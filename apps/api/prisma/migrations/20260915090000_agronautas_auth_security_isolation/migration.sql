-- Additive Agronautas auth authority. No legacy role-token data is imported.
CREATE TABLE IF NOT EXISTS "agronautas_auth_workspaces" (
  "id" TEXT PRIMARY KEY,
  "workspace_key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "agronautas_auth_users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "display_name" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "agronautas_auth_sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "agronautas_auth_users"("id") ON DELETE CASCADE,
  "membership_id" TEXT NOT NULL,
  "refresh_family_id" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "agronautas_auth_sessions_user_expiry_idx" ON "agronautas_auth_sessions" ("user_id", "expires_at");
CREATE INDEX IF NOT EXISTS "agronautas_auth_sessions_family_idx" ON "agronautas_auth_sessions" ("refresh_family_id");

CREATE TABLE IF NOT EXISTS "agronautas_auth_refresh_tokens" (
  "id" TEXT PRIMARY KEY,
  "session_id" TEXT NOT NULL REFERENCES "agronautas_auth_sessions"("id") ON DELETE CASCADE,
  "family_id" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "agronautas_auth_refresh_family_expiry_idx" ON "agronautas_auth_refresh_tokens" ("family_id", "expires_at");
CREATE INDEX IF NOT EXISTS "agronautas_auth_refresh_session_consumed_idx" ON "agronautas_auth_refresh_tokens" ("session_id", "consumed_at");

CREATE TABLE IF NOT EXISTS "agronautas_auth_memberships" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "agronautas_auth_users"("id") ON DELETE CASCADE,
  "workspace_id" TEXT NOT NULL REFERENCES "agronautas_auth_workspaces"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agronautas_auth_memberships_user_workspace_uq" UNIQUE ("user_id", "workspace_id")
);
CREATE INDEX IF NOT EXISTS "agronautas_auth_memberships_workspace_status_idx" ON "agronautas_auth_memberships" ("workspace_id", "status");
ALTER TABLE "agronautas_auth_sessions"
  ADD CONSTRAINT "agronautas_auth_sessions_membership_fk"
  FOREIGN KEY ("membership_id") REFERENCES "agronautas_auth_memberships"("id") ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS "agronautas_auth_field_mappings" (
  "field_id" TEXT PRIMARY KEY REFERENCES "fields"("id") ON DELETE CASCADE,
  "workspace_id" TEXT NOT NULL REFERENCES "agronautas_auth_workspaces"("id") ON DELETE CASCADE,
  "workspace_key" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "agronautas_auth_field_mappings_workspace_field_idx" ON "agronautas_auth_field_mappings" ("workspace_id", "field_id");

CREATE TABLE IF NOT EXISTS "agronautas_auth_bootstrap_state" (
  "singleton_id" TEXT PRIMARY KEY,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "input_hash" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL REFERENCES "agronautas_auth_workspaces"("id") ON DELETE RESTRICT,
  "admin_user_id" TEXT NOT NULL REFERENCES "agronautas_auth_users"("id") ON DELETE RESTRICT,
  "mapped_field_ids" JSONB NOT NULL,
  "unmapped_field_ids" JSONB NOT NULL,
  "secret_consumed_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agronautas_auth_workspaces_status_chk') THEN
    ALTER TABLE "agronautas_auth_workspaces"
      ADD CONSTRAINT "agronautas_auth_workspaces_status_chk"
      CHECK ("status" IN ('active', 'disabled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agronautas_auth_users_status_chk') THEN
    ALTER TABLE "agronautas_auth_users"
      ADD CONSTRAINT "agronautas_auth_users_status_chk"
      CHECK ("status" IN ('active', 'disabled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agronautas_auth_memberships_status_chk') THEN
    ALTER TABLE "agronautas_auth_memberships"
      ADD CONSTRAINT "agronautas_auth_memberships_status_chk"
      CHECK ("status" IN ('active', 'revoked'));
  END IF;
END $$;
