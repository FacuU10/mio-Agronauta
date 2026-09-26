CREATE TABLE "agronautas_marketplace_listings" (
    "listing_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "participant_ref" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "availability_status" TEXT NOT NULL,
    "availability_at" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(18,3),
    "unit" TEXT,
    "quality_status" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "source_url" TEXT,
    "provenance_recorded_at" TIMESTAMP(3) NOT NULL,
    "freshness_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agronautas_marketplace_listings_pkey" PRIMARY KEY ("listing_id")
);

CREATE TABLE "agronautas_marketplace_rfqs" (
    "rfq_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "requester_actor_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "item_name" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "participant_refs" JSONB NOT NULL,
    "review_status" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_actor_id" TEXT,

    CONSTRAINT "agronautas_marketplace_rfqs_pkey" PRIMARY KEY ("rfq_id")
);

CREATE TABLE "agronautas_marketplace_audit" (
    "audit_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "revision_before" INTEGER,
    "revision_after" INTEGER,
    "request_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agronautas_marketplace_audit_pkey" PRIMARY KEY ("audit_id")
);

CREATE INDEX "agronautas_marketplace_listings_workspace_market_updated_idx" ON "agronautas_marketplace_listings"("workspace_id", "market_id", "updated_at" DESC);
CREATE INDEX "agronautas_marketplace_listings_workspace_expiry_idx" ON "agronautas_marketplace_listings"("workspace_id", "freshness_expires_at");
CREATE UNIQUE INDEX "agronautas_marketplace_rfqs_workspace_idempotency_key" ON "agronautas_marketplace_rfqs"("workspace_id", "idempotency_key");
CREATE INDEX "agronautas_marketplace_rfqs_workspace_updated_idx" ON "agronautas_marketplace_rfqs"("workspace_id", "updated_at" DESC, "rfq_id");
CREATE INDEX "agronautas_marketplace_rfqs_workspace_status_updated_idx" ON "agronautas_marketplace_rfqs"("workspace_id", "review_status", "updated_at" DESC);
CREATE INDEX "agronautas_marketplace_audit_workspace_occurred_idx" ON "agronautas_marketplace_audit"("workspace_id", "occurred_at" DESC, "audit_id");
CREATE INDEX "agronautas_marketplace_audit_target_occurred_idx" ON "agronautas_marketplace_audit"("target_id", "occurred_at" DESC);

ALTER TABLE "agronautas_marketplace_listings" ADD CONSTRAINT "agronautas_marketplace_listings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "agronautas_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agronautas_marketplace_rfqs" ADD CONSTRAINT "agronautas_marketplace_rfqs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "agronautas_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agronautas_marketplace_audit" ADD CONSTRAINT "agronautas_marketplace_audit_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "agronautas_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
