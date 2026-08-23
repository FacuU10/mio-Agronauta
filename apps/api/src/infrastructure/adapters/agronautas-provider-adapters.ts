import { createHash, randomUUID } from 'node:crypto'
import type { EvidenceEnvelope } from '@repo/zod-schemas'

export interface ProviderEvidenceResult extends EvidenceEnvelope {
  raw?: Record<string, unknown>
  normalized?: Record<string, unknown>
  mode: ProviderMode
  status: EvidenceEnvelope['freshness']
}

export interface AgronautasProviderAdapter {
  readonly provider: string
  readonly signalType: string
  fetch(fieldId: string): Promise<ProviderEvidenceResult>
}

type ProviderMode = EvidenceEnvelope['providerMode']
type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>
type Clock = () => Date

interface HttpAdapterOptions {
  endpoint?: string
  fetch?: FetchLike
  now?: Clock
  timeoutMs?: number
  runId?: string
  requestId?: string
  latitude?: number
  longitude?: number
  apiKey?: string
  mode?: Exclude<ProviderMode, 'unavailable'>
  commercialUseApproved?: boolean
  province?: string
  timeStandard?: 'UTC' | 'local-solar'
  startDate?: string
  endDate?: string
  model?: string
  forecastHorizonDays?: number
}

interface HttpResult {
  payload: unknown
  status: number
  sourceUrl: string
  latencyMs: number
}

class ProviderRequestError extends Error {
  constructor(readonly reason: string, readonly httpStatus: number | null = null) {
    super(reason)
  }
}

export class TaxonomyProviderAdapter implements AgronautasProviderAdapter {
  constructor(
    readonly provider: string,
    readonly signalType: string,
    private readonly sourceUrl: string,
    private readonly fetcher: (fieldId: string) => Promise<Record<string, unknown>>,
    private readonly mode: ProviderMode,
    private readonly failureReason?: string,
    private readonly now: Clock = () => new Date(),
  ) {}

  async fetch(fieldId: string): Promise<ProviderEvidenceResult> {
    const retrievedAt = this.now().toISOString()
    try {
      const raw = await this.fetcher(fieldId)
      const normalized = isRecord(raw['normalized']) ? raw['normalized'] : raw
      const observedAt = toTimestamp(raw['observedAt'])
      const result = createEnvelope({
        provider: this.provider,
        signalType: this.signalType,
        sourceUrl: stringOr(raw['sourceUrl'], this.sourceUrl),
        providerMode: this.mode,
        observedAt,
        forecastAt: null,
        retrievedAt: toTimestamp(raw['retrievedAt']) ?? retrievedAt,
        timeStandard: observedAt ? 'UTC' : 'retrieval-only',
        forecastHorizonDays: null,
        model: null,
        units: inferUnits(this.provider, normalized),
        freshness: this.mode === 'live' ? 'fresh' : 'degraded',
        raw,
        normalized,
        value: normalized,
        failureReason: this.mode === 'live' ? undefined : this.failureReason,
      })
      return result
    } catch (error) {
      return unavailableEnvelope({
        provider: this.provider,
        signalType: this.signalType,
        sourceUrl: this.sourceUrl,
        retrievedAt,
        reason: error instanceof Error ? error.message : 'provider_unavailable',
      })
    }
  }
}

