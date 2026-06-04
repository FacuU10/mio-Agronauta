import { randomUUID } from 'node:crypto'
import { getAgronautasRuntimeConfig } from '../../infrastructure/config/agronautas-runtime'
import type { AgronautasJobRunRepository, AgronautasRuntimeDispatcher, RecomputeLockRepository } from '../../domain/repositories/agronautas'
import { AgronautasRuntimeDispatcherError } from '../../infrastructure/queue/agronautas-runtime-dispatcher'

const API_RECOMPUTE_LOCK_TTL_SECONDS = 120
const AGRONAUTAS_RUNTIME_CONTRACT_VERSION = '1.0.0'

export interface RequestRiskRecomputeResult {
  status: 'enqueued' | 'already_in_progress'
  runId: string
  jobId: string
  requestId: string
  contractVersion: string
}

interface RequestRiskRecomputeOptions {
  idGenerator?: () => string
}

interface RequestRiskRecomputeContext {
  requestId?: string
}

export class WorkerUnavailableError extends Error {
  constructor(
    message: string,
    readonly details: Pick<RequestRiskRecomputeResult, 'runId' | 'jobId' | 'requestId' | 'contractVersion'>,
  ) {
    super(message)
    this.name = 'WorkerUnavailableError'
  }
}

export class RequestRiskRecomputeUseCase {
  constructor(
    private readonly recomputeLockRepository: RecomputeLockRepository,
    private readonly runtimeDispatcher: AgronautasRuntimeDispatcher,
    private readonly jobRunRepository: AgronautasJobRunRepository,
    private readonly options: RequestRiskRecomputeOptions = {},
  ) {}

  async execute(fieldId: string, triggeredBy: 'api' | 'alert-refresh' = 'api', context: RequestRiskRecomputeContext = {}): Promise<RequestRiskRecomputeResult> {
    const runId = this.idGenerator()
    const jobId = `agro-job-${this.idGenerator()}`
    const requestId = context.requestId ?? this.idGenerator()
    const correlationId = requestId
    const runtimeConfig = getAgronautasRuntimeConfig()
    const lock = await this.recomputeLockRepository.acquire(fieldId, API_RECOMPUTE_LOCK_TTL_SECONDS, {
      runId,
      jobId,
      requestId,
      correlationId,
      triggeredBy,
      contractVersion: AGRONAUTAS_RUNTIME_CONTRACT_VERSION,
    })

    if (!lock.acquired) {
      return {
        status: 'already_in_progress',
        runId: lock.metadata.runId,
        jobId: lock.metadata.jobId,
        requestId: lock.metadata.requestId,
        contractVersion: lock.metadata.contractVersion,
      }
    }

    const queuedAt = new Date()
    await this.jobRunRepository.saveQueuedRun({
      jobId,
      runId,
      fieldId,
      status: 'queued',
      triggeredBy,
      contractVersion: AGRONAUTAS_RUNTIME_CONTRACT_VERSION,
      requestId,
      correlationId,
      runtimeMode: runtimeConfig.mode,
      queuedAt,
      resultPayload: {},
    })

    try {
      await this.runtimeDispatcher.dispatchRiskRecompute({
        contractVersion: AGRONAUTAS_RUNTIME_CONTRACT_VERSION,
        jobId,
        runId,
        fieldId,
        triggeredBy,
        requestId,
        correlationId,
        requestedAt: queuedAt,
        runtimeMode: runtimeConfig.mode,
      })
    } catch (error) {
      await this.jobRunRepository.markFailed(jobId, new Date(), 'WORKER_UNAVAILABLE', error instanceof Error ? error.message : 'unknown_worker_error')
      await this.recomputeLockRepository.release(fieldId)
      const message = error instanceof AgronautasRuntimeDispatcherError ? error.message : 'Failed to dispatch recompute job'
      throw new WorkerUnavailableError(message, { runId, jobId, requestId, contractVersion: AGRONAUTAS_RUNTIME_CONTRACT_VERSION })
    }

    return {
      status: 'enqueued',
      runId,
      jobId,
      requestId,
      contractVersion: AGRONAUTAS_RUNTIME_CONTRACT_VERSION,
    }
  }

  private idGenerator(): string {
    return this.options.idGenerator?.() ?? randomUUID()
  }
}
