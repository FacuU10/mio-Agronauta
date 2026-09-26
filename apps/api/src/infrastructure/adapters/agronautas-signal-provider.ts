import { createHash, randomUUID } from 'node:crypto'
import { agronautasEvidenceV2Schema, type AgronautasEvidenceV2 } from '@repo/zod-schemas'

export interface ProviderScope {
  locationId: string
  workspaceId: string
  fieldId: string
}

export interface ProviderWindow {
  start: string
  end: string
}

export interface ProviderRequest {
  scope: ProviderScope
  window: ProviderWindow
  requestId: string
}

export interface ProviderResponse {
  status: number
  payload: unknown
}

export interface ProviderParserResult {
  observedAt: string | null
  acquiredAt: string | null
  forecastAt: string | null
  units: Record<string, string>
  value: Record<string, unknown>
  model?: string
  forecastHorizonDays?: number
  sourceKey?: string
}

export type ProviderFetcher = (url: string, init?: RequestInit) => Promise<ProviderResponse | Response>

export interface ProviderPort {
  readonly provider: string
  readonly signalType: string
  fetch(input: ProviderRequest): Promise<AgronautasEvidenceV2>
}

export interface ProviderPortOptions {
  endpoint?: string
  fetcher?: ProviderFetcher
  now?: () => Date
  timeoutMs?: number
  latitude?: number
  longitude?: number
  model?: string
  commercialUseApproved?: boolean
  parser?: (payload: unknown, request: ProviderRequest) => ProviderParserResult
}

interface ProviderDefinition {
  provider: string
  signalType: string
  endpoint: string
  sourceKey: string
  freshnessPolicy: string
  options: ProviderPortOptions
  buildUrl: (request: ProviderRequest) => string
  parser: (payload: unknown, request: ProviderRequest) => ProviderParserResult
}

const DEFAULT_ENDPOINTS = {
  CLIMATE: 'https://api.open-meteo.com/v1/forecast',
  WEATHER: 'https://api.open-meteo.com/v1/forecast',
  SMN: 'https://www.smn.gob.ar/alertas',
  SATELLITE: 'https://dataspace.copernicus.eu/stac/search',
} as const

export function createClimateProvider(options: ProviderPortOptions = {}): ProviderPort {
  return createProvider({
    provider: 'open-meteo',
    signalType: 'climate',
    endpoint: options.endpoint ?? DEFAULT_ENDPOINTS.CLIMATE,
    sourceKey: 'open-meteo:forecast',
    freshnessPolicy: 'forecast-window',
    options,
    buildUrl: buildOpenMeteoUrl,
    parser: options.parser ?? parseClimate,
  })
}

export function createWeatherProvider(options: ProviderPortOptions = {}): ProviderPort {
  return createProvider({
    provider: 'open-meteo-weather',
    signalType: 'weather',
    endpoint: options.endpoint ?? DEFAULT_ENDPOINTS.WEATHER,
    sourceKey: 'open-meteo:current-weather',
    freshnessPolicy: 'observed-at-retrieval',
    options,
    buildUrl: buildOpenMeteoWeatherUrl,
    parser: options.parser ?? parseWeather,
  })
}

export function createSmnProvider(options: ProviderPortOptions = {}): ProviderPort {
  return createProvider({
    provider: 'smn-alerts',
    signalType: 'weather_alert',
    endpoint: options.endpoint ?? DEFAULT_ENDPOINTS.SMN,
    sourceKey: 'smn:alerts',
    freshnessPolicy: 'alert-publication-time',
    options,
    buildUrl: (request) => buildPlainUrl(options.endpoint ?? DEFAULT_ENDPOINTS.SMN, request),
    parser: options.parser ?? parseSmn,
  })
}

export function createSatelliteProvider(options: ProviderPortOptions = {}): ProviderPort {
  return createProvider({
    provider: 'sentinel-stac',
    signalType: 'satellite',
    endpoint: options.endpoint ?? DEFAULT_ENDPOINTS.SATELLITE,
    sourceKey: 'sentinel:stac',
    freshnessPolicy: 'scene-acquisition-time',
    options,
    buildUrl: (request) => buildPlainUrl(options.endpoint ?? DEFAULT_ENDPOINTS.SATELLITE, request),
    parser: options.parser ?? parseSatellite,
  })
}