export function createGeorefAdapter(input: HttpAdapterOptions = {}): AgronautasProviderAdapter {
  const endpoint = input.endpoint ?? 'https://apis.datos.gob.ar/georef/api/localidades'
  const fetcher = input.fetch ?? fetch
  const injected = Boolean(input.fetch)
  return createHttpAdapter({
    provider: 'georef-2.1',
    signalType: 'locality',
    endpoint,
    mode: injected ? (input.mode === 'mock' ? 'mock' : 'seam') : 'live',
    input,
    fetcher,
    buildUrl: (fieldId) => {
      const url = new URL(endpoint)
      url.searchParams.set('nombre', fieldId)
      url.searchParams.set('provincia', input.province ?? 'Corrientes')
      url.searchParams.set('max', '1')
      return url.toString()
    },
    parse: (payload) => {
      const row = firstRecord(payload, 'localidades')
      const centroid = isRecord(row?.['centroide']) ? row['centroide'] : undefined
      const province = isRecord(row?.['provincia']) ? row['provincia'] : undefined
      const lat = finiteNumber(centroid?.['lat'])
      const lon = finiteNumber(centroid?.['lon'])
      if (!row || typeof row['id'] !== 'string' || typeof row['nombre'] !== 'string' || !province || typeof province['id'] !== 'string' || lat === null || lon === null) throw new ProviderRequestError('schema_drift')
      return {
        observedAt: null,
        forecastAt: null,
        timeStandard: 'retrieval-only',
        units: { latitude: 'degrees', longitude: 'degrees', coordinateReferenceSystem: 'WGS84', code: 'code' },
        normalized: { localityId: row['id'], name: row['nombre'], provinceCode: province['id'], provinceName: province['nombre'], centroid: { lat, lng: lon } },
      }
    },
  })
}

export function createNasaPowerDailyAdapter(input: HttpAdapterOptions = {}): AgronautasProviderAdapter {
  const endpoint = input.endpoint ?? 'https://power.larc.nasa.gov/api/temporal/daily/point'
  const fetcher = input.fetch ?? fetch
  const injected = Boolean(input.fetch)
  return createHttpAdapter({
    provider: 'nasa-power-daily',
    signalType: 'climate',
    endpoint,
    mode: injected ? (input.mode === 'mock' ? 'mock' : 'seam') : 'live',
    input,
    fetcher,
    buildUrl: () => {
      const url = new URL(endpoint)
      url.searchParams.set('parameters', 'T2M,PRECTOTCORR')
      url.searchParams.set('community', 'AG')
      url.searchParams.set('longitude', String(input.longitude ?? Number(process.env['AGRONAUTAS_POWER_LONGITUDE'] ?? -58.08)))
      url.searchParams.set('latitude', String(input.latitude ?? Number(process.env['AGRONAUTAS_POWER_LATITUDE'] ?? -29.18)))
      url.searchParams.set('start', input.startDate ?? defaultPowerDate())
      url.searchParams.set('end', input.endDate ?? input.startDate ?? defaultPowerDate())
      url.searchParams.set('format', 'JSON')
      url.searchParams.set('time-standard', input.timeStandard ?? 'UTC')
      return url.toString()
    },
    parse: (payload) => {
      const properties = recordAt(payload, 'properties')
      const parameters = properties ? recordAt(properties, 'parameter') : undefined
      const temperature = parameters ? latestParameter(parameters['T2M']) : null
      const precipitation = parameters ? latestParameter(parameters['PRECTOTCORR']) : null
      if (!temperature || !precipitation || temperature.value === null || precipitation.value === null || temperature.value <= -900 || precipitation.value <= -900) throw new ProviderRequestError('provider_missing_value')
      const observedAt = `${formatPowerDate(temperature.date)}T00:00:00.000Z`
      return {
        observedAt,
        forecastAt: null,
        timeStandard: input.timeStandard ?? 'UTC',
        units: { temperature: 'C', precipitation: 'mm/day' },
        normalized: { temperatureC: temperature.value, precipitationMmDay: precipitation.value, observedDate: temperature.date },
      }
    },
  })
}

