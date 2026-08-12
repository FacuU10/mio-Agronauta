"""Workflow runtime entrypoint backed by shared JSON Schemas.

The module is intentionally dependency-light at import time so the scaffold can
run even before LangGraph is installed. Once installed, the same entrypoint can
be upgraded into a real graph executor without changing its contract-loading
behavior.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from jsonschema import Draft202012Validator
from worker.contracts import build_contract_validator, load_contract_schema as read_contract_schema
from worker.core.config import get_settings
from worker.core.platform import run_worker
from worker.queue.consumer import WorkflowQueueConsumer

try:
    from langgraph.graph import END, StateGraph
except Exception:  # pragma: no cover - graceful scaffold fallback
    END = "__end__"
    StateGraph = None


SCHEMAS_DIR = get_settings().resolved_contracts_root


def load_contract_schema(schema_name: str) -> dict[str, Any]:
    return read_contract_schema(schema_name, SCHEMAS_DIR)


WORKFLOW_JOB_SCHEMA = load_contract_schema("workflow-job.schema.json")
WORKFLOW_STATE_SCHEMA = load_contract_schema("workflow-state.schema.json")
ASSET_METADATA_SCHEMA = load_contract_schema("asset-metadata.schema.json")
WORKFLOW_JOB_VALIDATOR = build_contract_validator("workflow-job.schema.json", SCHEMAS_DIR)
WORKFLOW_STATE_VALIDATOR = build_contract_validator("workflow-state.schema.json", SCHEMAS_DIR)
ASSET_METADATA_VALIDATOR = build_contract_validator("asset-metadata.schema.json", SCHEMAS_DIR)


@dataclass(slots=True)
class ContractBundle:
    workflow_job: dict[str, Any]
    workflow_state: dict[str, Any]
    asset_metadata: dict[str, Any]


CONTRACTS = ContractBundle(
    workflow_job=WORKFLOW_JOB_SCHEMA,
    workflow_state=WORKFLOW_STATE_SCHEMA,
    asset_metadata=ASSET_METADATA_SCHEMA,
)


def validate_payload(payload: dict[str, Any], schema: dict[str, Any], validator: Draft202012Validator | None = None) -> dict[str, Any]:
    (validator or Draft202012Validator(schema)).validate(payload)
    return payload


def build_initial_state(job: dict[str, Any]) -> dict[str, Any]:
    validate_payload(job, CONTRACTS.workflow_job, WORKFLOW_JOB_VALIDATOR)
    return {
        "contractVersion": "1.0.0",
        "workflowId": job["workflowId"],
        "runId": job["runId"],
        "status": "running",
        "updatedAt": job["createdAt"],
        "currentStep": "validate-input",
        "steps": [
            {
                "name": "validate-input",
                "status": "running",
                "updatedAt": job["createdAt"],
                "message": "Workflow accepted by Python runtime",
            }
        ],
        "input": job["payload"],
        "output": {},
        "trace": job["trace"],
    }


def validate_input_node(state: dict[str, Any]) -> dict[str, Any]:
    payload = state.get("input", {})
    if isinstance(payload, dict) and "assetMetadata" in payload:
        validate_payload(payload["assetMetadata"], CONTRACTS.asset_metadata, ASSET_METADATA_VALIDATOR)

    state["steps"][0]["status"] = "succeeded"
    state["steps"][0]["updatedAt"] = state["updatedAt"]
    state["status"] = "succeeded"
    state["currentStep"] = "complete"
    state["output"] = {
        "accepted": True,
        "validatedSchemas": [
            CONTRACTS.workflow_job["$id"],
            CONTRACTS.workflow_state["$id"],
            CONTRACTS.asset_metadata["$id"],
        ],
    }
    validate_payload(state, CONTRACTS.workflow_state, WORKFLOW_STATE_VALIDATOR)
    return state


def build_workflow_graph() -> Any:
    if StateGraph is None:
        return None

    graph = StateGraph(dict)
    graph.add_node("validate-input", validate_input_node)
    graph.set_entry_point("validate-input")
    graph.add_edge("validate-input", END)
    return graph.compile()


def example_job_payload() -> dict[str, Any]:
    return {
        "contractVersion": "1.0.0",
        "jobId": "job_ingest_001",
        "workflowId": "wf_media_pipeline",
        "runId": "run_001",
        "kind": "ingest",
        "status": "pending",
        "priority": 50,
        "createdAt": "2026-01-01T00:00:00Z",
        "lease": {"attempt": 1, "maxAttempts": 3},
        "trace": {
            "traceId": "0123456789abcdef0123456789abcdef",
            "correlationId": "corr-001"
        },
        "payload": {
            "assetId": "asset_001",
            "inputUri": "s3://raw-bucket/video.mp4",
            "assetMetadata": {
                "contractVersion": "1.0.0",
                "assetId": "asset_001",
                "mimeType": "video/mp4",
                "sourceUri": "s3://raw-bucket/video.mp4",
                "checksum": {
                    "algorithm": "sha256",
                    "value": "8f434346648f6b96df89dda901c5176b10a6d83961b4f4b4f2ddf5b9fddb30f9"
                },
                "sizeBytes": 1048576,
                "capturedAt": "2026-01-01T00:00:00Z",
                "ownership": {
                    "tenantId": "tenant_001",
                    "workspaceId": "workspace_001"
                }
            }
        }
    }


def run_once(job: dict[str, Any]) -> dict[str, Any]:
    initial_state = build_initial_state(job)
    graph = build_workflow_graph()
    if graph is None:
        return validate_input_node(initial_state)
    return graph.invoke(initial_state)


def main() -> None:
    run_worker(WorkflowQueueConsumer().consume_forever())


if __name__ == "__main__":
    main()
