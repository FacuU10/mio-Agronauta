from __future__ import annotations

import json

import pytest

from worker.runtime.completion_gate import classify_worker_completion, sanitize_worker_evidence


def test_worker_completion_blocks_missing_prerequisite_without_claiming_success() -> None:
    result = classify_worker_completion(
        {
            "environment": "local",
            "postgres": "blocked",
            "redis": "unavailable",
            "queue": "not_run",
            "lease": "not_run",
            "restart": "not_run",
            "cron": "not_run",
        }
    )

    assert result["status"] == "blocked"
    assert result["productionProven"] is False
    assert "ready" not in json.dumps(result).lower()


def test_worker_completion_preserves_queue_lease_restart_matrix_and_sanitizes_evidence() -> None:
    result = classify_worker_completion(
        {
            "environment": "local",
            "postgres": "pass",
            "redis": "pass",
            "queue": "pass",
            "lease": "pass",
            "restart": "degraded",
            "cron": "not_run",
            "acknowledgement": "not_run",
            "requestId": "request-1",
            "reason": "restart evidence is unavailable",
        }
    )

    assert result["status"] == "degraded"
    assert result["checks"] == {"postgres": "pass", "redis": "pass", "queue": "pass", "lease": "pass", "restart": "degraded", "cron": "not_run", "acknowledgement": "not_run"}
    assert result["productionProven"] is False


@pytest.mark.parametrize("value", ["Bearer secret", "postgresql://user:password@db.example/test", "Traceback (most recent call last)"])
def test_worker_evidence_rejects_secrets_and_raw_trace_material(value: str) -> None:
    with pytest.raises(ValueError, match="redacted"):
        sanitize_worker_evidence({"reason": value})


def test_worker_completion_blocks_acknowledgement_before_durable_terminal_outcome() -> None:
    result = classify_worker_completion(
        {
            "environment": "local",
            "postgres": "pass",
            "redis": "pass",
            "queue": "pass",
            "lease": "pass",
            "restart": "pass",
            "cron": "pass",
            "acknowledgement": "blocked",
        }
    )

    assert result["status"] == "blocked"
    assert result["checks"]["acknowledgement"] == "blocked"
    assert result["productionProven"] is False


def test_worker_completion_does_not_promote_when_acknowledgement_has_not_observed_terminal_persistence() -> None:
    result = classify_worker_completion(
        {
            "environment": "local",
            "postgres": "pass",
            "redis": "pass",
            "queue": "pass",
            "lease": "pass",
            "restart": "pass",
            "cron": "pass",
            "acknowledgement": "not_run",
        }
    )

    assert result["status"] == "not_run"
    assert result["productionProven"] is False