export function createOpenMeteoAdapter(input: ((fieldId: string) => Promise<Record<string, unknown>>) | HttpAdapterOptions): AgronautasProviderAdapter {
  if (typeof input === 'function') return new TaxonomyProviderAdapter('open-meteo', 'climate', 'https://api.open-meteo.com/v1/forecast', input, 'seam', 'injectable seam, not direct live provider')
  const endpoint = input.endpoint ?? 'https://api.open-meteo.com/v1/forecast'
  const fetcher = input.fetch ?? fetch
  const injected = Boolean(input.fetch)
  const licenseApproved = input.commercialUseApproved === true
  const adapter = createHttpAdapter({
    provider: 'open-meteo',
    signalType: 'climate',
    endpoint,
    mode: injected ? (input.mode === 'mock' ? 'mock' : 'seam') : 'live',
    input,
    fetcher,
    buildUrl: () => {
      const url = new URL(endpoint)
      url.searchParams.set('latitude', String(input.latitude ?? Number(process.env['AGRONAUTAS_OPEN_METEO_LATITUDE'] ?? -29.18)))
      url.searchParams.set('longitude', String(input.longitude ?? Number(process.env['AGRONAUTAS_OPEN_METEO_LONGITUDE'] ?? -58.08)))
      url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum')
      url.searchParams.set('timezone', 'UTC')
      url.searchParams.set('models', input.model ?? 'best_match')
      return url.toString()
    },
    parse: (payload) => {
      const daily = recordAt(payload, 'daily')
      const times = stringList(daily?.['time'])
      const temperatures = numberList(daily?.['temperature_2m_max'])
      const rainfall = numberList(daily?.['precipitation_sum'])
      const model = isRecord(payload) && typeof payload['model'] === 'string' ? payload['model'] : input.model ?? 'best_match'
      if (times.length === 0 || temperatures.length !== times.length || rainfall.length !== times.length) throw new ProviderRequestError('schema_drift')
      const horizon = input.forecastHorizonDays ?? Math.max(0, times.length - 1)
      return {
        observedAt: null,
        forecastAt: `${times[0]}T00:00:00.000Z`,
        timeStandard: 'UTC',
        forecastHorizonDays: horizon,
        model,
        units: { temperature: '°C', precipitation: 'mm' },
        normalized: { temperatureMaxC: Math.max(...temperatures), rainfallMm7d: rainfall.reduce((sum, value) => sum + value, 0), forecastHorizonDays: horizon, model },
      }
    },
  })
  if (licenseApproved || injected) return adapter
  return new LicenseGatedAdapter(adapter, input.now ?? (() => new Date()), endpoint)
}

export function createSmnAlertsAdapter(input: ((fieldId: string) => Promise<Record<string, unknown>>) | HttpAdapterOptions): AgronautasProviderAdapter {
  if (typeof input === 'function') return new TaxonomyProviderAdapter('smn-alerts', 'weather_alert', 'https://www.smn.gob.ar/alertas', input, 'seam', 'injectable seam, not direct live provider')
  const endpoint = input.endpoint ?? process.env['AGRONAUTAS_SMN_ALERTS_URL'] ?? 'https://www.smn.gob.ar/alertas'
  const fetcher = input.fetch ?? fetch
  return new TaxonomyProviderAdapter('smn-alerts', 'weather_alert', endpoint, async () => {
    const response = await fetchJson(fetcher, endpoint, input.timeoutMs)
    const raw = isRecord(response.payload) ? response.payload : {}
    const alerts = Array.isArray(raw['alerts']) ? raw['alerts'] : []
    return { ...raw, sourceUrl: endpoint, normalized: { alertCount: alerts.length } }
  }, input.fetch ? (input.mode === 'mock' ? 'mock' : 'seam') : 'live', input.mode === 'mock' ? 'mock provider mode requested' : undefined, input.now)
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
    const response = await fetchJson(fetcher, url.toString(), input.timeoutMs)
    const raw = isRecord(response.payload) ? response.payload : {}
    return { ...raw, requested: url.toString(), normalized: { hotspotCount: Array.isArray(raw['hotspots']) ? raw['hotspots'].length : 0 } }
  }, input.fetch ? (input.mode === 'mock' ? 'mock' : 'seam') : 'live', input.mode === 'mock' ? 'mock provider mode requested' : undefined, input.now)
}

export function createSentinelStacAdapter(fetcher: (fieldId: string) => Promise<Record<string, unknown>>): AgronautasProviderAdapter {
  return new TaxonomyProviderAdapter('sentinel-stac', 'satellite', 'https://dataspace.copernicus.eu/', fetcher, 'seam', 'injectable seam, not direct live provider')
}

