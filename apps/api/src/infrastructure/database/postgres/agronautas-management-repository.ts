import type { Pool } from 'pg'
import { corrientesRiceZoneBoundarySource } from '@repo/zod-schemas'
import { Field } from '../../../domain/entities/agronautas'
import { DEFAULT_AGRONAUTAS_WORKSPACE_ID, type AgronautasActivitySourceRecord, type AgronautasWorkspaceContextRecord, type AgronautasWorkspaceRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'

const DEFAULT_WORKSPACE_NAME = 'Agronautas'

export class PostgresAgronautasManagementRepository implements AgronautasWorkspaceRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async ensureDefaultWorkspace(): Promise<AgronautasWorkspaceContextRecord> {
    const result = await this.pool.query(
      `INSERT INTO "agronautas_workspaces" ("id", "name", "status")
       VALUES ($1, $2, 'active')
       ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name"
       RETURNING "id", "name", "status", "created_at", "updated_at"`,
      [DEFAULT_AGRONAUTAS_WORKSPACE_ID, DEFAULT_WORKSPACE_NAME],
    )
    await this.pool.query('UPDATE "fields" SET "workspace_id" = $1 WHERE "workspace_id" IS NULL', [DEFAULT_AGRONAUTAS_WORKSPACE_ID])
    const row = result.rows[0]
    const count = await this.pool.query('SELECT COUNT(*)::int AS count FROM "fields" WHERE "workspace_id" = $1', [DEFAULT_AGRONAUTAS_WORKSPACE_ID])
    return toWorkspaceRecord({ ...row, field_count: count.rows[0]?.count ?? 0 })
  }

  async getWorkspace(workspaceId: string): Promise<AgronautasWorkspaceContextRecord | null> {
    const result = await this.pool.query(
      `SELECT workspace."id", workspace."name", workspace."status", workspace."created_at", workspace."updated_at", COUNT(field."id")::int AS field_count
         FROM "agronautas_workspaces" workspace
         LEFT JOIN "fields" field ON field."workspace_id" = workspace."id"
        WHERE workspace."id" = $1
        GROUP BY workspace."id"`,
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
        WHERE workspace_id = $2 AND ($3::timestamptz IS NULL OR updated_at < $3::timestamptz)
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

  async listFieldActivity(fieldId: string): Promise<AgronautasActivitySourceRecord[]> {
    const result = await this.pool.query(
      `SELECT source_type, source_id, occurred_at, title FROM (
         SELECT 'field' AS source_type, id AS source_id, created_at AS occurred_at, 'Field record created' AS title FROM "fields" WHERE id = $1
         UNION ALL SELECT 'risk_snapshot', id, computed_at, 'Risk snapshot persisted' FROM "risk_snapshots" WHERE field_id = $1
         UNION ALL SELECT 'alert_snapshot', id, created_at, 'Alert snapshot persisted' FROM "alert_snapshots" WHERE field_id = $1
         UNION ALL SELECT 'ingestion_run', run_id, COALESCE(observed_at, started_at), 'Signal ingestion run recorded' FROM "signal_ingestion_runs" WHERE field_id = $1
         UNION ALL SELECT 'recompute_run', "jobId", COALESCE(completed_at, started_at, queued_at), 'Recompute run recorded' FROM "agronautas_job_runs" WHERE field_id = $1 AND "jobId" IS NOT NULL
       ) activity ORDER BY occurred_at DESC, source_type ASC, source_id ASC`,
      [fieldId],
    )
    return result.rows.map((row) => ({ sourceType: row['source_type'], sourceId: row['source_id'], occurredAt: new Date(String(row['occurred_at'])), title: String(row['title']) }))
  }
}

function toWorkspaceRecord(row: Record<string, unknown>): AgronautasWorkspaceContextRecord {
  return { workspaceId: String(row['id']), name: String(row['name']), status: 'active', fieldCount: Number(row['field_count']), createdAt: new Date(String(row['created_at'])), updatedAt: new Date(String(row['updated_at'])) }
}

function toFieldRecord(row: Record<string, unknown>) {
  const field = new Field({
    id: String(row['id']), externalFieldId: String(row['external_field_id']), crop: String(row['crop']), hectares: Number(row['hectares']), localityName: String(row['locality_name']), provinceCode: String(row['province_code']),
    centroid: { lat: Number(row['centroid_lat']), lng: Number(row['centroid_lng']) }, boundaryMetadata: (row['boundary_source'] as typeof corrientesRiceZoneBoundarySource) ?? corrientesRiceZoneBoundarySource,
    polygonWkt: row['polygon_wkt'] ? String(row['polygon_wkt']) : undefined, geometrySource: row['geometry_source'] ? String(row['geometry_source']) as 'operator' | 'google' | 'fallback' : undefined,
  })
  return { field, createdAt: new Date(String(row['created_at'])), updatedAt: new Date(String(row['updated_at'])), geometryUpdatedAt: row['geometry_updated_at'] ? new Date(String(row['geometry_updated_at'])) : null }
}
