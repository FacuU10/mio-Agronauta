-- Support the atomic claim/reclaim predicate without changing historical rows.
CREATE INDEX IF NOT EXISTS "agronautas_job_runs_claim_state_idx"
  ON "agronautas_job_runs" ("status", "retry_at", "lease_expires_at");
