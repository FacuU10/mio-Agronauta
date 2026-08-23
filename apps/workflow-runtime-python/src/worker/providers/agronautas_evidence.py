from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from json import dumps
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


def normalize_georef(payload: Any, *, source_url: str, retrieved_at: str, run_id: str) -> EvidenceEnvelope:
    try:
        row = payload["localidades"][0]
        province = row["provincia"]
        centroid = row["centroide"]
        if not isinstance(row["id"], str) or not isinstance(row["nombre"], str):
            raise ValueError("schema_drift")
        if not isinstance(province.get("id"), str):
            raise ValueError("schema_drift")
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
) -> EvidenceEnvelope:
    return EvidenceEnvelope(
        provider=provider,
        signal_type=signal_type,
        source_url=source_url,
        provider_mode="seam",
        observed_at=observed_at,
        forecast_at=forecast_at,
        retrieved_at=retrieved_at,
        time_standard=time_standard,
        units=units,
        freshness="degraded",
        run_id=run_id,
        request_id=f"request:{run_id}",
        raw_hash=_hash_payload(payload),
        value=value,
        model=model,
        forecast_horizon_days=forecast_horizon_days,
    )


def _unavailable(provider: str, signal_type: str, source_url: str, retrieved_at: str, run_id: str, reason: str) -> EvidenceEnvelope:
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
    )


def _latest_parameter(value: Any) -> tuple[str, float] | None:
    if not isinstance(value, dict) or not value:
        return None
    date = sorted(value)[-1]
    number = value[date]
    return (date, float(number)) if isinstance(number, (int, float)) else None


def _format_power_date(value: str) -> str:
    if len(value) != 8 or not value.isdigit():
        raise ValueError("schema_drift")
    return f"{value[:4]}-{value[4:6]}-{value[6:]}"


def _finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and value == value


def _hash_payload(payload: Any) -> str:
    encoded = dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return f"sha256:{sha256(encoded).hexdigest()}"
