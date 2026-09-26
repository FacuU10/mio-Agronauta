import { campaignPlanningContextRequestSchema, campaignPlanningContextResponseSchema, type CampaignPlanningContextRequest } from '@repo/zod-schemas'
import type { FieldContextRepository, AgronautasWorkspaceRepository, RiskSnapshotRepository, SignalSummaryRepository } from '../../domain/repositories/agronautas'

export class UnsupportedPlanningFieldError extends Error {
  constructor(public readonly fieldId: string) { super(`Field ${fieldId} is not part of the supported workspace`) }
}

export class GetCampaignPlanningContext {
  constructor(private readonly workspaceRepository: AgronautasWorkspaceRepository, private readonly fieldContextRepository: FieldContextRepository, private readonly signalSummaryRepository: Pick<SignalSummaryRepository, 'getLatestClimateSummary' | 'getLatestSatelliteSummary'>, private readonly riskSnapshotRepository: Pick<RiskSnapshotRepository, 'getLatest'>) {}

  async execute(input: CampaignPlanningContextRequest) {
    const request = campaignPlanningContextRequestSchema.parse(input)
    const workspace = await this.workspaceRepository.getWorkspace(request.workspaceId)
    if (!workspace) throw new Error('Workspace not found')
    const page = await this.workspaceRepository.listWorkspaceFields({ workspaceId: request.workspaceId, limit: 50 })
    const selected = request.fieldIds.map((fieldId) => page.items.find((item) => item.field.props.id === fieldId))
    const missing = request.fieldIds.find((fieldId, index) => !selected[index])
    if (missing) throw new UnsupportedPlanningFieldError(missing)
    const fields = selected.map((item) => item!.field)
    const evidence = await Promise.all(fields.map(async (field) => {
      const climate = await this.signalSummaryRepository.getLatestClimateSummary?.(field.props.id)
      const risk = await this.riskSnapshotRepository.getLatest(field.props.id)
      const context = await this.fieldContextRepository.getLatest(field.props.id)
      return {
        fieldId: field.props.id,
        climate: climate ? { state: 'available' as const, source: climate.provider, observedAt: climate.observedAt.toISOString(), freshness: climate.freshness === 'missing' ? 'degraded' as const : climate.freshness ?? 'fresh' as const, provenance: climate.provenance } : { state: 'unavailable' as const, reason: 'No climate observation exists.' },
        risk: risk ? { state: 'available' as const, source: risk.props.ruleVersion, observedAt: risk.props.computedAt.toISOString(), freshness: risk.freshness, provenance: risk.props.evidenceRefs, engine: { selectionStatus: 'undecided' as const } } : { state: 'unavailable' as const, reason: 'No persisted risk snapshot exists.', engine: { selectionStatus: 'undecided' as const } },
        context,
      }
    }))
    return campaignPlanningContextResponseSchema.parse({
      contractVersion: 'agronautas-campaign-planning-context-v1', persistent: false,
      workspace: { workspaceId: workspace.workspaceId, name: workspace.name, status: workspace.status }, campaignName: request.campaignName, season: request.season,
      fields: fields.map((field) => ({ fieldId: field.props.id, externalFieldId: field.props.externalFieldId, crop: field.props.crop, hectares: field.props.hectares, locality: field.props.localityName, geometryStatus: field.props.polygonWkt ? 'saved' : 'point_only' })),
      evidence: evidence.map(({ context: _context, ...item }) => item),
      availability: [
        { domain: 'soil', state: 'unavailable', reason: 'No verified soil observation exists.', dependency: 'verified soil source' },
        { domain: 'prices', state: 'unavailable', reason: 'No verified price observation exists.', dependency: 'approved price source' },
        { domain: 'fx', state: 'unavailable', reason: 'No verified FX observation exists.', dependency: 'approved FX source' },
        { domain: 'external_economics', state: 'unavailable', reason: 'No external economic source is configured.', dependency: 'economic evidence policy' },
      ],
    })
  }
}
