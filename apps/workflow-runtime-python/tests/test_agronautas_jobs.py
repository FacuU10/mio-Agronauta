from __future__ import annotations

import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

import pytest

os.environ.setdefault(
    "WORKER_CONTRACTS_ROOT",
    str(Path(__file__).resolve().parents[3] / "packages" / "contracts" / "schemas"),
)
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from worker.runtime.agronautas_jobs import PostgresAgronautasJobStore, compute_risk_snapshot, fetch_field_coordinates, handle_agronautas_job, handle_scheduled_window_job


class FakeRedis:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, str]] = []

    async def hset(self, key: str, field: str, value: str) -> None:
        self.calls.append((key, field, value))


class FakeLogger:
    def __init__(self) -> None:
        self.entries: list[tuple[str, dict]] = []

    def info(self, message: str, *, extra: dict) -> None:
        self.entries.append((message, extra))


class CapturingCursor:
    def __init__(self, queries: list[str]) -> None:
        self.queries = queries

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def execute(self, sql, _params):
        self.queries.append(sql)

    async def fetchone(self):
        return ("job-1",)


class CapturingConnection:
    def __init__(self, queries: list[str]) -> None:
        self.queries = queries

    def cursor(self):
        return CapturingCursor(self.queries)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def commit(self):
        return None


def _parse_test_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


@pytest.mark.asyncio
async def test_durable_job_store_uses_prisma_managed_legacy_identifier_columns(monkeypatch: pytest.MonkeyPatch) -> None:
    queries: list[tuple[str, tuple[object, ...]]] = []

    async def fake_connect(_dsn: str):
        return CapturingConnection(queries)

    monkeypatch.setattr(
        "worker.runtime.agronautas_jobs.psycopg.AsyncConnection.connect",
        fake_connect,
    )
    store = PostgresAgronautasJobStore("postgres://test", "worker-1")

    assert await store.claim("job-1", _parse_test_timestamp("2026-08-04T00:00:00Z")) is True
    await store.heartbeat("job-1", "run-1", _parse_test_timestamp("2026-08-04T00:01:00Z"))

    assert '"jobId"' in queries[0]
    assert '"runId"' in queries[1]
    assert "job_id" not in queries[0]
    assert "run_id" not in queries[1]


@pytest.mark.asyncio
async def test_durable_job_store_keeps_run_identity_for_terminal_transitions(monkeypatch: pytest.MonkeyPatch) -> None:
    queries: list[str] = []

    async def fake_connect(_dsn: str):
        return CapturingConnection(queries)

    monkeypatch.setattr(
        "worker.runtime.agronautas_jobs.psycopg.AsyncConnection.connect",
        fake_connect,
    )
    store = PostgresAgronautasJobStore("postgres://test", "worker-1")
    timestamp = _parse_test_timestamp("2026-08-04T00:00:00Z")

    await store.complete("job-1", "run-1", timestamp, {"status": "succeeded"})
    await store.schedule_retry("job-1", "run-1", timestamp, "provider_retryable", "temporary")
    await store.dead_letter("job-1", "run-1", timestamp, "provider_exhausted", "unavailable")

    assert all('"jobId"' in query and '"runId"' in query for query in queries)
    assert all("job_id" not in query and "run_id" not in query for query in queries)


@pytest.mark.asyncio
async def test_fetch_field_coordinates_uses_prisma_field_identifier_columns(monkeypatch: pytest.MonkeyPatch) -> None:
    queries: list[str] = []

    class CoordinateCursor:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def execute(self, sql, _params):
            queries.append(sql)

        async def fetchone(self):
            return ("field-1", -29.18, -58.08)

    class CoordinateConnection:
        def cursor(self):
            return CoordinateCursor()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

    async def fake_connect(_dsn: str):
        return CoordinateConnection()

    monkeypatch.setattr("worker.runtime.agronautas_jobs.psycopg.AsyncConnection.connect", fake_connect)

    assert await fetch_field_coordinates("postgres://test", "field-1") == {
        "field_id": "field-1",
        "lat": -29.18,
        "lng": -58.08,
    }
    assert '"centroidLat"' in queries[0]
    assert '"centroidLng"' in queries[0]
    assert "centroid_lat" not in queries[0]
    assert "centroid_lng" not in queries[0]


