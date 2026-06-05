from __future__ import annotations

import json
import logging
from asyncio import CancelledError
from collections import defaultdict
from pathlib import Path
from types import SimpleNamespace

import pytest

import worker.queue.consumer as consumer_module
from worker.queue.consumer import WorkflowQueueConsumer


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
