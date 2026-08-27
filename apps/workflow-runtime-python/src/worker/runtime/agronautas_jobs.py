from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

import psycopg
from jsonschema.exceptions import ValidationError
from redis.asyncio import Redis

from worker.contracts import build_contract_validator
from worker.core.config import get_settings


_settings = get_settings()
_contracts_root = _settings.resolved_contracts_root
AGRONAUTAS_RECOMPUTE_VALIDATOR = build_contract_validator(
    "agronautas-runtime-recompute-job.schema.json", _contracts_root
)
SCHEDULED_WINDOW_VALIDATOR = build_contract_validator(
    "agronautas-scheduled-window-job.schema.json", _contracts_root
)
OPEN_METEO_RULE_VERSION = "open-meteo-basic-v1"
OPEN_METEO_TIMEOUT_SECONDS = 10
DEFAULT_LEASE_SECONDS = 300


class DurableOutcomeError(RuntimeError):
    """A durable outcome could not be recorded; the transport must not be ACKed."""


class PostgresAgronautasJobStore:
    """Small async adapter for durable Agronautas job transitions."""

    def __init__(self, postgres_dsn: str | None, worker_id: str, lease_seconds: int = DEFAULT_LEASE_SECONDS) -> None:
        self.postgres_dsn = postgres_dsn
        self.worker_id = worker_id
        self.lease_seconds = lease_seconds

    def _require_dsn(self) -> str:
        if not self.postgres_dsn:
            raise RuntimeError("Agronautas durable job store requires WORKER_POSTGRES_DSN")
        return self.postgres_dsn

    async def claim(self, job_id: str, now: datetime) -> bool:
        lease_expires_at = now + timedelta(seconds=self.lease_seconds)
        async with await psycopg.AsyncConnection.connect(self._require_dsn()) as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(
                    """
                    UPDATE agronautas_job_runs
                       SET status = 'leased', lease_owner = %s, lease_expires_at = %s,
                           "heartbeatAt" = %s, "startedAt" = COALESCE("startedAt", %s)
                     WHERE "jobId" = %s
                       AND (status IN ('queued', 'waiting')
                             OR (status IN ('leased', 'running') AND lease_expires_at < %s))
                     RETURNING "jobId"
                    """,
                    (self.worker_id, lease_expires_at, now, now, job_id, now),
                )
                claimed = await cursor.fetchone() is not None
            await connection.commit()
        return claimed

    async def heartbeat(self, job_id: str, run_id: str, heartbeat_at: datetime) -> bool:
        async with await psycopg.AsyncConnection.connect(self._require_dsn()) as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(
                    """
                    UPDATE agronautas_job_runs
                       SET status = 'running', "heartbeatAt" = %s,
                           lease_expires_at = %s + (%s * INTERVAL '1 second')
                     WHERE "jobId" = %s AND "runId" = %s AND lease_owner = %s
                       AND status IN ('leased', 'running')
                       AND (lease_expires_at IS NULL OR lease_expires_at >= %s)
                    """,
                    (heartbeat_at, heartbeat_at, self.lease_seconds, job_id, run_id, self.worker_id, heartbeat_at),
                )
                rowcount = getattr(cursor, "rowcount", None)
            await connection.commit()
        return rowcount is None or rowcount > 0

    async def complete(self, job_id: str, run_id: str, completed_at: datetime, result: dict[str, Any]) -> bool:
        return await self._transition(
            """
            UPDATE agronautas_job_runs
               SET status = 'succeeded', "completedAt" = %s, "resultPayload" = %s::jsonb,
                   lease_owner = NULL, lease_expires_at = NULL
             WHERE "jobId" = %s AND "runId" = %s AND lease_owner = %s
               AND status IN ('leased', 'running')
            """,
            (completed_at, json.dumps(result), job_id, run_id, self.worker_id),
        )

    async def schedule_retry(self, job_id: str, run_id: str, next_retry_at: datetime, error_code: str, error_message: str) -> bool:
        return await self._transition(
            """
            UPDATE agronautas_job_runs
               SET status = 'waiting', attempt = attempt + 1, retry_at = %s,
                   "errorCode" = %s, "errorMessage" = %s, lease_owner = NULL, lease_expires_at = NULL
               WHERE "jobId" = %s AND "runId" = %s AND lease_owner = %s
                AND status IN ('leased', 'running') AND attempt < max_attempts
            """,
            (next_retry_at, error_code, error_message, job_id, run_id, self.worker_id),
        )

    async def dead_letter(self, job_id: str, run_id: str, failed_at: datetime, error_code: str, error_message: str) -> bool:
        return await self._transition(
            """
            UPDATE agronautas_job_runs
               SET status = 'dlq', "completedAt" = %s, dead_lettered_at = %s,
                   dlq_reason = %s, terminal_error_code = %s, terminal_error_message = %s,
                   "errorCode" = %s, "errorMessage" = %s, lease_owner = NULL, lease_expires_at = NULL
             WHERE "jobId" = %s AND "runId" = %s AND lease_owner = %s
               AND status NOT IN ('completed', 'succeeded', 'dlq')
            """,
            (failed_at, failed_at, error_message, error_code, error_message, error_code, error_message, job_id, run_id, self.worker_id),
        )

    async def _transition(self, sql: str, params: tuple[Any, ...]) -> bool:
        async with await psycopg.AsyncConnection.connect(self._require_dsn()) as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(sql, params)
                rowcount = getattr(cursor, "rowcount", None)
            await connection.commit()
        return rowcount is None or rowcount > 0


