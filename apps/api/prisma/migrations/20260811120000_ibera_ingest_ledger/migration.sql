CREATE TABLE IF NOT EXISTS ibera_ingest_runs (
  id TEXT PRIMARY KEY,
  proof_run_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'started', 'completed', 'partial', 'failed')),
  requested_sources TEXT[] NOT NULL DEFAULT '{}',
  scheduled_slot TEXT UNIQUE,
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ(6),
  source_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  started_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ(6),
  expires_at TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ibera_ingest_runs_status_expiry_idx
  ON ibera_ingest_runs (status, expires_at);

CREATE INDEX IF NOT EXISTS ibera_ingest_runs_lease_expiry_idx
  ON ibera_ingest_runs (lease_expires_at);

ALTER TABLE hydrology_ingestion_runs
  ADD COLUMN IF NOT EXISTS ibera_run_id TEXT;

ALTER TABLE hydrology_ingestion_runs
  ADD COLUMN IF NOT EXISTS diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hydrology_ingestion_runs_ibera_run_fk') THEN
    ALTER TABLE hydrology_ingestion_runs
      ADD CONSTRAINT hydrology_ingestion_runs_ibera_run_fk
      FOREIGN KEY (ibera_run_id) REFERENCES ibera_ingest_runs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS hydrology_ingestion_runs_ibera_run_idx
  ON hydrology_ingestion_runs (ibera_run_id, started_at DESC);
