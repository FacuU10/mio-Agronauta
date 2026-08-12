import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type { AgronautasJobClaim, AgronautasJobRunRecord, AgronautasJobRunRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'
import { createAgronautasTelemetry } from '../../observability/agronautas-telemetry'

const telemetry = createAgronautasTelemetry()
const DEFAULT_LEASE_SECONDS = 300

export class PostgresAgronautasJobRunRepository implements AgronautasJobRunRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async saveQueuedRun(record: AgronautasJobRunRecord): Promise<void> {
    const id = randomUUID()
    await this.pool.query(
      `INSERT INTO agronautas_job_runs (
        "id", "jobId", "runId", "fieldId", status, "triggeredBy", "contractVersion",
        "requestId", "correlationId", "runtimeMode", attempt, max_attempts, "queuedAt", "resultPayload"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT ("jobId") DO UPDATE SET
        status = EXCLUDED.status,
        "requestId" = EXCLUDED."requestId",
        "correlationId" = EXCLUDED."correlationId",
        attempt = EXCLUDED.attempt,
        max_attempts = EXCLUDED.max_attempts,
        "queuedAt" = EXCLUDED."queuedAt",
        "resultPayload" = EXCLUDED."resultPayload"`,
      [
        id,
        record.jobId,
        record.runId,
        record.fieldId,
        record.status,
        record.triggeredBy,
        record.contractVersion,
        record.requestId,
        record.correlationId,
        record.runtimeMode,
        record.lease?.attempt ?? 1,
        record.lease?.maxAttempts ?? 3,
        record.queuedAt,
        record.resultPayload ?? {},
      ],
    )
    telemetry.onJobRunPersisted({ fieldId: record.fieldId, runId: record.runId, jobId: record.jobId, status: record.status })
  }

  async markRunning(jobId: string, startedAt: Date): Promise<void> {
    await this.pool.query("UPDATE agronautas_job_runs SET status = 'running', \"startedAt\" = $2 WHERE \"jobId\" = $1 AND status IN ('queued', 'leased', 'waiting')", [jobId, startedAt])
  }

  async markHeartbeat(jobId: string, heartbeatAt: Date): Promise<void> {
    await this.pool.query("UPDATE agronautas_job_runs SET \"heartbeatAt\" = $2 WHERE \"jobId\" = $1 AND status IN ('leased', 'running') AND (lease_expires_at IS NULL OR lease_expires_at >= $2)", [jobId, heartbeatAt])
  }

  async markCompleted(jobId: string, completedAt: Date, resultPayload: Record<string, unknown>): Promise<void> {
    await this.pool.query("UPDATE agronautas_job_runs SET status = 'completed', \"completedAt\" = $2, \"resultPayload\" = $3, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND status IN ('leased', 'running')", [jobId, completedAt, resultPayload])
  }

  async markFailed(jobId: string, failedAt: Date, errorCode: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'failed', \"completedAt\" = $2, \"errorCode\" = $3, \"errorMessage\" = $4, terminal_error_code = $3, terminal_error_message = $4, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND status NOT IN ('completed', 'dlq')",
      [jobId, failedAt, errorCode, errorMessage],
    )
  }

  async claim(jobId: string, workerId: string, now: Date, leaseSeconds: number): Promise<AgronautasJobClaim> {
    const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000)
    const result = await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'leased', lease_owner = $2, lease_expires_at = $4, \"heartbeatAt\" = $3, \"startedAt\" = COALESCE(\"startedAt\", $3) WHERE \"jobId\" = $1 AND (status IN ('queued', 'waiting') OR (status IN ('leased', 'running') AND lease_expires_at IS NOT NULL AND lease_expires_at < $3)) RETURNING lease_expires_at",
      [jobId, workerId, now, leaseExpiresAt],
    )
    const row = result.rows[0] as { lease_expires_at?: unknown } | undefined
    return { claimed: Boolean(row), leaseExpiresAt: row ? toDate(row.lease_expires_at) : null }
  }

  async heartbeat(jobId: string, runId: string, workerId: string, heartbeatAt: Date, leaseSeconds = DEFAULT_LEASE_SECONDS): Promise<void> {
    await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'running', \"heartbeatAt\" = $4, lease_expires_at = $4 + ($5 * INTERVAL '1 second') WHERE \"jobId\" = $1 AND \"runId\" = $2 AND lease_owner = $3 AND status IN ('leased', 'running') AND (lease_expires_at IS NULL OR lease_expires_at >= $4)",
      [jobId, runId, workerId, heartbeatAt, leaseSeconds],
    )
  }

  async scheduleRetry(jobId: string, runId: string, nextRetryAt: Date, errorCode: string, errorMessage = errorCode): Promise<void> {
    await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'waiting', attempt = attempt + 1, retry_at = $3, \"errorCode\" = $4, \"errorMessage\" = $5, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND \"runId\" = $2 AND status IN ('leased', 'running', 'failed') AND attempt < max_attempts",
      [jobId, runId, nextRetryAt, errorCode, errorMessage],
    )
  }

  async deadLetter(jobId: string, runId: string, failedAt: Date, errorCode: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'dlq', \"completedAt\" = $3, dead_lettered_at = $3, dlq_reason = $4, \"errorCode\" = $4, \"errorMessage\" = $5, terminal_error_code = $4, terminal_error_message = $5, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND \"runId\" = $2 AND status NOT IN ('completed', 'dlq')",
      [jobId, runId, failedAt, errorCode, errorMessage],
    )
  }
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}
