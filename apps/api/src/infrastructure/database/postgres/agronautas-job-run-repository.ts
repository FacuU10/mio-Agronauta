import type { Pool } from 'pg'
import type { AgronautasJobRunRecord, AgronautasJobRunRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'
import { createAgronautasTelemetry } from '../../observability/agronautas-telemetry'

const telemetry = createAgronautasTelemetry()

export class PostgresAgronautasJobRunRepository implements AgronautasJobRunRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async saveQueuedRun(record: AgronautasJobRunRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO agronautas_job_runs (
        job_id, run_id, field_id, status, triggered_by, contract_version,
        request_id, correlation_id, runtime_mode, queued_at, result_payload
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (job_id) DO UPDATE SET
        status = EXCLUDED.status,
        request_id = EXCLUDED.request_id,
        correlation_id = EXCLUDED.correlation_id,
        queued_at = EXCLUDED.queued_at,
        result_payload = EXCLUDED.result_payload`,
      [
        record.jobId,
        record.runId,
        record.fieldId,
        record.status,
        record.triggeredBy,
        record.contractVersion,
        record.requestId,
        record.correlationId,
        record.runtimeMode,
        record.queuedAt,
        record.resultPayload ?? {},
      ],
    )
    telemetry.onJobRunPersisted({ fieldId: record.fieldId, runId: record.runId, jobId: record.jobId, status: record.status })
  }

  async markRunning(jobId: string, startedAt: Date): Promise<void> {
    await this.pool.query('UPDATE agronautas_job_runs SET status = $2, started_at = $3 WHERE job_id = $1', [jobId, 'running', startedAt])
  }

  async markHeartbeat(jobId: string, heartbeatAt: Date): Promise<void> {
    await this.pool.query('UPDATE agronautas_job_runs SET heartbeat_at = $2 WHERE job_id = $1', [jobId, heartbeatAt])
  }

  async markCompleted(jobId: string, completedAt: Date, resultPayload: Record<string, unknown>): Promise<void> {
    await this.pool.query('UPDATE agronautas_job_runs SET status = $2, completed_at = $3, result_payload = $4 WHERE job_id = $1', [jobId, 'completed', completedAt, resultPayload])
  }

  async markFailed(jobId: string, failedAt: Date, errorCode: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      'UPDATE agronautas_job_runs SET status = $2, completed_at = $3, error_code = $4, error_message = $5 WHERE job_id = $1',
      [jobId, 'failed', failedAt, errorCode, errorMessage],
    )
  }
}
