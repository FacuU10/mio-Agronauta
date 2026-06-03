import type { Pool } from 'pg'
import type { SignalIngestionRepository, SignalIngestionRunRecord } from '../../../domain/repositories/agronautas'
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
}
