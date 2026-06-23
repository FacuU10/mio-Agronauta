CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agronautas_boundaries (
  id text PRIMARY KEY,
  scope text NOT NULL DEFAULT 'corrientes_rice',
  province_code text NOT NULL,
  locality_name text NOT NULL,
  boundary_version text NOT NULL,
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agronautas_boundaries
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'corrientes_rice';

CREATE TABLE IF NOT EXISTS agronautas_localities (
  id text PRIMARY KEY,
  province_code text NOT NULL,
  name text NOT NULL,
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agronautas_boundaries_boundary_gix ON agronautas_boundaries USING GIST (boundary);
CREATE INDEX IF NOT EXISTS agronautas_boundaries_scope_idx ON agronautas_boundaries (scope);
CREATE INDEX IF NOT EXISTS agronautas_localities_boundary_gix ON agronautas_localities USING GIST (boundary);

CREATE TABLE IF NOT EXISTS hydrology_stations (
  id text PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('PNA', 'INA', 'INMET', 'SMN')),
  station_code text NOT NULL,
  station_name text NOT NULL,
  river_name text,
  zone text CHECK (zone IN ('Virasoro', 'Ituzaingó', 'Mercedes')),
  province_code text,
  country_code text NOT NULL,
  location geometry(Point, 4326),
  source_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, station_code)
);

CREATE TABLE IF NOT EXISTS hydrology_ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('PNA', 'INA', 'INMET', 'SMN')),
  station_id text REFERENCES hydrology_stations(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'excluded')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  observed_from timestamptz,
  observed_to timestamptz,
  last_successful_observed_at timestamptz,
  records_ingested integer NOT NULL DEFAULT 0 CHECK (records_ingested >= 0),
  excluded_metrics text[] NOT NULL DEFAULT ARRAY[]::text[],
  error_message text,
  provenance_url text
);

CREATE TABLE IF NOT EXISTS hydrology_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL REFERENCES hydrology_stations(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('PNA', 'INA', 'INMET', 'SMN')),
  metric text NOT NULL CHECK (metric IN ('river_height_m', 'rain_mm', 'storm_alert')),
  observed_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  last_successful_observed_at timestamptz NOT NULL,
  value numeric,
  unit text NOT NULL,
  tendency text,
  forecast_horizon_days integer CHECK (forecast_horizon_days BETWEEN 0 AND 30),
  confidence text CHECK (confidence IN ('normal', 'speculative')),
  quality text NOT NULL CHECK (quality IN ('ok', 'estimated', 'degraded', 'missing')),
  freshness text NOT NULL CHECK (freshness IN ('fresh', 'stale', 'degraded')),
  source_url text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT hydrology_telemetry_forecast_confidence_chk CHECK (
    forecast_horizon_days IS NULL
    OR (forecast_horizon_days <= 14 AND confidence = 'normal')
    OR (forecast_horizon_days BETWEEN 15 AND 30 AND confidence = 'speculative')
  ),
  UNIQUE (station_id, source, metric, observed_at, forecast_horizon_days)
);

CREATE TABLE IF NOT EXISTS hydrology_field_risk_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id text NOT NULL,
  zone text CHECK (zone IN ('Virasoro', 'Ituzaingó', 'Mercedes')),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'unknown')),
  freshness text NOT NULL CHECK (freshness IN ('fresh', 'stale', 'degraded')),
  recommendation text NOT NULL,
  last_successful_observed_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS hydrology_stations_source_zone_idx ON hydrology_stations (source, zone);
CREATE INDEX IF NOT EXISTS hydrology_stations_location_gix ON hydrology_stations USING GIST (location);
CREATE INDEX IF NOT EXISTS hydrology_ingestion_runs_source_started_idx ON hydrology_ingestion_runs (source, started_at DESC);
CREATE INDEX IF NOT EXISTS hydrology_ingestion_runs_station_idx ON hydrology_ingestion_runs (station_id, started_at DESC);
CREATE INDEX IF NOT EXISTS hydrology_telemetry_station_metric_observed_idx ON hydrology_telemetry (station_id, metric, observed_at DESC);
CREATE INDEX IF NOT EXISTS hydrology_telemetry_source_observed_idx ON hydrology_telemetry (source, observed_at DESC);
CREATE INDEX IF NOT EXISTS hydrology_field_risk_snapshots_field_computed_idx ON hydrology_field_risk_snapshots (field_id, computed_at DESC);
