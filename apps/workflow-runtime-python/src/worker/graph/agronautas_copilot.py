from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Literal, TypedDict

StateGraph: Any
try:
    from langgraph.graph import END, StateGraph
except ImportError:  # pragma: no cover - allow pure-function fallback
    END = "__end__"
    StateGraph = None


MissingField = Literal["field_id", "crop", "growth_stage", "requested_window"]


class RequestedWindow(TypedDict):
    from_: str
    to: str


class CopilotTurnRequest(TypedDict, total=False):
    question: str
    field_id: str
    crop: str
    growth_stage: str
    requested_window: dict[str, str]


class CopilotTurnResponse(TypedDict):
    status: Literal["needs_context", "ready", "unsupported"]
    message: str
    missing_context: list[MissingField]
    citations: list[str]
    actionable: bool
    unavailable_reason: str
    source_run_ids: list[str]
    provider_modes: list[str]
    citation_lineage: list[dict[str, Any]]


class CopilotState(TypedDict, total=False):
    request: CopilotTurnRequest
    context: dict[str, Any]
    missing_context: list[MissingField]
    response: CopilotTurnResponse


@dataclass(slots=True)
class AgronautasCopilotRuntime:
    context_loader: Callable[[str, dict[str, str] | None], dict[str, Any]]

    def run(self, request: CopilotTurnRequest) -> CopilotTurnResponse:
        state: CopilotState = {"request": request}
        state = gate_request_context(state)
        if state.get("missing_context"):
            return build_missing_context_response(state)

        unsupported_reason = detect_out_of_scope_request(request)
        if unsupported_reason:
            return build_unsupported_response(unsupported_reason)

        field_id = request["field_id"]
        requested_window = request.get("requested_window")
        context = self.context_loader(field_id, requested_window)
        state["context"] = context
        state = gate_loaded_context(state)
        if state.get("missing_context"):
            return build_missing_context_response(state)

        return build_evidence_only_response(state)

    def build_graph(self) -> Any:
        if StateGraph is None:
            return None

        runtime = self
        graph = StateGraph(CopilotState)

        graph.add_node("gate_request", gate_request_context)
        graph.add_node("load_context", lambda state: load_context_node(state, runtime.context_loader))
        graph.add_node("gate_loaded", gate_loaded_context)
        graph.add_node("ask_context", ask_context_node)
        graph.add_node("respond", respond_node)
        graph.set_entry_point("gate_request")
        graph.add_conditional_edges("gate_request", route_after_request_gate, {"ask_context": "ask_context", "load_context": "load_context"})
        graph.add_edge("load_context", "gate_loaded")
        graph.add_conditional_edges("gate_loaded", route_after_loaded_gate, {"ask_context": "ask_context", "respond": "respond"})
        graph.add_edge("ask_context", END)
        graph.add_edge("respond", END)
        return graph.compile()


def gate_request_context(state: CopilotState) -> CopilotState:
    request = state.get("request", {})
    missing: list[MissingField] = []
    if not str(request.get("field_id", "")).strip():
        missing.append("field_id")
    if not str(request.get("crop", "")).strip():
        missing.append("crop")
    state["missing_context"] = missing
    return state


def load_context_node(state: CopilotState, context_loader: Callable[[str, dict[str, str] | None], dict[str, Any]]) -> CopilotState:
    request = state["request"]
    state["context"] = context_loader(request["field_id"], request.get("requested_window"))
    return state


def gate_loaded_context(state: CopilotState) -> CopilotState:
    request = state.get("request", {})
    context = state.get("context", {})
    missing: list[MissingField] = []

    growth_stage = request.get("growth_stage") or context.get("growthStage")
    if not str(growth_stage or "").strip():
        missing.append("growth_stage")

    requested_window = request.get("requested_window") or context.get("requestedWindow")
    if not isinstance(requested_window, dict) or not requested_window.get("from") or not requested_window.get("to"):
        missing.append("requested_window")

    state["missing_context"] = missing
    return state


