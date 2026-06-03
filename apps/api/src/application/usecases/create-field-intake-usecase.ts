import { randomUUID } from 'node:crypto'
import { corrientesRiceZoneBoundarySource, type FieldIntake } from '@repo/zod-schemas'
import { Field, FieldContext } from '../../domain/entities/agronautas'
import type { FieldContextRepository, FieldRepository } from '../../domain/repositories/agronautas'

export interface CreateFieldIntakeResult {
  fieldId: string
  coverage: {
    locality: string
    provinceCode: string
    boundaryVersion?: string
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

  async execute(input: FieldIntake): Promise<CreateFieldIntakeResult> {
    const coverage = await this.fieldRepository.resolveCoverage(input.location)
    if (!coverage.insideSupportedArea || !coverage.locality || !coverage.provinceCode) {
      throw new Error(coverage.staleCause ?? 'outside_supported_area')
    }

    const field = new Field({
      id: this.idGenerator(),
      externalFieldId: input.fieldId,
      crop: input.crop,
      hectares: input.hectares,
      localityName: coverage.locality,
      provinceCode: coverage.provinceCode,
      centroid: { lat: input.location.lat, lng: input.location.lng },
      polygonWkt: input.location.polygonWkt,
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

    await this.fieldRepository.save(field)
    await this.fieldContextRepository.save(context)

    return {
      fieldId: field.props.id,
      coverage: {
        locality: coverage.locality,
        provinceCode: coverage.provinceCode,
        boundaryVersion: coverage.boundaryVersion,
      },
    }
  }

  private idGenerator(): string {
    return this.options.idGenerator?.() ?? randomUUID()
  }
}
