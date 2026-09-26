import { fieldGeometryUpdateSchema, type FieldGeometryUpdate } from '@repo/zod-schemas'
import { normalizeFieldGeometryInput, polygonMetrics, type FieldGeometry } from '../../domain/geometry/field-geometry'
import type { FieldGeometryRepository, FieldRepository } from '../../domain/repositories/agronautas'

export class UpdateFieldGeometryUseCase {
  constructor(
    private readonly fieldRepository: FieldRepository,
    private readonly geometryRepository: FieldGeometryRepository,
  ) {}

  async get(fieldId: string, workspaceId: string): Promise<FieldGeometry | null> {
    return this.geometryRepository.getGeometry(fieldId, workspaceId)
  }

  async execute(fieldId: string, workspaceId: string, input: FieldGeometryUpdate): Promise<FieldGeometry> {
    const parsed = fieldGeometryUpdateSchema.parse(input)
    const field = await this.fieldRepository.findById(fieldId, workspaceId)
    if (!field) throw new Error('FIELD_NOT_FOUND')

    const normalized = normalizeFieldGeometryInput(parsed)
    const metrics = polygonMetrics(normalized.coordinates)
    const coverage = await this.fieldRepository.resolveCoverage(metrics.centroid)
    if (!coverage.insideSupportedArea || !coverage.locality || !coverage.provinceCode) {
      throw new Error(coverage.staleCause ?? 'outside_supported_area')
    }

    return this.geometryRepository.updateGeometry(fieldId, workspaceId, {
      polygonWkt: normalized.polygonWkt,
      source: 'operator',
      expectedUpdatedAt: parsed.expectedUpdatedAt,
    })
  }
}
