from __future__ import annotations

import asyncio as real_asyncio
import json
import logging
from asyncio import CancelledError
from collections import defaultdict
from pathlib import Path
from types import SimpleNamespace

import pytest

import worker.queue.consumer as consumer_module
import worker.main as worker_main
from worker.queue.consumer import WorkflowQueueConsumer, adapt_v2_runtime_job
from worker.core.platform import configure_worker_event_loop, run_worker, worker_event_loop_factory


class FakeRedis:
    def __init__(self) -> None:
        self.lists: dict[str, list[str]] = defaultdict(list)
        self.hashes: dict[str, dict[str, str]] = defaultdict(dict)
        self.blmove_payload: str | None = None

    async def blmove(self, source: str, destination: str, timeout: int, src: str, dest: str) -> str | None:
        assert timeout == 0
        assert src == "LEFT"
        assert dest == "RIGHT"
        if self.blmove_payload is not None:
            payload = self.blmove_payload
            self.blmove_payload = None
            self.lists[destination].append(payload)
            return payload
        if not self.lists[source]:
            return None
        payload = self.lists[source].pop(0)
        self.lists[destination].append(payload)
        return payload

    async def lpush(self, key: str, value: str) -> None:
        self.lists[key].insert(0, value)

    async def rpush(self, key: str, value: str) -> None:
        self.lists[key].append(value)

    async def lrem(self, key: str, count: int, value: str) -> int:
        removed = 0
        remaining: list[str] = []
        for item in self.lists[key]:
            if removed < count and item == value:
                removed += 1
                continue
            remaining.append(item)
        self.lists[key] = remaining
        return removed

    async def hset(self, key: str, field: str, value: str) -> None:
        self.hashes[key][field] = value

    async def hget(self, key: str, field: str) -> str | None:
        return self.hashes[key].get(field)


@pytest.fixture
def consumer(monkeypatch: pytest.MonkeyPatch) -> WorkflowQueueConsumer:
    repo_root = Path(__file__).resolve().parents[3]
    contracts_root = repo_root / "packages" / "contracts" / "schemas"
    monkeypatch.setattr(
        consumer_module,
        "get_settings",
        lambda: SimpleNamespace(redis_url="redis://test", resolved_contracts_root=contracts_root),
    )
    monkeypatch.setattr(consumer_module, "build_logger", lambda settings: logging.getLogger("test-worker"))
    monkeypatch.setattr(consumer_module.Redis, "from_url", lambda *args, **kwargs: FakeRedis())
    consumer = WorkflowQueueConsumer()
    consumer.redis = FakeRedis()
    return consumer


def _job(*, workflow_id: str = "demo-workflow", attempt: int = 1, max_attempts: int = 3) -> dict:
    return {
        "contractVersion": "1.0.0",
        "jobId": "job-123",
        "workflowId": workflow_id,
        "runId": "run-123",
        "kind": "transform",
        "status": "pending",
        "priority": 50,
        "createdAt": "2026-06-05T00:00:00Z",
        "trace": {"traceId": "1234567890abcdef", "correlationId": "abcdefgh"},
        "payload": {"assetId": "asset-1", "inputUri": "https://example.com/input.json"},
        "lease": {"attempt": attempt, "maxAttempts": max_attempts},
    }


def _scheduled_window_job(*, attempt: int = 1, max_attempts: int = 3) -> dict:
    return {
        "contractVersion": "1.0.0",
        "jobId": "window-job-123",
        "workflowId": "agronautas-scheduled-window",
        "runId": "open-meteo:climate:2026-06-05T00:00:00Z",
        "kind": "agronautas-scheduled-window",
        "status": "pending",
        "priority": 50,
        "createdAt": "2026-06-05T00:00:00Z",
        "trace": {"traceId": "1234567890abcdef", "correlationId": "abcdefgh", "causationId": "run-123"},
        "payload": {
            "sourceWindow": {
                "provider": "open-meteo",
                "signalType": "climate",
                "windowStart": "2026-06-05T00:00:00Z",
                "windowEnd": "2026-06-05T01:00:00Z",
                "runId": "open-meteo:climate:2026-06-05T00:00:00Z",
            }
        },
        "lease": {"attempt": attempt, "maxAttempts": max_attempts},
        "labels": {"domain": "agronautas", "operation": "scheduled-window"},
    }


