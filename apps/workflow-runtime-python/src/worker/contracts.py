from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from referencing import Registry, Resource


SCHEMA_DIRECTORY = Path("packages/contracts/schemas")
PACKAGED_SCHEMA_DIRECTORY = Path(__file__).resolve().parent / "schema"


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
