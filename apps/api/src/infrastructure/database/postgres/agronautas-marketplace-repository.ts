import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type { AgronautasMarketplaceRfqStatus } from '@repo/zod-schemas'
import type { MarketplaceAuditRecord, MarketplaceListingRecord, MarketplaceRepository, MarketplaceRfqCreateInput, MarketplaceRfqRecord } from '../../../domain/repositories/agronautas-marketplace'
import { getPostgresPool } from './pool'

export class PostgresAgronautasMarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async listListings(input: { workspaceId: string; marketId?: string; search?: string }): Promise<MarketplaceListingRecord[]> {
    const result = await this.pool.query(
      `SELECT listing_id, workspace_id, market_id, participant_ref, item_name, title,
              availability_status, availability_at, quantity, unit, quality_status,
              source_key, source_url, provenance_recorded_at, freshness_expires_at, updated_at
         FROM "agronautas_marketplace_listings"
        WHERE workspace_id = $1
          AND ($2::text IS NULL OR market_id = $2)
          AND ($3::text IS NULL OR item_name ILIKE '%' || $3 || '%' OR title ILIKE '%' || $3 || '%')
        ORDER BY updated_at DESC, listing_id ASC`,
      [input.workspaceId, input.marketId ?? null, input.search?.trim() || null],
    )
    return result.rows.map(toListingRecord)
  }

  async listRfqs(input: { workspaceId: string; requesterActorId?: string }): Promise<{ items: MarketplaceRfqRecord[]; audit: MarketplaceAuditRecord[] }> {
    const itemResult = await this.pool.query(
      `SELECT * FROM "agronautas_marketplace_rfqs"
        WHERE workspace_id = $1
          AND ($2::text IS NULL OR requester_actor_id = $2)
        ORDER BY updated_at DESC, rfq_id ASC`,
      [input.workspaceId, input.requesterActorId ?? null],
    )
    const items = itemResult.rows.map(toRfqRecord)
    const auditResult = await this.pool.query(
      `SELECT * FROM "agronautas_marketplace_audit"
        WHERE workspace_id = $1 AND target_id = ANY($2::text[])
        ORDER BY occurred_at DESC, audit_id ASC`,
      [input.workspaceId, items.map((item) => item.rfqId)],
    )
    return { items, audit: auditResult.rows.map(toAuditRecord) }
  }

  async getRfq(input: { workspaceId: string; rfqId: string }): Promise<MarketplaceRfqRecord | null> {
    const result = await this.pool.query('SELECT * FROM "agronautas_marketplace_rfqs" WHERE workspace_id = $1 AND rfq_id = $2', [input.workspaceId, input.rfqId])
    return result.rows[0] ? toRfqRecord(result.rows[0]) : null
  }

  async createRfq(input: MarketplaceRfqCreateInput): Promise<{ status: 'created' | 'duplicate' | 'conflict'; resource: MarketplaceRfqRecord; audit: MarketplaceAuditRecord }> {
    await this.pool.query('BEGIN')
    try {
      const inserted = await this.pool.query(
        `INSERT INTO "agronautas_marketplace_rfqs"
          (rfq_id, workspace_id, requester_actor_id, listing_id, item_name, quantity, unit, locality, participant_refs, review_status, revision, idempotency_key, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'submitted', 1, $10, now())
         ON CONFLICT (workspace_id, idempotency_key) DO NOTHING
         RETURNING *`,
        [randomUUID(), input.workspaceId, input.actorId, input.listingId ?? null, input.itemName, input.quantity, input.unit, input.locality, JSON.stringify(input.participantRefs), input.idempotencyKey],
      )
      let resource: MarketplaceRfqRecord
      let status: 'created' | 'duplicate' | 'conflict'
      if (inserted.rows[0]) {
        resource = toRfqRecord(inserted.rows[0])
        status = 'created'
      } else {
        const existing = await this.pool.query('SELECT * FROM "agronautas_marketplace_rfqs" WHERE workspace_id = $1 AND idempotency_key = $2', [input.workspaceId, input.idempotencyKey])
        if (!existing.rows[0]) throw new Error('MARKETPLACE_SCOPE_DENIED')
        resource = toRfqRecord(existing.rows[0])
        status = sameCreatePayload(resource, input) ? 'duplicate' : 'conflict'
      }
      const audit = await this.insertAudit({ workspaceId: input.workspaceId, actorId: input.actorId, action: status === 'created' ? 'submit' : 'retry', targetId: resource.rfqId, outcome: status === 'created' ? 'accepted' : status, revisionBefore: status === 'created' ? null : resource.revision, revisionAfter: resource.revision, requestId: input.requestId, occurredAt: new Date() })
      await this.pool.query('COMMIT')
      return { status, resource, audit }
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }

  async reviewRfq(input: { workspaceId: string; rfqId: string; expectedRevision: number; status: AgronautasMarketplaceRfqStatus; actorId: string; requestId: string }): Promise<{ status: 'reviewed' | 'stale' | 'not_found'; resource?: MarketplaceRfqRecord; audit: MarketplaceAuditRecord }> {
    await this.pool.query('BEGIN')
    try {
      const updated = await this.pool.query(
        `UPDATE "agronautas_marketplace_rfqs"
            SET review_status = $1, revision = revision + 1, reviewed_at = now(), reviewer_actor_id = $2, updated_at = now()
          WHERE workspace_id = $3 AND rfq_id = $4 AND revision = $5
          RETURNING *`,
        [input.status, input.actorId, input.workspaceId, input.rfqId, input.expectedRevision],
      )
      if (updated.rows[0]) {
        const resource = toRfqRecord(updated.rows[0])
        const audit = await this.insertAudit({ workspaceId: input.workspaceId, actorId: input.actorId, action: 'review', targetId: resource.rfqId, outcome: 'accepted', revisionBefore: input.expectedRevision, revisionAfter: resource.revision, requestId: input.requestId, occurredAt: new Date() })
        await this.pool.query('COMMIT')
        return { status: 'reviewed', resource, audit }
      }
      const current = await this.getRfq(input)
      const audit = await this.insertAudit({ workspaceId: input.workspaceId, actorId: input.actorId, action: 'review', targetId: input.rfqId, outcome: current ? 'conflict' : 'unavailable', revisionBefore: current?.revision ?? null, revisionAfter: current?.revision ?? null, requestId: input.requestId, occurredAt: new Date() })
      await this.pool.query('COMMIT')
      return current ? { status: 'stale', resource: current, audit } : { status: 'not_found', audit }
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }

  async cancelRfq(input: { workspaceId: string; rfqId: string; expectedRevision: number; actorId: string; requestId: string }): Promise<{ status: 'cancelled' | 'stale' | 'not_found'; resource?: MarketplaceRfqRecord; audit: MarketplaceAuditRecord }> {
    await this.pool.query('BEGIN')
    try {
      const updated = await this.pool.query(
        `UPDATE "agronautas_marketplace_rfqs"
            SET review_status = 'cancelled', revision = revision + 1, updated_at = now()
          WHERE workspace_id = $1 AND rfq_id = $2 AND revision = $3
          RETURNING *`,
        [input.workspaceId, input.rfqId, input.expectedRevision],
      )
      if (updated.rows[0]) {
        const resource = toRfqRecord(updated.rows[0])
        const audit = await this.insertAudit({ workspaceId: input.workspaceId, actorId: input.actorId, action: 'cancel', targetId: resource.rfqId, outcome: 'accepted', revisionBefore: input.expectedRevision, revisionAfter: resource.revision, requestId: input.requestId, occurredAt: new Date() })
        await this.pool.query('COMMIT')
        return { status: 'cancelled', resource, audit }
      }
      const current = await this.getRfq(input)
      const audit = await this.insertAudit({ workspaceId: input.workspaceId, actorId: input.actorId, action: 'cancel', targetId: input.rfqId, outcome: current ? 'conflict' : 'unavailable', revisionBefore: current?.revision ?? null, revisionAfter: current?.revision ?? null, requestId: input.requestId, occurredAt: new Date() })
      await this.pool.query('COMMIT')
      return current ? { status: 'stale', resource: current, audit } : { status: 'not_found', audit }
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }

  appendAudit(input: MarketplaceAuditRecord): Promise<MarketplaceAuditRecord> {
    return this.insertAudit(input)
  }

  private async insertAudit(input: Omit<MarketplaceAuditRecord, 'auditId'> & { auditId?: string }): Promise<MarketplaceAuditRecord> {
    const result = await this.pool.query(
      `INSERT INTO "agronautas_marketplace_audit"
        (audit_id, workspace_id, actor_id, action, target_id, outcome, revision_before, revision_after, request_id, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [input.auditId || randomUUID(), input.workspaceId, input.actorId, input.action, input.targetId, input.outcome, input.revisionBefore, input.revisionAfter, input.requestId, input.occurredAt],
    )
    return toAuditRecord(result.rows[0])
  }
}

function toListingRecord(row: Record<string, unknown>): MarketplaceListingRecord {
  return { listingId: String(row['listing_id']), workspaceId: String(row['workspace_id']), marketId: String(row['market_id']), participantRef: String(row['participant_ref']), itemName: String(row['item_name']), title: String(row['title']), availabilityStatus: row['availability_status'] as MarketplaceListingRecord['availabilityStatus'], availabilityAt: new Date(String(row['availability_at'])), quantity: row['quantity'] == null ? null : Number(row['quantity']), unit: row['unit'] == null ? null : String(row['unit']), qualityStatus: row['quality_status'] as MarketplaceListingRecord['qualityStatus'], sourceKey: String(row['source_key']), sourceUrl: row['source_url'] == null ? null : String(row['source_url']), provenanceRecordedAt: new Date(String(row['provenance_recorded_at'])), freshnessExpiresAt: new Date(String(row['freshness_expires_at'])), updatedAt: new Date(String(row['updated_at'])) }
}

function toRfqRecord(row: Record<string, unknown>): MarketplaceRfqRecord {
  return { rfqId: String(row['rfq_id']), workspaceId: String(row['workspace_id']), requesterActorId: String(row['requester_actor_id']), listingId: row['listing_id'] == null ? null : String(row['listing_id']), itemName: String(row['item_name']), quantity: Number(row['quantity']), unit: String(row['unit']), locality: String(row['locality']), participantRefs: Array.isArray(row['participant_refs']) ? row['participant_refs'].map(String) : [], reviewStatus: row['review_status'] as MarketplaceRfqRecord['reviewStatus'], revision: Number(row['revision']), idempotencyKey: String(row['idempotency_key']), createdAt: new Date(String(row['created_at'])), updatedAt: new Date(String(row['updated_at'])), reviewedAt: row['reviewed_at'] == null ? null : new Date(String(row['reviewed_at'])), reviewerActorId: row['reviewer_actor_id'] == null ? null : String(row['reviewer_actor_id']) }
}

function toAuditRecord(row: Record<string, unknown>): MarketplaceAuditRecord {
  return { auditId: String(row['audit_id']), workspaceId: String(row['workspace_id']), actorId: String(row['actor_id']), action: row['action'] as MarketplaceAuditRecord['action'], targetId: String(row['target_id']), outcome: row['outcome'] as MarketplaceAuditRecord['outcome'], revisionBefore: row['revision_before'] == null ? null : Number(row['revision_before']), revisionAfter: row['revision_after'] == null ? null : Number(row['revision_after']), requestId: String(row['request_id']), occurredAt: new Date(String(row['occurred_at'])) }
}

function sameCreatePayload(resource: MarketplaceRfqRecord, input: MarketplaceRfqCreateInput): boolean {
  return resource.requesterActorId === input.actorId && resource.listingId === (input.listingId ?? null) && resource.itemName === input.itemName && resource.quantity === input.quantity && resource.unit === input.unit && resource.locality === input.locality && JSON.stringify(resource.participantRefs) === JSON.stringify(input.participantRefs)
}
