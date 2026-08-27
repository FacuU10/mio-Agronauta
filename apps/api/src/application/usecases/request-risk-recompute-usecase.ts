import { randomUUID } from 'node:crypto'
import { getAgronautasRuntimeConfig } from '../../infrastructure/config/agronautas-runtime'
import type { AgronautasJobRunRepository, AgronautasRuntimeDispatcher, RecomputeLockRepository } from '../../domain/repositories/agronautas'
import { AgronautasRuntimeDispatcherError } from '../../infrastructure/queue/agronautas-runtime-dispatcher'
import { AGRONAUTAS_RUNTIME_DEFAULT_MAX_ATTEMPTS, createAgronautasRuntimeJob, WORKFLOW_CONTRACT_VERSION } from '@golden/workflows'

const API_RECOMPUTE_LOCK_TTL_SECONDS = 120
const AGRONAUTAS_RUNTIME_CONTRACT_VERSION = WORKFLOW_CONTRACT_VERSION

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
    const runtimeConfig = getAgronautasRuntimeConfig()
    const runtimeJob = runtimeConfig.runtimeV2Enabled
      ? createAgronautasRuntimeJob({
        fieldId,
        operation: 'risk-recompute',
        runtimeMode: runtimeConfig.mode,
        requestId: context.requestId,
        idGenerator: this.options.idGenerator,
      })
      : undefined
    const runId = runtimeJob?.runId ?? this.idGenerator()
    const jobId = runtimeJob?.jobId ?? `agro-job-${this.idGenerator()}`
    const requestId = runtimeJob?.trace.traceId ?? context.requestId ?? this.idGenerator()
    const correlationId = requestId
    const contractVersion = runtimeJob?.contractVersion ?? AGRONAUTAS_RUNTIME_CONTRACT_VERSION
    const lease = runtimeJob ? { attempt: runtimeJob.lease.attempt, maxAttempts: runtimeJob.lease.maxAttempts } : { attempt: 1, maxAttempts: AGRONAUTAS_RUNTIME_DEFAULT_MAX_ATTEMPTS }
    const lock = await this.recomputeLockRepository.acquire(fieldId, API_RECOMPUTE_LOCK_TTL_SECONDS, {
      runId,
      jobId,
      requestId,
      correlationId,
      triggeredBy,
      contractVersion,
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

    const queuedAt = runtimeJob ? new Date(runtimeJob.requestedAt) : new Date()
    await this.jobRunRepository.saveQueuedRun({
      jobId,
      runId,
      fieldId,
      status: 'queued',
      triggeredBy,
      contractVersion,
      requestId,
      correlationId,
      runtimeMode: runtimeConfig.mode,
      lease,
      queuedAt,
      resultPayload: {},
    })

    try {
      const dispatchCommand = {
        contractVersion,
        jobId,
        runId,
        fieldId,
        triggeredBy,
        requestId,
        correlationId,
        requestedAt: queuedAt,
        runtimeMode: runtimeConfig.mode,
        lease,
        ...(runtimeJob ? { runtimeJob } : {}),
      }
      await this.runtimeDispatcher.dispatchRiskRecompute(dispatchCommand)
    } catch (error) {
      await this.jobRunRepository.markFailed(jobId, new Date(), 'WORKER_UNAVAILABLE', error instanceof Error ? error.message : 'unknown_worker_error')
      await this.recomputeLockRepository.release(fieldId)
      const message = error instanceof AgronautasRuntimeDispatcherError ? error.message : 'Failed to dispatch recompute job'
      throw new WorkerUnavailableError(message, { runId, jobId, requestId, contractVersion })
    }

    return {
      status: 'enqueued',
      runId,
      jobId,
      requestId,
      contractVersion,
    }
  }

  private idGenerator(): string {
    return this.options.idGenerator?.() ?? randomUUID()
  }
}
