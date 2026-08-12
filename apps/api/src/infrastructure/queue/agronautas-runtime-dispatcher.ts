import type { AgronautasRuntimeDispatchCommand, AgronautasRuntimeDispatcher } from '../../domain/repositories/agronautas'
import { getRedisClient } from '../database/redis/client'
import { createAgronautasTelemetry } from '../observability/agronautas-telemetry'
import { AGRONAUTAS_RUNTIME_QUEUE_KEY, createAgronautasRiskRecomputeJob } from '@golden/workflows'

const telemetry = createAgronautasTelemetry()
const RUNTIME_QUEUE_NAME = AGRONAUTAS_RUNTIME_QUEUE_KEY

interface RedisListPublisher {
  lpush(key: string, value: string): Promise<number>
}

export class AgronautasRuntimeDispatcherError extends Error {
  constructor(message: string, readonly causeValue?: unknown) {
    super(message)
    this.name = 'AgronautasRuntimeDispatcherError'
  }
}

export class RedisAgronautasRuntimeDispatcher implements AgronautasRuntimeDispatcher {
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
      const job = createAgronautasRiskRecomputeJob(command)
      await this.getRedis().lpush(RUNTIME_QUEUE_NAME, JSON.stringify(job))
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

  private getRedis(): RedisListPublisher {
    this.redis ??= getRedisClient()
    return this.redis
  }
}
