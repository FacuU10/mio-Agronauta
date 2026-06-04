import type Redis from 'ioredis'
import type { AgronautasRuntimeDispatchCommand, AgronautasRuntimeDispatcher } from '../../domain/repositories/agronautas'
import { getRedisClient } from '../database/redis/client'
import { createAgronautasTelemetry } from '../observability/agronautas-telemetry'

const telemetry = createAgronautasTelemetry()
const RUNTIME_QUEUE_NAME = 'bull:agronautas-runtime:wait'

export class AgronautasRuntimeDispatcherError extends Error {
  constructor(message: string, readonly causeValue?: unknown) {
    super(message)
    this.name = 'AgronautasRuntimeDispatcherError'
  }
}

export class RedisAgronautasRuntimeDispatcher implements AgronautasRuntimeDispatcher {
  constructor(private readonly redis: Pick<Redis, 'lpush'> = getRedisClient()) {}

  async dispatchRiskRecompute(command: AgronautasRuntimeDispatchCommand): Promise<void> {
    telemetry.onDispatchAttempt({
      fieldId: command.fieldId,
      runId: command.runId,
      jobId: command.jobId,
      requestId: command.requestId,
      runtimeMode: command.runtimeMode,
    })

    try {
      const job = createAgronautasRiskRecomputeJob(command)
      await this.redis.lpush(RUNTIME_QUEUE_NAME, JSON.stringify(job))
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
}

function createAgronautasRiskRecomputeJob(command: AgronautasRuntimeDispatchCommand) {
  return {
    contractVersion: command.contractVersion,
    jobId: command.jobId,
    workflowId: 'agronautas-risk-recompute',
    runId: command.runId,
    kind: 'agronautas-risk-recompute',
    status: 'pending',
    priority: 50,
    createdAt: command.requestedAt.toISOString(),
    trace: {
      traceId: command.requestId,
      correlationId: command.correlationId,
      causationId: command.runId,
    },
    payload: {
      fieldId: command.fieldId,
      triggeredBy: command.triggeredBy,
      requestedAt: command.requestedAt.toISOString(),
      runtime: {
        mode: command.runtimeMode,
      },
    },
    labels: {
      domain: 'agronautas',
      operation: 'risk-recompute',
    },
  }
}