class LicenseGatedAdapter implements AgronautasProviderAdapter {
  constructor(private readonly delegate: AgronautasProviderAdapter, private readonly now: Clock, private readonly sourceUrl: string) {}
  get provider(): string { return this.delegate.provider }
  get signalType(): string { return this.delegate.signalType }
  async fetch(): Promise<ProviderEvidenceResult> {
    return unavailableEnvelope({ provider: this.provider, signalType: this.signalType, sourceUrl: this.sourceUrl, retrievedAt: this.now().toISOString(), reason: 'commercial_use_license_unavailable' })
  }
}

function createHttpAdapter(input: {
  provider: string
  signalType: string
  endpoint: string
  mode: ProviderMode
  input: HttpAdapterOptions
  fetcher: FetchLike
  buildUrl: (fieldId: string) => string
  parse: (payload: unknown) => { observedAt: string | null; forecastAt: string | null; retrievedAt?: string; timeStandard: EvidenceEnvelope['timeStandard']; forecastHorizonDays?: number | null; model?: string | null; units: Record<string, string>; normalized: Record<string, unknown> }
}): AgronautasProviderAdapter {
  return new HttpProviderAdapter(input)
}

class HttpProviderAdapter implements AgronautasProviderAdapter {
  readonly provider: string
  readonly signalType: string
  constructor(private readonly config: Parameters<typeof createHttpAdapter>[0]) {
    this.provider = config.provider
    this.signalType = config.signalType
  }
  async fetch(fieldId: string): Promise<ProviderEvidenceResult> {
    const now = this.config.input.now ?? (() => new Date())
    const retrievedAt = now().toISOString()
    const sourceUrl = this.config.buildUrl(fieldId)
    let response: HttpResult | undefined
    try {
      response = await fetchJson(this.config.fetcher, sourceUrl, this.config.input.timeoutMs ?? 10_000)
      const parsed = this.config.parse(response.payload)
      return createEnvelope({
        provider: this.provider,
        signalType: this.signalType,
        sourceUrl: response.sourceUrl,
        providerMode: this.config.mode,
        observedAt: parsed.observedAt,
        forecastAt: parsed.forecastAt,
        retrievedAt: parsed.retrievedAt ?? retrievedAt,
        timeStandard: parsed.timeStandard,
        forecastHorizonDays: parsed.forecastHorizonDays ?? null,
        model: parsed.model ?? null,
        units: parsed.units,
        freshness: this.config.mode === 'live' ? 'fresh' : 'degraded',
        raw: isRecord(response.payload) ? response.payload : undefined,
        normalized: parsed.normalized,
        value: parsed.normalized,
        httpStatus: response.status,
        latencyMs: response.latencyMs,
      })
    } catch (error) {
      const reason = error instanceof ProviderRequestError ? error.reason : error instanceof Error ? error.message : 'provider_unavailable'
      const status = error instanceof ProviderRequestError ? error.httpStatus ?? response?.status ?? null : response?.status ?? null
      return unavailableEnvelope({ provider: this.provider, signalType: this.signalType, sourceUrl, retrievedAt, reason, httpStatus: status, latencyMs: 0 })
    }
  }
}

