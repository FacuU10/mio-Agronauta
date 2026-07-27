import { InaAdapter } from '../adapters/ina-adapter.js'
import { InmetAdapter } from '../adapters/inmet-adapter.js'
import { PnaAdapter } from '../adapters/pna-adapter.js'
import { SmnAdapter } from '../adapters/smn-adapter.js'
import type { NormalizedHydrologyTelemetry } from '../types.js'
import type { HydrologyGovernmentHttpSummary, HydrologyGovernmentIngestDiagnostic } from '@repo/zod-schemas'

export type ScraperResult =
  | { ok: true; records: NormalizedHydrologyTelemetry[]; httpSummary?: HydrologyGovernmentHttpSummary; attemptLog?: ScraperAttemptLog[] }
  | { ok: false; error: string; diagnostic: HydrologyGovernmentIngestDiagnostic; httpSummary?: HydrologyGovernmentHttpSummary; attemptLog?: ScraperAttemptLog[] }

export type ScraperAttemptLog = {
  attempt: number
  outcome: 'success' | 'failure'
  providerHost?: string
  providerPath?: string
  status?: number
  elapsedMs: number
  failureKind?: string
}

interface ClientOptions {
  url?: string
  fetch?: typeof fetch
  userAgent?: string
  timeoutMs?: number
  totalTimeoutMs?: number
  retryBackoffMs?: number
  maxResponseBytes?: number
  maxResponseChars?: number
}

