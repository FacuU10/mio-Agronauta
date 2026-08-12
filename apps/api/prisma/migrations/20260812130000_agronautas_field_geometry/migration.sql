-- Additive field geometry storage. Existing point intake columns and rows remain valid.
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "fields"
  ADD COLUMN IF NOT EXISTS "boundary" geometry(MultiPolygon, 4326),
  ADD COLUMN IF NOT EXISTS "centroid" geometry(Point, 4326),
  ADD COLUMN IF NOT EXISTS "boundary_area_m2" numeric(18, 3),
  ADD COLUMN IF NOT EXISTS "boundary_perimeter_m" numeric(18, 3),
  ADD COLUMN IF NOT EXISTS "geometry_source" text,
  ADD COLUMN IF NOT EXISTS "geometry_updated_at" timestamptz;

CREATE INDEX IF NOT EXISTS "fields_boundary_gix" ON "fields" USING GIST ("boundary");
CREATE INDEX IF NOT EXISTS "fields_centroid_gix" ON "fields" USING GIST ("centroid");