async function fetchJson(fetcher: FetchLike, sourceUrl: string, timeoutMs = 10_000): Promise<HttpResult> {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetcher(sourceUrl, { signal: controller.signal })
    if (!response.ok) throw new ProviderRequestError(`provider_http_${response.status}`, response.status)
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ProviderRequestError('schema_drift', response.status)
    }
    return { payload, status: response.status, sourceUrl, latencyMs: Date.now() - startedAt }
  } catch (error) {
    if (controller.signal.aborted || (error instanceof DOMException && error.name === 'TimeoutError') || (error instanceof Error && /timed? ?out|timeout/i.test(error.message))) throw new ProviderRequestError('provider_timeout')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function createEnvelope(input: {
  provider: string
  signalType: string
  sourceUrl: string
  providerMode: ProviderMode
  observedAt: string | null
  forecastAt: string | null
  retrievedAt: string
  timeStandard: EvidenceEnvelope['timeStandard']
  forecastHorizonDays?: number | null
  model?: string | null
  units: Record<string, string>
  freshness: EvidenceEnvelope['freshness']
  raw?: Record<string, unknown>
  normalized?: Record<string, unknown>
  value?: unknown
  failureReason?: string
  httpStatus?: number | null
  latencyMs?: number
}): ProviderEvidenceResult {
  const rawHash = input.raw ? `sha256:${createHash('sha256').update(JSON.stringify(input.raw)).digest('hex')}` : null
  const envelope: ProviderEvidenceResult = {
    contractVersion: 'agronautas-evidence-v1',
    evidenceId: `${input.provider}:${input.signalType}:${randomUUID()}`,
    provider: input.provider,
    signalType: input.signalType,
    sourceUrl: input.sourceUrl,
    providerMode: input.providerMode,
    mode: input.providerMode,
    observedAt: input.observedAt,
    forecastAt: input.forecastAt,
    retrievedAt: input.retrievedAt,
    timeStandard: input.timeStandard,
    forecastHorizonDays: input.forecastHorizonDays ?? null,
    model: input.model ?? null,
    units: input.units,
    freshness: input.freshness,
    rawHash,
    runId: input.providerMode === 'unavailable' ? `unavailable:${randomUUID()}` : randomUUID(),
    requestId: randomUUID(),
    httpStatus: input.httpStatus ?? null,
    schemaStatus: input.providerMode === 'unavailable' ? 'unavailable' : 'valid',
    http: { status: input.httpStatus ?? null, ok: input.httpStatus === 200 },
    schema: { status: input.providerMode === 'unavailable' ? 'unavailable' : 'valid' },
    lineage: { sourceUrl: input.sourceUrl, rawHash, parentRunId: null },
    degradationReasons: input.failureReason ? [input.failureReason] : [],
    ...(input.failureReason ? { failureReason: input.failureReason } : {}),
    lastSuccessfulObservedAt: null,
    latencyMs: input.latencyMs ?? 0,
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.raw ? { raw: input.raw } : {}),
    ...(input.normalized ? { normalized: input.normalized } : {}),
    status: input.freshness,
  }
  Object.defineProperty(envelope, 'mode', { value: input.providerMode, enumerable: false })
  Object.defineProperty(envelope, 'status', { value: input.freshness, enumerable: false })
  if (input.raw) Object.defineProperty(envelope, 'raw', { value: input.raw, enumerable: false })
  if (input.normalized) Object.defineProperty(envelope, 'normalized', { value: input.normalized, enumerable: false })
  return envelope
}

function unavailableEnvelope(input: { provider: string; signalType: string; sourceUrl: string; retrievedAt: string; reason: string; httpStatus?: number | null; latencyMs?: number }): ProviderEvidenceResult {
  return createEnvelope({ ...input, providerMode: 'unavailable', observedAt: null, forecastAt: null, timeStandard: 'retrieval-only', units: {}, freshness: 'missing', httpStatus: input.httpStatus ?? null, latencyMs: input.latencyMs ?? 0, failureReason: input.reason })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function recordAt(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value) || !isRecord(value[key])) return undefined
  return value[key]
}

function firstRecord(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value) || !Array.isArray(value[key])) return undefined
  const first = value[key][0]
  return isRecord(first) ? first : undefined
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function numberList(value: unknown): number[] {
  return Array.isArray(value) ? value.map(finiteNumber).filter((item): item is number => item !== null) : []
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function toTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null
  return new Date(value).toISOString()
}

function inferUnits(provider: string, normalized: Record<string, unknown>): Record<string, string> {
  if (provider === 'open-meteo') return { temperature: '°C', precipitation: 'mm' }
  if (provider === 'nasa-firms') return { confidence: 'percent' }
  if (provider === 'smn-alerts') return { alert: 'code' }
  return Object.keys(normalized).length > 0 ? { value: 'provider-defined' } : {}
}

function latestParameter(value: unknown): { date: string; value: number | null } | null {
  if (!isRecord(value)) return null
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  const [date, raw] = entries.at(-1) ?? []
  return typeof date === 'string' ? { date, value: finiteNumber(raw) } : null
}

function formatPowerDate(value: string): string {
  if (!/^\d{8}$/.test(value)) throw new ProviderRequestError('schema_drift')
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function defaultPowerDate(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10).replaceAll('-', '')
}
