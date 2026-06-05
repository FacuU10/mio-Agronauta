-- Add field lifecycle cleanup for job runs
ALTER TABLE "agronautas_job_runs"
ADD CONSTRAINT "agronautas_job_runs_field_id_fkey"
FOREIGN KEY ("field_id") REFERENCES "fields"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Support Phase 1 query patterns
CREATE INDEX "signal_ingestion_runs_field_id_signal_type_status_observed_at_started_at_idx"
ON "signal_ingestion_runs" ("field_id", "signal_type", "status", "observed_at" DESC, "started_at" DESC);

CREATE INDEX "alert_snapshots_field_id_created_at_priority_confidence_idx"
ON "alert_snapshots" ("field_id", "created_at" DESC, "priority", "confidence" DESC);

CREATE INDEX "agronautas_job_runs_field_id_status_queued_at_idx"
ON "agronautas_job_runs" ("field_id", "status", "queued_at" DESC);

CREATE INDEX "agronautas_job_runs_status_queued_at_idx"
ON "agronautas_job_runs" ("status", "queued_at" DESC);
