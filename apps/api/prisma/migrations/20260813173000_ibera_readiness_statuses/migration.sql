ALTER TABLE ibera_source_registry
  DROP CONSTRAINT IF EXISTS ibera_source_registry_geometry_status_check;

ALTER TABLE ibera_source_registry
  ADD CONSTRAINT ibera_source_registry_geometry_status_check
  CHECK (geometry_status IN ('verified', 'unverified', 'partial', 'unavailable'));

ALTER TABLE ibera_ingest_runs
  DROP CONSTRAINT IF EXISTS ibera_ingest_runs_status_check;

ALTER TABLE ibera_ingest_runs
  ADD CONSTRAINT ibera_ingest_runs_status_check
  CHECK (status IN ('queued', 'started', 'completed', 'partial', 'failed', 'unavailable', 'maintenance'));
