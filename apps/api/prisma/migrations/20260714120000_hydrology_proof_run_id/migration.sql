ALTER TABLE hydrology_ingestion_runs
  ADD COLUMN IF NOT EXISTS proof_run_id text;

CREATE INDEX IF NOT EXISTS hydrology_ingestion_runs_proof_source_started_idx
  ON hydrology_ingestion_runs (proof_run_id, source, started_at DESC);