def _v2_risk_job() -> dict:
    return {
        "contractVersion": "2.0.0",
        "jobId": "v2-job-123",
        "runId": "v2-run-123",
        "operation": "risk-recompute",
        "fieldId": "field-v2",
        "requestedAt": "2026-06-05T00:00:00Z",
        "trace": {"traceId": "trace-v2", "correlationId": "corr-v2", "causationId": "cause-v2"},
        "runtime": {"mode": "real"},
        "state": "queued",
        "lease": {"attempt": 1, "maxAttempts": 3, "leaseExpiresAt": None},
    }


def _v2_scheduled_window_job() -> dict:
    job = _v2_risk_job()
    job.update({"jobId": "v2-window-job", "runId": "v2-window-run", "operation": "scheduled-window", "fieldId": None})
    job["sourceWindow"] = {
        "provider": "open-meteo",
        "signalType": "climate",
        "windowStart": "2026-06-05T00:00:00Z",
        "windowEnd": "2026-06-05T01:00:00Z",
        "runId": "v2-window-run",
    }
    return job


def _job_with_asset_metadata() -> dict:
    job = _job()
    job["payload"]["assetMetadata"] = {
        "contractVersion": "1.0.0",
        "assetId": "asset-1",
        "mimeType": "application/json",
        "sourceUri": "https://example.com/input.json",
        "checksum": {"algorithm": "sha256", "value": "a" * 16},
        "sizeBytes": 12,
        "capturedAt": "2026-06-05T00:00:00Z",
        "ownership": {"tenantId": "tenant-1", "workspaceId": "workspace-1"},
    }
    return job


def test_default_consumer_owns_the_agronautas_bull_queue(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        consumer_module,
        "get_settings",
        lambda: SimpleNamespace(
            redis_url="redis://test",
            resolved_contracts_root=Path(__file__).resolve().parents[3] / "packages" / "contracts" / "schemas",
        ),
    )
    monkeypatch.setattr(consumer_module, "build_logger", lambda settings: logging.getLogger("test-worker"))
    monkeypatch.setattr(consumer_module.Redis, "from_url", lambda *args, **kwargs: FakeRedis())

    consumer = WorkflowQueueConsumer()

    assert consumer.queue_name == "bull:agronautas-runtime:wait"


def test_consumer_validator_resolves_relative_schema_refs(consumer: WorkflowQueueConsumer) -> None:
    consumer.validator.validate(_job_with_asset_metadata())


def test_v2_runtime_job_adapter_emits_the_legacy_worker_shape() -> None:
    adapted = adapt_v2_runtime_job(_v2_risk_job())

    assert adapted["contractVersion"] == "1.0.0"
    assert adapted["workflowId"] == "agronautas-risk-recompute"
    assert adapted["payload"] == {
        "fieldId": "field-v2",
        "triggeredBy": "api",
        "requestedAt": "2026-06-05T00:00:00Z",
        "runtime": {"mode": "real"},
    }
    assert "leaseExpiresAt" not in adapted["lease"]


def test_v2_runtime_job_adapter_output_is_accepted_by_the_legacy_validator(consumer: WorkflowQueueConsumer) -> None:
    job = _v2_risk_job()
    job["trace"] = {"traceId": "trace-v2-123456789", "correlationId": "corr-v2-123", "causationId": "cause-v2-123"}

    consumer.validator.validate(adapt_v2_runtime_job(job))


def test_v2_scheduled_runtime_job_adapter_preserves_window_payload() -> None:
    adapted = adapt_v2_runtime_job(_v2_scheduled_window_job())

    assert adapted["workflowId"] == "agronautas-scheduled-window"
    assert adapted["payload"]["sourceWindow"]["runId"] == "v2-window-run"
    assert adapted["status"] == "pending"


