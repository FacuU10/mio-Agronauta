from worker.providers.agronautas_evidence import (
    EvidenceEnvelope,
    normalize_georef,
    normalize_nasa_power_daily,
    normalize_open_meteo,
)


def test_georef_parser_uses_wgs84_degrees_and_retrieval_only() -> None:
    envelope = normalize_georef(
        {"localidades": [{"id": "loc-1", "nombre": "Mercedes", "provincia": {"id": "AR-W"}, "centroide": {"lat": -29.18, "lon": -58.08}}]},
        source_url="https://apis.datos.gob.ar/georef/api/localidades",
        retrieved_at="2026-08-23T10:00:00Z",
        run_id="run-georef",
    )

    assert envelope.provider == "georef-2.1"
    assert envelope.observed_at is None
    assert envelope.units["latitude"] == "degrees"
    assert envelope.units["coordinateReferenceSystem"] == "WGS84"
    assert envelope.value["provinceCode"] == "AR-W"


def test_power_parser_preserves_local_solar_time_standard_and_mm_day() -> None:
    envelope = normalize_nasa_power_daily(
        {"properties": {"parameter": {"T2M": {"20260822": 24.5}, "PRECTOTCORR": {"20260822": 4.2}}}},
        source_url="https://power.larc.nasa.gov/api/temporal/daily/point",
        retrieved_at="2026-08-23T10:00:00Z",
        run_id="run-power",
        time_standard="local-solar",
    )

    assert envelope.observed_at == "2026-08-22T00:00:00Z"
    assert envelope.time_standard == "local-solar"
    assert envelope.units["precipitation"] == "mm/day"
    assert envelope.value["temperatureC"] == 24.5


def test_open_meteo_parser_requires_forecast_model_and_retrieval_semantics() -> None:
    envelope = normalize_open_meteo(
        {"model": "best_match", "daily": {"time": ["2026-08-23"], "temperature_2m_max": [21], "precipitation_sum": [3]}},
        source_url="https://api.open-meteo.com/v1/forecast",
        retrieved_at="2026-08-23T10:00:00Z",
        run_id="run-meteo",
        forecast_horizon_days=1,
    )

    assert envelope.forecast_at == "2026-08-23T00:00:00Z"
    assert envelope.model == "best_match"
    assert envelope.units == {"temperature": "°C", "precipitation": "mm"}


def test_invalid_units_and_schema_drift_are_unavailable_not_live() -> None:
    invalid = normalize_nasa_power_daily(
        {"properties": {"parameter": {"T2M": {"20260822": 75}, "PRECTOTCORR": {"20260822": 4.2}}}},
        source_url="https://power.larc.nasa.gov/api/temporal/daily/point",
        retrieved_at="2026-08-23T10:00:00Z",
        run_id="run-invalid",
        time_standard="UTC",
    )
    drift = normalize_georef(
        {"unexpected": True},
        source_url="https://apis.datos.gob.ar/georef/api/localidades",
        retrieved_at="2026-08-23T10:00:00Z",
        run_id="run-drift",
    )

    assert isinstance(invalid, EvidenceEnvelope)
    assert invalid.provider_mode == "unavailable"
    assert invalid.observed_at is None
    assert drift.provider_mode == "unavailable"
    assert "schema" in (drift.failure_reason or "")
