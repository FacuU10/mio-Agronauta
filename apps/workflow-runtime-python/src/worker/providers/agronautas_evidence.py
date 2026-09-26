from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from json import dumps
from math import isfinite
from typing import Any


@dataclass(frozen=True)
class EvidenceEnvelope:
    provider: str
    signal_type: str
    source_url: str
    provider_mode: str
    observed_at: str | None
    forecast_at: str | None
    retrieved_at: str
    time_standard: str
    units: dict[str, str]
    freshness: str
    run_id: str
    request_id: str
    raw_hash: str | None = None
    schema_status: str = "valid"
    http_status: int | None = None
    failure_reason: str | None = None
    value: dict[str, Any] | None = None
    model: str | None = None
    forecast_horizon_days: int | None = None
    contract_version: str = "agronautas-evidence-v2"
    evidence_id: str | None = None
    location_id: str | None = None
    workspace_id: str | None = None
    field_id: str | None = None
    source_key: str | None = None
    acquired_at: str | None = None
    freshness_policy: str = "provider-defined"
    last_successful_observed_at: str | None = None
    degradation_reasons: tuple[str, ...] = ()
    retryable: bool = False
    status: str = "degraded"


def normalize_georef(payload: Any, *, source_url: str, retrieved_at: str, run_id: str) -> EvidenceEnvelope:
    try:
        row = payload["localidades"][0]
        province = row["provincia"]
        centroid = row["centroide"]
        if not isinstance(row["id"], str) or not isinstance(row["nombre"], str):
            raise TypeError("schema_drift")
        if not isinstance(province.get("id"), str):
            raise TypeError("schema_drift")
        if not _finite_number(centroid.get("lat")) or not _finite_number(centroid.get("lon")):
            raise ValueError("schema_drift")
        value = {
            "localityId": row["id"],
            "name": row["nombre"],
            "provinceCode": province["id"],
            "centroid": {"lat": centroid["lat"], "lng": centroid["lon"]},
        }
        return _envelope(
            provider="georef-2.1",
            signal_type="locality",
            source_url=source_url,
            retrieved_at=retrieved_at,
            run_id=run_id,
            observed_at=None,
            forecast_at=None,
            time_standard="retrieval-only",
            units={"latitude": "degrees", "longitude": "degrees", "coordinateReferenceSystem": "WGS84", "code": "code"},
            value=value,
            payload=payload,
        )
    except (KeyError, IndexError, TypeError, ValueError):
        return _unavailable("georef-2.1", "locality", source_url, retrieved_at, run_id, "schema_drift")


def normalize_nasa_power_daily(
    payload: Any,
    *,
    source_url: str,
    retrieved_at: str,
    run_id: str,
    time_standard: str,
) -> EvidenceEnvelope:
    try:
        parameters = payload["properties"]["parameter"]
        temperature = _latest_parameter(parameters["T2M"])
        precipitation = _latest_parameter(parameters["PRECTOTCORR"])
        if temperature is None or precipitation is None or temperature[1] <= -900 or precipitation[1] <= -900 or not -80 <= temperature[1] <= 60:
            raise ValueError("provider_missing_value")
        observed_at = f"{_format_power_date(temperature[0])}T00:00:00Z"
        return _envelope(
            provider="nasa-power-daily",
            signal_type="climate",
            source_url=source_url,
            retrieved_at=retrieved_at,
            run_id=run_id,
            observed_at=observed_at,
            forecast_at=None,
            time_standard=time_standard,
            units={"temperature": "C", "precipitation": "mm/day"},
            value={"temperatureC": temperature[1], "precipitationMmDay": precipitation[1], "observedDate": temperature[0]},
            payload=payload,
        )
    except (KeyError, IndexError, TypeError, ValueError):
        return _unavailable("nasa-power-daily", "climate", source_url, retrieved_at, run_id, "schema_drift")


def normalize_open_meteo(
    payload: Any,
    *,
    source_url: str,
    retrieved_at: str,
    run_id: str,
    forecast_horizon_days: int,
    location_id: str | None = None,
    workspace_id: str | None = None,
    field_id: str | None = None,
    provider_mode: str = "seam",
) -> EvidenceEnvelope:
    try:
        daily = payload["daily"]
        times = daily["time"]
        temperatures = daily["temperature_2m_max"]
        rainfall = daily["precipitation_sum"]
        model = payload.get("model", "best_match")
        if not times or len(times) != len(temperatures) or len(times) != len(rainfall) or not isinstance(model, str):
            raise ValueError("schema_drift")
        forecast_at = f"{times[0]}T00:00:00Z"
        return _envelope(
            provider="open-meteo",
            signal_type="climate",
            source_url=source_url,
            retrieved_at=retrieved_at,
            run_id=run_id,
            observed_at=None,
            forecast_at=forecast_at,
            time_standard="UTC",
            units={"temperature": "°C", "precipitation": "mm"},
            value={"temperatureMaxC": max(temperatures), "rainfallMm": sum(rainfall)},
            payload=payload,
            model=model,
            forecast_horizon_days=forecast_horizon_days,
            location_id=location_id,
            workspace_id=workspace_id,
            field_id=field_id,
            source_key="open-meteo:forecast",
            freshness_policy="forecast-window",
            provider_mode=provider_mode,
        )
    except (KeyError, IndexError, TypeError, ValueError):
        return _unavailable("open-meteo", "climate", source_url, retrieved_at, run_id, "schema_drift")