function createProvider(definition: ProviderDefinition): ProviderPort {
  const injected = Boolean(definition.options.fetcher)
  const providerMode = injected ? 'seam' : 'live'
  const now = definition.options.now ?? (() => new Date())

  return {
    provider: definition.provider,
    signalType: definition.signalType,
    async fetch(input: ProviderRequest): Promise<AgronautasEvidenceV2> {
      const retrievedAt = now().toISOString()
      if (definition.options.commercialUseApproved === false) {
        return createUnavailableEvidence(definition, input, retrievedAt, 'commercial_use_license_unavailable')
      }

      const fetcher = definition.options.fetcher ?? fetch
      try {
        const response = await fetchJson(fetcher, definition.buildUrl(input), definition.options.timeoutMs ?? 10_000)
        const parsed = definition.parser(response.payload, input)
        return agronautasEvidenceV2Schema.parse({
          ...baseEvidence(definition, input, retrievedAt, response.status, providerMode),
          sourceKey: parsed.sourceKey ?? definition.sourceKey,
          observedAt: parsed.observedAt,
          acquiredAt: parsed.acquiredAt,
          forecastAt: parsed.forecastAt,
          units: parsed.units,
          schemaVersion: `${definition.provider}-v1`,
          schemaStatus: 'valid',
          rawHash: hashPayload(response.payload),
          freshnessPolicy: definition.freshnessPolicy,
          degradationReasons: providerMode === 'live' ? [] : ['provider_seam'],
          retryable: providerMode !== 'live',
          value: parsed.value,
          ...(parsed.model ? { model: parsed.model } : {}),
          ...(parsed.forecastHorizonDays === undefined ? {} : { forecastHorizonDays: parsed.forecastHorizonDays }),
        })
      } catch (error) {
        const reason = error instanceof ProviderAdapterError ? error.reason : error instanceof Error ? error.message : 'provider_unavailable'
        const httpStatus = error instanceof ProviderAdapterError ? error.httpStatus : null
        return createUnavailableEvidence(definition, input, retrievedAt, normalizeFailureReason(reason), httpStatus)
      }
    },
  }
}

function baseEvidence(definition: ProviderDefinition, input: ProviderRequest, retrievedAt: string, httpStatus: number, providerMode: 'live' | 'seam'): Omit<AgronautasEvidenceV2, 'sourceKey' | 'observedAt' | 'acquiredAt' | 'forecastAt' | 'units' | 'schemaVersion' | 'schemaStatus' | 'freshnessPolicy' | 'degradationReasons' | 'retryable' | 'value'> {
  return {
    contractVersion: 'agronautas-evidence-v2',
    evidenceId: `${definition.provider}:${definition.signalType}:${randomUUID()}`,
    locationId: input.scope.locationId,
    workspaceId: input.scope.workspaceId,
    fieldId: input.scope.fieldId,
    provider: definition.provider,
    signalType: definition.signalType,
    providerMode,
    status: providerMode === 'live' ? 'fresh' : 'degraded',
    sourceUrl: definition.endpoint,
    retrievedAt,
    httpStatus,
    runId: `${definition.provider}:${definition.signalType}:${input.scope.locationId}:${input.window.start}`,
    requestId: input.requestId,
    rawHash: null,
  }
}

function createUnavailableEvidence(definition: ProviderDefinition, input: ProviderRequest, retrievedAt: string, reason: string, httpStatus: number | null = null): AgronautasEvidenceV2 {
  return agronautasEvidenceV2Schema.parse({
    ...baseEvidence(definition, input, retrievedAt, httpStatus ?? 503, 'seam'),
    evidenceId: `${definition.provider}:${definition.signalType}:${randomUUID()}`,
    providerMode: 'unavailable',
    status: 'unavailable',
    sourceUrl: definition.endpoint,
    sourceKey: definition.sourceKey,
    observedAt: null,
    acquiredAt: null,
    forecastAt: null,
    retrievedAt,
    units: {},
    schemaVersion: `${definition.provider}-v1`,
    schemaStatus: httpStatus === null ? 'unavailable' : 'invalid',
    httpStatus,
    runId: `unavailable:${definition.provider}:${input.scope.locationId}:${input.window.start}`,
    requestId: input.requestId,
    rawHash: null,
    freshnessPolicy: definition.freshnessPolicy,
    degradationReasons: [reason],
    retryable: reason !== 'commercial_use_license_unavailable' && reason !== 'satellite_proof_incomplete',
  })
}

async function fetchJson(fetcher: ProviderFetcher, url: string, timeoutMs: number): Promise<ProviderResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const result = await fetcher(url, { signal: controller.signal })
    if (isProviderResponse(result)) {
      if (result.status < 200 || result.status >= 300) throw new ProviderAdapterError(`provider_http_${result.status}`, result.status)
      return result
    }
    if (!result.ok) throw new ProviderAdapterError(`provider_http_${result.status}`, result.status)
    let payload: unknown
    try { payload = await result.json() } catch { throw new ProviderAdapterError('schema_drift', result.status) }
    return { status: result.status, payload }
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && /timed? ?out|timeout/i.test(error.message))) throw new ProviderAdapterError('provider_timeout')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

class ProviderAdapterError extends Error {
  constructor(readonly reason: string, readonly httpStatus: number | null = null) { super(reason) }
}

function isProviderResponse(value: ProviderResponse | Response): value is ProviderResponse {
  return typeof value === 'object' && value !== null && 'payload' in value && 'status' in value && !(value instanceof Response)
}