def build_missing_context_response(state: CopilotState) -> CopilotTurnResponse:
    missing = state.get("missing_context", [])
    prompts = {
        "field_id": "el lote (`field_id`)",
        "crop": "el cultivo soportado (`crop`)",
        "growth_stage": "la etapa fenológica",
        "requested_window": "la ventana temporal (`from` y `to`)",
    }
    message = (
        "Antes de recomendar acciones necesito completar contexto crítico: "
        + ", ".join(prompts[item] for item in missing)
        + ". Responderé solo con evidencia persistida cuando esté completo."
    )
    return {
        "status": "needs_context",
        "message": message,
        "missing_context": missing,
        "citations": [],
        "actionable": False,
        "unavailable_reason": "missing_context",
        "source_run_ids": [],
        "provider_modes": [],
        "citation_lineage": [],
    }


def ask_context_node(state: CopilotState) -> CopilotState:
    state["response"] = build_missing_context_response(state)
    return state


def detect_out_of_scope_request(request: CopilotTurnRequest) -> str | None:
    crop = str(request.get("crop", "")).strip().lower()
    if crop and crop != "rice":
        return "El MVP Agronautas solo soporta arroz (`crop=rice`)."

    question = str(request.get("question", "")).lower()
    unsupported_signals = (
        "simulaci",
        "proyecci",
        "pricing",
        "claim",
        "machine learning",
        "ml predictivo",
        "multi-provincia",
        "ibera",
        "municipal",
        "municipio",
        "marketplace",
        "mercado",
        "sesión",
        "session",
        "auth",
        "token",
        "financ",
        "precio",
        "legal",
        "hidrául",
        "evacuación",
        "evacuacion",
        "garantiz",
        "certeza",
    )
    if any(signal in question for signal in unsupported_signals):
        return "La solicitud queda fuera del alcance MVP: no soportamos simulación avanzada, expansión multi-provincia, pricing, claims ni ML predictivo."

    return None


def build_unsupported_response(reason: str) -> CopilotTurnResponse:
    return {
        "status": "unsupported",
        "message": f"Solicitud no soportada en esta versión. {reason}",
        "missing_context": [],
        "citations": [],
        "actionable": False,
        "unavailable_reason": "unsupported_question",
        "source_run_ids": [],
        "provider_modes": [],
        "citation_lineage": [],
    }


def build_evidence_only_response(state: CopilotState) -> CopilotTurnResponse:
    context = state.get("context", {})
    if "evidence" in context:
        return build_grounded_evidence_response(context)

    request = state.get("request", {})
    snapshot = context.get("snapshot") or {}
    alerts = context.get("alerts") or []
    requested_window = request.get("requested_window") or context.get("requestedWindow") or {}

    citations: list[str] = []
    latest_snapshot_id = context.get("latestSnapshotId")
    if latest_snapshot_id:
        citations.append(f"snapshot:{latest_snapshot_id}")

    for alert in alerts:
        alert_id = alert.get("alertId")
        if alert_id:
            citations.append(f"alert:{alert_id}")

    for evidence_ref in snapshot.get("evidenceRefs", []):
        citations.append(f"evidence:{evidence_ref}")

    if not citations:
        return {
            "status": "needs_context",
            "message": "No encuentro evidencia persistida suficiente para responder sin inventar datos. Confirmame un lote con snapshot y alertas persistidas.",
            "missing_context": [],
            "citations": [],
            "actionable": False,
            "unavailable_reason": "missing_grounding",
            "source_run_ids": [],
            "provider_modes": [],
            "citation_lineage": [],
        }

    growth_stage = request.get("growth_stage") or context.get("growthStage")
    message = (
        f"Con el lote {context.get('fieldId')} en etapa {growth_stage} y ventana {requested_window.get('from')} → {requested_window.get('to')}, "
        f"veo un snapshot persistido {latest_snapshot_id} con score {snapshot.get('score')} ({snapshot.get('level')}) y confianza {snapshot.get('confidence')}. "
        f"Las alertas persistidas activas son {', '.join(alert.get('type', 'sin_tipo') for alert in alerts) or 'ninguna'}. "
        "No recalculé riesgo: la respuesta cita únicamente snapshot, alertas y referencias de evidencia ya persistidas."
    )
    return {
        "status": "ready",
        "message": message,
        "missing_context": [],
        "citations": citations,
        "actionable": True,
        "unavailable_reason": "",
        "source_run_ids": [],
        "provider_modes": [],
        "citation_lineage": [],
    }


ALLOWED_EVIDENCE_PROVIDERS = {"open-meteo", "smn", "nasa-power-daily", "risk-engine", "agronautas"}
ALLOWED_EVIDENCE_SIGNALS = {"climate", "weather", "weather_alert", "risk", "fire"}


