import type { Pool } from 'pg'
import type { AgronautasSignalType, SignalIngestionRepository, SignalIngestionRunRecord } from '../../../domain/repositories/agronautas'
import type { DegradationReason } from '../../../domain/entities/agronautas'
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
        JSON.stringify({
          ...record.evidencePayload,
          ...(record.sourceRunId ? { sourceRunId: record.sourceRunId } : {}),
          ...(record.acquiredAt ? { acquiredAt: record.acquiredAt.toISOString() } : {}),
          ...(record.freshness ? { freshness: record.freshness } : {}),
          ...(record.degradationReasons ? { degradationReasons: record.degradationReasons } : {}),
        }),
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

    const evidencePayload = (row.evidence_payload as Record<string, unknown>) ?? {}
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
      sourceRunId: typeof evidencePayload['sourceRunId'] === 'string' ? evidencePayload['sourceRunId'] : row.run_id,
      acquiredAt: parseDate(evidencePayload['acquiredAt']),
      freshness: normalizeFreshness(evidencePayload['freshness'], row.status, row.stale_cause, row.degradation_reason),
      degradationReasons: normalizeDegradationReasons(evidencePayload['degradationReasons'], row.degradation_reason),
      evidencePayload,
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

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function normalizeFreshness(value: unknown, status: string, staleCause: unknown, degradationReason: unknown): SignalIngestionRunRecord['freshness'] {
  if (value === 'fresh' || value === 'degraded' || value === 'stale' || value === 'missing') return value
  if (status !== 'succeeded') return 'missing'
  return staleCause || degradationReason ? 'degraded' : 'fresh'
}

function normalizeDegradationReasons(value: unknown, degradationReason: unknown): DegradationReason[] {
  const reasons = Array.isArray(value) ? value.filter((item): item is DegradationReason => typeof item === 'string') : []
  if (degradationReason && typeof degradationReason === 'string' && !reasons.includes(degradationReason as DegradationReason)) {
    reasons.push(degradationReason as DegradationReason)
  }
  return reasons
}
