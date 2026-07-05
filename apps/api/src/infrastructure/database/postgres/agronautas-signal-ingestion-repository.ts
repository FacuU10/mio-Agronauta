import type { Pool } from 'pg'
import type { AgronautasSignalType, SignalIngestionRepository, SignalIngestionRunRecord } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'

export class PostgresSignalIngestionRepository implements SignalIngestionRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async saveRun(record: SignalIngestionRunRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO signal_ingestion_runs (
        id, field_id, provider, signal_type, run_id, status,
        stale_cause, started_at, finished_at, observed_at, evidence_payload, degradation_reason
      ) VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
      ON CONFLICT (run_id) DO UPDATE SET
        status = EXCLUDED.status,
        stale_cause = EXCLUDED.stale_cause,
        finished_at = EXCLUDED.finished_at,
        observed_at = EXCLUDED.observed_at,
        evidence_payload = EXCLUDED.evidence_payload,
        degradation_reason = EXCLUDED.degradation_reason`,
      [
        record.fieldId,
        record.provider,
        record.signalType,
        record.runId,
        record.status,
        record.staleCause ?? null,
        record.startedAt,
        record.finishedAt ?? null,
        record.observedAt ?? null,
        JSON.stringify(record.evidencePayload),
        record.degradationReason ?? null,
      ],
    )
  }

  async findLatestGood(fieldId: string, signalType: AgronautasSignalType): Promise<SignalIngestionRunRecord | null> {
    const result = await this.pool.query(
      `SELECT field_id, provider, signal_type, run_id, status, stale_cause, started_at,
              finished_at, observed_at, evidence_payload, degradation_reason
       FROM signal_ingestion_runs
       WHERE field_id = $1 AND signal_type = $2 AND status = 'succeeded'
       ORDER BY observed_at DESC NULLS LAST, finished_at DESC NULLS LAST, started_at DESC
       LIMIT 1`,
      [fieldId, signalType],
    )

    const row = result.rows[0]
    if (!row) return null

    return {
      fieldId: row.field_id,
      provider: row.provider,
      signalType: row.signal_type,
      runId: row.run_id,
      status: row.status,
      staleCause: row.stale_cause ?? undefined,
      startedAt: new Date(row.started_at),
      finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
      observedAt: row.observed_at ? new Date(row.observed_at) : undefined,
      evidencePayload: (row.evidence_payload as Record<string, unknown>) ?? {},
      degradationReason: row.degradation_reason ?? undefined,
    }
  }

  async getLastSuccessfulObservedAtBySource(): Promise<Map<string, Date>> {
    const result = await this.pool.query(
      `SELECT provider, signal_type, MAX(COALESCE(observed_at, finished_at, started_at)) AS last_success_at
       FROM signal_ingestion_runs
       WHERE status = 'succeeded'
       GROUP BY provider, signal_type`,
    )

    return new Map(
      result.rows
        .filter((row) => row.provider && row.signal_type && row.last_success_at)
        .map((row) => [`${row.provider}:${row.signal_type}`, new Date(row.last_success_at)]),
    )
  }
}
