import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { corrientesRiceZoneBoundarySource } from '@repo/zod-schemas'
import { Field } from '../../../domain/entities/agronautas'
import { DEFAULT_AGRONAUTAS_WORKSPACE_ID, type AgronautasActivitySourceRecord, type AgronautasManagementRepository, type AgronautasWorkspaceContextRecord, type ManagementAuditInput, type ManagementAuditRecord, type ManagementCreateInput, type ManagementItemRecord } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'

const DEFAULT_WORKSPACE_NAME = 'Agronautas'

export class PostgresAgronautasManagementRepository implements AgronautasManagementRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async ensureDefaultWorkspace(): Promise<AgronautasWorkspaceContextRecord> {
    const result = await this.pool.query(
      `INSERT INTO "agronautas_workspaces" ("id", "name", "status")
       VALUES ($1, $2, 'active')
       ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name"
       RETURNING "id", "name", "status", "created_at", "updated_at"`,
      [DEFAULT_AGRONAUTAS_WORKSPACE_ID, DEFAULT_WORKSPACE_NAME],
    )
    const row = result.rows[0]
    const count = await this.pool.query('SELECT COUNT(*)::int AS count FROM "fields" WHERE "workspace_id" = $1', [DEFAULT_AGRONAUTAS_WORKSPACE_ID])
    const workspace = toWorkspaceRecord({ ...row, field_count: count.rows[0]?.count ?? 0 })
    if (!workspace) throw new Error('WORKSPACE_STATUS_INVALID')
    return workspace
  }

  async getWorkspace(workspaceId: string): Promise<AgronautasWorkspaceContextRecord | null> {
    const result = await this.pool.query(
       `SELECT workspace."id", workspace."name", workspace."status", workspace."created_at", workspace."updated_at",
                 (SELECT COUNT(*)::int FROM "fields" field
                  WHERE EXISTS (SELECT 1 FROM "agronautas_auth_field_mappings" mapping
                                 WHERE mapping."field_id" = field."id" AND mapping."workspace_id" = workspace."id")) AS field_count
          FROM "agronautas_workspaces" workspace
         WHERE workspace."id" = $1`,
      [workspaceId],
    )
    return result.rows[0] ? toWorkspaceRecord(result.rows[0]) : null
  }

  async listWorkspaceFields(input: { workspaceId: string; limit: number; cursor?: string }) {
    const limit = Math.min(50, Math.max(1, Math.floor(input.limit)))
    const result = await this.pool.query(
      `SELECT id, external_field_id, crop, hectares, locality_name, province_code, centroid_lat, centroid_lng,
              boundary_source, ST_AsText(boundary) AS polygon_wkt, geometry_source, geometry_updated_at, created_at, updated_at
         FROM "fields"
          WHERE EXISTS (SELECT 1 FROM "agronautas_auth_field_mappings" mapping WHERE mapping."field_id" = "fields"."id" AND mapping."workspace_id" = $2)
           AND ($3::timestamptz IS NULL OR updated_at < $3::timestamptz)
        ORDER BY updated_at DESC, id DESC
        LIMIT $1`,
      [limit + 1, input.workspaceId, input.cursor ? new Date(input.cursor) : null],
    )
    const rows = result.rows.slice(0, limit)
    return {
      items: rows.map(toFieldRecord),
      nextCursor: result.rows.length > limit ? (rows.at(-1)?.['updated_at'] as Date | undefined)?.toISOString() ?? null : null,
    }
  }

  async listFieldActivity(fieldId: string, workspaceId: string): Promise<AgronautasActivitySourceRecord[]> {
    const result = await this.pool.query(
      `WITH authorized_field AS (
         SELECT field.id FROM "fields" field
          WHERE field.id = $1
            AND EXISTS (
               SELECT 1 FROM agronautas_auth_field_mappings mapping
                WHERE mapping.field_id = field.id AND mapping.workspace_id = $2
             )
       )
       SELECT source_type, source_id, occurred_at, title FROM (
         SELECT 'field' AS source_type, field.id AS source_id, field.created_at AS occurred_at, 'Field record created' AS title FROM "fields" field JOIN authorized_field authorized ON authorized.id = field.id
         UNION ALL SELECT 'risk_snapshot', snapshot.id, snapshot.computed_at, 'Risk snapshot persisted' FROM "risk_snapshots" snapshot JOIN authorized_field authorized ON authorized.id = snapshot.field_id
         UNION ALL SELECT 'alert_snapshot', alert.id, alert.created_at, 'Alert snapshot persisted' FROM "alert_snapshots" alert JOIN authorized_field authorized ON authorized.id = alert.field_id
         UNION ALL SELECT 'ingestion_run', ingestion.run_id, COALESCE(ingestion.observed_at, ingestion.started_at), 'Signal ingestion run recorded' FROM "signal_ingestion_runs" ingestion JOIN authorized_field authorized ON authorized.id = ingestion.field_id
         UNION ALL SELECT 'recompute_run', jobs."jobId", COALESCE(jobs.completed_at, jobs.started_at, jobs.queued_at), 'Recompute run recorded' FROM "agronautas_job_runs" jobs JOIN authorized_field authorized ON authorized.id = jobs.field_id WHERE jobs."jobId" IS NOT NULL
       ) activity ORDER BY occurred_at DESC, source_type ASC, source_id ASC`,
      [fieldId, workspaceId],
    )
    return result.rows.map((row) => ({ sourceType: row['source_type'], sourceId: row['source_id'], occurredAt: new Date(String(row['occurred_at'])), title: String(row['title']) }))
  }

  async listManagement(input: { workspaceId: string; fieldId?: string }): Promise<{ items: ManagementItemRecord[]; audit: ManagementAuditRecord[] }> {
    const itemResult = await this.pool.query(
      `SELECT item.* FROM "agronautas_management_items" item
        WHERE item."workspace_id" = $1
          AND ($2::text IS NULL OR item."field_id" = $2)
          AND (item."field_id" IS NULL OR EXISTS (
            SELECT 1 FROM "agronautas_auth_field_mappings" mapping
             WHERE mapping."field_id" = item."field_id" AND mapping."workspace_id" = item."workspace_id"
          ))
        ORDER BY item."updated_at" DESC, item."id" DESC`,
      [input.workspaceId, input.fieldId ?? null],
    )
    const items = itemResult.rows.map(toManagementItemRecord)
    const auditResult = await this.pool.query(
      `SELECT audit.* FROM "agronautas_management_audit" audit
         LEFT JOIN "agronautas_management_items" item
           ON item."id" = audit."target_id" AND item."workspace_id" = audit."workspace_id"
        WHERE audit."workspace_id" = $1
          AND ($2::text IS NULL OR item."field_id" = $2)
          AND (item."field_id" IS NULL OR EXISTS (
            SELECT 1 FROM "agronautas_auth_field_mappings" mapping
             WHERE mapping."field_id" = item."field_id" AND mapping."workspace_id" = item."workspace_id"
          ))
        ORDER BY audit."occurred_at" DESC, audit."audit_id" DESC`,
      [input.workspaceId, input.fieldId ?? null],
    )
    return { items, audit: auditResult.rows.map(toManagementAuditRecord) }
  }

  async getManagementItem(input: { workspaceId: string; itemId: string }): Promise<ManagementItemRecord | null> {
    const result = await this.pool.query(
      `SELECT * FROM "agronautas_management_items" WHERE "id" = $1 AND "workspace_id" = $2`,
      [input.itemId, input.workspaceId],
    )
    return result.rows[0] ? toManagementItemRecord(result.rows[0]) : null
  }

  async recordManagementAudit(input: ManagementAuditInput): Promise<ManagementAuditRecord> {
    return this.insertManagementAudit(input)
  }

  async createManagement(input: ManagementCreateInput): Promise<{ status: 'created' | 'duplicate' | 'conflict'; resource: ManagementItemRecord; audit: ManagementAuditRecord }> {
    await this.pool.query('BEGIN')
    try {
      const inserted = await this.pool.query(
        `INSERT INTO "agronautas_management_items"
          ("id", "kind", "workspace_id", "field_id", "parent_id", "name", "status", "revision", "responsible_actor_id", "created_by_actor_id", "idempotency_key", "source_location_ids")
         SELECT $1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11::jsonb
          WHERE ($4::text IS NULL OR EXISTS (
            SELECT 1 FROM "agronautas_auth_field_mappings" mapping
             WHERE mapping."field_id" = $4 AND mapping."workspace_id" = $3
          ))
         ON CONFLICT ("workspace_id", "idempotency_key") DO NOTHING
         RETURNING *`,
        [randomUUID(), input.kind, input.workspaceId, input.fieldId ?? null, input.parentId ?? null, input.name, input.status, input.responsibleActorId ?? null, input.actorId, input.idempotencyKey, JSON.stringify(input.sourceLocationIds)],
      )
      let resource: ManagementItemRecord
      let status: 'created' | 'duplicate' | 'conflict'
      if (inserted.rows[0]) {
        resource = toManagementItemRecord(inserted.rows[0])
        status = 'created'
      } else {
        const existing = await this.pool.query('SELECT * FROM "agronautas_management_items" WHERE "workspace_id" = $1 AND "idempotency_key" = $2', [input.workspaceId, input.idempotencyKey])
        if (!existing.rows[0]) throw new Error('MANAGEMENT_SCOPE_DENIED')
        resource = toManagementItemRecord(existing.rows[0])
        status = sameCreatePayload(resource, input) ? 'duplicate' : 'conflict'
      }
      const audit = await this.insertManagementAudit({
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        action: status === 'created' ? 'create' : 'retry',
        targetId: resource.id,
        outcome: status === 'created' ? 'accepted' : status,
        revisionBefore: status === 'created' ? null : resource.revision,
        revisionAfter: resource.revision,
        requestId: input.requestId,
      })
      await this.pool.query('COMMIT')
      return { status, resource, audit }
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }

  async transitionManagement(input: { workspaceId: string; itemId: string; expectedRevision: number; status: ManagementItemRecord['status']; actorId: string; requestId: string }): Promise<{ status: 'transitioned' | 'stale' | 'not_found'; resource?: ManagementItemRecord; audit: ManagementAuditRecord }> {
    await this.pool.query('BEGIN')
    try {
      const updated = await this.pool.query(
        `UPDATE "agronautas_management_items"
            SET "status" = $1, "revision" = "revision" + 1, "updated_at" = now()
          WHERE "id" = $2 AND "workspace_id" = $3 AND "revision" = $4
          RETURNING *`,
        [input.status, input.itemId, input.workspaceId, input.expectedRevision],
      )
      const existing = updated.rows[0] ? toManagementItemRecord(updated.rows[0]) : undefined
      if (existing) {
        const audit = await this.insertManagementAudit({ workspaceId: input.workspaceId, actorId: input.actorId, action: 'transition', targetId: existing.id, outcome: 'accepted', revisionBefore: input.expectedRevision, revisionAfter: existing.revision, requestId: input.requestId })
        await this.pool.query('COMMIT')
        return { status: 'transitioned', resource: existing, audit }
      }
      const currentResult = await this.pool.query('SELECT * FROM "agronautas_management_items" WHERE "id" = $1 AND "workspace_id" = $2', [input.itemId, input.workspaceId])
      const current = currentResult.rows[0] ? toManagementItemRecord(currentResult.rows[0]) : undefined
      const outcome = current ? 'conflict' : 'unavailable'
      const audit = await this.insertManagementAudit({ workspaceId: input.workspaceId, actorId: input.actorId, action: 'transition', targetId: input.itemId, outcome, revisionBefore: current?.revision ?? null, revisionAfter: current?.revision ?? null, requestId: input.requestId })
      await this.pool.query('COMMIT')
      return current ? { status: 'stale', resource: current, audit } : { status: 'not_found', audit }
    } catch (error) {
      await this.pool.query('ROLLBACK')
      throw error
    }
  }

  private async insertManagementAudit(input: ManagementAuditInput): Promise<ManagementAuditRecord> {
    const result = await this.pool.query(
      `INSERT INTO "agronautas_management_audit" ("audit_id", "workspace_id", "actor_id", "action", "target_id", "outcome", "revision_before", "revision_after", "request_id")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [randomUUID(), input.workspaceId, input.actorId, input.action, input.targetId, input.outcome, input.revisionBefore, input.revisionAfter, input.requestId],
    )
    return toManagementAuditRecord(result.rows[0])
  }
}

function toWorkspaceRecord(row: Record<string, unknown>): AgronautasWorkspaceContextRecord | null {
  if (row['status'] !== 'active' && row['status'] !== 'disabled') return null
  return { workspaceId: String(row['id']), name: String(row['name']), status: row['status'], fieldCount: Number(row['field_count']), createdAt: new Date(String(row['created_at'])), updatedAt: new Date(String(row['updated_at'])) }
}

function toFieldRecord(row: Record<string, unknown>) {
  const field = new Field({
    id: String(row['id']), externalFieldId: String(row['external_field_id']), crop: String(row['crop']), hectares: Number(row['hectares']), localityName: String(row['locality_name']), provinceCode: String(row['province_code']),
    centroid: { lat: Number(row['centroid_lat']), lng: Number(row['centroid_lng']) }, boundaryMetadata: (row['boundary_source'] as typeof corrientesRiceZoneBoundarySource) ?? corrientesRiceZoneBoundarySource,
    polygonWkt: row['polygon_wkt'] ? String(row['polygon_wkt']) : undefined, geometrySource: row['geometry_source'] ? String(row['geometry_source']) as 'operator' | 'google' | 'fallback' : undefined,
  })
  return { field, createdAt: new Date(String(row['created_at'])), updatedAt: new Date(String(row['updated_at'])), geometryUpdatedAt: row['geometry_updated_at'] ? new Date(String(row['geometry_updated_at'])) : null }
}

function toManagementItemRecord(row: Record<string, unknown>): ManagementItemRecord {
  return {
    id: String(row['id']), kind: row['kind'] as ManagementItemRecord['kind'], workspaceId: String(row['workspace_id']),
    fieldId: row['field_id'] == null ? null : String(row['field_id']), parentId: row['parent_id'] == null ? null : String(row['parent_id']),
    name: String(row['name']), status: row['status'] as ManagementItemRecord['status'], revision: Number(row['revision']),
    responsibleActorId: row['responsible_actor_id'] == null ? null : String(row['responsible_actor_id']), createdByActorId: String(row['created_by_actor_id']),
    idempotencyKey: String(row['idempotency_key']), sourceLocationIds: Array.isArray(row['source_location_ids']) ? row['source_location_ids'] as string[] : [],
    createdAt: new Date(String(row['created_at'])), updatedAt: new Date(String(row['updated_at'])),
  }
}

function toManagementAuditRecord(row: Record<string, unknown>): ManagementAuditRecord {
  return { auditId: String(row['audit_id']), actorId: String(row['actor_id']), action: row['action'] as ManagementAuditRecord['action'], targetId: String(row['target_id']), outcome: row['outcome'] as ManagementAuditRecord['outcome'], revisionBefore: row['revision_before'] == null ? null : Number(row['revision_before']), revisionAfter: row['revision_after'] == null ? null : Number(row['revision_after']), occurredAt: new Date(String(row['occurred_at'])), requestId: String(row['request_id']) }
}

function sameCreatePayload(resource: ManagementItemRecord, input: ManagementCreateInput): boolean {
  return resource.kind === input.kind && resource.fieldId === (input.fieldId ?? null) && resource.parentId === (input.parentId ?? null) && resource.name === input.name && resource.status === input.status && resource.responsibleActorId === (input.responsibleActorId ?? null)
}
