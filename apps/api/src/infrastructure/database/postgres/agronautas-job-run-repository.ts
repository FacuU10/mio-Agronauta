import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type { AgronautasJobClaim, AgronautasJobRunRecord, AgronautasJobRunRepository } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'
import { createAgronautasTelemetry, type AgronautasTelemetry } from '../../observability/agronautas-telemetry'
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
  resultStatus?: string
  providerMode?: string
  reason?: string
  leaseExpiresAt?: Date | null
}

export interface LegacyJobRunDbRow {
  jobId: string
  runId: string
  status: string
  resultPayload: Record<string, unknown>
}

export interface LegacyJobRunRead extends Omit<LegacyJobRunDbRow, 'status'> {
  status: RuntimeTransitionState
  legacyStatus?: 'completed'
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
  constructor(
    private readonly pool: Pick<Pool, 'query'> = getPostgresPool(),
    private readonly telemetry: AgronautasTelemetry = createAgronautasTelemetry(),
  ) {}

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
    this.telemetry.onJobRunPersisted({ fieldId: record.fieldId, runId: record.runId, jobId: record.jobId, status: record.status })
  }

  async markRunning(jobId: string, startedAt: Date, workerId: string): Promise<void> {
    const result = await this.pool.query("UPDATE agronautas_job_runs SET status = 'running', \"startedAt\" = $2 WHERE \"jobId\" = $1 AND status = 'leased' AND lease_owner = $3 AND (lease_expires_at IS NULL OR lease_expires_at >= $2) RETURNING \"jobId\", \"runId\", \"contractVersion\", attempt, lease_expires_at, \"runtimeMode\", \"startedAt\"", [jobId, startedAt, workerId])
    this.emitLegacyTransition(result.rows[0], { jobId, workerId, from: 'leased', to: 'running', occurredAt: startedAt, resultStatus: 'running' })
  }

  async markHeartbeat(jobId: string, heartbeatAt: Date, workerId: string): Promise<void> {
    await this.pool.query("UPDATE agronautas_job_runs SET \"heartbeatAt\" = $2 WHERE \"jobId\" = $1 AND status IN ('leased', 'running') AND lease_owner = $3 AND (lease_expires_at IS NULL OR lease_expires_at >= $2)", [jobId, heartbeatAt, workerId])
  }

  async markCompleted(jobId: string, completedAt: Date, resultPayload: Record<string, unknown>, workerId: string): Promise<void> {
    const result = await this.pool.query("UPDATE agronautas_job_runs SET status = 'succeeded', \"completedAt\" = $2, \"resultPayload\" = $3, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND status = 'running' AND lease_owner = $4 AND (lease_expires_at IS NULL OR lease_expires_at >= $2) RETURNING \"jobId\", \"runId\", \"contractVersion\", attempt, lease_expires_at, \"runtimeMode\", \"startedAt\"", [jobId, completedAt, resultPayload, workerId])
    this.emitLegacyTransition(result.rows[0], { jobId, workerId, from: 'running', to: 'succeeded', occurredAt: completedAt, resultStatus: readResultStatus(resultPayload) })
  }

  async markFailed(jobId: string, failedAt: Date, errorCode: string, errorMessage: string, workerId: string): Promise<void> {
    const result = await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'failed', \"completedAt\" = $2, \"errorCode\" = $3, \"errorMessage\" = $4, terminal_error_code = $3, terminal_error_message = $4, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND status = 'running' AND lease_owner = $5 AND (lease_expires_at IS NULL OR lease_expires_at >= $2) RETURNING \"jobId\", \"runId\", \"contractVersion\", attempt, lease_expires_at, \"runtimeMode\", \"startedAt\"",
      [jobId, failedAt, errorCode, errorMessage, workerId],
    )
    this.emitLegacyTransition(result.rows[0], { jobId, workerId, from: 'running', to: 'failed', occurredAt: failedAt, resultStatus: 'failed', reason: `${errorCode}: ${errorMessage}` })
  }

  async markDispatchFailed(jobId: string, failedAt: Date, errorCode: string, errorMessage: string): Promise<void> {
    const result = await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'failed', \"completedAt\" = $2, \"errorCode\" = $3, \"errorMessage\" = $4, terminal_error_code = $3, terminal_error_message = $4 WHERE \"jobId\" = $1 AND status = 'queued' AND lease_owner IS NULL RETURNING \"jobId\", \"runId\", \"contractVersion\", attempt, lease_expires_at, \"runtimeMode\", \"startedAt\"",
      [jobId, failedAt, errorCode, errorMessage],
    )
    this.emitLegacyTransition(result.rows[0], { jobId, workerId: 'api-dispatcher', from: 'queued', to: 'failed', occurredAt: failedAt, resultStatus: 'failed', reason: `${errorCode}: ${errorMessage}` })
  }

  async getByJobId(jobId: string): Promise<LegacyJobRunRead | null> {
    const result = await this.pool.query(
      'SELECT "jobId", "runId", status, "resultPayload" FROM agronautas_job_runs WHERE "jobId" = $1 LIMIT 1',
      [jobId],
    )
    const row = result.rows[0] as LegacyJobRunDbRow | undefined
    return row ? adaptLegacyJobRunRow(row) : null
  }

  async claim(jobId: string, workerId: string, now: Date, leaseSeconds: number): Promise<AgronautasJobClaim> {
    const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000)
    const result = await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'leased', lease_owner = $2, lease_expires_at = $4, \"heartbeatAt\" = $3, \"startedAt\" = COALESCE(\"startedAt\", $3) WHERE \"jobId\" = $1 AND ((status = 'queued') OR (status = 'waiting' AND retry_at IS NOT NULL AND retry_at <= $3) OR (status IN ('leased', 'running') AND lease_expires_at IS NOT NULL AND lease_expires_at < $3)) RETURNING lease_expires_at, \"runId\", \"contractVersion\", attempt, \"runtimeMode\"",
      [jobId, workerId, now, leaseExpiresAt],
    )
    const row = result.rows[0] as { lease_expires_at?: unknown } | undefined
    if (row) {
      this.emitLegacyTransition(row, { jobId, workerId, from: 'queued', to: 'leased', occurredAt: now, resultStatus: 'leased', leaseExpiresAt: toDate(row.lease_expires_at) })
    }
    return { claimed: Boolean(row), leaseExpiresAt: row ? toDate(row.lease_expires_at) : null }
  }

  async heartbeat(jobId: string, runId: string, workerId: string, heartbeatAt: Date, leaseSeconds = DEFAULT_LEASE_SECONDS): Promise<void> {
    await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'running', \"heartbeatAt\" = $4, lease_expires_at = $4 + ($5 * INTERVAL '1 second') WHERE \"jobId\" = $1 AND \"runId\" = $2 AND lease_owner = $3 AND status IN ('leased', 'running') AND (lease_expires_at IS NULL OR lease_expires_at >= $4)",
      [jobId, runId, workerId, heartbeatAt, leaseSeconds],
    )
  }

  async scheduleRetry(jobId: string, runId: string, nextRetryAt: Date, errorCode: string, errorMessage = errorCode, workerId = 'worker'): Promise<void> {
    const result = await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'waiting', attempt = attempt + 1, retry_at = $3, \"errorCode\" = $4, \"errorMessage\" = $5, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND \"runId\" = $2 AND status = 'running' AND attempt < max_attempts AND lease_owner = $6 RETURNING \"jobId\", \"runId\", \"contractVersion\", attempt, lease_expires_at, \"runtimeMode\", \"startedAt\"",
      [jobId, runId, nextRetryAt, errorCode, errorMessage, workerId],
    )
    this.emitLegacyTransition(result.rows[0], { jobId, runId, workerId, from: 'running', to: 'waiting', occurredAt: nextRetryAt, resultStatus: 'retryable_failure', leaseExpiresAt: null, reason: `${errorCode}: ${errorMessage}` })
  }

  async deadLetter(jobId: string, runId: string, failedAt: Date, errorCode: string, errorMessage: string, workerId = 'worker'): Promise<void> {
    const result = await this.pool.query(
      "UPDATE agronautas_job_runs SET status = 'dlq', \"completedAt\" = $3, dead_lettered_at = $3, dlq_reason = $4, \"errorCode\" = $4, \"errorMessage\" = $5, terminal_error_code = $4, terminal_error_message = $5, lease_owner = NULL, lease_expires_at = NULL WHERE \"jobId\" = $1 AND \"runId\" = $2 AND status = 'running' AND lease_owner = $6 RETURNING \"jobId\", \"runId\", \"contractVersion\", attempt, lease_expires_at, \"runtimeMode\", \"startedAt\"",
      [jobId, runId, failedAt, errorCode, errorMessage, workerId],
    )
    this.emitLegacyTransition(result.rows[0], { jobId, runId, workerId, from: 'running', to: 'dlq', occurredAt: failedAt, resultStatus: 'dlq', leaseExpiresAt: null, reason: `${errorCode}: ${errorMessage}` })
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
       RETURNING "jobId", "runId", "contractVersion", attempt, lease_expires_at, "runtimeMode", "startedAt"`,
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
    const row = result.rows[0]
    if (row) this.emitLegacyTransition(row, input)
    return result.rows.length > 0
  }

  async persistOutcome(input: RuntimeTransitionInput): Promise<boolean> {
    return this.transition(input)
  }

  private emitLegacyTransition(row: unknown, input: Omit<Pick<RuntimeTransitionInput, 'jobId' | 'runId' | 'workerId' | 'from' | 'to' | 'occurredAt' | 'resultStatus' | 'providerMode' | 'reason' | 'leaseExpiresAt' | 'resultPayload'>, 'runId'> & { runId?: string }): void {
    if (!row || typeof row !== 'object') return
    const metadata = row as Record<string, unknown>
    this.telemetry.onQueueTransition({
      contractVersion: asString(metadata['contractVersion'], '1.0.0'),
      jobId: input.jobId,
      runId: asString(input.runId ?? metadata['runId'], 'unknown'),
      from: input.from,
      to: input.to,
      attempt: asNumber(metadata['attempt'], 1),
      workerId: input.workerId,
      leaseExpiresAt: input.leaseExpiresAt === undefined ? toDate(metadata['lease_expires_at'])?.toISOString() ?? null : input.leaseExpiresAt?.toISOString() ?? null,
      resultStatus: input.resultStatus ?? readResultStatus(input.resultPayload ?? {}) ?? input.to,
      providerMode: input.providerMode ?? runtimeModeToProviderMode(metadata['runtimeMode'] ?? metadata['providerMode']),
      latencyMs: Math.max(0, input.occurredAt.getTime() - (toDate(metadata['startedAt'])?.getTime() ?? input.occurredAt.getTime())),
      ...(input.reason ? { reason: input.reason } : {}),
    })
  }
}

function readResultStatus(payload: Record<string, unknown>): string {
  const nested = payload['result']
  if (nested && typeof nested === 'object' && typeof (nested as Record<string, unknown>)['status'] === 'string') return (nested as Record<string, unknown>)['status'] as string
  return typeof payload['status'] === 'string' ? payload['status'] : 'succeeded'
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function runtimeModeToProviderMode(value: unknown): string {
  if (value === 'real') return 'live'
  if (value === 'demo') return 'mock'
  if (value === 'live' || value === 'mock' || value === 'unavailable') return value
  return 'unknown'
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

export function adaptLegacyJobRunRow(row: LegacyJobRunDbRow): LegacyJobRunRead {
  if (row.status === 'completed') {
    return { ...row, status: 'succeeded', legacyStatus: 'completed' }
  }

  if (!Object.prototype.hasOwnProperty.call(LEGAL_TRANSITIONS, row.status)) {
    throw new Error(`Unsupported Agronautas job status: ${row.status}`)
  }

  return { ...row, status: row.status as RuntimeTransitionState }
}
