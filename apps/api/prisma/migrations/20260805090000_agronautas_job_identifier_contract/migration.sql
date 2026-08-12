-- Keep the Prisma-managed camelCase job identifier canonical.
-- If an older deployment still exposes job_id, copy it into the additive
-- canonical column without dropping or rewriting historical job payloads.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'agronautas_job_runs'
       AND column_name = 'job_id'
  ) AND NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'agronautas_job_runs'
       AND column_name = 'jobId'
  ) THEN
    ALTER TABLE "agronautas_job_runs" ADD COLUMN "jobId" text;
    EXECUTE 'UPDATE "agronautas_job_runs" SET "jobId" = job_id WHERE "jobId" IS NULL';
  END IF;
END $$;

ALTER TABLE "agronautas_job_runs"
  ADD COLUMN IF NOT EXISTS "jobId" text;

CREATE UNIQUE INDEX IF NOT EXISTS "agronautas_job_runs_jobId_contract_idx"
  ON "agronautas_job_runs" ("jobId")
  WHERE "jobId" IS NOT NULL;