class RuntimeOutcomeCoordinator:
    """Owns the single durable outcome transition before Redis can be ACKed."""

    def __init__(self, job_store: PostgresAgronautasJobStore | None, redis: Redis | None = None) -> None:
        self.job_store = job_store
        self.redis = redis

    async def claim(self, job: dict[str, Any]) -> bool:
        if self.job_store is None:
            return True
        try:
            claimed = await self.job_store.claim(str(job["jobId"]), datetime.now(UTC))
            if claimed:
                heartbeat_ok = await self.heartbeat(job)
                if heartbeat_ok is False:
                    raise DurableOutcomeError("durable heartbeat ownership was lost")
            return claimed
        except Exception as error:
            raise DurableOutcomeError("failed to claim durable job") from error

    async def heartbeat(self, job: dict[str, Any]) -> None:
        if self.job_store is not None:
            heartbeat_ok = await self.job_store.heartbeat(str(job["jobId"]), str(job["runId"]), datetime.now(UTC))
            if heartbeat_ok is False:
                raise DurableOutcomeError("durable heartbeat ownership was lost")

    async def persist_outcome_before_ack(self, job: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
        if self.job_store is None:
            if result.get("status") == "dlq" and self.redis is not None:
                await self.redis.hset("agronautas:job-runs:dlq", str(job["jobId"]), json.dumps(result))
            return result

        job_id = str(job["jobId"])
        run_id = str(job["runId"])
        attempt = _job_attempt(job)
        max_attempts = _job_max_attempts(job)
        status = result.get("status")
        persisted = True

        if status == "retryable_failure" and attempt < max_attempts:
            retry_at = datetime.now(UTC) + timedelta(seconds=2**attempt)
            persisted = await self.job_store.schedule_retry(job_id, run_id, retry_at, "provider_retryable", str(result.get("error", status)))
            result["nextAttempt"] = attempt + 1
        elif status == "retryable_failure":
            result["status"] = "dlq"
            persisted = await self.job_store.dead_letter(job_id, run_id, datetime.now(UTC), "provider_exhausted", str(result.get("error", status)))
        elif status in {"dlq", "stale_schema", "failed"}:
            persisted = await self.job_store.dead_letter(job_id, run_id, datetime.now(UTC), "non_retryable_failure", str(result.get("error", status)))
        elif status in {"succeeded", "unavailable"}:
            persisted = await self.job_store.complete(job_id, run_id, datetime.now(UTC), result)
        else:
            result["status"] = "dlq"
            persisted = await self.job_store.dead_letter(job_id, run_id, datetime.now(UTC), "non_retryable_failure", "missing or unknown outcome status")

        if persisted is False:
            raise DurableOutcomeError("durable outcome transition was not owned by this worker")
        return result


def _job_attempt(job: dict[str, Any]) -> int:
    lease = job.get("lease") or {}
    value = job.get("attempt") or lease.get("attempt") or (job.get("payload") or {}).get("attempt") or 1
    return int(value)


def _job_max_attempts(job: dict[str, Any]) -> int:
    lease = job.get("lease") or {}
    value = job.get("maxAttempts") or lease.get("maxAttempts") or (job.get("payload") or {}).get("maxAttempts") or 1
    return int(value)


async def handle_agronautas_job(
    job: dict[str, Any],
    redis: Redis,
    logger: Any,
    job_store: PostgresAgronautasJobStore | None = None,
    worker_id: str | None = None,
    outcome_coordinator: RuntimeOutcomeCoordinator | None = None,
) -> dict[str, Any]:
    coordinator = outcome_coordinator or RuntimeOutcomeCoordinator(job_store, redis)
    payload = job["payload"]
    job_id = job["jobId"]
    run_id = job["runId"]
    if job_store is not None:
        claimed = await coordinator.claim(job)
        if not claimed:
            result = {
                "accepted": False,
                "status": "skipped_duplicate",
                "runId": run_id,
                "jobId": job_id,
            }
            await redis.hset("agronautas:job-runs:result", job_id, json.dumps(result))
            return result
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
        await coordinator.persist_outcome_before_ack(job, result)
        await redis.hset("agronautas:job-runs:result", job_id, json.dumps(result))
        return result

    field_id = payload["fieldId"]
    mode = payload["runtime"]["mode"]

    claimed = await claim_run_once(redis, run_id, job_id) if job_store is None else True
    if not claimed:
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
    heartbeat_at = datetime.now(UTC)
    await redis.hset("agronautas:job-runs:heartbeat", job_id, heartbeat_at.isoformat().replace("+00:00", "Z"))

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
            source_run_id=str(weather.get("source_run_id") or run_id),
            acquired_at=str(weather.get("acquired_at") or payload["requestedAt"]),
        )

        await persist_successful_snapshot(
            postgres_dsn=_settings.postgres_dsn,
            field_id=field_id,
            run_id=run_id,
            requested_at=payload["requestedAt"],
            weather=weather,
            snapshot=snapshot,
        )

        lineage = {
            "sourceRunIds": [run_id],
            "providerRunIds": [str(weather.get("source_run_id") or run_id)],
            "retrievedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "observedAt": str(weather["observed_at"]),
            "forecastAt": None,
            "providerMode": "live" if mode == "real" else "mock",
            "units": {"rainfall": "mm", "temperature": "celsius"},
            "httpStatus": 200,
            "schemaStatus": "valid",
            "lastSuccessfulObservedAt": str(weather["observed_at"]),
        }
        result = {
            "accepted": True,
            "status": "succeeded",
            "fieldId": field_id,
            "mode": mode,
            "runId": run_id,
            "jobId": job_id,
            "snapshot": snapshot,
            "engine": {
                "id": snapshot["engineId"],
                "version": snapshot["engineVersion"],
                "selectionStatus": snapshot["selectionStatus"],
                "calibrationStatus": snapshot["calibrationStatus"],
            },
            "lineage": {
                "sourceRunIds": [run_id],
                "providerRunIds": [str(weather.get("source_run_id") or run_id)],
                "acquisitionTimes": [str(weather.get("acquired_at") or payload["requestedAt"])],
                "freshness": snapshot["freshness"],
                "degradationReasons": snapshot["degradationReasons"],
                "engineId": snapshot["engineId"],
                "engineVersion": snapshot["engineVersion"],
                "riskSnapshotId": snapshot["snapshotId"],
                "alertSnapshotIds": [],
            },
            "result": {
                "status": "available",
                "freshness": snapshot["freshness"],
                "confidence": snapshot["confidence"],
                "uncertainty": "not_calibrated",
                "degradationReasons": snapshot["degradationReasons"],
                "lineage": lineage,
                "engine": {
                    "id": snapshot["engineId"],
                    "version": snapshot["engineVersion"],
                    "selectionStatus": snapshot["selectionStatus"],
                    "calibrationStatus": snapshot["calibrationStatus"],
                },
                "risk": {"score": snapshot["score"], "level": snapshot["level"], "drivers": snapshot["drivers"]},
            },
        }
        await coordinator.persist_outcome_before_ack(job, result)
    except DurableOutcomeError:
        raise
    except Exception as error:  # noqa: BLE001 - preserve the recoverable processing payload on DB failures
        try:
            await persist_failed_ingestion(
                postgres_dsn=_settings.postgres_dsn,
                field_id=field_id,
                run_id=run_id,
                requested_at=payload["requestedAt"],
                error_message=str(error),
            )
        except Exception as persistence_error:
            if job_store is not None:
                raise DurableOutcomeError("failed to persist failed ingestion") from persistence_error
            raise
        lease = job.get("lease") or {}
        attempt = int(job.get("attempt") or lease.get("attempt") or payload.get("attempt") or 1)
        max_attempts = int(job.get("maxAttempts") or lease.get("maxAttempts") or payload.get("maxAttempts") or 1)
        retryable = isinstance(error, (RuntimeError, TimeoutError, ConnectionError))
        exhausted = not retryable or attempt >= max_attempts
        result = {
            "accepted": False,
            "status": "dlq" if exhausted else "retryable_failure",
            "fieldId": field_id,
            "mode": mode,
            "runId": run_id,
            "jobId": job_id,
            "error": str(error),
        }
        if not exhausted:
            result["nextAttempt"] = attempt + 1
        await coordinator.persist_outcome_before_ack(job, result)

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


