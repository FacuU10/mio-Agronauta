from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

import psycopg
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from redis.asyncio import Redis

from worker.core.config import get_settings


_settings = get_settings()
_schema_path = _settings.resolved_contracts_root / "agronautas-runtime-recompute-job.schema.json"
AGRONAUTAS_RECOMPUTE_VALIDATOR = Draft202012Validator(json.loads(Path(_schema_path).read_text(encoding="utf-8")))
OPEN_METEO_RULE_VERSION = "open-meteo-basic-v1"
OPEN_METEO_TIMEOUT_SECONDS = 10


async def handle_agronautas_job(job: dict[str, Any], redis: Redis, logger: Any) -> dict[str, Any]:
    payload = job["payload"]
    job_id = job["jobId"]
    run_id = job["runId"]
    try:
        AGRONAUTAS_RECOMPUTE_VALIDATOR.validate(payload)
    except ValidationError as error:
        result = {
            "accepted": False,
            "status": "stale_schema",
            "runId": run_id,
            "jobId": job_id,
            "error": error.message,
        }
        await redis.hset("agronautas:job-runs:result", job_id, json.dumps(result))
        return result

    field_id = payload["fieldId"]
    mode = payload["runtime"]["mode"]

    if not await claim_run_once(redis, run_id, job_id):
        result = {
            "accepted": False,
            "status": "skipped_duplicate",
            "fieldId": field_id,
            "mode": mode,
            "runId": run_id,
            "jobId": job_id,
        }
        await redis.hset("agronautas:job-runs:result", job_id, json.dumps(result))
        return result

    await redis.hset("agronautas:job-runs:status", job_id, json.dumps({"status": "running", "runId": run_id}))
    await redis.hset("agronautas:job-runs:heartbeat", job_id, payload["requestedAt"])

    try:
        field = await fetch_field_coordinates(_settings.postgres_dsn, field_id)
        if field is None:
            raise ValueError("missing_field_coordinates")

        weather = fetch_open_meteo_snapshot(field["lat"], field["lng"])
        snapshot = compute_risk_snapshot(
            field_id=field_id,
            run_id=run_id,
            observed_at=weather["observed_at"],
            rainfall_mm_7d=weather["rainfall_mm_7d"],
            temperature_max_c=weather["temperature_max_c"],
            temperature_min_c=weather["temperature_min_c"],
        )

        await persist_successful_snapshot(
            postgres_dsn=_settings.postgres_dsn,
            field_id=field_id,
            run_id=run_id,
            requested_at=payload["requestedAt"],
            weather=weather,
            snapshot=snapshot,
        )

        result = {
            "accepted": True,
            "status": "succeeded",
            "fieldId": field_id,
            "mode": mode,
            "runId": run_id,
            "jobId": job_id,
            "snapshot": snapshot,
        }
    except Exception as error:
        await persist_failed_ingestion(
            postgres_dsn=_settings.postgres_dsn,
            field_id=field_id,
            run_id=run_id,
            requested_at=payload["requestedAt"],
            error_message=str(error),
        )
        attempt = int(job.get("attempt") or payload.get("attempt") or 1)
        max_attempts = int(job.get("maxAttempts") or payload.get("maxAttempts") or 1)
        exhausted = attempt >= max_attempts
        result = {
            "accepted": False,
            "status": "dlq" if exhausted else "retryable_failure",
            "fieldId": field_id,
            "mode": mode,
            "runId": run_id,
            "jobId": job_id,
            "error": str(error),
        }
        if exhausted:
            await redis.hset("agronautas:job-runs:dlq", job_id, json.dumps(result))
        else:
            result["nextAttempt"] = attempt + 1

    await redis.hset("agronautas:job-runs:result", job_id, json.dumps(result))
    logger.info(
        "agronautas.job.completed",
        extra={
            "job_id": job_id,
            "run_id": run_id,
            "field_id": field_id,
            "mode": mode,
            "request_id": job["trace"]["traceId"],
        },
    )
    return result


