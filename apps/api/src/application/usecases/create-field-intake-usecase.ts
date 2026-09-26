import { randomUUID } from 'node:crypto'
import { corrientesRiceZoneBoundarySource, type FieldIntake } from '@repo/zod-schemas'
import { Field, FieldContext } from '../../domain/entities/agronautas'
import type { FieldContextRepository, FieldRepository } from '../../domain/repositories/agronautas'
import { normalizeFieldGeometryInput, polygonMetrics } from '../../domain/geometry/field-geometry'

export interface CreateFieldIntakeResult {
  fieldId: string
  crop: string
  coverage: {
    locality: string
    provinceCode: string
    boundaryVersion?: string
    status: 'supported'
  }
}

interface CreateFieldIntakeOptions {
  idGenerator?: () => string
}

export class CreateFieldIntakeUseCase {
  constructor(
    private readonly fieldRepository: FieldRepository,
    private readonly fieldContextRepository: FieldContextRepository,
    private readonly options: CreateFieldIntakeOptions = {},
  ) {}

  async execute(input: FieldIntake, workspaceId: string): Promise<CreateFieldIntakeResult> {
    if (!workspaceId.trim()) throw new Error('WORKSPACE_REQUIRED')
    const geometry = input.location.polygonWkt || input.location.geoJson
      ? normalizeFieldGeometryInput({ polygonWkt: input.location.polygonWkt, geoJson: input.location.geoJson })
      : null
    const geometryMetrics = geometry ? polygonMetrics(geometry.coordinates) : null
    const coverage = await this.fieldRepository.resolveCoverage(geometryMetrics?.centroid ?? input.location)
    if (!coverage.insideSupportedArea || !coverage.locality || !coverage.provinceCode) {
      throw new Error(coverage.staleCause ?? (coverage.insideSupportedArea ? 'unsupported_locality' : 'outside_supported_area'))
    }

    const field = new Field({
      id: this.idGenerator(),
      externalFieldId: input.fieldId,
      crop: input.crop,
      cropCategory: input.cropCategory,
      hectares: geometryMetrics?.hectares ?? input.hectares,
      localityName: coverage.locality,
      provinceCode: coverage.provinceCode,
      centroid: geometryMetrics?.centroid ?? { lat: input.location.lat, lng: input.location.lng },
      polygonWkt: geometry?.polygonWkt,
      geometrySource: geometry ? 'operator' : 'fallback',
      boundaryMetadata: {
        ...corrientesRiceZoneBoundarySource,
        sourceVersion: coverage.boundaryVersion ?? corrientesRiceZoneBoundarySource.sourceVersion,
      },
    })

    const context = new FieldContext({
      fieldId: field.props.id,
      growthStage: input.growthStage,
      localityCanonical: coverage.locality,
      localityConfidence: coverage.localityConfidence ?? 1,
      contextPayload: {
        declaredLocality: input.locality,
        polygonWkt: input.location.polygonWkt,
      },
    })

    await this.fieldRepository.save(field, workspaceId)
    await this.fieldContextRepository.save(context)

    return {
      fieldId: field.props.id,
      crop: field.props.crop,
      coverage: {
        locality: coverage.locality,
        provinceCode: coverage.provinceCode,
        boundaryVersion: coverage.boundaryVersion,
        status: 'supported',
      },
    }
  }

  private idGenerator(): string {
    return this.options.idGenerator?.() ?? randomUUID()
  }
}
