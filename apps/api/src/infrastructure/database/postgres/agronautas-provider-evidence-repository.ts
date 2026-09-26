import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import type { AgronautasProviderEvidenceRepository, AgronautasProviderRunInput } from '../../../domain/repositories/agronautas-product-flows'
import { getPostgresPool } from './pool'

type TransactionPool = Pick<Pool, 'query'> & Partial<Pick<Pool, 'connect'>>

export class PostgresAgronautasProviderEvidenceRepository implements AgronautasProviderEvidenceRepository {
  constructor(private readonly pool: TransactionPool = getPostgresPool()) {}

  async saveRun(input: AgronautasProviderRunInput): Promise<boolean> {
    const client = this.pool.connect ? await this.pool.connect() : null
    const executor = client ?? this.pool
    try {
      if (client) await client.query('BEGIN')
      const runResult = await executor.query(
        `INSERT INTO agronautas_provider_runs (
          id, run_key, run_id, request_id, location_id, workspace_id, field_id,
          provider, signal_type, window_start, window_end, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (run_key) DO NOTHING`,
        [
          randomUUID(), input.runKey, input.runId, input.requestId,
          input.scope.locationId, input.scope.workspaceId, input.scope.fieldId,
          input.provider, input.signalType, input.windowStart, input.windowEnd, input.evidence.status,
        ],
      )
      if ((runResult.rowCount ?? 0) === 0) {
        if (client) await client.query('ROLLBACK')
        return false
      }

      await executor.query(
        `INSERT INTO agronautas_provider_evidence (
          id, run_id, evidence_id, location_id, workspace_id, field_id,
          provider, signal_type, status, provider_mode, observed_at, acquired_at,
          forecast_at, retrieved_at, evidence_payload
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
        ON CONFLICT (evidence_id) DO NOTHING`,
        [
          randomUUID(), input.runId, input.evidence.evidenceId,
          input.scope.locationId, input.scope.workspaceId, input.scope.fieldId,
          input.provider, input.signalType, input.evidence.status, input.evidence.providerMode,
          input.evidence.observedAt, input.evidence.acquiredAt, input.evidence.forecastAt,
          input.evidence.retrievedAt, JSON.stringify(input.evidence),
        ],
      )
      if (client) await client.query('COMMIT')
      return true
    } catch (error) {
      if (client) await client.query('ROLLBACK')
      throw error
    } finally {
      client?.release()
    }
  }
}

export type ProviderEvidenceTransactionClient = Pick<PoolClient, 'query' | 'release'>
