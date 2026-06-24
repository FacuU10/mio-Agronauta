CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agronautas_municipalities (
  id TEXT PRIMARY KEY,
  locality_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  province_code TEXT NOT NULL DEFAULT 'AR-W',
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  alert_height_m NUMERIC(8,3),
  evacuation_height_m NUMERIC(8,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT municipality_heights_order_chk CHECK (
    alert_height_m IS NULL OR evacuation_height_m IS NULL OR evacuation_height_m >= alert_height_m
  )
);

CREATE TABLE IF NOT EXISTS municipality_gauge_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id TEXT NOT NULL REFERENCES agronautas_municipalities(id) ON DELETE CASCADE,
  primary_pna_port_id TEXT,
  secondary_pna_port_ids TEXT[] NOT NULL DEFAULT '{}',
  ina_station_ids TEXT[] NOT NULL DEFAULT '{}',
  smn_region_ids TEXT[] NOT NULL DEFAULT '{}',
  inmet_station_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (municipality_id)
);

CREATE INDEX IF NOT EXISTS agronautas_municipalities_boundary_gix
  ON agronautas_municipalities USING GIST (boundary);

CREATE INDEX IF NOT EXISTS agronautas_municipalities_province_name_idx
  ON agronautas_municipalities (province_code, name);

CREATE INDEX IF NOT EXISTS municipality_gauge_mappings_secondary_pna_gin
  ON municipality_gauge_mappings USING GIN (secondary_pna_port_ids);

CREATE INDEX IF NOT EXISTS municipality_gauge_mappings_ina_gin
  ON municipality_gauge_mappings USING GIN (ina_station_ids);

CREATE INDEX IF NOT EXISTS municipality_gauge_mappings_smn_gin
  ON municipality_gauge_mappings USING GIN (smn_region_ids);

CREATE INDEX IF NOT EXISTS municipality_gauge_mappings_inmet_gin
  ON municipality_gauge_mappings USING GIN (inmet_station_ids);