async def handle_scheduled_window_job(
    job: dict[str, Any],
    redis: Redis,
    logger: Any,
    job_store: PostgresAgronautasJobStore | None = None,
    worker_id: str | None = None,
    outcome_coordinator: RuntimeOutcomeCoordinator | None = None,
) -> dict[str, Any]:
    """Validate a scheduled source window without pretending a provider ran.

    Provider execution belongs to the next phase. Until an explicit processor is
    wired, the queue records an unavailable terminal outcome rather than a false
    success or a fabricated observation.
    """

    payload = job.get("payload")
    if not isinstance(payload, dict):
        raise ValueError("scheduled_window_payload_missing")
    SCHEDULED_WINDOW_VALIDATOR.validate(payload)
    source_window = payload["sourceWindow"]
    if source_window["runId"] != job["runId"]:
        raise ValueError("scheduled_window_run_id_mismatch")
    start = _parse_timestamp(source_window["windowStart"])
    end = _parse_timestamp(source_window["windowEnd"])
    if end <= start:
        raise ValueError("scheduled_window_end_must_follow_start")

    coordinator = outcome_coordinator or RuntimeOutcomeCoordinator(job_store, redis)
    if job_store is not None:
        claimed = await coordinator.claim(job)
        if not claimed:
            result = {
                "accepted": False,
                "status": "skipped_duplicate",
                "runId": job["runId"],
                "jobId": job["jobId"],
            }
            await redis.hset("bull:agronautas-runtime:results", job["jobId"], json.dumps(result))
            return result

    lineage = {
        "sourceRunIds": [job["runId"]],
        "providerRunIds": [f"{source_window['provider']}:{job['runId']}"],
        "retrievedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "observedAt": None,
        "forecastAt": None,
        "providerMode": "unavailable",
        "units": {"status": "not_available"},
        "httpStatus": None,
        "schemaStatus": "unavailable",
        "lastSuccessfulObservedAt": None,
    }
    result = {
        "accepted": False,
        "status": "unavailable",
        "reason": "scheduled_window_processor_not_configured",
        "runId": job["runId"],
        "jobId": job["jobId"],
        "freshness": "missing",
        "uncertainty": "not_calibrated",
        "degradationReasons": ["processor_not_configured"],
        "lineage": lineage,
        "result": {"status": "unavailable", "freshness": "missing", "uncertainty": "not_calibrated", "degradationReasons": ["processor_not_configured"], "lineage": lineage},
    }
    await coordinator.persist_outcome_before_ack(job, result)
    await redis.hset("bull:agronautas-runtime:results", job["jobId"], json.dumps(result))
    logger.info(
        "agronautas.scheduled-window.unavailable",
        extra={"job_id": job["jobId"], "run_id": job["runId"], "reason": result["reason"]},
    )
    return result