function parseClimate(payload: unknown): ProviderParserResult {
  const daily = recordAt(payload, 'daily')
  const times = stringList(daily?.['time'])
  const temperatures = numberList(daily?.['temperature_2m_max'])
  const rainfall = numberList(daily?.['precipitation_sum'])
  if (times.length === 0 || times.length !== temperatures.length || times.length !== rainfall.length) throw new ProviderAdapterError('schema_drift')
  const model = isRecord(payload) && typeof payload['model'] === 'string' ? payload['model'] : 'best_match'
  return { observedAt: null, acquiredAt: null, forecastAt: `${times[0]}T00:00:00.000Z`, units: { temperature: '°C', precipitation: 'mm' }, value: { temperatureMaxC: Math.max(...temperatures), rainfallMm: rainfall.reduce((sum, item) => sum + item, 0), forecastHorizonDays: Math.max(0, times.length - 1), model }, model, forecastHorizonDays: Math.max(0, times.length - 1) }
}

function parseWeather(payload: unknown): ProviderParserResult {
  const current = recordAt(payload, 'current')
  const temperature = finiteNumber(current?.['temperature_2m'])
  if (temperature === null) throw new ProviderAdapterError('schema_drift')
  const observedAt = toTimestamp(current?.['time'])
  if (!observedAt) throw new ProviderAdapterError('schema_drift')
  return { observedAt, acquiredAt: null, forecastAt: null, units: { temperature: '°C', humidity: '%' }, value: { temperatureC: temperature, ...(finiteNumber(current?.['relative_humidity_2m']) === null ? {} : { humidityPct: finiteNumber(current?.['relative_humidity_2m']) }) } }
}

function parseSmn(payload: unknown): ProviderParserResult {
  const alerts = isRecord(payload) && Array.isArray(payload['alerts']) ? payload['alerts'] : null
  if (!alerts) throw new ProviderAdapterError('schema_drift')
  return { observedAt: toTimestamp(isRecord(payload) ? payload['observedAt'] : null), acquiredAt: null, forecastAt: null, units: { alert: 'count' }, value: { alertCount: alerts.length } }
}

function parseSatellite(payload: unknown): ProviderParserResult {
  const record = isRecord(payload) ? payload : {}
  const sceneId = typeof record['sceneId'] === 'string' ? record['sceneId'] : null
  const coverage = recordAt(record, 'coverage')
  const coveragePercentage = finiteNumber(coverage?.['percentage'])
  const processing = recordAt(record, 'processing')
  const processingProof = typeof processing?.['proofRef'] === 'string' && processing['status'] === 'complete' ? processing['proofRef'] : null
  if (!sceneId || coveragePercentage === null || coveragePercentage <= 0 || !processingProof) throw new ProviderAdapterError('satellite_proof_incomplete')
  return { observedAt: toTimestamp(record['acquiredAt'] ?? record['observedAt']), acquiredAt: toTimestamp(record['acquiredAt']), forecastAt: null, units: { coverage: '%' }, value: { sceneId, coveragePercentage, processingProof, ...(finiteNumber(record['ndvi']) === null ? {} : { ndvi: finiteNumber(record['ndvi']) }) } }
}

function buildOpenMeteoUrl(request: ProviderRequest, endpoint = DEFAULT_ENDPOINTS.CLIMATE): string {
  const url = new URL(endpoint)
  url.searchParams.set('latitude', String(Number(process.env['AGRONAUTAS_OPEN_METEO_LATITUDE'] ?? -29.18)))
  url.searchParams.set('longitude', String(Number(process.env['AGRONAUTAS_OPEN_METEO_LONGITUDE'] ?? -58.08)))
  url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum')
  url.searchParams.set('timezone', 'UTC')
  url.searchParams.set('models', 'best_match')
  return url.toString()
}

function buildOpenMeteoWeatherUrl(request: ProviderRequest, endpoint = DEFAULT_ENDPOINTS.WEATHER): string {
  const url = new URL(buildOpenMeteoUrl(request, endpoint))
  url.searchParams.delete('daily')
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m')
  url.searchParams.delete('models')
  return url.toString()
}

function buildPlainUrl(endpoint: string, request: ProviderRequest): string {
  const url = new URL(endpoint)
  url.searchParams.set('location_id', request.scope.locationId)
  url.searchParams.set('window_start', request.window.start)
  url.searchParams.set('window_end', request.window.end)
  return url.toString()
}

function normalizeFailureReason(reason: string): string {
  if (/license|commercial/i.test(reason)) return 'commercial_use_license_unavailable'
  if (/schema|drift|json/i.test(reason)) return 'schema_drift'
  if (/timeout|timed ?out/i.test(reason)) return 'provider_timeout'
  return reason || 'provider_unavailable'
}

function hashPayload(payload: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`
}

function recordAt(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value) || !isRecord(value[key])) return undefined
  return value[key]
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function finiteNumber(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null }
function numberList(value: unknown): number[] { return Array.isArray(value) ? value.map(finiteNumber).filter((item): item is number => item !== null) : [] }
function stringList(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [] }
function toTimestamp(value: unknown): string | null { return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null }
