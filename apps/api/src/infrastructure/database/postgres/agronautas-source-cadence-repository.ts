import type { Pool } from 'pg'
import type { SourceCadenceRecord, SourceCadenceRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'

export class PostgresSourceCadenceRepository implements SourceCadenceRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async upsert(record: SourceCadenceRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO source_cadences (
        provider, signal_type, update_cadence_minutes, freshness_sla_minutes,
        rate_limit, source_ref, researched_at, enabled
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (provider, signal_type) DO UPDATE SET
        update_cadence_minutes = EXCLUDED.update_cadence_minutes,
        freshness_sla_minutes = EXCLUDED.freshness_sla_minutes,
        rate_limit = EXCLUDED.rate_limit,
        source_ref = EXCLUDED.source_ref,
        researched_at = EXCLUDED.researched_at,
        enabled = EXCLUDED.enabled`,
      [
        record.provider,
        record.signalType,
        record.updateCadenceMinutes,
        record.freshnessSlaMinutes,
        record.rateLimit ?? null,
        record.sourceRef,
        record.researchedAt,
        record.enabled,
      ],
    )
  }

  async listEnabled(): Promise<SourceCadenceRecord[]> {
    const result = await this.pool.query(
      `SELECT provider, signal_type, update_cadence_minutes, freshness_sla_minutes,
              rate_limit, source_ref, researched_at, enabled
       FROM source_cadences WHERE enabled = true
       ORDER BY provider, signal_type`,
    )

    return result.rows.map((row) => ({
      provider: row.provider,
      signalType: row.signal_type,
      updateCadenceMinutes: Number(row.update_cadence_minutes),
      freshnessSlaMinutes: Number(row.freshness_sla_minutes),
      rateLimit: row.rate_limit ?? undefined,
      sourceRef: row.source_ref,
      researchedAt: new Date(row.researched_at),
      enabled: Boolean(row.enabled),
    }))
  }
}
