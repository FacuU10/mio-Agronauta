import type { AgronautasSignalType } from '../../domain/repositories/agronautas'

export interface ProviderEvidenceResult {
  provider: string
  signalType: AgronautasSignalType
  observedAt: Date
  confidence: number
  sourceUrl?: string
  raw: Record<string, unknown>
  normalized: Record<string, unknown>
  mode: 'live' | 'seam' | 'mock' | 'unavailable'
  status: 'fresh' | 'degraded' | 'missing'
  failureReason?: string
}

export interface AgronautasProviderAdapter {
  readonly provider: string
  readonly signalType: AgronautasSignalType
  fetch(fieldId: string): Promise<ProviderEvidenceResult>
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>

interface HttpAdapterOptions {
  endpoint?: string
  fetch?: FetchLike
  latitude?: number
  longitude?: number
  apiKey?: string
  mode?: 'live' | 'mock'
}

export class TaxonomyProviderAdapter implements AgronautasProviderAdapter {
  constructor(
    readonly provider: string,
    readonly signalType: AgronautasSignalType,
    private readonly sourceUrl: string,
    private readonly fetcher: (fieldId: string) => Promise<Record<string, unknown>>,
    private readonly mode: ProviderEvidenceResult['mode'],
    private readonly failureReason?: string,
  ) {}

  async fetch(fieldId: string): Promise<ProviderEvidenceResult> {
    let raw: Record<string, unknown>
    try {
      raw = await this.fetcher(fieldId)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'provider_unavailable'
      throw new Error(`unavailable:${this.provider}:${reason}`)
    }
    return {
      provider: this.provider,
      signalType: this.signalType,
      observedAt: raw['observedAt'] instanceof Date ? raw['observedAt'] : new Date(String(raw['observedAt'] ?? new Date().toISOString())),
      confidence: Number(raw['confidence'] ?? 0.7),
      sourceUrl: typeof raw['sourceUrl'] === 'string' ? raw['sourceUrl'] : this.sourceUrl,
      raw,
      normalized: raw['normalized'] && typeof raw['normalized'] === 'object' ? raw['normalized'] as Record<string, unknown> : raw,
      mode: this.mode,
      status: this.mode === 'live' ? 'fresh' : 'degraded',
      failureReason: this.mode === 'live' ? undefined : this.failureReason,
    }
  }
}

export const PlaceholderRealProviderAdapter = TaxonomyProviderAdapter

async function fetchJson(fetcher: FetchLike, url: string): Promise<Record<string, unknown>> {
  const response = await fetcher(url)
  if (!response.ok) throw new Error(`provider_http_${response.status}`)
  return await response.json() as Record<string, unknown>
}

function parseNumberList(value: unknown): number[] {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : []
}

export function createOpenMeteoAdapter(input: ((fieldId: string) => Promise<Record<string, unknown>>) | HttpAdapterOptions): AgronautasProviderAdapter {
  if (typeof input === 'function') return new TaxonomyProviderAdapter('open-meteo', 'climate', 'https://open-meteo.com/', input, 'seam', 'injectable seam, not direct live provider')
  const fetcher = input.fetch ?? fetch
  return new TaxonomyProviderAdapter('open-meteo', 'climate', input.endpoint ?? 'https://api.open-meteo.com/v1/forecast', async () => {
    const url = new URL(input.endpoint ?? 'https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(input.latitude ?? Number(process.env['AGRONAUTAS_OPEN_METEO_LATITUDE'] ?? -29.18)))
    url.searchParams.set('longitude', String(input.longitude ?? Number(process.env['AGRONAUTAS_OPEN_METEO_LONGITUDE'] ?? -58.08)))
    url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum')
    url.searchParams.set('timezone', 'UTC')
    const raw = await fetchJson(fetcher, url.toString())
    const daily = raw['daily'] as Record<string, unknown> | undefined
    const rainfall = parseNumberList(daily?.['precipitation_sum'])
    const maxTemps = parseNumberList(daily?.['temperature_2m_max'])
    return { ...raw, sourceUrl: url.toString(), observedAt: `${(daily?.['time'] as string[] | undefined)?.[0] ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`, normalized: { temperatureMaxC: Math.max(...maxTemps), rainfallMm7d: rainfall.reduce((sum, value) => sum + value, 0) } }
  }, input.mode ?? 'live', input.mode === 'mock' ? 'mock provider mode requested' : undefined)
}

export function createSmnAlertsAdapter(input: ((fieldId: string) => Promise<Record<string, unknown>>) | HttpAdapterOptions): AgronautasProviderAdapter {
  if (typeof input === 'function') return new TaxonomyProviderAdapter('smn-alerts', 'weather_alert', 'https://www.smn.gob.ar/alertas', input, 'seam', 'injectable seam, not direct live provider')
  const endpoint = input.endpoint ?? process.env['AGRONAUTAS_SMN_ALERTS_URL'] ?? 'https://www.smn.gob.ar/alertas'
  const fetcher = input.fetch ?? fetch
  return new TaxonomyProviderAdapter('smn-alerts', 'weather_alert', endpoint, async () => {
    const raw = await fetchJson(fetcher, endpoint)
    const alerts = Array.isArray(raw['alerts']) ? raw['alerts'] : []
    return { ...raw, normalized: { alertCount: alerts.length }, observedAt: raw['observedAt'] ?? new Date().toISOString() }
  }, input.mode ?? 'live', input.mode === 'mock' ? 'mock provider mode requested' : undefined)
}

export function createNasaFirmsAdapter(input: ((fieldId: string) => Promise<Record<string, unknown>>) | HttpAdapterOptions): AgronautasProviderAdapter {
  if (typeof input === 'function') return new TaxonomyProviderAdapter('nasa-firms', 'fire', 'https://firms.modaps.eosdis.nasa.gov/', input, 'seam', 'injectable seam, not direct live provider')
  const apiKey = input.apiKey ?? process.env['FIRMS_API_KEY']
  if (!apiKey) throw new Error('FIRMS_API_KEY is required for nasa-firms adapter')
  const endpoint = input.endpoint ?? 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'
  const fetcher = input.fetch ?? fetch
  return new TaxonomyProviderAdapter('nasa-firms', 'fire', endpoint, async () => {
    const url = new URL(endpoint)
    url.searchParams.set('MAP_KEY', apiKey)
    const raw = await fetchJson(fetcher, url.toString())
    const hotspots = Array.isArray(raw['hotspots']) ? raw['hotspots'] : []
    return { ...raw, normalized: { hotspotCount: hotspots.length }, observedAt: raw['observedAt'] ?? new Date().toISOString() }
  }, input.mode ?? 'live', input.mode === 'mock' ? 'mock provider mode requested' : undefined)
}

export function createSentinelStacAdapter(fetcher: (fieldId: string) => Promise<Record<string, unknown>>): AgronautasProviderAdapter {
  return new TaxonomyProviderAdapter('sentinel-stac', 'satellite', 'https://dataspace.copernicus.eu/', fetcher, 'seam', 'injectable seam, not direct live provider')
}
