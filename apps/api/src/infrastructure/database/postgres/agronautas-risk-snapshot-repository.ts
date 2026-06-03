import type { Pool } from 'pg'
import { RiskSnapshotFoundation } from '../../../domain/entities/agronautas'
import type { RiskSnapshotRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'

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
              stale_cause, degradation_reasons, drivers, evidence_refs
       FROM risk_snapshots WHERE field_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [fieldId],
    )

    const row = result.rows[0]
    if (!row) return null

    return new RiskSnapshotFoundation({
      snapshotId: row.id,
      fieldId: row.field_id,
      runId: row.run_id,
      score: Number(row.score),
      confidence: Number(row.confidence),
      computedAt: new Date(row.computed_at),
      validUntil: new Date(row.valid_until),
      ruleVersion: row.rule_version,
      staleCause: row.stale_cause ?? undefined,
      degradationReasons: (row.degradation_reasons as RiskSnapshotFoundation['props']['degradationReasons']) ?? [],
      drivers: (row.drivers as RiskSnapshotFoundation['props']['drivers']) ?? [],
      evidenceRefs: (row.evidence_refs as string[]) ?? [],
    })
  }

  async listTimeline(fieldId: string, limit: number): Promise<RiskSnapshotFoundation[]> {
    const result = await this.pool.query(
      `SELECT id, field_id, run_id, score, confidence, computed_at, valid_until, rule_version,
              stale_cause, degradation_reasons, drivers, evidence_refs
       FROM risk_snapshots WHERE field_id = $1 ORDER BY computed_at DESC LIMIT $2`,
      [fieldId, limit],
    )

    return result.rows.map(
      (row) =>
        new RiskSnapshotFoundation({
          snapshotId: row.id,
          fieldId: row.field_id,
          runId: row.run_id,
          score: Number(row.score),
          confidence: Number(row.confidence),
          computedAt: new Date(row.computed_at),
          validUntil: new Date(row.valid_until),
          ruleVersion: row.rule_version,
          staleCause: row.stale_cause ?? undefined,
          degradationReasons: (row.degradation_reasons as RiskSnapshotFoundation['props']['degradationReasons']) ?? [],
          drivers: (row.drivers as RiskSnapshotFoundation['props']['drivers']) ?? [],
          evidenceRefs: (row.evidence_refs as string[]) ?? [],
        }),
    )
  }
}