@pytest.mark.asyncio
async def test_handle_agronautas_job_persists_success_without_mock_snapshot(monkeypatch: pytest.MonkeyPatch) -> None:
    redis = FakeRedis()
    logger = FakeLogger()
    job = {
        "jobId": "job-1",
        "runId": "run-1",
        "payload": {
            "fieldId": "field-1",
            "triggeredBy": "api",
            "requestedAt": "2026-06-05T00:00:00Z",
            "runtime": {"mode": "real"},
        },
        "trace": {"traceId": "trace-1"},
    }

    async def fake_fetch_field(postgres_dsn: str, field_id: str):
        return {"field_id": field_id, "lat": -29.1833, "lng": -58.0833}

    def fake_fetch_weather(latitude: float, longitude: float):
        return {
            "observed_at": "2026-06-05T00:00:00Z",
            "acquired_at": "2026-06-05T00:01:00Z",
            "source_run_id": "open-meteo-provider-run-1",
            "rainfall_mm_7d": 64.0,
            "temperature_max_c": 35.0,
            "temperature_min_c": 22.0,
            "source_url": "https://api.open-meteo.com/test",
            "raw": {"daily": {"precipitation_sum": [10, 9, 8, 7, 6, 12, 12]}},
        }

    async def fake_persist_success(**kwargs):
        return kwargs

    monkeypatch.setattr("worker.runtime.agronautas_jobs.fetch_field_coordinates", fake_fetch_field)
    monkeypatch.setattr("worker.runtime.agronautas_jobs.fetch_open_meteo_snapshot", fake_fetch_weather)
    monkeypatch.setattr("worker.runtime.agronautas_jobs.persist_successful_snapshot", fake_persist_success)

    result = await handle_agronautas_job(job, redis, logger)

    assert result["accepted"] is True
    assert result["status"] == "succeeded"
    assert result["fieldId"] == "field-1"
    assert result["snapshot"]["ruleVersion"] == "open-meteo-basic-v1"
    assert result["snapshot"]["engineId"] == "open-meteo-basic-v1"
    assert result["snapshot"]["engineVersion"] == "open-meteo-basic-v1"
    assert result["engine"] == {
        "id": "open-meteo-basic-v1",
        "version": "open-meteo-basic-v1",
        "selectionStatus": "undecided",
        "calibrationStatus": "not_established",
    }
    assert result["snapshot"]["evidenceRefs"] == ["signal_ingestion_runs:open-meteo:climate:run-1"]
    assert result["lineage"] == {
        "sourceRunIds": ["run-1"],
        "providerRunIds": ["open-meteo-provider-run-1"],
        "acquisitionTimes": ["2026-06-05T00:01:00Z"],
        "freshness": "fresh",
        "degradationReasons": [],
        "engineId": "open-meteo-basic-v1",
        "engineVersion": "open-meteo-basic-v1",
        "riskSnapshotId": "field-1:run-1:risk",
        "alertSnapshotIds": [],
    }
    assert any(key == "agronautas:job-runs:result" for key, _, _ in redis.calls)


