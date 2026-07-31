export interface MapPoint {
  lat: number
  lng: number
}

export interface LocalityOption {
  id: string
  name: string
  provinceCode: string
  coordinates?: MapPoint
}

export interface CoveragePreview {
  state: 'inside' | 'outside' | 'unknown'
  locality: string | null
  provinceCode: string | null
  source: string
  pointOnly: true
}

export interface MapProviderAdapter {
  provider: 'unconfigured' | 'custom'
  searchLocalities(query: string): LocalityOption[]
  previewCoverage(point: MapPoint): Promise<CoveragePreview>
}

interface MapAdapterOptions {
  localities: readonly LocalityOption[]
  previewCoverage: (point: MapPoint) => Promise<CoveragePreview>
}

export function filterLocalities(localities: readonly LocalityOption[], query: string): LocalityOption[] {
  const normalized = query.trim().toLocaleLowerCase('es-AR')
  if (!normalized) return [...localities]
  return localities.filter((locality) => `${locality.name} ${locality.provinceCode}`.toLocaleLowerCase('es-AR').includes(normalized))
}

export function createMapProviderAdapter(options: MapAdapterOptions): MapProviderAdapter {
  return {
    provider: 'unconfigured',
    searchLocalities: (query) => filterLocalities(options.localities, query),
    previewCoverage: options.previewCoverage,
  }
}
