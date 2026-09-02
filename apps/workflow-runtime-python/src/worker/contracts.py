from __future__ import annotations

import json
import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any, Literal

from jsonschema import Draft202012Validator
from referencing import Registry, Resource


SCHEMA_DIRECTORY = Path("packages/contracts/schemas")
PACKAGED_SCHEMA_DIRECTORY = Path(__file__).resolve().parent / "schema"

BoundaryStatus = Literal["live", "degraded", "failed", "blocked", "not_run"]

_BOUNDARY_NAMES = ("provider", "auth", "tenant", "lead", "ingest")
_STATUS_PRIORITY: tuple[BoundaryStatus, ...] = ("failed", "blocked", "degraded", "not_run", "live")
_SAFE_IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$")
_SECRET_TEXT = re.compile(
    r"(?:bearer\s+\S+|\b(?:api[-_ ]?key|password|secret|token|credential)\b|"
    r"(?:postgres(?:ql)?|redis)://\S+|https?://[^\s/@:]+:[^\s/@]+@|"
    r"https?://\S*[?&](?:api[-_ ]?key|password|secret|token)=\S+)",
    re.IGNORECASE,
)
_STACK_TRACE_TEXT = re.compile(r"(?:traceback \(most recent call last\)|^\s*file \".*\", line \d+)", re.IGNORECASE | re.MULTILINE)
_SENSITIVE_KEY_PARTS = (
    "token",
    "secret",
    "password",
    "credential",
    "stacktrace",
    "rawchat",
    "raw_payload",
    "database",
    "connection",
    "dsn",
)
_SAFE_METADATA_FIELDS = (
    "environment",
    "endpoint",
    "requestId",
    "revisionId",
    "proofRunId",
    "runId",
    "jobId",
    "timeoutMs",
    "correlationStatus",
    "providerStatus",
)


def classify_runtime_boundary(evidence: Mapping[str, Any]) -> dict[str, Any]:
    """Build a small, redacted boundary receipt from classified outcomes.

    Unknown fields are intentionally ignored, while fields that clearly carry
    credentials or raw diagnostic material fail closed instead of being copied
    into an evidence artifact.
    """
    for key in evidence:
        normalized_key = str(key).replace("-", "_").lower()
        if any(part in normalized_key for part in _SENSITIVE_KEY_PARTS):
            raise ValueError("runtime boundary evidence must be redacted")

    statuses: list[BoundaryStatus] = []
    receipt: dict[str, Any] = {}
    for boundary in _BOUNDARY_NAMES:
        value = evidence.get(boundary)
        if value is None:
            continue
        if value not in _STATUS_PRIORITY:
            raise ValueError(f"unsupported runtime boundary status for {boundary}")
        status = value
        statuses.append(status)
        receipt[boundary] = status

    receipt["status"] = next((status for status in _STATUS_PRIORITY if status in statuses), "blocked")

    for field in _SAFE_METADATA_FIELDS:
        value = evidence.get(field)
        if value is None:
            continue
        if field == "timeoutMs":
            if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
                raise ValueError("runtime boundary timeout must be a positive integer")
            receipt[field] = value
            continue
        receipt[field] = _safe_receipt_text(value, field)

    reason = evidence.get("reason")
    if reason is not None:
        receipt["reason"] = _safe_receipt_text(reason, "reason")

    return {"status": receipt.pop("status"), **receipt}


def _safe_receipt_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 512:
        raise ValueError(f"runtime boundary {field} must be redacted")
    normalized = value.strip()
    if _SECRET_TEXT.search(normalized) or _STACK_TRACE_TEXT.search(normalized) or "\n" in normalized or "\r" in normalized:
        raise ValueError("runtime boundary evidence must be redacted")
    if field != "reason" and not _SAFE_IDENTIFIER.fullmatch(normalized):
        raise ValueError(f"runtime boundary {field} must be a safe identifier")
    return normalized


def resolve_contracts_root(configured: Path | str = SCHEMA_DIRECTORY) -> Path:
    configured_path = Path(configured)
    if configured_path.is_absolute():
        candidates: list[Path] = [configured_path]
    else:
        candidates = [Path.cwd() / configured_path]

    source_path = Path(__file__).resolve()
    for parent in source_path.parents:
        candidates.append(parent / configured_path)
        candidates.append(parent / SCHEMA_DIRECTORY)
    candidates.append(PACKAGED_SCHEMA_DIRECTORY)

    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if resolved.is_dir() and any(resolved.glob("*.schema.json")):
            return resolved

    searched = ", ".join(str(path.resolve()) for path in candidates)
    raise FileNotFoundError(
        "Workflow contract schemas were not found. Set WORKER_CONTRACTS_ROOT to a "
        f"directory containing *.schema.json files. Searched: {searched}"
    )


def load_contract_schema(schema_name: str, contracts_root: Path | str) -> dict[str, Any]:
    schema_path = resolve_contracts_root(contracts_root) / schema_name
    if not schema_path.is_file():
        raise FileNotFoundError(f"Workflow contract schema was not found: {schema_path}")
    return json.loads(schema_path.read_text(encoding="utf-8"))


def build_contract_validator(schema_name: str, contracts_root: Path | str) -> Draft202012Validator:
    root = resolve_contracts_root(contracts_root)
    schema_path = root / schema_name
    if not schema_path.is_file():
        raise FileNotFoundError(f"Workflow contract schema was not found: {schema_path}")
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    registry = Registry()

    for referenced_path in root.glob("*.schema.json"):
        referenced_schema = json.loads(referenced_path.read_text(encoding="utf-8"))
        resource = Resource.from_contents(referenced_schema)
        references = {referenced_path.name, referenced_path.as_uri()}
        schema_id = referenced_schema.get("$id")
        if isinstance(schema_id, str):
            references.add(schema_id)
            references.add(f"{schema_id.rsplit('/', 1)[0]}/{referenced_path.name}")
        for reference in references:
            registry = registry.with_resource(reference, resource)

    return Draft202012Validator(schema, registry=registry)
