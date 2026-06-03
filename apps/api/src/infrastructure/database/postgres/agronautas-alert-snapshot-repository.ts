import type { Pool } from 'pg'
import type { AlertSnapshotRecord, AlertSnapshotRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'

export class PostgresAlertSnapshotRepository implements AlertSnapshotRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async saveMany(alerts: AlertSnapshotRecord[]): Promise<void> {
    for (const alert of alerts) {
      await this.pool.query(
        `INSERT INTO alert_snapshots (
          id, field_id, risk_snapshot_id, run_id, alert_type, priority, confidence, freshness, stale_cause, degradation_reasons, payload
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          priority = EXCLUDED.priority,
          confidence = EXCLUDED.confidence,
          freshness = EXCLUDED.freshness,
          stale_cause = EXCLUDED.stale_cause,
          degradation_reasons = EXCLUDED.degradation_reasons,
          payload = EXCLUDED.payload`,
        [
          alert.alertId,
          alert.fieldId,
          alert.basedOnSnapshotId,
          alert.runId,
          alert.type,
          alert.priority,
          alert.confidence,
          alert.freshness,
          alert.staleCause ?? null,
          JSON.stringify(alert.degradationReasons),
          JSON.stringify(alert),
        ],
      )
    }
  }

  async getLatestForField(fieldId: string): Promise<AlertSnapshotRecord[]> {
    const latest = await this.pool.query(`SELECT created_at FROM alert_snapshots WHERE field_id = $1 ORDER BY created_at DESC LIMIT 1`, [fieldId])
    const createdAt = latest.rows[0]?.created_at
    if (!createdAt) return []

    return this.listByCreatedAt(fieldId, createdAt)
  }

  async listTimeline(fieldId: string, limit: number): Promise<AlertSnapshotRecord[]> {
    const result = await this.pool.query(
      `SELECT id, field_id, risk_snapshot_id, run_id, alert_type, priority, confidence, freshness, stale_cause, degradation_reasons
       FROM alert_snapshots WHERE field_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [fieldId, limit],
    )

    return result.rows.map(mapAlertRow)
  }

  private async listByCreatedAt(fieldId: string, createdAt: Date): Promise<AlertSnapshotRecord[]> {
    const result = await this.pool.query(
      `SELECT id, field_id, risk_snapshot_id, run_id, alert_type, priority, confidence, freshness, stale_cause, degradation_reasons
       FROM alert_snapshots WHERE field_id = $1 AND created_at = $2 ORDER BY priority ASC, confidence DESC`,
      [fieldId, createdAt],
    )

    return result.rows.map(mapAlertRow)
  }
}

function mapAlertRow(row: Record<string, unknown>): AlertSnapshotRecord {
  return {
    alertId: String(row['id']),
    fieldId: String(row['field_id']),
    basedOnSnapshotId: String(row['risk_snapshot_id']),
    runId: String(row['run_id']),
    type: row['alert_type'] as AlertSnapshotRecord['type'],
    priority: Number(row['priority']) as AlertSnapshotRecord['priority'],
    confidence: Number(row['confidence']),
    freshness: row['freshness'] as AlertSnapshotRecord['freshness'],
    degradationReasons: ((row['degradation_reasons'] as string[]) ?? []).map(String),
    staleCause: row['stale_cause'] == null ? undefined : String(row['stale_cause']),
  }
}