def _envelope(
    *,
    provider: str,
    signal_type: str,
    source_url: str,
    retrieved_at: str,
    run_id: str,
    observed_at: str | None,
    forecast_at: str | None,
    time_standard: str,
    units: dict[str, str],
    value: dict[str, Any],
    payload: Any,
    model: str | None = None,
    forecast_horizon_days: int | None = None,
    location_id: str | None = None,
    workspace_id: str | None = None,
    field_id: str | None = None,
    source_key: str | None = None,
    freshness_policy: str = "provider-defined",
    provider_mode: str = "seam",
) -> EvidenceEnvelope:
    is_live = provider_mode == "live"
    return EvidenceEnvelope(
        provider=provider,
        signal_type=signal_type,
        source_url=source_url,
        provider_mode=provider_mode,
        observed_at=observed_at,
        forecast_at=forecast_at,
        retrieved_at=retrieved_at,
        time_standard=time_standard,
        units=units,
        freshness="fresh" if is_live else "degraded",
        run_id=run_id,
        request_id=f"request:{run_id}",
        raw_hash=_hash_payload(payload),
        value=value,
        model=model,
        forecast_horizon_days=forecast_horizon_days,
        evidence_id=f"{provider}:{signal_type}:{run_id}",
        location_id=location_id,
        workspace_id=workspace_id,
        field_id=field_id,
        source_key=source_key,
        freshness_policy=freshness_policy,
        degradation_reasons=() if is_live else ("provider_seam",),
        retryable=not is_live,
        status="fresh" if is_live else "degraded",
    )


def _unavailable(
    provider: str,
    signal_type: str,
    source_url: str,
    retrieved_at: str,
    run_id: str,
    reason: str,
    *,
    location_id: str | None = None,
    workspace_id: str | None = None,
    field_id: str | None = None,
    source_key: str | None = None,
    freshness_policy: str = "provider-defined",
) -> EvidenceEnvelope:
    return EvidenceEnvelope(
        provider=provider,
        signal_type=signal_type,
        source_url=source_url,
        provider_mode="unavailable",
        observed_at=None,
        forecast_at=None,
        retrieved_at=retrieved_at,
        time_standard="retrieval-only",
        units={},
        freshness="missing",
        run_id=run_id,
        request_id=f"request:{run_id}",
        schema_status="invalid",
        failure_reason=reason,
        evidence_id=f"{provider}:{signal_type}:{run_id}",
        location_id=location_id,
        workspace_id=workspace_id,
        field_id=field_id,
        source_key=source_key,
        freshness_policy=freshness_policy,
        degradation_reasons=(reason,),
        retryable=reason not in {"satellite_proof_incomplete", "commercial_use_license_unavailable"},
        status="unavailable",
    )


def normalize_satellite(
    payload: Any,
    *,
    source_url: str,
    retrieved_at: str,
    run_id: str,
    location_id: str,
    workspace_id: str,
    field_id: str,
) -> EvidenceEnvelope:
    try:
        if not isinstance(payload, dict):
            raise TypeError("schema_drift")
        scene_id = payload["sceneId"]
        coverage = payload["coverage"]
        processing = payload["processing"]
        coverage_percentage = coverage["percentage"]
        processing_proof = processing["proofRef"]
        if not isinstance(scene_id, str) or not isinstance(coverage_percentage, (int, float)) or coverage_percentage <= 0:
            raise ValueError("satellite_proof_incomplete")
        if processing.get("status") != "complete" or not isinstance(processing_proof, str):
            raise ValueError("satellite_proof_incomplete")
        value = {
            "sceneId": scene_id,
            "coveragePercentage": coverage_percentage,
            "processingProof": processing_proof,
        }
        if isinstance(payload.get("ndvi"), (int, float)):
            value["ndvi"] = payload["ndvi"]
        return _envelope(
            provider="sentinel-stac",
            signal_type="satellite",
            source_url=source_url,
            retrieved_at=retrieved_at,
            run_id=run_id,
            observed_at=payload.get("observedAt") or payload.get("acquiredAt"),
            forecast_at=None,
            time_standard="UTC",
            units={"coverage": "%"},
            value=value,
            payload=payload,
            location_id=location_id,
            workspace_id=workspace_id,
            field_id=field_id,
            source_key="sentinel:stac",
            freshness_policy="scene-acquisition-time",
        )
    except (AttributeError, KeyError, TypeError, ValueError):
        return _unavailable(
            "sentinel-stac",
            "satellite",
            source_url,
            retrieved_at,
            run_id,
            "satellite_proof_incomplete",
            location_id=location_id,
            workspace_id=workspace_id,
            field_id=field_id,
            source_key="sentinel:stac",
            freshness_policy="scene-acquisition-time",
        )


def _latest_parameter(value: Any) -> tuple[str, float] | None:
    if not isinstance(value, dict) or not value:
        return None
    date = max(value)
    number = value[date]
    return (date, float(number)) if isinstance(number, (int, float)) else None


def _format_power_date(value: str) -> str:
    if len(value) != 8 or not value.isdigit():
        raise ValueError("schema_drift")
    return f"{value[:4]}-{value[4:6]}-{value[6:]}"


def _finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and isfinite(value)


def _hash_payload(payload: Any) -> str:
    encoded = dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return f"sha256:{sha256(encoded).hexdigest()}"
