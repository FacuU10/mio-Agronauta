from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest

os.environ.setdefault(
    "WORKER_CONTRACTS_ROOT",
    str(Path(__file__).resolve().parents[3] / "packages" / "contracts" / "schemas"),
)
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from worker.runtime.agronautas_jobs import compute_risk_snapshot, handle_agronautas_job


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
    assert result["fieldId"] == "field-1"
    assert result["snapshot"]["ruleVersion"] == "open-meteo-basic-v1"
    assert result["snapshot"]["evidenceRefs"] == ["signal_ingestion_runs:open-meteo:climate:run-1"]
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