async def claim_run_once(redis: Redis, run_id: str, job_id: str) -> bool:
    hset_result = await redis.hset("agronautas:job-runs:claims", run_id, job_id)
    return hset_result in (1, True, None)


async def fetch_field_coordinates(postgres_dsn: str, field_id: str) -> dict[str, float | str] | None:
    async with await psycopg.AsyncConnection.connect(postgres_dsn) as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "SELECT id, centroid_lat, centroid_lng FROM fields WHERE id = %s LIMIT 1",
                (field_id,),
            )
            row = await cursor.fetchone()

    if row is None or row[1] is None or row[2] is None:
        return None

    return {"field_id": row[0], "lat": float(row[1]), "lng": float(row[2])}


def fetch_open_meteo_snapshot(latitude: float, longitude: float) -> dict[str, Any]:
    params = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
            "timezone": "UTC",
            "forecast_days": 7,
        }
    )
    source_url = f"https://api.open-meteo.com/v1/forecast?{params}"

    try:
        with urlopen(source_url, timeout=OPEN_METEO_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError("open_meteo_unavailable") from exc

    daily = payload.get("daily") or {}
    rainfall = daily.get("precipitation_sum") or []
    max_temps = daily.get("temperature_2m_max") or []
    min_temps = daily.get("temperature_2m_min") or []
    times = daily.get("time") or []

    if not rainfall or not max_temps or not min_temps:
        raise ValueError("open_meteo_unusable_response")

    observed_at = f"{times[0]}T00:00:00Z" if times else datetime.now(UTC).isoformat().replace("+00:00", "Z")
    return {
        "observed_at": observed_at,
        "rainfall_mm_7d": round(sum(float(value) for value in rainfall), 2),
        "temperature_max_c": max(float(value) for value in max_temps),
        "temperature_min_c": min(float(value) for value in min_temps),
        "source_url": source_url,
        "raw": payload,
    }


def compute_risk_snapshot(
    *,
    field_id: str,
    run_id: str,
    observed_at: str,
    rainfall_mm_7d: float,
    temperature_max_c: float,
    temperature_min_c: float,
) -> dict[str, Any]:
    rainfall_score = min(60.0, rainfall_mm_7d)
    heat_penalty = 20.0 if temperature_max_c >= 35 else 10.0 if temperature_max_c >= 32 else 0.0
    cold_penalty = 10.0 if temperature_min_c <= 10 else 0.0
    score = round(min(100.0, rainfall_score + heat_penalty + cold_penalty), 2)
    level = "high" if score >= 70 else "medium" if score >= 40 else "low"
    computed_at = _parse_timestamp(observed_at)
    valid_until = computed_at + timedelta(hours=24)

    return {
        "snapshotId": f"{field_id}:{run_id}:risk",
        "fieldId": field_id,
        "runId": run_id,
        "score": score,
        "confidence": 0.74,
        "level": level,
        "freshness": "fresh",
        "computedAt": computed_at.isoformat().replace("+00:00", "Z"),
        "validUntil": valid_until.isoformat().replace("+00:00", "Z"),
        "ruleVersion": OPEN_METEO_RULE_VERSION,
        "staleCause": None,
        "degradationReasons": [],
        "drivers": [
            {"key": "rainfall_mm_7d", "label": "Rainfall 7d", "weight": 0.6, "value": rainfall_mm_7d},
            {"key": "temperature_max_c", "label": "Max temperature", "weight": 0.3, "value": temperature_max_c},
            {"key": "temperature_min_c", "label": "Min temperature", "weight": 0.1, "value": temperature_min_c},
        ],
        "evidenceRefs": [f"signal_ingestion_runs:open-meteo:climate:{run_id}"],
        "summaryPayload": {
            "provider": "open-meteo",
            "observedAt": observed_at,
            "rainfallMm7d": rainfall_mm_7d,
            "temperatureMaxC": temperature_max_c,
            "temperatureMinC": temperature_min_c,
        },
    }


async def persist_successful_snapshot(
    *,
    postgres_dsn: str,
    field_id: str,
    run_id: str,
    requested_at: str,
    weather: dict[str, Any],
    snapshot: dict[str, Any],
) -> None:
    async with await psycopg.AsyncConnection.connect(postgres_dsn) as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                INSERT INTO signal_ingestion_runs (
                    id, field_id, provider, signal_type, run_id, status,
                    stale_cause, started_at, finished_at, observed_at, evidence_payload, degradation_reason
                ) VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                ON CONFLICT (run_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    stale_cause = EXCLUDED.stale_cause,
                    finished_at = EXCLUDED.finished_at,
                    observed_at = EXCLUDED.observed_at,
                    evidence_payload = EXCLUDED.evidence_payload,
                    degradation_reason = EXCLUDED.degradation_reason
                """,
                (
                    field_id,
                    "open-meteo",
                    "climate",
                    run_id,
                    "succeeded",
                    None,
                    _parse_timestamp(requested_at),
                    datetime.now(UTC),
                    _parse_timestamp(weather["observed_at"]),
                    json.dumps({"sourceUrl": weather["source_url"], "weather": weather["raw"]}),
                    None,
                ),
            )
            await cursor.execute(
                """
                INSERT INTO risk_snapshots (
                    id, field_id, run_id, score, confidence, level, freshness,
                    computed_at, valid_until, rule_version, stale_cause,
                    degradation_reasons, drivers, evidence_refs, summary_payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb)
                ON CONFLICT (id) DO UPDATE SET
                    score = EXCLUDED.score,
                    confidence = EXCLUDED.confidence,
                    level = EXCLUDED.level,
                    freshness = EXCLUDED.freshness,
                    computed_at = EXCLUDED.computed_at,
                    valid_until = EXCLUDED.valid_until,
                    rule_version = EXCLUDED.rule_version,
                    stale_cause = EXCLUDED.stale_cause,
                    degradation_reasons = EXCLUDED.degradation_reasons,
                    drivers = EXCLUDED.drivers,
                    evidence_refs = EXCLUDED.evidence_refs,
                    summary_payload = EXCLUDED.summary_payload
                """,
                (
                    snapshot["snapshotId"],
                    field_id,
                    run_id,
                    snapshot["score"],
                    snapshot["confidence"],
                    snapshot["level"],
                    snapshot["freshness"],
                    _parse_timestamp(snapshot["computedAt"]),
                    _parse_timestamp(snapshot["validUntil"]),
                    snapshot["ruleVersion"],
                    snapshot["staleCause"],
                    json.dumps(snapshot["degradationReasons"]),
                    json.dumps(snapshot["drivers"]),
                    json.dumps(snapshot["evidenceRefs"]),
                    json.dumps(snapshot["summaryPayload"]),
                ),
            )
        await connection.commit()


async def persist_failed_ingestion(
    *,
    postgres_dsn: str,
    field_id: str,
    run_id: str,
    requested_at: str,
    error_message: str,
) -> None:
    async with await psycopg.AsyncConnection.connect(postgres_dsn) as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                INSERT INTO signal_ingestion_runs (
                    id, field_id, provider, signal_type, run_id, status,
                    stale_cause, started_at, finished_at, observed_at, evidence_payload, degradation_reason
                ) VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                ON CONFLICT (run_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    stale_cause = EXCLUDED.stale_cause,
                    finished_at = EXCLUDED.finished_at,
                    observed_at = EXCLUDED.observed_at,
                    evidence_payload = EXCLUDED.evidence_payload,
                    degradation_reason = EXCLUDED.degradation_reason
                """,
                (
                    field_id,
                    "open-meteo",
                    "climate",
                    run_id,
                    "failed",
                    error_message,
                    _parse_timestamp(requested_at),
                    datetime.now(UTC),
                    None,
                    json.dumps({"error": error_message}),
                    "weather_data_unavailable",
                ),
            )
        await connection.commit()


def _parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
