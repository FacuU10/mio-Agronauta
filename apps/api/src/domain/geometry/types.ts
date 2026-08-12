export const fieldGeometrySources = ['operator', 'google', 'fallback'] as const
export type FieldGeometrySource = (typeof fieldGeometrySources)[number]
