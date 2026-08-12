import { createMapProviderAdapter, type CoveragePreview, type MapPoint, type MapProviderAdapter, type LocalityOption } from '@/lib/visibility/map'

const GOOGLE_MAPS_REASONS = {
  MISSING_PUBLIC_KEY: 'missing_public_key',
  DISABLED_BY_CONFIGURATION: 'disabled_by_configuration',
  PROVIDER_LOAD_FAILED: 'provider_load_failed',
} as const

export interface GoogleMapsConfigInput {
  enabled?: boolean
  apiKey?: string
}

export type GoogleMapsCapability =
  | { status: 'disabled'; reason: 'missing_public_key' | 'disabled_by_configuration' }
  | { status: 'ready'; apiKeyConfigured: true }
  | { status: 'failed'; reason: 'provider_load_failed' }

export interface GoogleMapsLoader {
  load: () => Promise<GoogleMapsCapability>
  retry: () => Promise<GoogleMapsCapability>
}

export interface AgronautasMapAdapter extends MapProviderAdapter {
  parseCoordinates: (value: string) => MapPoint | null
  google: GoogleMapsCapability
}

export const AGRONAUTAS_LOCALITIES: readonly LocalityOption[] = [
  { id: 'mercedes', name: 'Mercedes', provinceCode: 'AR-W', coordinates: { lat: -29.1846, lng: -58.0759 } },
  { id: 'corrientes', name: 'Corrientes', provinceCode: 'AR-W', coordinates: { lat: -27.4692, lng: -58.8306 } },
]

export function resolveGoogleMapsConfig(input: GoogleMapsConfigInput = {}): GoogleMapsCapability {
  if (input.enabled === false) return { status: 'disabled', reason: GOOGLE_MAPS_REASONS.DISABLED_BY_CONFIGURATION }
  const apiKey = input.apiKey?.trim() || (typeof window === 'undefined' ? process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']?.trim() : undefined)
  return apiKey ? { status: 'ready', apiKeyConfigured: true } : { status: 'disabled', reason: GOOGLE_MAPS_REASONS.MISSING_PUBLIC_KEY }
}

export function createGoogleMapsLoader(options: { config: GoogleMapsCapability; apiKey?: string; loadScript: (apiKey: string) => Promise<void> }): GoogleMapsLoader {
  let capability = options.config
  const load = async (): Promise<GoogleMapsCapability> => {
    if (capability.status !== 'ready') return capability
    const apiKey = options.apiKey?.trim() || (typeof window === 'undefined' ? process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']?.trim() : undefined)
    if (!apiKey) return { status: 'disabled', reason: GOOGLE_MAPS_REASONS.MISSING_PUBLIC_KEY }
    try {
      await options.loadScript(apiKey)
      return capability
    } catch {
      capability = { status: 'failed', reason: GOOGLE_MAPS_REASONS.PROVIDER_LOAD_FAILED }
      return capability
    }
  }
  return {
    load,
    retry: async () => {
      capability = options.config
      return load()
    },
  }
}

export function createAgronautasMapAdapter(): AgronautasMapAdapter {
  const base = createMapProviderAdapter({
    localities: AGRONAUTAS_LOCALITIES,
    previewCoverage: async (point) => previewAgronautasPoint(point),
  })
  return { ...base, google: resolveGoogleMapsConfig(), parseCoordinates }
}

export function previewAgronautasPoint(point: MapPoint): CoveragePreview {
  const inside = point.lat >= -32 && point.lat <= -27 && point.lng >= -60.5 && point.lng <= -56
  const locality = inside ? nearestLocality(point) : null
  return {
    state: inside ? 'inside' : 'outside',
    locality: locality?.name ?? null,
    provinceCode: inside ? 'AR-W' : null,
    source: 'Previsualización local; el backend confirma la cobertura',
    pointOnly: true,
  }
}

function nearestLocality(point: MapPoint): LocalityOption | undefined {
  return AGRONAUTAS_LOCALITIES.reduce<LocalityOption | undefined>((nearest, locality) => {
    if (!locality.coordinates) return nearest
    if (!nearest?.coordinates) return locality
    return distance(point, locality.coordinates) < distance(point, nearest.coordinates) ? locality : nearest
  }, undefined)
}

function distance(a: MapPoint, b: MapPoint): number {
  return Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng)
}

export interface PolygonDraft {
  points: MapPoint[]
  polygonWkt: string | null
  isComplete: boolean
  areaM2: number
  hectares: number
  perimeterM: number
}

export function createPolygonDraft(points: readonly MapPoint[]): PolygonDraft {
  const normalized = points.map((point) => ({ lat: point.lat, lng: point.lng }))
  const isComplete = normalized.length >= 3
  const closed = isComplete && normalized[0] ? [...normalized, normalized[0]] : normalized
  const polygonWkt = isComplete ? `POLYGON((${closed.map((point) => `${point.lng} ${point.lat}`).join(',')}))` : null
  const areaM2 = isComplete ? Math.round(Math.abs(shoelace(normalized)) * 12_300_000) : 0
  const perimeterM = isComplete ? Math.round(perimeter(normalized)) : 0
  return { points: normalized, polygonWkt, isComplete, areaM2, hectares: Number((areaM2 / 10_000).toFixed(2)), perimeterM }
}

export function formatGeometryMetrics(metrics: { hectares: number; areaM2: number; perimeterM: number }) {
  return {
    area: `${metrics.hectares.toFixed(2)} ha`,
    footprint: `${Math.round(metrics.areaM2).toLocaleString('en-US')} m²`,
    perimeter: `${Math.round(metrics.perimeterM).toLocaleString('en-US')} m`,
  }
}

function parseCoordinates(value: string): MapPoint | null {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null
}

function shoelace(points: readonly MapPoint[]): number {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    if (!next) return sum
    return sum + point.lng * next.lat - next.lng * point.lat
  }, 0) / 2
}

function perimeter(points: readonly MapPoint[]): number {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return next ? sum + distanceMeters(point, next) : sum
  }, 0)
}

function distanceMeters(a: MapPoint, b: MapPoint): number {
  const latScale = 111_320
  const lngScale = 111_320 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  return Math.hypot((a.lat - b.lat) * latScale, (a.lng - b.lng) * lngScale)
}