@pytest.mark.asyncio
async def test_handle_agronautas_job_marks_failure_for_weather_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    redis = FakeRedis()
    logger = FakeLogger()
    job = {
        "jobId": "job-2",
        "runId": "run-2",
        "payload": {
            "fieldId": "field-2",
            "triggeredBy": "api",
            "requestedAt": "2026-06-05T00:00:00Z",
            "runtime": {"mode": "real"},
        },
        "trace": {"traceId": "trace-2"},
    }

    async def fake_fetch_field(postgres_dsn: str, field_id: str):
        return {"field_id": field_id, "lat": -29.1833, "lng": -58.0833}

    async def fake_persist_failure(**kwargs):
        return kwargs

    monkeypatch.setattr("worker.runtime.agronautas_jobs.fetch_field_coordinates", fake_fetch_field)
    monkeypatch.setattr("worker.runtime.agronautas_jobs.fetch_open_meteo_snapshot", lambda latitude, longitude: (_ for _ in ()).throw(RuntimeError("weather_down")))
    monkeypatch.setattr("worker.runtime.agronautas_jobs.persist_failed_ingestion", fake_persist_failure)

    result = await handle_agronautas_job(job, redis, logger)

    assert result["accepted"] is False
    assert result["error"] == "weather_down"
    status_payload = json.loads(next(value for key, _, value in redis.calls if key == "agronautas:job-runs:result"))
    assert status_payload["accepted"] is False


@pytest.mark.asyncio
async def test_handle_agronautas_job_skips_duplicate_locked_run(monkeypatch: pytest.MonkeyPatch) -> None:
    redis = FakeRedis()
    logger = FakeLogger()
    job = {"jobId": "job-dupe", "runId": "run-dupe", "payload": {"fieldId": "field-1", "triggeredBy": "api", "requestedAt": "2026-06-05T00:00:00Z", "runtime": {"mode": "real"}}, "trace": {"traceId": "trace-dupe"}}
    fetch_calls = 0

    async def fake_claim_run(redis_client, run_id: str, job_id: str) -> bool:
        return False

    async def fake_fetch_field(postgres_dsn: str, field_id: str):
        nonlocal fetch_calls
        fetch_calls += 1
        return {"field_id": field_id, "lat": -29.1833, "lng": -58.0833}

    monkeypatch.setattr("worker.runtime.agronautas_jobs.claim_run_once", fake_claim_run)
    monkeypatch.setattr("worker.runtime.agronautas_jobs.fetch_field_coordinates", fake_fetch_field)

    result = await handle_agronautas_job(job, redis, logger)

    assert result["accepted"] is False
    assert result["status"] == "skipped_duplicate"
    assert fetch_calls == 0


@pytest.mark.asyncio
async def test_handle_agronautas_job_marks_retryable_failure_before_dlq(monkeypatch: pytest.MonkeyPatch) -> None:
    redis = FakeRedis()
    logger = FakeLogger()
    job = {"jobId": "job-retry", "runId": "run-retry", "attempt": 1, "maxAttempts": 3, "payload": {"fieldId": "field-2", "triggeredBy": "api", "requestedAt": "2026-06-05T00:00:00Z", "runtime": {"mode": "real"}}, "trace": {"traceId": "trace-retry"}}

    async def fake_fetch_field(postgres_dsn: str, field_id: str):
        return {"field_id": field_id, "lat": -29.1833, "lng": -58.0833}

    async def fake_persist_failure(**kwargs):
        return kwargs

    monkeypatch.setattr("worker.runtime.agronautas_jobs.fetch_field_coordinates", fake_fetch_field)
    monkeypatch.setattr("worker.runtime.agronautas_jobs.fetch_open_meteo_snapshot", lambda latitude, longitude: (_ for _ in ()).throw(RuntimeError("weather_down")))
    monkeypatch.setattr("worker.runtime.agronautas_jobs.persist_failed_ingestion", fake_persist_failure)

    result = await handle_agronautas_job(job, redis, logger)

    assert result["accepted"] is False
    assert result["status"] == "retryable_failure"
    assert result["nextAttempt"] == 2


