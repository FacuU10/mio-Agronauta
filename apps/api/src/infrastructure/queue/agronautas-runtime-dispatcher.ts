import type { AgronautasRuntimeDispatchCommand, AgronautasRuntimeDispatcher } from '../../domain/repositories/agronautas'
import { getRedisClient } from '../database/redis/client'
import { getAgronautasRuntimeConfig } from '../config/agronautas-runtime'
import { createAgronautasTelemetry } from '../observability/agronautas-telemetry'
import { agronautasScheduledWindowSchema, runtimeJobEnvelopeSchema } from '@repo/zod-schemas'
import { AGRONAUTAS_RUNTIME_QUEUE_KEY, createAgronautasRiskRecomputeJob, createAgronautasRuntimeJob, createAgronautasScheduledWindowJob } from '@golden/workflows'
import type { ScheduledWindowDispatcher, SourceWindow } from '../jobs/agronautas-scheduler'

const telemetry = createAgronautasTelemetry()
const RUNTIME_QUEUE_NAME = AGRONAUTAS_RUNTIME_QUEUE_KEY

interface RedisListPublisher {
  lpush(key: string, value: string): Promise<number>
  rpush?(key: string, value: string): Promise<number>
  set?(key: string, value: string, mode: 'EX', ttlSeconds: number, condition: 'NX'): Promise<'OK' | null>
  del?(key: string): Promise<number>
}

export class AgronautasRuntimeDispatcherError extends Error {
  constructor(message: string, readonly causeValue?: unknown) {
    super(message)
    this.name = 'AgronautasRuntimeDispatcherError'
  }
}

export class RedisAgronautasRuntimeDispatcher implements AgronautasRuntimeDispatcher, ScheduledWindowDispatcher {
  constructor(private redis?: RedisListPublisher) {}

  async dispatchRiskRecompute(command: AgronautasRuntimeDispatchCommand): Promise<void> {
    telemetry.onDispatchAttempt({
      fieldId: command.fieldId,
      runId: command.runId,
      jobId: command.jobId,
      requestId: command.requestId,
      runtimeMode: command.runtimeMode,
    })

    try {
      const runtimeV2Enabled = getAgronautasRuntimeConfig().runtimeV2Enabled
      const job = runtimeV2Enabled
        ? command.runtimeJob ?? createAgronautasRuntimeJob({
          fieldId: command.fieldId,
          operation: 'risk-recompute',
          runtimeMode: command.runtimeMode,
          requestedAt: command.requestedAt,
          jobId: command.jobId,
          runId: command.runId,
          requestId: command.requestId,
          correlationId: command.correlationId,
          lease: command.lease ? {
            attempt: command.lease.attempt,
            maxAttempts: command.lease.maxAttempts,
            leaseExpiresAt: command.lease.leaseExpiresAt?.toISOString() ?? null,
          } : undefined,
        })
        : createAgronautasRiskRecomputeJob(command)
      const serializedJob = runtimeV2Enabled ? runtimeJobEnvelopeSchema.parse(job) : job
      await this.getRedis().lpush(RUNTIME_QUEUE_NAME, JSON.stringify(serializedJob))
      telemetry.onDispatchPublished({
        fieldId: command.fieldId,
        runId: command.runId,
        jobId: command.jobId,
        requestId: command.requestId,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_dispatch_error'
      telemetry.onDispatchFailed({
        fieldId: command.fieldId,
        runId: command.runId,
        jobId: command.jobId,
        requestId: command.requestId,
        error: message,
      })
      throw new AgronautasRuntimeDispatcherError('Failed to dispatch Agronautas recompute job', error)
    }
  }

  async enqueue(window: SourceWindow): Promise<void> {
    const redis = this.getRedis()
    if (!redis.set) throw new AgronautasRuntimeDispatcherError('Scheduled-window idempotency requires Redis SET NX')

    const job = createAgronautasScheduledWindowJob({
      window,
      requestId: `scheduler:${window.runId}`,
      correlationId: window.runId,
    })
    const parsed = agronautasScheduledWindowSchema.parse(job)
    const idempotencyKey = `agronautas:scheduler:idempotency:${window.runId}`
    const acquired = await redis.set(idempotencyKey, parsed.jobId, 'EX', 55 * 60, 'NX')
    if (acquired !== 'OK') {
      telemetry.onQueueTransition({ jobId: parsed.jobId, runId: parsed.runId, from: 'waiting', to: 'waiting', reason: 'duplicate_run_id' })
      return
    }

    try {
      await redis.lpush(RUNTIME_QUEUE_NAME, JSON.stringify(parsed))
      telemetry.onQueueTransition({ jobId: parsed.jobId, runId: parsed.runId, from: 'scheduler', to: 'waiting' })
    } catch (error) {
      await redis.del?.(idempotencyKey)
      throw error
    }
  }

  async deadLetter(window: SourceWindow, error: Error): Promise<void> {
    const redis = this.getRedis()
    if (!redis.rpush) throw new AgronautasRuntimeDispatcherError('Scheduled-window DLQ requires Redis RPUSH')
    const jobId = `agronautas-window:${window.runId}`
    await redis.rpush(
      `bull:${RUNTIME_QUEUE_NAME.replace(/^bull:/, '').replace(/:wait$/, '')}:dead-letter`,
      JSON.stringify({ jobId, runId: window.runId, window, reason: error.message, failedAt: new Date().toISOString() }),
    )
    telemetry.onQueueDeadLetter({ jobId, runId: window.runId, reason: error.message })
  }

  private getRedis(): RedisListPublisher {
    this.redis ??= getRedisClient()
    return this.redis
  }
}
