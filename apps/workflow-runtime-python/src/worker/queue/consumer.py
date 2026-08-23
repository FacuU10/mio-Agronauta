from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from redis.asyncio import Redis
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from worker.contracts import build_contract_validator
from worker.core.config import get_settings
from worker.core.platform import run_worker
from worker.core.telemetry import build_logger, traced_operation
from worker.graph.base import build_graph
from worker.runtime.agronautas_jobs import PostgresAgronautasJobStore, handle_agronautas_job, handle_scheduled_window_job


class RetryableAgronautasJobError(ConnectionError):
    """Signals that the durable retry transition completed but Redis must requeue."""

    durable_transition = True


class WorkflowQueueConsumer:
    """Redis/BullMQ-compatible worker consuming JSON-encoded workflow jobs."""

    def __init__(self, queue_name: str = "agronautas-runtime") -> None:
        self.settings = get_settings()
        self.logger = build_logger(self.settings)
        self.redis = Redis.from_url(self.settings.redis_url, decode_responses=True)
        self.validator = build_contract_validator("workflow-job.schema.json", self.settings.resolved_contracts_root)
        self.queue_name = f"bull:{queue_name}:wait"
        self.processing_queue_name = self._processing_queue_name(queue_name)
        self.dead_letter_queue_name = self._dead_letter_queue_name(queue_name)
        self.completed_queue_name = f"bull:{queue_name}:completed"
        self.results_key = f"bull:{queue_name}:results"
        self.max_recovery_attempts = 3
        postgres_dsn = getattr(self.settings, "postgres_dsn", None)
        self.job_store = PostgresAgronautasJobStore(postgres_dsn, worker_id=f"worker-{uuid4()}") if postgres_dsn else None

    @staticmethod
    def _processing_queue_name(queue_name: str) -> str:
        return f"bull:{queue_name}:processing"

    @staticmethod
    def _dead_letter_queue_name(queue_name: str) -> str:
        return f"bull:{queue_name}:dead-letter"

    async def consume_forever(self) -> None:
        while True:
            payload = await self.redis.blmove(self.queue_name, self.processing_queue_name, 0, "LEFT", "RIGHT")
            if payload is None:
                continue

            try:
                job = json.loads(payload)
                await self.handle_job(job)
                if job.get("workflowId") == "agronautas-scheduled-window":
                    result = json.loads((await self.redis.hget(self.results_key, job["jobId"])) or "{}")
                    if result.get("status") == "unavailable":
                        await self._dead_letter(payload, str(result.get("reason", "scheduled_window_unavailable")))
                    elif result.get("status") == "succeeded":
                        await self._ack(payload)
                    else:
                        await self._ack(payload)
                else:
                    await self._ack(payload)
            except Exception as exc:
                self.logger.exception("job.failed", extra={"queue": self.queue_name, "error": str(exc)})
                await self._handle_failure(payload, exc)

    async def handle_job(self, job: dict[str, Any]) -> dict[str, Any]:
        self.validator.validate(job)
        heartbeat_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        await self.redis.hset("bull:agronautas-runtime:status", job["jobId"], json.dumps({"status": "processing", "runId": job["runId"]}))
        await self.redis.hset("bull:agronautas-runtime:heartbeat", job["jobId"], heartbeat_at)
        self.logger.info("queue.heartbeat", extra={"job_id": job["jobId"], "run_id": job["runId"], "heartbeat_at": heartbeat_at})
        if job.get("workflowId") == "agronautas-scheduled-window":
            validate_scheduled_window_job(job)
            result = await self._run_scheduled_window_job(job)
            await self.redis.hset(self.results_key, job["jobId"], json.dumps(result))
            if result.get("status") == "succeeded":
                await self.redis.rpush(self.completed_queue_name, json.dumps(result))
                self.logger.info("queue.result", extra={"job_id": job["jobId"], "run_id": job["runId"], "status": result["status"]})
            return result

        if job.get("workflowId") == "agronautas-risk-recompute":
            with traced_operation(
                "agronautas-risk-recompute.process",
                {"jobId": job["jobId"], "runId": job["runId"], "requestId": job["trace"]["traceId"]},
            ):
                result = await self._run_agronautas_job(job)
                await self.redis.hset("bull:agronautas-runtime:results", job["jobId"], json.dumps(result))
                if result.get("status") == "succeeded":
                    await self.redis.rpush(self.completed_queue_name, json.dumps(result))
                    self.logger.info("queue.result", extra={"job_id": job["jobId"], "run_id": job["runId"], "status": result["status"]})
                return result

        with traced_operation("workflow-job.process", {"jobId": job["jobId"], "workflowId": job["workflowId"]}):
            state = {
                "job": job,
                "messages": [],
                "current_step": "plan",
                "output": {},
                "updated_at": job["createdAt"],
            }
            result = await self._run_graph_job(state, job["runId"])
            await self.redis.hset(self.results_key, job["jobId"], json.dumps(result))
            self.logger.info("job.completed", extra={"job_id": job["jobId"], "run_id": job["runId"]})
            await self.redis.rpush(self.completed_queue_name, json.dumps(result))
            self.logger.info("queue.result", extra={"job_id": job["jobId"], "run_id": job["runId"], "status": result.get("status", "completed")})
            return result

    async def _ack(self, payload: str) -> None:
        await self.redis.lrem(self.processing_queue_name, 1, payload)

    async def _requeue(self, payload: str, reason: str) -> None:
        job = json.loads(payload)
        next_payload = self._with_retry_metadata(job, reason)
        await self.redis.lpush(self.queue_name, next_payload)
        await self._ack(payload)

    async def _dead_letter(self, payload: str, reason: str) -> None:
        job = json.loads(payload)
        attempt = self._current_attempt(job)
        envelope = {
            "job": job,
            "reason": reason,
            "failedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "attempt": attempt,
        }
        await self.redis.rpush(self.dead_letter_queue_name, json.dumps(envelope))
        await self._ack(payload)
        self.logger.error("queue.dlq", extra={"job_id": job["jobId"], "run_id": job["runId"], "reason": reason, "attempt": attempt})

    async def _handle_failure(self, payload: str, exc: Exception) -> None:
        job = json.loads(payload)
        max_attempts = self._max_attempts(job)
        attempt = self._current_attempt(job)
        reason = f"{type(exc).__name__}: {exc}"
        if self._is_retryable_exception(exc) and attempt < max_attempts:
            if self.job_store is not None and not getattr(exc, "durable_transition", False):
                await self.job_store.schedule_retry(
                    job["jobId"],
                    job["runId"],
                    datetime.now(UTC) + timedelta(seconds=2**attempt),
                    type(exc).__name__,
                    reason,
                )
            await self._requeue(payload, reason)
            return

        if self.job_store is not None and not getattr(exc, "durable_transition", False):
            await self.job_store.dead_letter(job["jobId"], job["runId"], datetime.now(UTC), type(exc).__name__, reason)
        await self._dead_letter(payload, reason)

    @staticmethod
    def _is_retryable_exception(exc: Exception) -> bool:
        return isinstance(exc, (TimeoutError, ConnectionError))

    def _max_attempts(self, job: dict[str, Any]) -> int:
        lease = job.get("lease") or {}
        value = lease.get("maxAttempts")
        return value if isinstance(value, int) and value > 0 else self.max_recovery_attempts

    def _current_attempt(self, job: dict[str, Any]) -> int:
        lease = job.get("lease") or {}
        value = lease.get("attempt")
        return value if isinstance(value, int) and value > 0 else 1

    def _with_retry_metadata(self, job: dict[str, Any], reason: str) -> str:
        next_job = json.loads(json.dumps(job))
        lease = next_job.setdefault("lease", {})
        lease["attempt"] = self._current_attempt(job) + 1
        lease["maxAttempts"] = self._max_attempts(job)
        labels = next_job.setdefault("labels", {})
        labels["retry_reason"] = reason[:256]
        next_job["status"] = "waiting"
        return json.dumps(next_job)

    async def _execute_with_retry(self, operation: Any, *args: Any) -> Any:
        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, max=8),
            retry=retry_if_exception_type((TimeoutError, ConnectionError)),
            reraise=True,
        )
        async def _runner() -> Any:
            return await operation(*args)

        return await _runner()

    async def _run_agronautas_job(self, job: dict[str, Any]) -> dict[str, Any]:
        result = await self._execute_with_retry(
            handle_agronautas_job,
            job,
            self.redis,
            self.logger,
            self.job_store,
            self.job_store.worker_id if self.job_store is not None else None,
        )
        if result.get("status") == "retryable_failure":
            raise RetryableAgronautasJobError(str(result.get("error", "retryable_failure")))
        return result

    async def _run_scheduled_window_job(self, job: dict[str, Any]) -> dict[str, Any]:
        return await handle_scheduled_window_job(job, self.redis, self.logger, self.job_store, self.job_store.worker_id if self.job_store is not None else None)

    async def _run_graph_job(self, state: dict[str, Any], run_id: str) -> dict[str, Any]:
        graph = await build_graph()
        return await self._execute_with_retry(graph.ainvoke, state, {"configurable": {"thread_id": run_id}})


def main() -> None:
    run_worker(WorkflowQueueConsumer().consume_forever())


if __name__ == "__main__":
    main()


def validate_scheduled_window_job(job: dict[str, Any]) -> None:
    source_window = job.get("payload", {}).get("sourceWindow")
    if not isinstance(source_window, dict):
        raise ValueError("scheduled_window_payload_missing")
    if source_window.get("runId") != job.get("runId"):
        raise ValueError("scheduled_window_run_id_mismatch")
    start = datetime.fromisoformat(str(source_window["windowStart"]).replace("Z", "+00:00"))
    end = datetime.fromisoformat(str(source_window["windowEnd"]).replace("Z", "+00:00"))
    if end <= start:
        raise ValueError("scheduled_window_end_must_follow_start")
