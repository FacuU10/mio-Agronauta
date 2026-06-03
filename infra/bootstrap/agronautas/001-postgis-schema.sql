CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS agronautas_boundaries (
  id text PRIMARY KEY,
  province_code text NOT NULL,
  locality_name text NOT NULL,
  boundary_version text NOT NULL,
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agronautas_localities (
  id text PRIMARY KEY,
  province_code text NOT NULL,
  name text NOT NULL,
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agronautas_boundaries_boundary_gix ON agronautas_boundaries USING GIST (boundary);
CREATE INDEX IF NOT EXISTS agronautas_localities_boundary_gix ON agronautas_localities USING GIST (boundary);
