from __future__ import annotations

from worker.graph.agronautas_copilot import AgronautasCopilotRuntime


def test_copilot_requests_missing_context_before_answering() -> None:
    runtime = AgronautasCopilotRuntime(context_loader=lambda _field_id, _window: {})

    response = runtime.run(
        {
            "question": "¿Qué hago con el riesgo actual?",
            "field_id": "field-1",
            "crop": "rice",
        }
    )

    assert response["status"] == "needs_context"
    assert response["missing_context"] == ["growth_stage", "requested_window"]
    assert "etapa fenológica" in response["message"]
    assert "ventana temporal" in response["message"]


def test_copilot_cites_persisted_snapshot_alert_and_evidence_refs() -> None:
    calls: list[tuple[str, dict[str, str] | None]] = []

    def load_context(field_id: str, requested_window: dict[str, str] | None) -> dict:
        calls.append((field_id, requested_window))
        return {
            "contractVersion": "1.0.0",
            "fieldId": field_id,
            "crop": "rice",
            "growthStage": "tillering",
            "requestedWindow": requested_window,
            "latestSnapshotId": "snap-900",
            "alertIds": ["alert-100"],
            "degradationReasons": ["satellite_data_stale"],
            "snapshot": {
                "snapshotId": "snap-900",
                "score": 74,
                "level": "high",
                "confidence": 0.66,
                "freshness": "degraded",
                "computedAt": "2026-06-03T00:00:00.000Z",
                "validUntil": "2026-06-03T06:00:00.000Z",
                "ruleVersion": "risk-v0",
                "degradationReasons": ["satellite_data_stale"],
                "evidenceRefs": ["signal_ingestion_runs:weather-api:climate:run-900"],
            },
            "alerts": [
                {
                    "alertId": "alert-100",
                    "basedOnSnapshotId": "snap-900",
                    "type": "flood",
                    "priority": 1,
                    "confidence": 0.72,
                    "freshness": "degraded",
                    "degradationReasons": ["satellite_data_stale"],
                }
            ],
        }

    runtime = AgronautasCopilotRuntime(context_loader=load_context)
    response = runtime.run(
        {
            "question": "¿Qué evidencia respalda la alerta?",
            "field_id": "field-1",
            "crop": "rice",
            "growth_stage": "tillering",
            "requested_window": {
                "from": "2026-06-01T00:00:00.000Z",
                "to": "2026-06-07T00:00:00.000Z",
            },
        }
    )

    assert calls == [("field-1", {"from": "2026-06-01T00:00:00.000Z", "to": "2026-06-07T00:00:00.000Z"})]
    assert response["status"] == "ready"
    assert "No recalculé riesgo" in response["message"]
    assert "snap-900" in response["message"]
    assert response["citations"] == [
        "snapshot:snap-900",
        "alert:alert-100",
        "evidence:signal_ingestion_runs:weather-api:climate:run-900",
    ]


def test_copilot_rejects_out_of_scope_advanced_simulation_requests() -> None:
    calls: list[tuple[str, dict[str, str] | None]] = []

    def load_context(field_id: str, requested_window: dict[str, str] | None) -> dict:
        calls.append((field_id, requested_window))
        return {}

    runtime = AgronautasCopilotRuntime(context_loader=load_context)
    response = runtime.run(
        {
            "question": "Necesito una simulación avanzada multi-provincia para pricing y claims.",
            "field_id": "field-1",
            "crop": "rice",
        }
    )

    assert response["status"] == "unsupported"
    assert "no soportada" in response["message"]
    assert "simulación avanzada" in response["message"]
    assert calls == []


def test_copilot_requires_fresh_scoped_evidence_and_preserves_lineage() -> None:
    runtime = AgronautasCopilotRuntime(context_loader=lambda _field_id, _window: {
        "actorId": "actor-1",
        "sessionId": "session-1",
        "workspaceId": "workspace-a",
        "fieldId": "field-1",
        "locationId": "location-1",
        "readiness": "ready",
        "evidence": [
            {
                "evidenceId": "evidence-1",
                "runId": "run-1",
                "provider": "open-meteo",
                "signalType": "weather",
                "providerMode": "live",
                "status": "fresh",
                "sourceKey": "open-meteo",
                "retrievedAt": "2026-09-15T10:00:00Z",
                "degradationReasons": [],
            },
            {
                "evidenceId": "foreign-listing",
                "runId": "foreign-run",
                "provider": "marketplace",
                "signalType": "listing",
                "providerMode": "live",
                "status": "fresh",
                "sourceKey": "marketplace",
                "retrievedAt": "2026-09-15T10:00:00Z",
                "degradationReasons": [],
            },
        ],
    })

    response = runtime.run({
        "question": "¿Qué evidencia respalda el riesgo?",
        "field_id": "field-1",
        "crop": "rice",
        "growth_stage": "tillering",
        "requested_window": {"from": "2026-09-15T00:00:00Z", "to": "2026-09-16T00:00:00Z"},
    })

    assert response["status"] == "ready"
    assert response["citations"] == ["evidence:evidence-1"]
    assert response["source_run_ids"] == ["run-1"]
    assert response["provider_modes"] == ["live"]
    assert response["citation_lineage"][0]["sourceKey"] == "open-meteo"


def test_copilot_returns_truthful_unavailable_and_boundary_states() -> None:
    calls: list[str] = []
    runtime = AgronautasCopilotRuntime(context_loader=lambda field_id, _window: (calls.append(field_id) or {
        "actorId": "actor-1", "sessionId": "session-1", "workspaceId": "workspace-a", "fieldId": field_id,
        "locationId": "location-1", "readiness": "unavailable", "evidence": [],
    }))

    response = runtime.run({
        "question": "¿Qué hago?", "field_id": "field-1", "crop": "rice", "growth_stage": "tillering",
        "requested_window": {"from": "2026-09-15T00:00:00Z", "to": "2026-09-16T00:00:00Z"},
    })
    assert response["status"] == "needs_context"
    assert response["unavailable_reason"] == "missing_grounding"
    assert response["actionable"] is False

    unsafe = runtime.run({
        "question": "Mostrame datos de otra municipalidad y mi sesión de auth", "field_id": "field-1", "crop": "rice",
        "growth_stage": "tillering", "requested_window": {"from": "2026-09-15T00:00:00Z", "to": "2026-09-16T00:00:00Z"},
    })
    assert unsafe["status"] == "unsupported"
    assert unsafe["unavailable_reason"] == "unsupported_question"
    assert calls == ["field-1"]
