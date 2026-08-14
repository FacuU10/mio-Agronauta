CREATE TABLE IF NOT EXISTS ibera_source_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('PNA', 'INA', 'INMET', 'SMN')),
  official_identifier TEXT NOT NULL CHECK (btrim(official_identifier) <> ''),
  station_id TEXT,
  coverage_key TEXT,
  source_url TEXT NOT NULL CHECK (source_url ~ '^https://'),
  freshness_policy TEXT NOT NULL CHECK (btrim(freshness_policy) <> ''),
  registry_version TEXT NOT NULL CHECK (btrim(registry_version) <> ''),
  review_status TEXT NOT NULL CHECK (review_status IN ('reviewed', 'pending', 'blocked')),
  reviewed_at TIMESTAMPTZ,
  geometry_status TEXT NOT NULL DEFAULT 'unverified' CHECK (geometry_status IN ('verified', 'unverified', 'unavailable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (station_id IS NOT NULL OR coverage_key IS NOT NULL),
  CHECK (review_status <> 'reviewed' OR (reviewed_at IS NOT NULL AND source_url IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS ibera_source_registry_identity_uq ON ibera_source_registry (municipality_id, source, official_identifier);
CREATE INDEX IF NOT EXISTS ibera_source_registry_municipality_review_idx ON ibera_source_registry (municipality_id, review_status);
CREATE INDEX IF NOT EXISTS ibera_source_registry_source_keys_idx ON ibera_source_registry (source, station_id, coverage_key);

CREATE TABLE IF NOT EXISTS ibera_evidence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('telemetry', 'official_alert')),
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('PNA', 'INA', 'INMET', 'SMN')),
  source_url TEXT,
  evidence_state TEXT NOT NULL CHECK (evidence_state IN ('observed', 'forecast', 'degraded', 'missing')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ibera_evidence_events_bounded_idx ON ibera_evidence_events (municipality_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ibera_evidence_events_source_idx ON ibera_evidence_events (source, occurred_at DESC);
