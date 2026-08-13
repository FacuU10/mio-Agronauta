-- Additive Agronautas management context. Existing field and evidence identities are preserved.
CREATE TABLE IF NOT EXISTS "agronautas_workspaces" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
);

INSERT INTO "agronautas_workspaces" ("id", "name", "status")
VALUES ('agronautas-default-workspace', 'Agronautas', 'active')
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";

ALTER TABLE "fields" ADD COLUMN IF NOT EXISTS "workspace_id" text;
UPDATE "fields" SET "workspace_id" = 'agronautas-default-workspace' WHERE "workspace_id" IS NULL;
ALTER TABLE "fields" ALTER COLUMN "workspace_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fields_workspace_id_fkey'
  ) THEN
    ALTER TABLE "fields"
      ADD CONSTRAINT "fields_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "agronautas_workspaces"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "fields_workspace_id_updated_at_id_idx"
  ON "fields" ("workspace_id", "updated_at" DESC, "id" DESC);
