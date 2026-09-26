from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any, Literal

WorkerStatus = Literal["pass", "blocked", "unavailable", "degraded", "not_run"]
_CHECKS = ("postgres", "redis", "queue", "lease", "restart", "cron", "acknowledgement")
_PRIORITY: tuple[WorkerStatus, ...] = ("blocked", "unavailable", "degraded", "not_run", "pass")
_SECRET = re.compile(r"bearer\s+\S+|password|secret|token|postgres(?:ql)?://|traceback", re.IGNORECASE)


def classify_worker_completion(evidence: Mapping[str, Any]) -> dict[str, Any]:
    checks: dict[str, WorkerStatus] = {}
    for name in _CHECKS:
        value = evidence.get(name, "not_run")
        if value not in _PRIORITY:
            raise ValueError(f"unsupported worker completion status for {name}")
        checks[name] = value

    status = next((candidate for candidate in _PRIORITY if candidate in checks.values()), "blocked")
    result: dict[str, Any] = {
        "verifier": "agronautas-worker-completion-matrix-v1",
        "environment": _safe_text(evidence.get("environment", "local"), "environment"),
        "status": status,
        "productionProven": False,
        "checks": checks,
    }
    if "requestId" in evidence:
        result["requestId"] = _safe_text(evidence["requestId"], "requestId")
    if "reason" in evidence:
        result["reason"] = _safe_text(evidence["reason"], "reason")
    return result


def sanitize_worker_evidence(evidence: Mapping[str, Any]) -> dict[str, str]:
    return {str(key): _safe_text(value, str(key)) for key, value in evidence.items()}


def _safe_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 512:
        raise ValueError(f"worker evidence {field} must be redacted")
    normalized = value.strip()
    if _SECRET.search(normalized) or "\n" in normalized or "\r" in normalized:
        raise ValueError("worker evidence must be redacted")
    return normalized
