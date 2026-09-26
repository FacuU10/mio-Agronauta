import { randomUUID } from 'node:crypto'
import {
  agronautasLocationSelectionRequestSchema,
  type AgronautasLocationResolution,
  type AgronautasLocationSelectionRequest,
} from '@repo/zod-schemas'
import type { AuthPrincipal } from '../../domain/auth/contracts'
import { composeCanonicalLocation, geometryCoveragePoint, parseLocationGeometry, type LocationClock } from '../../domain/location/agronautas-location'
import type { AgronautasLocationRepository } from '../../domain/repositories/agronautas-product-flows'

export class ResolveAgronautasLocationUseCase {
  private readonly clock: LocationClock

  constructor(private readonly repository: AgronautasLocationRepository, options: Partial<LocationClock> = {}) {
    this.clock = {
      now: options.now ?? (() => new Date()),
      idGenerator: options.idGenerator ?? randomUUID,
      selectionIdGenerator: options.selectionIdGenerator ?? randomUUID,
    }
  }

  async execute(principal: AuthPrincipal, input: AgronautasLocationSelectionRequest): Promise<AgronautasLocationResolution> {
    const parsed = agronautasLocationSelectionRequestSchema.safeParse(input)
    if (!parsed.success) return { status: 'invalid', reason: 'selection_contract_invalid' }
    if (parsed.data.workspaceId !== principal.workspaceId) return { status: 'unauthorized', reason: 'selection_workspace_out_of_scope' }

    const geometry = parseLocationGeometry(parsed.data.geometry)
    if (!geometry.success) return { status: 'invalid', reason: geometry.reason }

    let field
    try {
      field = await this.repository.findAuthorizedField(parsed.data.fieldId, parsed.data.workspaceId)
    } catch {
      return { status: 'unavailable', reason: 'field_scope_unavailable', retryable: true }
    }
    if (!field) return { status: 'unauthorized', reason: 'field_out_of_scope' }

    let coverage
    try {
      coverage = await this.repository.resolveCoverage(geometryCoveragePoint(geometry.geometry))
    } catch {
      return { status: 'unavailable', reason: 'coverage_unavailable', retryable: true }
    }
    if (!coverage.insideSupportedArea || !coverage.locality || !coverage.provinceCode) {
      return { status: 'unavailable', reason: coverage.staleCause ?? 'coverage_not_proven', retryable: Boolean(coverage.staleCause === 'coverage_not_loaded') }
    }

    const evidenceRef = coverage.boundaryVersion ?? field.props.boundaryMetadata.sourceVersion
    const isPolygon = geometry.geometry.type === 'polygon'
    return {
      status: 'accepted',
      location: composeCanonicalLocation({
        principal,
        field,
        request: { ...parsed.data, geometry: geometry.geometry },
        coverage: isPolygon
          ? { status: 'partial', reason: 'polygon_boundary_coverage_not_proven', ...(evidenceRef ? { evidenceRef } : {}) }
          : evidenceRef
            ? { status: 'supported', evidenceRef }
            : { status: 'unverified', reason: 'coverage_evidence_reference_unavailable' },
        clock: this.clock,
      }),
    }
  }
}
