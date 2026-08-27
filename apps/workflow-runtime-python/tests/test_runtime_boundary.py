from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from worker.contracts import PACKAGED_SCHEMA_DIRECTORY, build_contract_validator, resolve_contracts_root


ROOT = Path(__file__).resolve().parents[3]
CONTRACTS_ROOT = ROOT / "packages" / "contracts" / "schemas"
FIXTURE_PATH = ROOT / "packages" / "contracts" / "fixtures" / "agronautas" / "runtime-contract.v2.json"


def test_contract_validator_resolves_relative_refs_from_installed_contract_root() -> None:
    validator = build_contract_validator("workflow-job.schema.json", CONTRACTS_ROOT)

    validator.validate(
        {
            "contractVersion": "1.0.0",
            "jobId": "job-ref-resolution",
            "workflowId": "demo-workflow",
            "runId": "run-ref-resolution",
            "kind": "transform",
            "status": "pending",
            "priority": 50,
            "createdAt": "2026-06-05T00:00:00Z",
            "trace": {"traceId": "1234567890abcdef", "correlationId": "abcdefgh"},
            "payload": {
                "assetId": "asset-1",
                "inputUri": "https://example.com/input.json",
                "assetMetadata": {
                    "contractVersion": "1.0.0",
                    "assetId": "asset-1",
                    "mimeType": "application/json",
                    "sourceUri": "https://example.com/input.json",
                    "checksum": {"algorithm": "sha256", "value": "a" * 16},
                    "sizeBytes": 12,
                    "capturedAt": "2026-06-05T00:00:00Z",
                    "ownership": {"tenantId": "tenant-1", "workspaceId": "workspace-1"},
                },
            },
            "lease": {"attempt": 1, "maxAttempts": 3},
        }
    )


def test_contract_root_is_discovered_from_worker_source_checkout() -> None:
    assert resolve_contracts_root(Path("packages/contracts/schemas")) == CONTRACTS_ROOT


def test_packaged_contract_root_resolves_external_refs_without_repo_cwd() -> None:
    validator = build_contract_validator("workflow-job.schema.json", PACKAGED_SCHEMA_DIRECTORY)

    validator.validate(
        {
            "contractVersion": "1.0.0",
            "jobId": "job-packaged-ref-resolution",
            "workflowId": "demo-workflow",
            "runId": "run-packaged-ref-resolution",
            "kind": "transform",
            "status": "pending",
            "priority": 50,
            "createdAt": "2026-06-05T00:00:00Z",
            "trace": {"traceId": "1234567890abcdef", "correlationId": "abcdefgh"},
            "payload": {
                "assetId": "asset-1",
                "inputUri": "https://example.com/input.json",
                "assetMetadata": {
                    "contractVersion": "1.0.0",
                    "assetId": "asset-1",
                    "mimeType": "application/json",
                    "sourceUri": "https://example.com/input.json",
                    "checksum": {"algorithm": "sha256", "value": "a" * 16},
                    "sizeBytes": 12,
                    "capturedAt": "2026-06-05T00:00:00Z",
                    "ownership": {"tenantId": "tenant-1", "workspaceId": "workspace-1"},
                },
            },
            "lease": {"attempt": 1, "maxAttempts": 3},
        }
    )


def test_python_consumes_the_same_v2_fixture_and_schema_as_the_typescript_contract_suite() -> None:
    schema = json.loads((CONTRACTS_ROOT / "agronautas-runtime.v2.schema.json").read_text(encoding="utf-8"))
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    validators = {
        name: Draft202012Validator({**schema, "$ref": f"#/$defs/{name}"}, format_checker=FormatChecker())
        for name in {case["contract"] for case in fixture["cases"]}
    }

    for case in fixture["cases"]:
        errors = list(validators[case["contract"]].iter_errors(case["payload"]))
        assert (not errors) is case["valid"], case["name"]

    assert fixture["cases"][0]["payload"]["contractVersion"] == "2.0.0"
    assert fixture["cases"][0]["payload"]["result"]["engine"]["selectionStatus"] == "undecided"
