CREATE TABLE IF NOT EXISTS municipality_alert_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id TEXT NOT NULL REFERENCES agronautas_municipalities(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('INMET', 'SMN')),
  official_coverage_key TEXT NOT NULL CHECK (
    btrim(official_coverage_key) <> ''
    AND lower(official_coverage_key) NOT LIKE 'alert-%'
  ),
  active BOOLEAN NOT NULL DEFAULT true,
  seed_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS municipality_alert_coverage_active_key_uq
  ON municipality_alert_coverage (municipality_id, source, official_coverage_key)
  WHERE active;

CREATE INDEX IF NOT EXISTS municipality_alert_coverage_source_key_idx
  ON municipality_alert_coverage (source, official_coverage_key)
  WHERE active;