@pytest.mark.asyncio
async def test_consumer_validates_and_routes_v2_risk_envelope_while_preserving_v1_path(consumer: WorkflowQueueConsumer, monkeypatch: pytest.MonkeyPatch) -> None:
    received: list[dict] = []

    async def fake_run(job):
        received.append(job)
        return {"accepted": True, "status": "succeeded", "jobId": job["jobId"], "runId": job["runId"]}

    monkeypatch.setattr(consumer, "_run_agronautas_job", fake_run)
    result = await consumer.handle_job(_v2_risk_job())

    assert result["status"] == "succeeded"
    assert received[0]["contractVersion"] == "1.0.0"
    assert received[0]["payload"]["fieldId"] == "field-v2"


@pytest.mark.asyncio
async def test_consumer_validates_and_routes_v2_scheduled_window_envelope(consumer: WorkflowQueueConsumer, monkeypatch: pytest.MonkeyPatch) -> None:
    received: list[dict] = []

    async def fake_run(job):
        received.append(job)
        return {"accepted": False, "status": "unavailable", "jobId": job["jobId"], "runId": job["runId"]}

    monkeypatch.setattr(consumer, "_run_scheduled_window_job", fake_run)
    result = await consumer.handle_job(_v2_scheduled_window_job())

    assert result["status"] == "unavailable"
    assert received[0]["workflowId"] == "agronautas-scheduled-window"
    assert received[0]["payload"]["sourceWindow"]["provider"] == "open-meteo"