def build_grounded_evidence_response(context: dict[str, Any]) -> CopilotTurnResponse:
    raw_evidence = context.get("evidence")
    evidence: list[Any] = raw_evidence if isinstance(raw_evidence, list) else []
    scope = {
        "actorId": context.get("actorId"),
        "sessionId": context.get("sessionId"),
        "workspaceId": context.get("workspaceId"),
        "fieldId": context.get("fieldId"),
        "locationId": context.get("locationId"),
    }
    if any(not isinstance(value, str) or not value.strip() for value in scope.values()):
        return grounded_unavailable_response("missing_grounding", "No hay una ubicación y alcance autorizado completos para responder.", context)

    approved = [
        item for item in evidence
        if isinstance(item, dict)
        and item.get("provider") in ALLOWED_EVIDENCE_PROVIDERS
        and item.get("signalType") in ALLOWED_EVIDENCE_SIGNALS
        and item.get("evidenceId")
        and item.get("runId")
        and item.get("retrievedAt")
        and item.get("status") in {"fresh", "stale", "degraded"}
        and item.get("providerMode") in {"live", "seam", "mock"}
    ]
    if not approved:
        return grounded_unavailable_response("missing_grounding", "No hay evidencia Agronautas aprobada y persistida suficiente para responder sin inventar datos.", context)

    readiness = context.get("readiness")
    fresh = [item for item in approved if item.get("status") == "fresh"]
    if readiness != "ready" or len(approved) != len(fresh):
        reason = "stale_evidence" if any(item.get("status") == "stale" for item in approved) else "degraded_evidence"
        return grounded_unavailable_response(reason, "La evidencia disponible no está fresca o la readiness no está verificada; no emito una recomendación accionable.", context, approved)

    citations = [f"evidence:{item['evidenceId']}" for item in approved]
    source_run_ids = unique_strings(item["runId"] for item in approved)
    provider_modes = unique_strings(item["providerMode"] for item in approved)
    lineage = [
        {
            "citationId": f"evidence:{item['evidenceId']}",
            "evidenceId": item["evidenceId"],
            "runId": item["runId"],
            "provider": item["provider"],
            "signalType": item["signalType"],
            "providerMode": item["providerMode"],
            "status": item["status"],
            "sourceUrl": item.get("sourceUrl"),
            "sourceKey": item.get("sourceKey"),
            "observedAt": item.get("observedAt"),
            "acquiredAt": item.get("acquiredAt"),
            "forecastAt": item.get("forecastAt"),
            "retrievedAt": item["retrievedAt"],
            "lastSuccessfulObservedAt": item.get("lastSuccessfulObservedAt"),
            "degradationReasons": item.get("degradationReasons", []),
        }
        for item in approved
    ]
    return {
        "status": "ready",
        "message": f"Respuesta limitada al lote {scope['fieldId']} y su ubicación autorizada. Se utilizaron {len(approved)} fuentes Agronautas frescas; no se recalculó evidencia ni se incorporaron datos de otros productos.",
        "missing_context": [],
        "citations": citations,
        "actionable": True,
        "unavailable_reason": "",
        "source_run_ids": source_run_ids,
        "provider_modes": provider_modes,
        "citation_lineage": lineage,
    }


def grounded_unavailable_response(reason: str, message: str, context: dict[str, Any], approved: list[dict[str, Any]] | None = None) -> CopilotTurnResponse:
    approved_items = approved or []
    return {
        "status": "needs_context",
        "message": message,
        "missing_context": [],
        "citations": [f"evidence:{item['evidenceId']}" for item in approved_items],
        "actionable": False,
        "unavailable_reason": reason,
        "source_run_ids": unique_strings(item["runId"] for item in approved_items),
        "provider_modes": unique_strings(item["providerMode"] for item in approved_items),
        "citation_lineage": [],
    }


def unique_strings(values: Any) -> list[str]:
    result: list[str] = []
    for value in values:
        if isinstance(value, str) and value not in result:
            result.append(value)
    return result


def respond_node(state: CopilotState) -> CopilotState:
    state["response"] = build_evidence_only_response(state)
    return state


def route_after_request_gate(state: CopilotState) -> str:
    return "ask_context" if state.get("missing_context") else "load_context"


def route_after_loaded_gate(state: CopilotState) -> str:
    return "ask_context" if state.get("missing_context") else "respond"
