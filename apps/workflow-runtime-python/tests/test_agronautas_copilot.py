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