@pytest.mark.asyncio
async def test_handle_agronautas_job_sends_exhausted_failures_to_dlq(monkeypatch: pytest.MonkeyPatch) -> None:
    redis = FakeRedis()
    logger = FakeLogger()
    job = {"jobId": "job-dlq", "runId": "run-dlq", "attempt": 3, "maxAttempts": 3, "payload": {"fieldId": "field-3", "triggeredBy": "api", "requestedAt": "2026-06-05T00:00:00Z", "runtime": {"mode": "real"}}, "trace": {"traceId": "trace-dlq"}}

    async def fake_fetch_field(postgres_dsn: str, field_id: str):
        return {"field_id": field_id, "lat": -29.1833, "lng": -58.0833}

    async def fake_persist_failure(**kwargs):
        return kwargs

    monkeypatch.setattr("worker.runtime.agronautas_jobs.fetch_field_coordinates", fake_fetch_field)
    monkeypatch.setattr("worker.runtime.agronautas_jobs.fetch_open_meteo_snapshot", lambda latitude, longitude: (_ for _ in ()).throw(RuntimeError("weather_down")))
    monkeypatch.setattr("worker.runtime.agronautas_jobs.persist_failed_ingestion", fake_persist_failure)

    result = await handle_agronautas_job(job, redis, logger)

    assert result["accepted"] is False
    assert result["status"] == "dlq"
    assert any(key == "agronautas:job-runs:dlq" for key, _, _ in redis.calls)


@pytest.mark.asyncio
async def test_handle_scheduled_window_keeps_unconfigured_provider_explicitly_unavailable() -> None:
    redis = FakeRedis()
    logger = FakeLogger()
    job = {
        "jobId": "window-job-1",
        "runId": "open-meteo:climate:2026-06-05T00:00:00Z",
        "payload": {"sourceWindow": {"provider": "open-meteo", "signalType": "climate", "windowStart": "2026-06-05T00:00:00Z", "windowEnd": "2026-06-05T01:00:00Z", "runId": "open-meteo:climate:2026-06-05T00:00:00Z"}},
        "trace": {"traceId": "trace-window-1"},
    }

    result = await handle_scheduled_window_job(job, redis, logger)

    assert result["accepted"] is False
    assert result["status"] == "unavailable"
    assert result["reason"] == "scheduled_window_processor_not_configured"
    assert result["degradationReasons"] == ["processor_not_configured"]
    assert result["freshness"] == "missing"
    assert result["uncertainty"] == "not_calibrated"
    assert result["lineage"]["providerMode"] == "unavailable"
    assert "risk" not in result


@pytest.mark.asyncio
async def test_handle_agronautas_job_rejects_stale_schema_without_mutating(monkeypatch: pytest.MonkeyPatch) -> None:
    redis = FakeRedis()
    logger = FakeLogger()
    job = {"jobId": "job-stale-schema", "runId": "run-stale-schema", "payload": {"fieldId": "field-4", "triggeredBy": "api", "requestedAt": "2026-06-05T00:00:00Z", "runtime": {"mode": "real"}, "contractVersion": "0.9.0"}, "trace": {"traceId": "trace-stale-schema"}}
    persist_calls = 0

    async def fake_persist_failure(**kwargs):
        nonlocal persist_calls
        persist_calls += 1

    monkeypatch.setattr("worker.runtime.agronautas_jobs.persist_failed_ingestion", fake_persist_failure)

    result = await handle_agronautas_job(job, redis, logger)

    assert result["accepted"] is False
    assert result["status"] == "stale_schema"
    assert persist_calls == 0


def test_compute_risk_snapshot_uses_weather_inputs() -> None:
    snapshot = compute_risk_snapshot(
        field_id="field-3",
        run_id="run-3",
        observed_at="2026-06-05T00:00:00Z",
        rainfall_mm_7d=70.0,
        temperature_max_c=36.0,
        temperature_min_c=24.0,
    )

    assert snapshot["score"] >= 70
    assert snapshot["level"] == "high"
    assert snapshot["ruleVersion"] == "open-meteo-basic-v1"
    assert snapshot["selectionStatus"] == "undecided"
    assert snapshot["calibrationStatus"] == "not_established"


