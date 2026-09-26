-- Additive Agronautas management lifecycle storage. No existing evidence or auth rows are changed.
CREATE TABLE IF NOT EXISTS "agronautas_management_items" (
  "id" text PRIMARY KEY,
  "kind" text NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "agronautas_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "field_id" text REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "parent_id" text,
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'planned',
  "revision" integer NOT NULL DEFAULT 1,
  "responsible_actor_id" text,
  "created_by_actor_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "source_location_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "agronautas_management_items_revision_positive" CHECK ("revision" > 0),
  CONSTRAINT "agronautas_management_items_kind_valid" CHECK ("kind" IN ('season', 'campaign', 'operation', 'task')),
  CONSTRAINT "agronautas_management_items_status_valid" CHECK ("status" IN ('planned', 'active', 'blocked', 'completed', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "agronautas_management_items_workspace_id_idempotency_key_key"
  ON "agronautas_management_items" ("workspace_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "agronautas_management_items_workspace_updated_id_idx"
  ON "agronautas_management_items" ("workspace_id", "updated_at" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "agronautas_management_items_workspace_field_updated_idx"
  ON "agronautas_management_items" ("workspace_id", "field_id", "updated_at" DESC);

CREATE TABLE IF NOT EXISTS "agronautas_management_audit" (
  "audit_id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "agronautas_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actor_id" text NOT NULL,
  "action" text NOT NULL,
  "target_id" text NOT NULL,
  "outcome" text NOT NULL,
  "revision_before" integer,
  "revision_after" integer,
  "request_id" text NOT NULL,
  "occurred_at" timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "agronautas_management_audit_workspace_occurred_id_idx"
  ON "agronautas_management_audit" ("workspace_id", "occurred_at" DESC, "audit_id" DESC);
CREATE INDEX IF NOT EXISTS "agronautas_management_audit_target_occurred_idx"
  ON "agronautas_management_audit" ("target_id", "occurred_at" DESC);
