CREATE TABLE IF NOT EXISTS "agronautas_provider_runs" (
  "id" text NOT NULL,
  "run_key" text NOT NULL,
  "run_id" text NOT NULL,
  "request_id" text NOT NULL,
  "location_id" text NOT NULL,
  "workspace_id" text NOT NULL,
  "field_id" text NOT NULL,
  "provider" text NOT NULL,
  "signal_type" text NOT NULL,
  "window_start" timestamptz(6) NOT NULL,
  "window_end" timestamptz(6) NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agronautas_provider_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agronautas_provider_runs_run_key_key"
  ON "agronautas_provider_runs" ("run_key");
CREATE UNIQUE INDEX IF NOT EXISTS "agronautas_provider_runs_run_id_key"
  ON "agronautas_provider_runs" ("run_id");
CREATE INDEX IF NOT EXISTS "agronautas_provider_runs_scope_created_idx"
  ON "agronautas_provider_runs" ("workspace_id", "field_id", "location_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "agronautas_provider_runs_provider_window_idx"
  ON "agronautas_provider_runs" ("provider", "signal_type", "window_start");

CREATE TABLE IF NOT EXISTS "agronautas_provider_evidence" (
  "id" text NOT NULL,
  "run_id" text NOT NULL,
  "evidence_id" text NOT NULL,
  "location_id" text NOT NULL,
  "workspace_id" text NOT NULL,
  "field_id" text NOT NULL,
  "provider" text NOT NULL,
  "signal_type" text NOT NULL,
  "status" text NOT NULL,
  "provider_mode" text NOT NULL,
  "observed_at" timestamptz(6),
  "acquired_at" timestamptz(6),
  "forecast_at" timestamptz(6),
  "retrieved_at" timestamptz(6) NOT NULL,
  "evidence_payload" jsonb NOT NULL,
  CONSTRAINT "agronautas_provider_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agronautas_provider_evidence_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "agronautas_provider_runs" ("run_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "agronautas_provider_evidence_evidence_id_key"
  ON "agronautas_provider_evidence" ("evidence_id");
CREATE INDEX IF NOT EXISTS "agronautas_provider_evidence_scope_retrieved_idx"
  ON "agronautas_provider_evidence" ("workspace_id", "field_id", "location_id", "retrieved_at" DESC);
CREATE INDEX IF NOT EXISTS "agronautas_provider_evidence_provider_retrieved_idx"
  ON "agronautas_provider_evidence" ("provider", "signal_type", "retrieved_at" DESC);
