import type { Pool } from 'pg'
import { estimateFreshnessHours, type ClimateSummary, type SatelliteSummary } from '../../../domain/entities/agronautas'
import type { SignalSummaryRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'
import { createAgronautasTelemetry } from '../../observability/agronautas-telemetry'

const telemetry = createAgronautasTelemetry()

export class PostgresSignalSummaryRepository implements SignalSummaryRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async getLatestClimateSummary(fieldId: string): Promise<ClimateSummary | null> {
    const result = await this.pool.query(
      `SELECT provider, observed_at, stale_cause, evidence_payload
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

    return {
      provider: row.provider,
      observedAt,
      freshnessHours: estimateFreshnessHours(observedAt),
      confidence: Number(payload['confidence'] ?? 0.5),
      staleCause: row.stale_cause ?? undefined,
      provenance: [`signal_ingestion_runs:${row.provider}:climate`],
      temperatureC: Number(payload['temperatureC'] ?? 0),
      rainfallMm7d: Number(payload['rainfallMm7d'] ?? 0),
      humidityPct: payload['humidityPct'] == null ? undefined : Number(payload['humidityPct']),
    }
  }

  async getLatestSatelliteSummary(fieldId: string): Promise<SatelliteSummary | null> {
    const result = await this.pool.query(
      `SELECT provider, observed_at, stale_cause, evidence_payload
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

    return {
      provider: row.provider,
      observedAt,
      freshnessHours: estimateFreshnessHours(observedAt),
      confidence: Number(payload['confidence'] ?? 0.5),
      staleCause: row.stale_cause ?? undefined,
      provenance: [`signal_ingestion_runs:${row.provider}:satellite`],
      ndvi: payload['ndvi'] == null ? undefined : Number(payload['ndvi']),
      evi: payload['evi'] == null ? undefined : Number(payload['evi']),
      waterStressIndex: payload['waterStressIndex'] == null ? undefined : Number(payload['waterStressIndex']),
    }
  }

  async listClimateTimeline(fieldId: string, limit: number): Promise<ClimateSummary[]> {
    const result = await this.pool.query(
      `SELECT provider, observed_at, stale_cause, evidence_payload
       FROM signal_ingestion_runs
       WHERE field_id = $1 AND signal_type = 'climate' AND status IN ('succeeded', 'degraded')
       ORDER BY observed_at DESC NULLS LAST, started_at DESC
       LIMIT $2`,
      [fieldId, limit],
    )

    return result.rows.map((row) => {
      const observedAt = new Date(row.observed_at)
      const payload = (row.evidence_payload as Record<string, unknown>) ?? {}

      return {
        provider: row.provider,
        observedAt,
        freshnessHours: estimateFreshnessHours(observedAt),
        confidence: Number(payload['confidence'] ?? 0.5),
        staleCause: row.stale_cause ?? undefined,
        provenance: [`signal_ingestion_runs:${row.provider}:climate`],
        temperatureC: Number(payload['temperatureC'] ?? 0),
        rainfallMm7d: Number(payload['rainfallMm7d'] ?? 0),
        humidityPct: payload['humidityPct'] == null ? undefined : Number(payload['humidityPct']),
      }
    })
  }
}