def test_worker_entrypoint_starts_the_queue_consumer(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []
    class FakeConsumer:
        async def consume_forever(self) -> None:
            calls.append("consume_forever")

    def fake_run(coroutine: object) -> None:
        calls.append("run_worker")
        real_asyncio.run(coroutine)

    monkeypatch.setattr(worker_main, "WorkflowQueueConsumer", FakeConsumer)
    monkeypatch.setattr(worker_main, "run_worker", fake_run)

    worker_main.main()

    assert calls == ["run_worker", "consume_forever"]


def test_worker_entrypoint_configures_platform_boundary_before_asyncio_run(monkeypatch: pytest.MonkeyPatch) -> None:
    events: list[str] = []
    class FakeConsumer:
        async def consume_forever(self) -> None:
            events.append("consume_forever")

    def fake_run(coroutine: object) -> None:
        events.append("run_worker")
        real_asyncio.run(coroutine)

    monkeypatch.setattr(worker_main, "WorkflowQueueConsumer", FakeConsumer)
    monkeypatch.setattr(worker_main, "run_worker", fake_run)

    worker_main.main()

    assert events == ["run_worker", "consume_forever"]


def test_windows_worker_uses_selector_event_loop_for_psycopg() -> None:
    previous_policy = real_asyncio.get_event_loop_policy()
    try:
        configure_worker_event_loop(platform_name="win32")
        assert isinstance(real_asyncio.get_event_loop_policy(), real_asyncio.WindowsSelectorEventLoopPolicy)
    finally:
        real_asyncio.set_event_loop_policy(previous_policy)


def test_non_windows_worker_keeps_platform_default_event_loop_policy() -> None:
    previous_policy = real_asyncio.get_event_loop_policy()
    configure_worker_event_loop(platform_name="linux")
    assert real_asyncio.get_event_loop_policy() is previous_policy


def test_worker_event_loop_factory_is_selector_loop_on_windows() -> None:
    loop = worker_event_loop_factory(platform_name="win32")
    selector_probe = real_asyncio.WindowsSelectorEventLoopPolicy().new_event_loop()
    try:
        assert isinstance(loop, type(selector_probe))
    finally:
        selector_probe.close()
        loop.close()


def test_worker_runner_does_not_suppress_database_boundary_errors() -> None:
    async def fail_with_database_error() -> None:
        raise RuntimeError("psycopg boundary failure")

    with pytest.raises(RuntimeError, match="psycopg boundary failure"):
        run_worker(fail_with_database_error())


@pytest.mark.asyncio
async def test_ack_removes_payload_from_processing_after_success(consumer: WorkflowQueueConsumer, monkeypatch: pytest.MonkeyPatch) -> None:
    job = _job()
    payload = json.dumps(job)
    consumer.redis.blmove_payload = payload

    async def fake_blmove(source: str, destination: str, timeout: int, src: str, dest: str) -> str | None:
        if consumer.redis.blmove_payload is not None:
            return await FakeRedis.blmove(consumer.redis, source, destination, timeout, src, dest)
        raise CancelledError

    async def fake_handle(received_job: dict) -> dict:
        assert received_job["jobId"] == job["jobId"]
        result = {"ok": True}
        await consumer.redis.hset(consumer.results_key, received_job["jobId"], json.dumps(result))
        return result

    monkeypatch.setattr(consumer.redis, "blmove", fake_blmove)
    monkeypatch.setattr(consumer, "handle_job", fake_handle)

    with pytest.raises(CancelledError):
        await consumer.consume_forever()

    assert consumer.redis.lists[consumer.processing_queue_name] == []
    assert consumer.redis.hashes[consumer.results_key][job["jobId"]] == json.dumps({"ok": True})


@pytest.mark.asyncio
async def test_retryable_failure_requeues_with_incremented_attempt(consumer: WorkflowQueueConsumer) -> None:
    payload = json.dumps(_job(attempt=1, max_attempts=3))
    consumer.redis.lists[consumer.processing_queue_name] = [payload]

    await consumer._handle_failure(payload, TimeoutError("upstream timed out"))

    assert consumer.redis.lists[consumer.processing_queue_name] == []
    requeued = json.loads(consumer.redis.lists[consumer.queue_name][0])
    assert requeued["lease"]["attempt"] == 2
    assert requeued["lease"]["maxAttempts"] == 3
    assert requeued["status"] == "waiting"
    assert requeued["labels"]["retry_reason"].startswith("TimeoutError")


@pytest.mark.asyncio
async def test_exhausted_retryable_failure_moves_to_dead_letter(consumer: WorkflowQueueConsumer) -> None:
    payload = json.dumps(_job(attempt=3, max_attempts=3))
    consumer.redis.lists[consumer.processing_queue_name] = [payload]

    await consumer._handle_failure(payload, TimeoutError("still failing"))

    assert consumer.redis.lists[consumer.processing_queue_name] == []
    dead_letter = json.loads(consumer.redis.lists[consumer.dead_letter_queue_name][0])
    assert dead_letter["job"]["jobId"] == "job-123"
    assert dead_letter["attempt"] == 3
    assert "TimeoutError" in dead_letter["reason"]


@pytest.mark.asyncio
async def test_unretryable_failure_moves_to_dead_letter_immediately(consumer: WorkflowQueueConsumer) -> None:
    payload = json.dumps(_job(attempt=1, max_attempts=3))
    consumer.redis.lists[consumer.processing_queue_name] = [payload]

    await consumer._handle_failure(payload, ValueError("bad payload"))

    assert consumer.redis.lists[consumer.queue_name] == []
    assert len(consumer.redis.lists[consumer.dead_letter_queue_name]) == 1


@pytest.mark.asyncio
async def test_execute_with_retry_retries_transient_failures(consumer: WorkflowQueueConsumer) -> None:
    attempts = {"count": 0}

    async def flaky_operation() -> str:
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise ConnectionError("temporary outage")
        return "ok"

    result = await consumer._execute_with_retry(flaky_operation)

    assert result == "ok"
    assert attempts["count"] == 3


@pytest.mark.asyncio
async def test_processing_payload_remains_recoverable_until_ack(consumer: WorkflowQueueConsumer) -> None:
    payload = json.dumps(_job())
    consumer.redis.lists[consumer.processing_queue_name] = [payload]

    assert consumer.redis.lists[consumer.processing_queue_name] == [payload]
    await consumer._dead_letter(payload, "manual recovery")
    assert consumer.redis.lists[consumer.processing_queue_name] == []


@pytest.mark.asyncio
async def test_scheduled_window_unavailable_is_not_reported_as_success(consumer: WorkflowQueueConsumer) -> None:
    result = await consumer.handle_job(_scheduled_window_job())

    assert result["accepted"] is False
    assert result["status"] == "unavailable"
    assert result["reason"] == "scheduled_window_processor_not_configured"
    assert consumer.redis.hashes[consumer.results_key]["window-job-123"] == json.dumps(result)
    assert consumer.redis.lists.get(consumer.completed_queue_name, []) == []


@pytest.mark.asyncio
async def test_scheduled_window_unavailable_has_typed_lineage_metadata(consumer: WorkflowQueueConsumer) -> None:
    result = await consumer.handle_job(_scheduled_window_job())

    assert result["degradationReasons"] == ["processor_not_configured"]
    assert result["lineage"]["providerMode"] == "unavailable"
    assert result["lineage"]["schemaStatus"] == "unavailable"
    assert "retrievedAt" in result["lineage"]


@pytest.mark.asyncio
async def test_v2_scheduled_window_unavailable_result_is_valid_in_the_v2_envelope(consumer: WorkflowQueueConsumer) -> None:
    job = _v2_scheduled_window_job()
    result = await consumer.handle_job(job)
    job["result"] = result["result"]

    consumer.v2_validator.validate(job)


@pytest.mark.asyncio
async def test_scheduled_window_success_records_result_and_completed_transition(consumer: WorkflowQueueConsumer, monkeypatch: pytest.MonkeyPatch) -> None:
    job = _scheduled_window_job()
    consumer.redis.blmove_payload = json.dumps(job)

    async def fake_blmove(source: str, destination: str, timeout: int, src: str, dest: str) -> str | None:
        if consumer.redis.blmove_payload is not None:
            return await FakeRedis.blmove(consumer.redis, source, destination, timeout, src, dest)
        raise CancelledError

    async def fake_scheduled_window(received_job: dict) -> dict:
        return {"accepted": True, "status": "succeeded", "jobId": received_job["jobId"], "runId": received_job["runId"]}

    monkeypatch.setattr(consumer.redis, "blmove", fake_blmove)
    monkeypatch.setattr(consumer, "_run_scheduled_window_job", fake_scheduled_window)

    with pytest.raises(CancelledError):
        await consumer.consume_forever()

    assert consumer.redis.lists[consumer.processing_queue_name] == []
    assert len(consumer.redis.lists[consumer.completed_queue_name]) == 1
    assert json.loads(consumer.redis.hashes[consumer.results_key][job["jobId"]])["status"] == "succeeded"


def test_scheduled_window_schema_rejects_duplicate_identity() -> None:
    job = _scheduled_window_job()
    job["payload"]["sourceWindow"]["runId"] = "other-run"

    with pytest.raises(Exception):
        consumer_module.validate_scheduled_window_job(job)


def test_v2_consumer_exposes_one_persistence_before_ack_coordinator() -> None:
    assert hasattr(WorkflowQueueConsumer, "persist_outcome_before_ack")


@pytest.mark.asyncio
async def test_failure_fallback_uses_the_coordinator_once_and_does_not_call_store_directly(consumer: WorkflowQueueConsumer) -> None:
    payload = json.dumps(_job(attempt=1, max_attempts=2))
    consumer.redis.lists[consumer.processing_queue_name] = [payload]
    coordinator_calls: list[str] = []

    class Coordinator:
        async def persist_outcome_before_ack(self, job, result):
            coordinator_calls.append(result["status"])
            return result

    class ForbiddenStore:
        async def schedule_retry(self, *args, **kwargs):
            raise AssertionError("consumer must not schedule retries directly")

        async def dead_letter(self, *args, **kwargs):
            raise AssertionError("consumer must not dead-letter directly")

    consumer.outcome_coordinator = Coordinator()
    consumer.job_store = ForbiddenStore()
    await consumer._handle_failure(payload, TimeoutError("upstream timed out"))

    assert coordinator_calls == ["retryable_failure"]
    assert json.loads(consumer.redis.lists[consumer.queue_name][0])["lease"]["attempt"] == 2


@pytest.mark.asyncio
async def test_consumer_persistence_failure_does_not_ack_processing_payload(consumer: WorkflowQueueConsumer) -> None:
    payload = json.dumps(_job())
    consumer.redis.lists[consumer.processing_queue_name] = [payload]

    class FailingCoordinator:
        async def persist_outcome_before_ack(self, job, result):
            raise RuntimeError("database unavailable")

    consumer.outcome_coordinator = FailingCoordinator()
    with pytest.raises(RuntimeError, match="database unavailable"):
        await consumer.persist_outcome_before_ack(_job(), {"status": "succeeded"})

    assert consumer.redis.lists[consumer.processing_queue_name] == [payload]
