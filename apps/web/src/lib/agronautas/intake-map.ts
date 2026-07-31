import { createMapProviderAdapter, type CoveragePreview, type MapPoint, type MapProviderAdapter, type LocalityOption } from '@/lib/visibility/map'

export const AGRONAUTAS_LOCALITIES: readonly LocalityOption[] = [
  { id: 'mercedes', name: 'Mercedes', provinceCode: 'AR-W', coordinates: { lat: -29.1846, lng: -58.0759 } },
  { id: 'corrientes', name: 'Corrientes', provinceCode: 'AR-W', coordinates: { lat: -27.4692, lng: -58.8306 } },
]

export function createAgronautasMapAdapter(): MapProviderAdapter {
  return createMapProviderAdapter({
    localities: AGRONAUTAS_LOCALITIES,
    previewCoverage: async (point) => previewAgronautasPoint(point),
  })
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
