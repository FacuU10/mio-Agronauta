-- Additive runtime hardening for Agronautas jobs.
-- Defaults/backfill touch operational metadata only; historical scores and crops are untouched.
ALTER TABLE "agronautas_job_runs"
  ADD COLUMN IF NOT EXISTS "attempt" integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "max_attempts" integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "lease_owner" text,
  ADD COLUMN IF NOT EXISTS "lease_expires_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "retry_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "terminal_error_code" text,
  ADD COLUMN IF NOT EXISTS "terminal_error_message" text,
  ADD COLUMN IF NOT EXISTS "dead_lettered_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "dlq_reason" text;

UPDATE "agronautas_job_runs"
   SET "attempt" = COALESCE("attempt", 1),
       "max_attempts" = COALESCE("max_attempts", 3)
 WHERE "attempt" IS NULL OR "max_attempts" IS NULL;

CREATE INDEX IF NOT EXISTS "agronautas_job_runs_status_retry_at_idx"
  ON "agronautas_job_runs" ("status", "retry_at");

CREATE INDEX IF NOT EXISTS "agronautas_job_runs_active_lease_idx"
  ON "agronautas_job_runs" ("status", "lease_expires_at")
 WHERE "status" IN ('leased', 'running');