const MAX_REQUEST_TIMEOUT_MS = 120_000
const MAX_TOTAL_REQUEST_TIMEOUT_MS = 145_000
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000
const DEFAULT_PNA_REQUEST_TIMEOUT_MS = 120_000
const DEFAULT_PNA_TOTAL_TIMEOUT_MS = 145_000
const DEFAULT_PNA_RETRY_BACKOFF_MS = 250
const MAX_PNA_ATTEMPTS = 2
const DEFAULT_PNA_MAX_RESPONSE_BYTES = 1_000_000
const DEFAULT_PNA_MAX_RESPONSE_CHARS = 1_000_000
const DEFAULT_INA_MAX_RESPONSE_BYTES = 256_000
const DEFAULT_INA_MAX_RESPONSE_CHARS = 256_000
const DEFAULT_INMET_MAX_RESPONSE_BYTES = 512_000
const DEFAULT_INMET_MAX_RESPONSE_CHARS = 512_000
const DEFAULT_SMN_MAX_RESPONSE_BYTES = 256_000
const DEFAULT_SMN_MAX_RESPONSE_CHARS = 256_000
const FAST_PNA_URL = 'https://contenidosweb.prefecturanaval.gob.ar/alturas/'
const INA_SERIES_IDS = ['6764', '33988', '38469'] as const
const INMET_ALERTS_URL = 'https://apiprevmet3.inmet.gov.br/avisos/rss'
const SMN_ALERTS_URL = 'https://ssl.smn.gob.ar/feeds/CAP/rss_alertaCAP_nuevo_2026.xml'
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const DEFAULT_HEADERS = {
  'user-agent': CHROME_USER_AGENT,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,text/plain;q=0.7,*/*;q=0.5',
  'accept-language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
}

type FetchTextResult =
  | { ok: true; body: string; status: number; httpSummary: HydrologyGovernmentHttpSummary }
  | { ok: false; error: string; diagnostic: HydrologyGovernmentIngestDiagnostic; httpSummary?: HydrologyGovernmentHttpSummary }

abstract class OfficialHttpClient {
  protected readonly fetchImpl: typeof fetch
  protected readonly userAgent: string
  readonly timeoutMs: number
  readonly totalTimeoutMs: number
  protected readonly retryBackoffMs: number
  private readonly maxResponseBytes?: number
  private readonly maxResponseChars?: number

  protected constructor(protected readonly source: string, protected readonly url: string, options: ClientOptions = {}) {
    this.fetchImpl = options.fetch ?? fetch
    this.userAgent = options.userAgent ?? CHROME_USER_AGENT
    this.timeoutMs = clampTimeout(options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS)
    this.totalTimeoutMs = clampTotalTimeout(options.totalTimeoutMs ?? this.timeoutMs)
    this.retryBackoffMs = clampRetryBackoff(options.retryBackoffMs ?? 0)
    this.maxResponseBytes = options.maxResponseBytes
    this.maxResponseChars = options.maxResponseChars
  }

  protected async fetchTextOnce(expectedContent: 'any' | 'json' = 'any', url = this.url, externalSignal?: AbortSignal, timeoutMs = this.timeoutMs): Promise<FetchTextResult> {
    const controller = new AbortController()
    const startedAt = Date.now()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const abortExternal = () => controller.abort()
    if (externalSignal?.aborted) controller.abort()
    else externalSignal?.addEventListener('abort', abortExternal, { once: true })
    try {
      const response = await this.fetchImpl(url, { headers: { ...DEFAULT_HEADERS, 'user-agent': this.userAgent }, signal: controller.signal })
      if (!response.ok) {
        return { ok: false, error: `${this.source} HTTP ${response.status} ${response.statusText}`.trim(), diagnostic: this.diagnostic('http_status', `${this.source} upstream returned HTTP ${response.status}`, startedAt, { upstreamStatus: response.status }, url, timeoutMs), httpSummary: this.httpSummary(startedAt, response.status, undefined, undefined, url, timeoutMs) }
      }
      if (response.status === 204) return { ok: true, body: '', status: response.status, httpSummary: this.httpSummary(startedAt, response.status, 0, 0, url) }
      const contentType = response.headers.get('content-type') ?? ''
      const body = await this.readBoundedResponseText(response, startedAt)
      if (!body.ok) return { ok: false, error: body.error, diagnostic: body.diagnostic, httpSummary: this.httpSummary(startedAt, response.status, body.bytesRead, body.charsRead, url) }
      if (expectedContent === 'json' && !isJsonResponse(contentType, body.body)) {
        return { ok: false, error: `${this.source} unexpected content-type ${contentType || 'unknown'}; expected JSON payload`, diagnostic: this.diagnostic('unexpected_content_type', `${this.source} returned unsupported content type`, startedAt, {}, url, timeoutMs), httpSummary: this.httpSummary(startedAt, response.status, body.bytesRead, body.body.length, url, timeoutMs) }
      }
      return { ok: true, body: body.body, status: response.status, httpSummary: this.httpSummary(startedAt, response.status, body.bytesRead, body.body.length, url, timeoutMs) }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return { ok: false, error: `${this.source} network failure: timeout after ${timeoutMs}ms`, diagnostic: this.diagnostic('timeout', `${this.source} request timed out`, startedAt, {}, url, timeoutMs), httpSummary: this.httpSummary(startedAt, undefined, undefined, undefined, url, timeoutMs) }
      return { ok: false, error: `${this.source} network failure`, diagnostic: this.diagnostic('network_failure', `${this.source} network request failed`, startedAt, {}, url, timeoutMs), httpSummary: this.httpSummary(startedAt, undefined, undefined, undefined, url, timeoutMs) }
    } finally {
      clearTimeout(timeout)
      externalSignal?.removeEventListener('abort', abortExternal)
    }
  }

  private async readBoundedResponseText(response: Response, startedAt: number): Promise<{ ok: true; body: string; bytesRead: number } | { ok: false; error: string; diagnostic: HydrologyGovernmentIngestDiagnostic; bytesRead: number; charsRead: number }> {
    if (!response.body) return { ok: true, body: '', bytesRead: 0 }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let bytesRead = 0
    let body = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytesRead += value.byteLength
        if (this.maxResponseBytes !== undefined && bytesRead > this.maxResponseBytes) {
          await reader.cancel().catch(() => undefined)
          return { ...this.tooLargeDiagnostic(startedAt), bytesRead, charsRead: body.length }
        }
        body += decoder.decode(value, { stream: true })
        if (this.maxResponseChars !== undefined && body.length > this.maxResponseChars) {
          await reader.cancel().catch(() => undefined)
          return { ...this.tooLargeDiagnostic(startedAt), bytesRead, charsRead: body.length }
        }
      }
      body += decoder.decode()
      if (this.maxResponseChars !== undefined && body.length > this.maxResponseChars) return { ...this.tooLargeDiagnostic(startedAt), bytesRead, charsRead: body.length }
      return { ok: true, body, bytesRead }
    } finally {
      reader.releaseLock()
    }
  }

  private tooLargeDiagnostic(startedAt: number): { ok: false; error: string; diagnostic: HydrologyGovernmentIngestDiagnostic } {
    return { ok: false, error: `${this.source} response exceeded safe size limit`, diagnostic: this.diagnostic('response_too_large', `${this.source} response exceeded safe size limit`, startedAt) }
  }

  protected parseSafely(body: string, httpSummary: HydrologyGovernmentHttpSummary, parse: (body: string) => NormalizedHydrologyTelemetry[]): ScraperResult {
    const startedAt = Date.now()
    try {
      return { ok: true, records: parse(body), httpSummary }
    } catch {
      return { ok: false, error: `${this.source} payload parse failure`, diagnostic: this.diagnostic('parse_failure', `${this.source} payload parse failed`, startedAt), httpSummary }
    }
  }

  private diagnostic(failureKind: NonNullable<HydrologyGovernmentIngestDiagnostic['failureKind']>, reason: string, startedAt: number, extra: Partial<Pick<HydrologyGovernmentIngestDiagnostic, 'upstreamStatus'>> = {}, url = this.url, timeoutMs = this.timeoutMs): HydrologyGovernmentIngestDiagnostic {
    const safeUrl = safeProviderUrl(url)
    return { failureKind, reason, attempts: 1, timeoutMs, elapsedMs: Math.max(0, Date.now() - startedAt), ...safeUrl, ...extra }
  }

  private httpSummary(startedAt: number, status?: number, responseBytes?: number, responseChars?: number, url = this.url, timeoutMs = this.timeoutMs): HydrologyGovernmentHttpSummary {
    const safeUrl = safeProviderUrl(url)
    return { host: safeUrl.providerHost ?? 'unknown.local', path: safeUrl.providerPath ?? '/', status, elapsedMs: Math.max(0, Date.now() - startedAt), attempts: 1, timeoutMs, responseBytes, responseChars }
  }
}

export class PnaHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) {
    super('PNA', options.url ?? process.env['HYDROLOGY_PNA_URL'] ?? FAST_PNA_URL, { ...options, userAgent: options.userAgent ?? process.env['HYDROLOGY_PNA_USER_AGENT'], timeoutMs: options.timeoutMs ?? parsePositiveInt(process.env['HYDROLOGY_PNA_TIMEOUT_MS'], DEFAULT_PNA_REQUEST_TIMEOUT_MS), totalTimeoutMs: options.totalTimeoutMs ?? parsePositiveInt(process.env['HYDROLOGY_PNA_TOTAL_TIMEOUT_MS'], DEFAULT_PNA_TOTAL_TIMEOUT_MS), retryBackoffMs: options.retryBackoffMs ?? parseNonNegativeInt(process.env['HYDROLOGY_PNA_RETRY_BACKOFF_MS'], DEFAULT_PNA_RETRY_BACKOFF_MS), maxResponseBytes: options.maxResponseBytes ?? DEFAULT_PNA_MAX_RESPONSE_BYTES, maxResponseChars: options.maxResponseChars ?? DEFAULT_PNA_MAX_RESPONSE_CHARS })
  }
  async fetchTelemetry(signal?: AbortSignal): Promise<ScraperResult> {
    const startedAt = Date.now()
    const attemptLog: ScraperAttemptLog[] = []
    let finalResult: ScraperResult | undefined
    for (let attempt = 1; attempt <= MAX_PNA_ATTEMPTS; attempt += 1) {
      const remainingMs = this.totalTimeoutMs - (Date.now() - startedAt)
      if (remainingMs <= 0 || signal?.aborted) break
      const attemptTimeoutMs = Math.min(this.timeoutMs, remainingMs)
      const fetched = await this.fetchTextOnce('any', this.url, signal, attemptTimeoutMs)
      finalResult = fetched.ok ? this.parseSafely(fetched.body, fetched.httpSummary, parsePnaBody) : fetched
      attemptLog.push(attemptLogFor(finalResult, attempt))
      if (finalResult.ok || !isRetryablePnaFailure(finalResult) || attempt === MAX_PNA_ATTEMPTS || signal?.aborted) break
      const remainingAfterAttemptMs = this.totalTimeoutMs - (Date.now() - startedAt)
      if (remainingAfterAttemptMs <= this.retryBackoffMs) break
      await delay(this.retryBackoffMs)
    }
    finalResult ??= {
      ok: false,
      error: 'PNA request exceeded its total timeout budget',
      diagnostic: { failureKind: 'timeout', reason: 'PNA total request budget exhausted', attempts: 1, timeoutMs: this.timeoutMs },
    }
    return withPnaAttemptMetadata(finalResult, startedAt, attemptLog, this.timeoutMs)
  }
}

export class SmnHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('SMN', options.url ?? process.env['HYDROLOGY_SMN_URL'] ?? SMN_ALERTS_URL, { ...options, timeoutMs: options.timeoutMs ?? parsePositiveInt(process.env['HYDROLOGY_SMN_TIMEOUT_MS'], DEFAULT_REQUEST_TIMEOUT_MS), maxResponseBytes: options.maxResponseBytes ?? DEFAULT_SMN_MAX_RESPONSE_BYTES, maxResponseChars: options.maxResponseChars ?? DEFAULT_SMN_MAX_RESPONSE_CHARS }) }
  async fetchTelemetry(signal?: AbortSignal): Promise<ScraperResult> {
    const fetched = await this.fetchTextOnce('any', this.url, signal)
    return fetched.ok ? this.parseSafely(fetched.body, fetched.httpSummary, (body) => new SmnAdapter(this.url).parse(body)) : fetched
  }
}

export class InmetHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) {
    const url = options.url ?? process.env['HYDROLOGY_INMET_URL'] ?? INMET_ALERTS_URL
    super('INMET', url, { ...options, timeoutMs: options.timeoutMs ?? parsePositiveInt(process.env['HYDROLOGY_INMET_TIMEOUT_MS'], DEFAULT_REQUEST_TIMEOUT_MS), maxResponseBytes: options.maxResponseBytes ?? DEFAULT_INMET_MAX_RESPONSE_BYTES, maxResponseChars: options.maxResponseChars ?? DEFAULT_INMET_MAX_RESPONSE_CHARS })
  }
  async fetchTelemetry(signal?: AbortSignal): Promise<ScraperResult> {
    const fetched = await this.fetchTextOnce('any', this.url, signal)
    return fetched.ok ? this.parseSafely(fetched.body, fetched.httpSummary, (body) => new InmetAdapter(this.url).parse(body)) : fetched
  }
}

export class InaHttpClient extends OfficialHttpClient {
  private readonly urls: string[]
  constructor(options: ClientOptions = {}) {
    const url = options.url ?? process.env['HYDROLOGY_INA_URL'] ?? inaSeriesUrls()[0] ?? 'https://alerta.ina.gob.ar/a5/getObservaciones'
    super('INA', url, { ...options, timeoutMs: options.timeoutMs ?? parsePositiveInt(process.env['HYDROLOGY_INA_TIMEOUT_MS'], DEFAULT_REQUEST_TIMEOUT_MS), maxResponseBytes: options.maxResponseBytes ?? DEFAULT_INA_MAX_RESPONSE_BYTES, maxResponseChars: options.maxResponseChars ?? DEFAULT_INA_MAX_RESPONSE_CHARS })
    this.urls = options.url || process.env['HYDROLOGY_INA_URL'] ? [url] : inaSeriesUrls()
  }
  async fetchTelemetry(signal?: AbortSignal): Promise<ScraperResult> {
    const records: NormalizedHydrologyTelemetry[] = []
    let latestSummary: HydrologyGovernmentHttpSummary | undefined
    let firstFailure: ScraperResult | undefined
    const fetchedResults = await Promise.all(this.urls.map((url) => this.fetchTextOnce('any', url, signal)))
    for (const [index, fetched] of fetchedResults.entries()) {
      const url = this.urls[index]
      if (!fetched.ok) {
        firstFailure ??= fetched
        continue
      }
      latestSummary = fetched.httpSummary
      const parsed = this.parseSafely(fetched.body, fetched.httpSummary, (body) => new InaAdapter(url).parse(body))
      if (!parsed.ok) {
        firstFailure ??= parsed
        continue
      }
      records.push(...parsed.records)
    }
    return records.length > 0 || !firstFailure ? { ok: true, records, httpSummary: latestSummary } : firstFailure
  }
}

function isJsonResponse(contentType: string, body: string): boolean {
  if (/\bjson\b/i.test(contentType)) return true
  if (!contentType) return /^\s*[[{]/.test(body)
  return false
}

function isRetryablePnaFailure(result: ScraperResult): boolean {
  if (result.ok) return false
  const failureKind = result.diagnostic.failureKind
  if (failureKind === 'network_failure' || failureKind === 'timeout') return true
  const status = result.diagnostic.upstreamStatus
  return failureKind === 'http_status' && (status === 429 || (status !== undefined && status >= 500))
}

function parsePnaBody(body: string): NormalizedHydrologyTelemetry[] {
  if (!/<(?:table|tr)\b/i.test(body)) throw new Error('PNA payload has no official table structure')
  return new PnaAdapter().parse(body)
}

function attemptLogFor(result: ScraperResult, attempt: number): ScraperAttemptLog {
  const summary = result.httpSummary
  const diagnostic = result.ok ? undefined : result.diagnostic
  return {
    attempt,
    outcome: result.ok ? 'success' : 'failure',
    providerHost: summary?.host ?? diagnostic?.providerHost,
    providerPath: summary?.path ?? diagnostic?.providerPath,
    status: summary?.status ?? diagnostic?.upstreamStatus,
    elapsedMs: summary?.elapsedMs ?? diagnostic?.elapsedMs ?? 0,
    failureKind: diagnostic?.failureKind,
  }
}

function withPnaAttemptMetadata(result: ScraperResult, startedAt: number, attemptLog: ScraperAttemptLog[], timeoutMs: number): ScraperResult {
  const elapsedMs = Math.max(0, Date.now() - startedAt)
  const attempts: HydrologyGovernmentHttpSummary['attempts'] = attemptLog.length > 1 ? 2 : 1
  const httpSummary = result.httpSummary ? { ...result.httpSummary, attempts, elapsedMs, timeoutMs } : undefined
  if (result.ok) return { ...result, ...(httpSummary ? { httpSummary } : {}), attemptLog }
  return {
    ...result,
    ...(httpSummary ? { httpSummary } : {}),
    diagnostic: { ...result.diagnostic, attempts, timeoutMs, elapsedMs, durationMs: elapsedMs },
    attemptLog,
  }
}

function delay(delayMs: number): Promise<void> {
  if (delayMs <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function clampTimeout(value: number): number {
  return Math.min(MAX_REQUEST_TIMEOUT_MS, Math.max(1, Math.trunc(value)))
}

function clampTotalTimeout(value: number): number {
  return Math.min(MAX_TOTAL_REQUEST_TIMEOUT_MS, Math.max(1, Math.trunc(value)))
}

function clampRetryBackoff(value: number): number {
  return Math.min(5_000, Math.max(0, Math.trunc(value)))
}

function inaSeriesUrls(now = new Date()): string[] {
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const end = now.toISOString()
  const range = `timestart=${encodeURIComponent(start)}&timeend=${encodeURIComponent(end)}`
  return INA_SERIES_IDS.map((seriesId) => `https://alerta.ina.gob.ar/a5/getObservaciones?tipo=puntual&series_id=${seriesId}&${range}&format=csv`)
}

function safeProviderUrl(url: string): Pick<HydrologyGovernmentIngestDiagnostic, 'providerHost' | 'providerPath'> {
  try {
    const parsed = new URL(url)
    return { providerHost: parsed.host, providerPath: parsed.pathname || '/' }
  } catch {
    return {}
  }
}
