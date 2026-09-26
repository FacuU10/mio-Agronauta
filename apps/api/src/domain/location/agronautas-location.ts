import {
  agronautasCanonicalLocationSchema,
  agronautasLocationGeometrySchema,
  type AgronautasCanonicalLocation,
  type AgronautasLocationGeometryType,
  type AgronautasLocationSelectionRequest,
} from '@repo/zod-schemas'
import type { AuthPrincipal } from '../auth/contracts'
import type { Field } from '../entities/agronautas'

type PointGeometry = { type: 'point'; coordinates: { latitude: number; longitude: number } }
type PolygonGeometry = { type: 'polygon'; coordinates: number[][][] }
type LocationGeometry = PointGeometry | PolygonGeometry

export interface LocationClock {
  now: () => Date
  idGenerator: () => string
  selectionIdGenerator: () => string
}

export function parseLocationGeometry(input: unknown): { success: true; geometry: LocationGeometry } | { success: false; reason: string } {
  const parsed = agronautasLocationGeometrySchema.safeParse(input)
  if (!parsed.success) return { success: false, reason: 'geometry_contract_invalid' }
  if (parsed.data.type === 'point') return { success: true, geometry: parsed.data as PointGeometry }

  const polygon = parsed.data.coordinates as number[][][]
  const ring = polygon[0]
  if (!ring || ring.length < 4) return { success: false, reason: 'polygon_requires_closed_ring' }
  const first = ring[0]
  const last = ring.at(-1)
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) return { success: false, reason: 'polygon_requires_closed_ring' }
  if (ring.some((pair) => {
    const longitude = pair[0]
    const latitude = pair[1]
    return longitude === undefined || latitude === undefined || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90
  })) return { success: false, reason: 'polygon_coordinate_out_of_range' }
  return { success: true, geometry: parsed.data as PolygonGeometry }
}

export function geometryCoveragePoint(geometry: LocationGeometry): { lat: number; lng: number } {
  if (geometry.type === 'point') return { lat: geometry.coordinates.latitude, lng: geometry.coordinates.longitude }
  const ring = geometry.coordinates[0] ?? []
  const vertices = ring.slice(0, -1)
  const sums = vertices.reduce((result, pair) => ({ lat: result.lat + (pair[1] ?? 0), lng: result.lng + (pair[0] ?? 0) }), { lat: 0, lng: 0 })
  const count = Math.max(vertices.length, 1)
  return { lat: sums.lat / count, lng: sums.lng / count }
}

export function composeCanonicalLocation(input: {
  principal: AuthPrincipal
  field: Field
  request: AgronautasLocationSelectionRequest
  coverage: { status: AgronautasCanonicalLocation['coverage']['status']; evidenceRef?: string; reason?: string }
  clock: LocationClock
}): AgronautasCanonicalLocation {
  const { principal, field, request, coverage, clock } = input
  const geometryType: AgronautasLocationGeometryType = request.geometry.type
  return agronautasCanonicalLocationSchema.parse({
    contractVersion: 'agronautas-location-v2',
    locationId: clock.idGenerator(),
    workspaceId: request.workspaceId,
    fieldId: request.fieldId,
    actorScope: {
      actorId: principal.actorId,
      sessionId: principal.sessionId,
      workspaceId: request.workspaceId,
      fieldId: request.fieldId,
      scopes: principal.scopes,
    },
    geometry: { type: geometryType, coordinates: request.geometry.coordinates },
    coverage,
    selectionLineage: {
      selectionId: clock.selectionIdGenerator(),
      selectedAt: clock.now().toISOString(),
      source: request.selection.source,
      ...(request.selection.provider ? { provider: request.selection.provider } : {}),
      ...(request.selection.sourceReference ? { sourceReference: request.selection.sourceReference } : {}),
    },
  })
}
