import type { AgronautasIntelligence } from '@repo/zod-schemas'
import type { FieldContextRepository, FieldRepository, RiskSnapshotRepository, SignalSummaryRepository } from '../../domain/repositories/agronautas'
import { buildAgronautasIntelligenceViewModel } from '../viewmodels/agronautas-intelligence'

export class GetFieldIntelligenceUseCase {
  constructor(
    private readonly fieldRepository: FieldRepository,
    private readonly fieldContextRepository: FieldContextRepository,
    private readonly signalSummaryRepository: SignalSummaryRepository,
    private readonly riskSnapshotRepository: RiskSnapshotRepository,
  ) {}

  async execute(fieldId: string, workspaceId: string): Promise<AgronautasIntelligence | null> {
    const field = await this.fieldRepository.findById(fieldId, workspaceId)
    if (!field) return null

    const [context, climate, climateTimeline, risk, riskTimeline] = await Promise.all([
      this.fieldContextRepository.getLatest(fieldId),
      this.signalSummaryRepository.getLatestClimateSummary(fieldId),
      this.signalSummaryRepository.listClimateTimeline?.(fieldId, 10) ?? Promise.resolve([]),
      this.riskSnapshotRepository.getLatest(fieldId),
      this.riskSnapshotRepository.listTimeline?.(fieldId, 10) ?? Promise.resolve([]),
    ])

    return buildAgronautasIntelligenceViewModel({ field, context, climate, climateTimeline, risk, riskTimeline })
  }
}