@pytest.mark.asyncio
async def test_persist_successful_snapshot_writes_contractual_succeeded_status(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: list[tuple[object, ...]] = []

    class FakeCursor:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def execute(self, _sql, params):
            captured.append(params)

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def commit(self):
            return None

    async def fake_connect(_dsn: str):
        return FakeConnection()

    monkeypatch.setattr("worker.runtime.agronautas_jobs.psycopg.AsyncConnection.connect", fake_connect)
    from worker.runtime.agronautas_jobs import persist_successful_snapshot

    snapshot = compute_risk_snapshot(field_id="field-1", run_id="run-1", observed_at="2026-06-05T00:00:00Z", rainfall_mm_7d=1, temperature_max_c=28, temperature_min_c=18)
    await persist_successful_snapshot(postgres_dsn="postgres://test", field_id="field-1", run_id="run-1", requested_at="2026-06-05T00:00:00Z", weather={"observed_at": "2026-06-05T00:00:00Z", "source_url": "https://api.open-meteo.com/test", "raw": {}}, snapshot=snapshot)

    assert captured[0][3] == "run-1"
    assert captured[0][4] == "succeeded"


@pytest.mark.asyncio
async def test_persist_successful_snapshot_dual_writes_prisma_and_legacy_lineage_columns(monkeypatch: pytest.MonkeyPatch) -> None:
    queries: list[tuple[str, tuple[object, ...]]] = []

    class FakeCursor:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def execute(self, sql, params):
            queries.append((sql, tuple(params)))

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def commit(self):
            return None

    async def fake_connect(_dsn: str):
        return FakeConnection()

    monkeypatch.setattr("worker.runtime.agronautas_jobs.psycopg.AsyncConnection.connect", fake_connect)
    from worker.runtime.agronautas_jobs import persist_successful_snapshot

    snapshot = compute_risk_snapshot(
        field_id="field-1",
        run_id="run-1",
        observed_at="2026-06-05T00:00:00Z",
        rainfall_mm_7d=1,
        temperature_max_c=28,
        temperature_min_c=18,
        source_run_id="provider-run-1",
        acquired_at="2026-06-05T00:01:00Z",
    )
    await persist_successful_snapshot(
        postgres_dsn="postgres://test",
        field_id="field-1",
        run_id="run-1",
        requested_at="2026-06-05T00:00:00Z",
        weather={
            "observed_at": "2026-06-05T00:00:00Z",
            "acquired_at": "2026-06-05T00:01:00Z",
            "source_run_id": "provider-run-1",
            "source_url": "https://api.open-meteo.com/test",
            "raw": {},
        },
        snapshot=snapshot,
    )

    assert len(queries) == 2
    source_sql, risk_sql = queries[0][0], queries[1][0]
    for column in ('"fieldId"', 'field_id', '"runId"', 'run_id', '"evidencePayload"', 'evidence_payload'):
        assert column in source_sql
    for column in ('"fieldId"', 'field_id', '"runId"', 'run_id', '"computedAt"', 'computed_at', '"summaryPayload"', 'summary_payload'):
        assert column in risk_sql
    source_params = json.dumps(queries[0][1], default=str)
    risk_params = queries[1][1]
    assert "sourceRunId" in source_params
    assert "provider-run-1" in source_params
    assert risk_params[0] == snapshot["snapshotId"]
    assert risk_params[1] == "field-1"
    assert risk_params[2] == "run-1"


@pytest.mark.asyncio
async def test_snapshot_persistence_never_rewrites_historical_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    queries: list[str] = []

    class Cursor:
        async def __aenter__(self): return self
        async def __aexit__(self, exc_type, exc, tb): return None
        async def execute(self, sql, _params): queries.append(sql)

    class Connection:
        def cursor(self): return Cursor()
        async def __aenter__(self): return self
        async def __aexit__(self, exc_type, exc, tb): return None
        async def commit(self): return None

    async def fake_connect(_dsn: str): return Connection()
    monkeypatch.setattr("worker.runtime.agronautas_jobs.psycopg.AsyncConnection.connect", fake_connect)
    from worker.runtime.agronautas_jobs import persist_successful_snapshot

    snapshot = compute_risk_snapshot(field_id="field-1", run_id="run-immutable", observed_at="2026-06-05T00:00:00Z", rainfall_mm_7d=1, temperature_max_c=28, temperature_min_c=18)
    await persist_successful_snapshot(
        postgres_dsn="postgres://test",
        field_id="field-1",
        run_id="run-immutable",
        requested_at="2026-06-05T00:00:00Z",
        weather={"observed_at": "2026-06-05T00:00:00Z", "source_url": "https://api.open-meteo.com/test", "raw": {}},
        snapshot=snapshot,
    )

    assert len(queries) == 2
    assert "ON CONFLICT (run_id) DO NOTHING" in queries[0]
    assert "ON CONFLICT (id) DO NOTHING" in queries[1]
    assert "DO UPDATE" not in queries[0]
    assert "DO UPDATE" not in queries[1]


def test_v2_job_runtime_exposes_a_single_outcome_transition_coordinator() -> None:
    import worker.runtime.agronautas_jobs as agronautas_jobs

    assert hasattr(agronautas_jobs, "RuntimeOutcomeCoordinator")


@pytest.mark.asyncio
async def test_outcome_coordinator_persists_before_redis_result_and_ack_boundary() -> None:
    import worker.runtime.agronautas_jobs as agronautas_jobs

    events: list[str] = []

    class FakeStore:
        worker_id = "worker-1"

        async def complete(self, *args, **kwargs):
            events.append("durable")
            return True

        async def schedule_retry(self, *args, **kwargs):
            events.append("retry")
            return True

        async def dead_letter(self, *args, **kwargs):
            events.append("dlq")
            return True

    coordinator = agronautas_jobs.RuntimeOutcomeCoordinator(FakeStore())
    result = await coordinator.persist_outcome_before_ack(
        {"jobId": "job-1", "runId": "run-1", "lease": {"attempt": 1, "maxAttempts": 3}},
        {"status": "succeeded", "jobId": "job-1", "runId": "run-1"},
    )

    assert result["status"] == "succeeded"
    assert events == ["durable"]


@pytest.mark.asyncio
async def test_outcome_coordinator_owns_one_retry_and_exhaustion_transition() -> None:
    import worker.runtime.agronautas_jobs as agronautas_jobs

    events: list[str] = []

    class FakeStore:
        worker_id = "worker-1"

        async def schedule_retry(self, *args, **kwargs):
            events.append("retry")
            return True

        async def dead_letter(self, *args, **kwargs):
            events.append("dlq")
            return True

    coordinator = agronautas_jobs.RuntimeOutcomeCoordinator(FakeStore())
    await coordinator.persist_outcome_before_ack(
        {"jobId": "job-1", "runId": "run-1", "lease": {"attempt": 1, "maxAttempts": 2}},
        {"status": "retryable_failure", "error": "timeout"},
    )
    await coordinator.persist_outcome_before_ack(
        {"jobId": "job-1", "runId": "run-1", "lease": {"attempt": 2, "maxAttempts": 2}},
        {"status": "retryable_failure", "error": "timeout"},
    )

    assert events == ["retry", "dlq"]


@pytest.mark.asyncio
async def test_scheduled_window_unavailable_is_persisted_before_transport_result() -> None:
    import worker.runtime.agronautas_jobs as agronautas_jobs

    events: list[str] = []

    class FakeStore:
        async def claim(self, *args, **kwargs):
            events.append("claim")
            return True

        async def heartbeat(self, *args, **kwargs):
            events.append("heartbeat")

        async def complete(self, *args, **kwargs):
            events.append("durable-unavailable")
            return True

    job = {
        "jobId": "window-job-2",
        "runId": "open-meteo:climate:2026-06-05T00:00:00Z",
        "payload": {"sourceWindow": {"provider": "open-meteo", "signalType": "climate", "windowStart": "2026-06-05T00:00:00Z", "windowEnd": "2026-06-05T01:00:00Z", "runId": "open-meteo:climate:2026-06-05T00:00:00Z"}},
        "trace": {"traceId": "trace-window-2"},
    }

    result = await agronautas_jobs.handle_scheduled_window_job(job, FakeRedis(), FakeLogger(), FakeStore())

    assert result["status"] == "unavailable"
    assert events == ["claim", "heartbeat", "durable-unavailable"]
