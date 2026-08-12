import type { Pool } from 'pg'
import { estimateFreshnessHours, type ClimateSummary, type DegradationReason, type SatelliteSummary } from '../../../domain/entities/agronautas'
import type { SignalSummaryRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'
import { createAgronautasTelemetry } from '../../observability/agronautas-telemetry'

const telemetry = createAgronautasTelemetry()

export class PostgresSignalSummaryRepository implements SignalSummaryRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async getLatestClimateSummary(fieldId: string): Promise<ClimateSummary | null> {
    const result = await this.pool.query(
      `SELECT provider, run_id, observed_at, stale_cause, degradation_reason, evidence_payload
       FROM signal_ingestion_runs
       WHERE field_id = $1 AND signal_type = 'climate' AND status = 'succeeded'
       ORDER BY observed_at DESC NULLS LAST, started_at DESC
       LIMIT 1`,
      [fieldId],
    )

    const row = result.rows[0]
    if (!row) return null

    telemetry.onSignalRunRecorded({
      runId: `climate:${fieldId}`,
      provider: row.provider,
      staleCause: row.stale_cause ?? undefined,
    })

    const observedAt = new Date(row.observed_at)
    const payload = (row.evidence_payload as Record<string, unknown>) ?? {}
    const freshnessHours = estimateFreshnessHours(observedAt)
    const freshness = resolveFreshness(payload, freshnessHours, 12, row.stale_cause, row.degradation_reason)
    const degradationReasons = resolveDegradationReasons(payload, row.degradation_reason, freshness)

    return {
      provider: row.provider,
      observedAt,
      runId: row.run_id,
      sourceRunId: typeof payload['sourceRunId'] === 'string' ? payload['sourceRunId'] : row.run_id,
      acquiredAt: parseDate(payload['acquiredAt']) ?? observedAt,
      freshnessHours,
      confidence: Number(payload['confidence'] ?? 0.5),
      freshness,
      staleCause: row.stale_cause ?? undefined,
      degradationReasons,
      provenance: [`signal_ingestion_runs:${row.provider}:climate:${row.run_id}`],
      temperatureC: Number(payload['temperatureC'] ?? 0),
      rainfallMm7d: Number(payload['rainfallMm7d'] ?? 0),
      humidityPct: payload['humidityPct'] == null ? undefined : Number(payload['humidityPct']),
    }
  }

  async getLatestSatelliteSummary(fieldId: string): Promise<SatelliteSummary | null> {
    const result = await this.pool.query(
      `SELECT provider, run_id, observed_at, stale_cause, degradation_reason, evidence_payload
       FROM signal_ingestion_runs
       WHERE field_id = $1 AND signal_type = 'satellite' AND status = 'succeeded'
       ORDER BY observed_at DESC NULLS LAST, started_at DESC
       LIMIT 1`,
      [fieldId],
    )

    const row = result.rows[0]
    if (!row) return null

    telemetry.onSignalRunRecorded({
      runId: `satellite:${fieldId}`,
      provider: row.provider,
      staleCause: row.stale_cause ?? undefined,
    })

    const observedAt = new Date(row.observed_at)
    const payload = (row.evidence_payload as Record<string, unknown>) ?? {}
    const freshnessHours = estimateFreshnessHours(observedAt)
    const freshness = resolveFreshness(payload, freshnessHours, 72, row.stale_cause, row.degradation_reason)
    const degradationReasons = resolveDegradationReasons(payload, row.degradation_reason, freshness)

    return {
      provider: row.provider,
      observedAt,
      runId: row.run_id,
      sourceRunId: typeof payload['sourceRunId'] === 'string' ? payload['sourceRunId'] : row.run_id,
      acquiredAt: parseDate(payload['acquiredAt']) ?? observedAt,
      freshnessHours,
      confidence: Number(payload['confidence'] ?? 0.5),
      freshness,
      staleCause: row.stale_cause ?? undefined,
      degradationReasons,
      provenance: [`signal_ingestion_runs:${row.provider}:satellite:${row.run_id}`],
      ndvi: payload['ndvi'] == null ? undefined : Number(payload['ndvi']),
      evi: payload['evi'] == null ? undefined : Number(payload['evi']),
      waterStressIndex: payload['waterStressIndex'] == null ? undefined : Number(payload['waterStressIndex']),
    }
  }

  async listClimateTimeline(fieldId: string, limit: number): Promise<ClimateSummary[]> {
    const result = await this.pool.query(
      `SELECT provider, run_id, observed_at, stale_cause, degradation_reason, evidence_payload
       FROM signal_ingestion_runs
       WHERE field_id = $1 AND signal_type = 'climate' AND status IN ('succeeded', 'degraded')
       ORDER BY observed_at DESC NULLS LAST, started_at DESC
       LIMIT $2`,
      [fieldId, limit],
    )

    return result.rows.map((row) => {
      const observedAt = new Date(row.observed_at)
      const payload = (row.evidence_payload as Record<string, unknown>) ?? {}
      const freshnessHours = estimateFreshnessHours(observedAt)
      const freshness = resolveFreshness(payload, freshnessHours, 12, row.stale_cause, row.degradation_reason)
      const degradationReasons = resolveDegradationReasons(payload, row.degradation_reason, freshness)

      return {
        provider: row.provider,
        observedAt,
        runId: row.run_id,
        sourceRunId: typeof payload['sourceRunId'] === 'string' ? payload['sourceRunId'] : row.run_id,
        acquiredAt: parseDate(payload['acquiredAt']) ?? observedAt,
        freshnessHours,
        confidence: Number(payload['confidence'] ?? 0.5),
        freshness,
        staleCause: row.stale_cause ?? undefined,
        degradationReasons,
        provenance: [`signal_ingestion_runs:${row.provider}:climate:${row.run_id}`],
        temperatureC: Number(payload['temperatureC'] ?? 0),
        rainfallMm7d: Number(payload['rainfallMm7d'] ?? 0),
        humidityPct: payload['humidityPct'] == null ? undefined : Number(payload['humidityPct']),
      }
    })
  }
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function resolveFreshness(
  payload: Record<string, unknown>,
  freshnessHours: number,
  staleAfterHours: number,
  staleCause: unknown,
  degradationReason: unknown,
): ClimateSummary['freshness'] {
  const value = payload['freshness']
  if (value === 'fresh' || value === 'degraded' || value === 'stale' || value === 'missing') return value
  if (staleCause || degradationReason) return 'degraded'
  return freshnessHours > staleAfterHours ? 'stale' : 'fresh'
}

function resolveDegradationReasons(payload: Record<string, unknown>, degradationReason: unknown, freshness: ClimateSummary['freshness']): DegradationReason[] {
  const reasons = Array.isArray(payload['degradationReasons']) ? payload['degradationReasons'].filter((item): item is DegradationReason => typeof item === 'string') : []
  if (degradationReason && typeof degradationReason === 'string' && !reasons.includes(degradationReason as DegradationReason)) reasons.push(degradationReason as DegradationReason)
  if (freshness === 'stale' && reasons.length === 0) reasons.push('weather_data_stale')
  return reasons
}
