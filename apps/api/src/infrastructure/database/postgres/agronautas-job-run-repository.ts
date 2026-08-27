import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type { AgronautasJobClaim, AgronautasJobRunRecord, AgronautasJobRunRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'
import { createAgronautasTelemetry } from '../../observability/agronautas-telemetry'

const telemetry = createAgronautasTelemetry()
const DEFAULT_LEASE_SECONDS = 300

export type RuntimeTransitionState = 'queued' | 'leased' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'dlq' | 'cancelled'

export interface RuntimeTransitionInput {
  jobId: string
  runId: string
  workerId: string
  from: RuntimeTransitionState
  to: RuntimeTransitionState
  occurredAt: Date
  resultPayload?: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
}

const LEGAL_TRANSITIONS: Readonly<Record<RuntimeTransitionState, readonly RuntimeTransitionState[]>> = {
  queued: ['leased'],
  leased: ['running'],
  running: ['succeeded', 'failed', 'waiting', 'dlq', 'cancelled'],
  waiting: ['leased'],
  succeeded: [],
  failed: [],
  dlq: [],
  cancelled: [],
}

export class PostgresAgronautasJobRunRepository implements AgronautasJobRunRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async saveQueuedRun(record: AgronautasJobRunRecord): Promise<void> {
    const id = randomUUID()
    await this.pool.query(
      `INSERT INTO agronautas_job_runs (
        "id", "jobId", "runId", "fieldId", status, "triggeredBy", "contractVersion",
        "requestId", "correlationId", "runtimeMode", attempt, max_attempts, "queuedAt", "resultPayload"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT ("jobId") DO NOTHING`,
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
      "UPDATE agronautas_job_runs SET status = 'leased', lease_owner = $2, lease_expires_at = $4, \"heartbeatAt\" = $3, \"startedAt\" = COALESCE(\"startedAt\", $3) WHERE \"jobId\" = $1 AND ((status = 'queued') OR (status = 'waiting' AND (retry_at IS NULL OR retry_at <= $3)) OR (status IN ('leased', 'running') AND lease_expires_at IS NOT NULL AND lease_expires_at < $3)) RETURNING lease_expires_at",
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
      "UPDATE agronautas_job_runs SET status = 'waiting', attempt = attempt + 1, retry_at = $3, \"errorCode\" = $4, \"errorMessage\" = $5, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND \"runId\" = $2 AND status IN ('leased', 'running') AND attempt < max_attempts AND lease_owner IS NOT NULL",
      [jobId, runId, nextRetryAt, errorCode, errorMessage],
    )
  }

  async deadLetter(jobId: string, runId: string, failedAt: Date, errorCode: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'dlq', \"completedAt\" = $3, dead_lettered_at = $3, dlq_reason = $4, \"errorCode\" = $4, \"errorMessage\" = $5, terminal_error_code = $4, terminal_error_message = $5, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND \"runId\" = $2 AND status NOT IN ('completed', 'succeeded', 'dlq') AND lease_owner IS NOT NULL",
      [jobId, runId, failedAt, errorCode, errorMessage],
    )
  }

  async transition(input: RuntimeTransitionInput): Promise<boolean> {
    if (!LEGAL_TRANSITIONS[input.from].includes(input.to)) return false

    const terminal = ['succeeded', 'failed', 'dlq', 'cancelled'].includes(input.to)
    const result = await this.pool.query(
      `UPDATE agronautas_job_runs
          SET status = $5,
              "completedAt" = CASE WHEN $6 THEN $4 ELSE "completedAt" END,
              "resultPayload" = CASE WHEN $7::jsonb IS NULL THEN "resultPayload" ELSE $7::jsonb END,
              "errorCode" = COALESCE($8, "errorCode"),
              "errorMessage" = COALESCE($9, "errorMessage"),
              dead_lettered_at = CASE WHEN $5 = 'dlq' THEN $4 ELSE dead_lettered_at END,
              dlq_reason = CASE WHEN $5 = 'dlq' THEN COALESCE($9, dlq_reason) ELSE dlq_reason END,
              terminal_error_code = CASE WHEN $5 = 'dlq' THEN COALESCE($8, terminal_error_code) ELSE terminal_error_code END,
              terminal_error_message = CASE WHEN $5 = 'dlq' THEN COALESCE($9, terminal_error_message) ELSE terminal_error_message END,
              lease_owner = CASE WHEN $6 THEN NULL ELSE lease_owner END,
              lease_expires_at = CASE WHEN $6 THEN NULL ELSE lease_expires_at END
        WHERE "jobId" = $1 AND "runId" = $2 AND lease_owner = $3
          AND status = $10
          AND (lease_expires_at IS NULL OR lease_expires_at >= $4)
        RETURNING "jobId"`,
      [
        input.jobId,
        input.runId,
        input.workerId,
        input.occurredAt,
        input.to,
        terminal,
        input.resultPayload ? JSON.stringify(input.resultPayload) : null,
        input.errorCode ?? null,
        input.errorMessage ?? null,
        input.from,
      ],
    )
    return result.rows.length > 0
  }

  async persistOutcome(input: RuntimeTransitionInput): Promise<boolean> {
    return this.transition(input)
  }
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}
