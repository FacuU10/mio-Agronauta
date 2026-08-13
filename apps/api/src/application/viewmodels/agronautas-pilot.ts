import type { FieldRepository } from '../../domain/repositories/agronautas'

export type AgronautasFieldIndexRecord = Awaited<ReturnType<NonNullable<FieldRepository['list']>>>['items'][number]

export function toAgronautasFieldIndexItem({ field, createdAt, updatedAt, geometryUpdatedAt }: AgronautasFieldIndexRecord) {
  return {
    fieldId: field.props.id,
    externalFieldId: field.props.externalFieldId,
    crop: field.props.crop,
    hectares: field.props.hectares,
    locality: field.props.localityName,
    provinceCode: field.props.provinceCode,
    centroid: field.props.centroid,
    geometryStatus: field.props.polygonWkt ? 'saved' as const : 'point_only' as const,
    geometrySource: field.props.geometrySource ?? 'fallback',
    geometryUpdatedAt: geometryUpdatedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    sourceRunIds: [],
  }
}
