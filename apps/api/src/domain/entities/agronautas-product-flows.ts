import type {
  AgronautasBoundaryRequest,
  AgronautasCanonicalLocation,
  AgronautasEvidenceV2,
  AgronautasLocationResolution,
  AgronautasProductScope,
  AgronautasReadinessV2,
} from '@repo/zod-schemas'

export type ProductFlowScope = Pick<AgronautasProductScope, 'workspaceId' | 'fieldId'>
export type CanonicalLocation = AgronautasCanonicalLocation
export type EvidenceV2 = AgronautasEvidenceV2
export type ReadinessV2 = AgronautasReadinessV2
export type LocationResolution = AgronautasLocationResolution
export type BoundaryRequest = AgronautasBoundaryRequest

export interface AgronautasProductFlowsRepository {
  resolveLocation(request: BoundaryRequest): Promise<LocationResolution>
  saveEvidence(evidence: EvidenceV2): Promise<void>
  getReadiness(request: BoundaryRequest): Promise<ReadinessV2 | null>
}

export function isProductFlowScopeMatch(scope: ProductFlowScope, binding: ProductFlowScope): boolean {
  return scope.workspaceId === binding.workspaceId && scope.fieldId === binding.fieldId
}
