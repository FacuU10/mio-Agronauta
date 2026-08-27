import type { Pool } from 'pg'
import { RiskSnapshotFoundation } from '../../../domain/entities/agronautas'
import type { RiskSnapshotRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'

const LEGACY_RISK_SNAPSHOT_SOURCE = 'risk-snapshot.v1' as const
const ENGINE_SELECTION_STATUS = 'undecided' as const
const ENGINE_CALIBRATION_STATUS = 'not_established' as const

interface LegacyRiskSnapshotDbRow {
  id: string
  field_id: string
  run_id: string
  score: string | number
  confidence: string | number
  computed_at: string | number | Date
  valid_until: string | number | Date
  rule_version: string
  stale_cause?: string | null
  degradation_reasons?: unknown
  drivers?: unknown
  evidence_refs?: unknown
  summary_payload?: unknown
}

export interface LegacyRiskSnapshotRowRead {
  source: typeof LEGACY_RISK_SNAPSHOT_SOURCE
  snapshot: RiskSnapshotFoundation
  engine: {
    id: string
    version: string
    selectionStatus: typeof ENGINE_SELECTION_STATUS
    calibrationStatus: typeof ENGINE_CALIBRATION_STATUS
  }
}

export class PostgresRiskSnapshotRepository implements RiskSnapshotRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async save(snapshot: RiskSnapshotFoundation): Promise<void> {
    await this.pool.query(
      `INSERT INTO risk_snapshots (
        id, field_id, run_id, score, confidence, level, freshness,
        computed_at, valid_until, rule_version, stale_cause,
        degradation_reasons, drivers, evidence_refs, summary_payload
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        score = EXCLUDED.score,
        confidence = EXCLUDED.confidence,
        level = EXCLUDED.level,
        freshness = EXCLUDED.freshness,
        computed_at = EXCLUDED.computed_at,
        valid_until = EXCLUDED.valid_until,
        rule_version = EXCLUDED.rule_version,
        stale_cause = EXCLUDED.stale_cause,
        degradation_reasons = EXCLUDED.degradation_reasons,
        drivers = EXCLUDED.drivers,
        evidence_refs = EXCLUDED.evidence_refs,
        summary_payload = EXCLUDED.summary_payload`,
      [
        snapshot.props.snapshotId,
        snapshot.props.fieldId,
        snapshot.props.runId,
        snapshot.props.score,
        snapshot.props.confidence,
        snapshot.level,
        snapshot.freshness,
        snapshot.props.computedAt,
        snapshot.props.validUntil,
        snapshot.props.ruleVersion,
        snapshot.props.staleCause ?? null,
        JSON.stringify(snapshot.props.degradationReasons),
        JSON.stringify(snapshot.props.drivers),
        JSON.stringify(snapshot.props.evidenceRefs),
        JSON.stringify(snapshot.toContract()),
      ],
    )
  }

  async getLatest(fieldId: string): Promise<RiskSnapshotFoundation | null> {
    const result = await this.pool.query(
      `SELECT id, field_id, run_id, score, confidence, computed_at, valid_until, rule_version,
              stale_cause, degradation_reasons, drivers, evidence_refs, summary_payload
       FROM risk_snapshots WHERE field_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [fieldId],
    )

    const row = result.rows[0]
    if (!row) return null

    return adaptLegacyRiskSnapshotRow(row).snapshot
  }

  async listTimeline(fieldId: string, limit: number): Promise<RiskSnapshotFoundation[]> {
    const result = await this.pool.query(
      `SELECT id, field_id, run_id, score, confidence, computed_at, valid_until, rule_version,
              stale_cause, degradation_reasons, drivers, evidence_refs, summary_payload
       FROM risk_snapshots WHERE field_id = $1 ORDER BY computed_at DESC LIMIT $2`,
      [fieldId, limit],
    )

    return result.rows.map((row) => adaptLegacyRiskSnapshotRow(row).snapshot)
  }
}

export function adaptLegacyRiskSnapshotRow(row: LegacyRiskSnapshotDbRow): LegacyRiskSnapshotRowRead {
  const lineage = readLineage(row.summary_payload)
  const id = lineage.engineId ?? String(row.rule_version)
  const version = lineage.engineVersion ?? String(row.rule_version)
  return {
    source: LEGACY_RISK_SNAPSHOT_SOURCE,
    snapshot: new RiskSnapshotFoundation({
      snapshotId: String(row.id),
      fieldId: String(row.field_id),
      runId: String(row.run_id),
      score: Number(row.score),
      confidence: Number(row.confidence),
      computedAt: new Date(row.computed_at),
      validUntil: new Date(row.valid_until),
      ruleVersion: String(row.rule_version),
      staleCause: row.stale_cause ?? undefined,
      degradationReasons: Array.isArray(row.degradation_reasons) ? row.degradation_reasons as RiskSnapshotFoundation['props']['degradationReasons'] : [],
      drivers: Array.isArray(row.drivers) ? row.drivers as RiskSnapshotFoundation['props']['drivers'] : [],
      evidenceRefs: Array.isArray(row.evidence_refs) ? row.evidence_refs.filter((item): item is string => typeof item === 'string') : [],
      ...lineage,
    }),
    engine: { id, version, selectionStatus: ENGINE_SELECTION_STATUS, calibrationStatus: ENGINE_CALIBRATION_STATUS },
  }
}

function readLineage(value: unknown): Pick<RiskSnapshotFoundation['props'], 'engineId' | 'engineVersion' | 'sourceRunIds' | 'acquisitionTimes' | 'alertSnapshotIds'> {
  if (!value || typeof value !== 'object') return {}
  const payload = value as Record<string, unknown>
  const acquisitionTimes = Array.isArray(payload['acquisitionTimes'])
    ? payload['acquisitionTimes']
        .filter((item): item is string => typeof item === 'string')
        .map((item) => new Date(item))
        .filter((item) => !Number.isNaN(item.getTime()))
    : undefined
  return {
    engineId: typeof payload['engineId'] === 'string' ? payload['engineId'] : undefined,
    engineVersion: typeof payload['engineVersion'] === 'string' ? payload['engineVersion'] : undefined,
    sourceRunIds: Array.isArray(payload['sourceRunIds']) ? payload['sourceRunIds'].filter((item): item is string => typeof item === 'string') : undefined,
    acquisitionTimes,
    alertSnapshotIds: Array.isArray(payload['alertSnapshotIds']) ? payload['alertSnapshotIds'].filter((item): item is string => typeof item === 'string') : undefined,
  }
}
