from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from redis.asyncio import Redis

from worker.core.config import get_settings


_settings = get_settings()
_schema_path = _settings.resolved_contracts_root / "agronautas-runtime-recompute-job.schema.json"
AGRONAUTAS_RECOMPUTE_VALIDATOR = Draft202012Validator(json.loads(Path(_schema_path).read_text(encoding="utf-8")))


async def handle_agronautas_job(job: dict[str, Any], redis: Redis, logger: Any) -> dict[str, Any]:
    payload = job["payload"]
    AGRONAUTAS_RECOMPUTE_VALIDATOR.validate(payload)

    job_id = job["jobId"]
    run_id = job["runId"]
    field_id = payload["fieldId"]
    mode = payload["runtime"]["mode"]

    await redis.hset("agronautas:job-runs:status", job_id, json.dumps({"status": "running", "runId": run_id}))
    await redis.hset("agronautas:job-runs:heartbeat", job_id, payload["requestedAt"])

    result = {
        "accepted": True,
        "fieldId": field_id,
        "mode": mode,
        "runId": run_id,
        "jobId": job_id,
    }

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
