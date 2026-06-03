from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Literal, TypedDict

try:
    from langgraph.graph import END, StateGraph
except Exception:  # pragma: no cover - allow pure-function fallback
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
    }


def build_evidence_only_response(state: CopilotState) -> CopilotTurnResponse:
    context = state.get("context", {})
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
    }


def respond_node(state: CopilotState) -> CopilotState:
    state["response"] = build_evidence_only_response(state)
    return state


def route_after_request_gate(state: CopilotState) -> str:
    return "ask_context" if state.get("missing_context") else "load_context"


def route_after_loaded_gate(state: CopilotState) -> str:
    return "ask_context" if state.get("missing_context") else "respond"
