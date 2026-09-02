import { normalizeRequestError, normalizeRequestResponse, type RequestOutcome } from './view-models'

export type IngestStatus = 'queued' | 'started' | 'completed' | 'partial' | 'failed'
export type IngestSourceStatus = 'success' | 'failed' | 'empty' | 'skipped'
export type HydrologySource = 'PNA' | 'INA' | 'INMET' | 'SMN'

export type SafeIngestResult = {
  source: HydrologySource
  status: IngestSourceStatus
  recordsIngested: number
  provenanceUrl?: string
  observedFrom?: string
  observedTo?: string
  httpSummary?: { host: string; path: string; status?: number; elapsedMs: number; attempts: number; timeoutMs: number }
  diagnostic?: { failureKind?: string; reason?: string; attempts: number; timeoutMs?: number; providerHost?: string; providerPath?: string; upstreamStatus?: number }
}

export type SafeIngestView = {
  status: IngestStatus
  runId?: string
  proofRunId?: string
  statusPath?: string
  requestedSources: HydrologySource[]
  results: SafeIngestResult[]
  coverageGaps: string[]
}

export type PollOptions = {
  maxAttempts?: number
  delayMs?: number
  fetcher?: typeof fetch
}

export class PollingError extends Error {
  constructor(public readonly outcome: RequestOutcome<never>) {
    super(outcome.reason ?? 'No se pudo consultar el estado de la ingesta.')
    this.name = 'PollingError'
  }
}

const TERMINAL_STATUSES = new Set<IngestStatus>(['completed', 'partial', 'failed'])
const SOURCES = new Set<HydrologySource>(['PNA', 'INA', 'INMET', 'SMN'])

export async function pollStatusPath(statusPath: string, options: PollOptions = {}): Promise<SafeIngestView> {
  const maxAttempts = clampInteger(options.maxAttempts ?? 6, 1, 6)
  const delayMs = clampInteger(options.delayMs ?? 750, 0, 5_000)
  const fetcher = options.fetcher ?? fetch
  let latest: SafeIngestView | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const separator = statusPath.includes('?') ? '&' : '?'
    let response: Response
    try {
      response = await fetcher(`${statusPath}${separator}waitMs=0`, { method: 'GET', cache: 'no-store' })
    } catch (error) {
      throw new PollingError(normalizeRequestError(error))
    }
    if (!response.ok) {
      throw new PollingError(normalizeRequestResponse({ status: response.status, retryAfterMs: parseRetryAfter(response), raw: response.statusText }))
    }
    latest = sanitizeIngestResponse(await response.json())
    if (!latest) throw new Error('El estado de la ingesta no tiene un formato válido.')
    if (TERMINAL_STATUSES.has(latest.status)) return latest
    if (attempt < maxAttempts - 1 && delayMs > 0) await wait(delayMs)
  }

  return latest ?? { status: 'queued', requestedSources: [], results: [], coverageGaps: [] }
}

function parseRetryAfter(response: Response): number | undefined {
  const header = response.headers.get('retry-after')
  if (!header) return undefined
  const value = header.trim()
  if (/^\d+$/.test(value)) return Number(value) * 1_000
  const dateMs = Date.parse(value) - Date.now()
  return Number.isFinite(dateMs) && dateMs > 0 ? Math.floor(dateMs) : undefined
}

export function sanitizeIngestResponse(value: unknown): SafeIngestView | null {
  if (!isRecord(value) || !isIngestStatus(value['status'])) return null
  const results = Array.isArray(value['results']) ? value['results'].flatMap((item) => sanitizeResult(item)).slice(0, 20) : []
  return {
    status: value['status'],
    runId: safeString(value['runId'], 120),
    proofRunId: safeString(value['proofRunId'], 120),
    statusPath: safeStatusPath(value['statusPath']),
    requestedSources: safeSources(value['requestedSources']),
    results,
    coverageGaps: safeStrings(value['coverageGaps'], 8, 160),
  }
}

