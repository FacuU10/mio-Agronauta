import type {
  CanonicalLocation,
  EvidenceV2,
  ProductFlowScope,
  ReadinessV2,
} from '../entities/agronautas-product-flows'
import type { Field, GeoPoint } from '../entities/agronautas'
import type { SupportedCoverageResult, FieldRepository } from './agronautas'
import type { AgronautasEvidenceV2 } from '@repo/zod-schemas'

export interface AgronautasCanonicalLocationRepository {
  findAuthorized(locationId: string, scope: ProductFlowScope): Promise<CanonicalLocation | null>
}

export interface AgronautasLocationRepository {
  findAuthorizedField(fieldId: string, workspaceId: string): Promise<Field | null>
  resolveCoverage(point: GeoPoint): Promise<SupportedCoverageResult>
}

export class PostgresAgronautasLocationRepository implements AgronautasLocationRepository {
  constructor(private readonly fields: Pick<FieldRepository, 'findById' | 'resolveCoverage'>) {}

  findAuthorizedField(fieldId: string, workspaceId: string): Promise<Field | null> {
    return this.fields.findById(fieldId, workspaceId)
  }

  resolveCoverage(point: GeoPoint): Promise<SupportedCoverageResult> {
    return this.fields.resolveCoverage(point)
  }
}

export interface AgronautasEvidenceRepository {
  save(evidence: EvidenceV2): Promise<void>
  listByLocation(locationId: string, scope: ProductFlowScope): Promise<ReadonlyArray<EvidenceV2>>
}

export interface AgronautasProviderRunScope {
  locationId: string
  workspaceId: string
  fieldId: string
}

export interface AgronautasProviderRunInput {
  runKey: string
  runId: string
  requestId: string
  scope: AgronautasProviderRunScope
  provider: string
  signalType: string
  windowStart: Date
  windowEnd: Date
  evidence: AgronautasEvidenceV2
}

export interface AgronautasProviderEvidenceRepository {
  saveRun(input: AgronautasProviderRunInput): Promise<boolean>
}

export interface AgronautasReadinessRepository {
  getByLocation(locationId: string, scope: ProductFlowScope): Promise<ReadinessV2 | null>
}

export interface AgronautasProductFlowRepositories {
  locations: AgronautasCanonicalLocationRepository
  evidence: AgronautasEvidenceRepository
  readiness: AgronautasReadinessRepository
}