async def claim_run_once(redis: Redis, run_id: str, job_id: str) -> bool:
    hset_result = await redis.hset("agronautas:job-runs:claims", run_id, job_id)
    return hset_result in (1, True, None)


async def fetch_field_coordinates(postgres_dsn: str, field_id: str) -> dict[str, float | str] | None:
    async with await psycopg.AsyncConnection.connect(postgres_dsn) as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                'SELECT id, "centroidLat", "centroidLng" FROM fields WHERE id = %s LIMIT 1',
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
    acquired_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    return {
        "observed_at": observed_at,
        "acquired_at": acquired_at,
        "source_run_id": f"open-meteo:{observed_at}",
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
    source_run_id: str | None = None,
    acquired_at: str | None = None,
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
        "engineId": OPEN_METEO_RULE_VERSION,
        "engineVersion": OPEN_METEO_RULE_VERSION,
        "selectionStatus": "undecided",
        "calibrationStatus": "not_established",
        "staleCause": None,
        "degradationReasons": [],
        "drivers": [
            {"key": "rainfall_mm_7d", "label": "Rainfall 7d", "weight": 0.6, "value": rainfall_mm_7d},
            {"key": "temperature_max_c", "label": "Max temperature", "weight": 0.3, "value": temperature_max_c},
            {"key": "temperature_min_c", "label": "Min temperature", "weight": 0.1, "value": temperature_min_c},
        ],
        "evidenceRefs": [f"signal_ingestion_runs:open-meteo:climate:{run_id}"],
        "sourceRunIds": [run_id],
        "providerRunIds": [source_run_id or run_id],
        "acquisitionTimes": [acquired_at or observed_at],
        "summaryPayload": {
            "provider": "open-meteo",
            "observedAt": observed_at,
            "sourceRunId": source_run_id or run_id,
            "acquiredAt": acquired_at or observed_at,
                         "engineId": OPEN_METEO_RULE_VERSION,
                         "engineVersion": OPEN_METEO_RULE_VERSION,
                         "selectionStatus": "undecided",
                         "calibrationStatus": "not_established",
            "sourceRunIds": [run_id],
            "acquisitionTimes": [acquired_at or observed_at],
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
                    stale_cause, started_at, finished_at, observed_at, evidence_payload, degradation_reason,
                    "fieldId", "signalType", "runId", "staleCause", "startedAt", "finishedAt", "observedAt", "evidencePayload", "degradationReason"
                ) VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s,
                          %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                ON CONFLICT (run_id) DO NOTHING
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
                    json.dumps({
                        "sourceUrl": weather["source_url"],
                        "weather": weather["raw"],
                        "sourceRunId": weather.get("source_run_id") or run_id,
                        "acquiredAt": weather.get("acquired_at") or requested_at,
                        "freshness": snapshot["freshness"],
                        "degradationReasons": snapshot["degradationReasons"],
                    }),
                    None,
                    field_id,
                    "climate",
                    run_id,
                    None,
                    _parse_timestamp(requested_at),
                    datetime.now(UTC),
                    _parse_timestamp(weather["observed_at"]),
                    json.dumps({
                        "sourceUrl": weather["source_url"],
                        "weather": weather["raw"],
                        "sourceRunId": weather.get("source_run_id") or run_id,
                        "acquiredAt": weather.get("acquired_at") or requested_at,
                        "freshness": snapshot["freshness"],
                        "degradationReasons": snapshot["degradationReasons"],
                    }),
                    None,
                ),
            )
            await cursor.execute(
                """
                INSERT INTO risk_snapshots (
                    id, field_id, run_id, score, confidence, level, freshness,
                    computed_at, valid_until, rule_version, stale_cause,
                    degradation_reasons, drivers, evidence_refs, summary_payload,
                    "fieldId", "runId", "computedAt", "validUntil", "ruleVersion", "staleCause",
                    "degradationReasons", "evidenceRefs", "summaryPayload"
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb,
                          %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb)
                ON CONFLICT (id) DO NOTHING
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
                    field_id,
                    run_id,
                    _parse_timestamp(snapshot["computedAt"]),
                    _parse_timestamp(snapshot["validUntil"]),
                    snapshot["ruleVersion"],
                    snapshot["staleCause"],
                    json.dumps(snapshot["degradationReasons"]),
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
                    stale_cause, started_at, finished_at, observed_at, evidence_payload, degradation_reason,
                    "fieldId", "signalType", "runId", "staleCause", "startedAt", "finishedAt", "observedAt", "evidencePayload", "degradationReason"
                ) VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s,
                          %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                ON CONFLICT (run_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    stale_cause = EXCLUDED.stale_cause,
                    finished_at = EXCLUDED.finished_at,
                    observed_at = EXCLUDED.observed_at,
                    evidence_payload = EXCLUDED.evidence_payload,
                    degradation_reason = EXCLUDED.degradation_reason,
                    "fieldId" = EXCLUDED."fieldId",
                    "signalType" = EXCLUDED."signalType",
                    "runId" = EXCLUDED."runId",
                    "staleCause" = EXCLUDED."staleCause",
                    "startedAt" = EXCLUDED."startedAt",
                    "finishedAt" = EXCLUDED."finishedAt",
                    "observedAt" = EXCLUDED."observedAt",
                    "evidencePayload" = EXCLUDED."evidencePayload",
                    "degradationReason" = EXCLUDED."degradationReason"
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
                    field_id,
                    "climate",
                    run_id,
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