function sanitizeResult(value: unknown): SafeIngestResult[] {
  if (!isRecord(value) || !isSource(value['source']) || !isSourceStatus(value['status'])) return []
  const result: SafeIngestResult = {
    source: value['source'],
    status: value['status'],
    recordsIngested: safeNonNegativeInteger(value['recordsIngested']),
  }
  const provenanceUrl = safeString(value['provenanceUrl'], 500)
  const observedFrom = safeDate(value['observedFrom'])
  const observedTo = safeDate(value['observedTo'])
  const httpSummary = sanitizeHttpSummary(value['httpSummary'])
  const diagnostic = sanitizeDiagnostic(value['diagnostic'])
  if (provenanceUrl) result.provenanceUrl = provenanceUrl
  if (observedFrom) result.observedFrom = observedFrom
  if (observedTo) result.observedTo = observedTo
  if (httpSummary) result.httpSummary = httpSummary
  if (diagnostic) result.diagnostic = diagnostic
  return [result]
}

function sanitizeHttpSummary(value: unknown): SafeIngestResult['httpSummary'] {
  if (!isRecord(value)) return undefined
  const host = safeHost(value['host'])
  const path = safePath(value['path'])
  const elapsedMs = safeNonNegativeInteger(value['elapsedMs'])
  const attempts = value['attempts'] === 1 || value['attempts'] === 2 ? value['attempts'] : undefined
  const timeoutMs = safePositiveInteger(value['timeoutMs'])
  if (!host || !path || attempts === undefined || timeoutMs === undefined) return undefined
  const status = safeHttpStatus(value['status'])
  return { host, path, elapsedMs, attempts, timeoutMs, ...(status ? { status } : {}) }
}

function sanitizeDiagnostic(value: unknown): SafeIngestResult['diagnostic'] {
  if (!isRecord(value)) return undefined
  const attempts = value['attempts'] === 1 || value['attempts'] === 2 ? value['attempts'] : undefined
  if (attempts === undefined) return undefined
  const diagnostic: NonNullable<SafeIngestResult['diagnostic']> = { attempts }
  const fields: Array<[keyof typeof diagnostic, string | number | undefined]> = [
    ['failureKind', safeString(value['failureKind'], 80)],
    ['reason', safeString(value['reason'], 160)],
    ['providerHost', safeHost(value['providerHost'])],
    ['providerPath', safePath(value['providerPath'])],
    ['timeoutMs', safePositiveInteger(value['timeoutMs'])],
    ['upstreamStatus', safeHttpStatus(value['upstreamStatus'])],
  ]
  for (const [key, field] of fields) if (field !== undefined) diagnostic[key] = field as never
  return diagnostic
}

function safeSources(value: unknown): HydrologySource[] {
  return Array.isArray(value) ? value.filter(isSource).slice(0, 8) : []
}

function safeStrings(value: unknown, maxItems: number, maxLength: number): string[] {
  return Array.isArray(value) ? value.flatMap((item) => {
    const text = safeString(item, maxLength)
    return text ? [text] : []
  }).slice(0, maxItems) : []
}

function safeStatusPath(value: unknown) {
  const path = safeString(value, 240)
  return path && /^\/api\/hydrology\/ingest\/[^/?#]+$/.test(path) ? path : undefined
}

function safeHost(value: unknown) {
  const host = safeString(value, 120)
  return host && /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host) ? host : undefined
}

function safePath(value: unknown) {
  const path = safeString(value, 240)
  return path && /^\/[^?#]*$/.test(path) ? path : undefined
}

function safeDate(value: unknown) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : undefined
}

function safeString(value: unknown, max: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
}

function safeNonNegativeInteger(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

function safePositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined
}

function safeHttpStatus(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isSource(value: unknown): value is HydrologySource {
  return typeof value === 'string' && SOURCES.has(value as HydrologySource)
}

function isSourceStatus(value: unknown): value is IngestSourceStatus {
  return value === 'success' || value === 'failed' || value === 'empty' || value === 'skipped'
}

function isIngestStatus(value: unknown): value is IngestStatus {
  return value === 'queued' || value === 'started' || value === 'completed' || value === 'partial' || value === 'failed'
}

function clampInteger(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : min
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
