import { randomUUID } from 'node:crypto'
import type { RecomputeLockRepository } from '../../domain/repositories/agronautas'

const API_RECOMPUTE_LOCK_TTL_SECONDS = 120

export interface RequestRiskRecomputeResult {
  status: 'enqueued' | 'already_in_progress'
  runId: string
}

interface RequestRiskRecomputeOptions {
  idGenerator?: () => string
}

export class RequestRiskRecomputeUseCase {
  constructor(
    private readonly recomputeLockRepository: RecomputeLockRepository,
    private readonly options: RequestRiskRecomputeOptions = {},
  ) {}

  async execute(fieldId: string, triggeredBy: 'api' | 'alert-refresh' = 'api'): Promise<RequestRiskRecomputeResult> {
    const runId = this.idGenerator()
    const acquired = await this.recomputeLockRepository.acquire(fieldId, API_RECOMPUTE_LOCK_TTL_SECONDS, { runId, triggeredBy })

    return {
      status: acquired ? 'enqueued' : 'already_in_progress',
      runId,
    }
  }

  private idGenerator(): string {
    return this.options.idGenerator?.() ?? randomUUID()
  }
}
