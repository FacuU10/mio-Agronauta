import { InaAdapter } from '../adapters/ina-adapter.js'
import { InmetAdapter } from '../adapters/inmet-adapter.js'
import { PnaAdapter } from '../adapters/pna-adapter.js'
import { SmnAdapter } from '../adapters/smn-adapter.js'
import type { NormalizedHydrologyTelemetry } from '../types.js'
import type { HydrologyGovernmentIngestDiagnostic } from '@repo/zod-schemas'

export type ScraperResult = { ok: true; records: NormalizedHydrologyTelemetry[] } | { ok: false; error: string; diagnostic: HydrologyGovernmentIngestDiagnostic }

interface ClientOptions {
  url?: string
  fetch?: typeof fetch
  userAgent?: string
  timeoutMs?: number
  maxResponseBytes?: number
  maxResponseChars?: number
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000
const DEFAULT_PNA_REQUEST_TIMEOUT_MS = 25_000
const DEFAULT_PNA_MAX_RESPONSE_BYTES = 1_000_000
const DEFAULT_PNA_MAX_RESPONSE_CHARS = 1_000_000
const FAST_PNA_URL = 'https://contenidosweb.prefecturanaval.gob.ar/alturas/'
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const DEFAULT_HEADERS = {
  'user-agent': CHROME_USER_AGENT,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,text/plain;q=0.7,*/*;q=0.5',
  'accept-language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
}

abstract class OfficialHttpClient {
  protected readonly fetchImpl: typeof fetch
  protected readonly userAgent: string
  readonly timeoutMs: number
  private readonly maxResponseBytes?: number
  private readonly maxResponseChars?: number

  protected constructor(protected readonly source: string, protected readonly url: string, options: ClientOptions = {}) {
    this.fetchImpl = options.fetch ?? fetch
    this.userAgent = options.userAgent ?? CHROME_USER_AGENT
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
    this.maxResponseBytes = options.maxResponseBytes
    this.maxResponseChars = options.maxResponseChars
  }

  protected async fetchText(expectedContent: 'any' | 'json' = 'any'): Promise<{ ok: true; body: string; status: number } | { ok: false; error: string; diagnostic: HydrologyGovernmentIngestDiagnostic }> {
    const controller = new AbortController()
    const startedAt = Date.now()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchImpl(this.url, { headers: { ...DEFAULT_HEADERS, 'user-agent': this.userAgent }, signal: controller.signal })
      if (!response.ok) {
        return {
          ok: false,
          error: `${this.source} HTTP ${response.status} ${response.statusText}`.trim(),
          diagnostic: this.diagnostic('http_status', `${this.source} upstream returned HTTP ${response.status}`, startedAt, { upstreamStatus: response.status }),
        }
      }
      if (response.status === 204) return { ok: true, body: '', status: response.status }
      const contentType = response.headers.get('content-type') ?? ''
      const body = await this.readBoundedResponseText(response, startedAt)
      if (!body.ok) return body
      if (expectedContent === 'json' && !isJsonResponse(contentType, body.body)) {
        return {
          ok: false,
          error: `${this.source} unexpected content-type ${contentType || 'unknown'}; expected JSON payload`,
          diagnostic: this.diagnostic('unexpected_content_type', `${this.source} returned unsupported content type`, startedAt),
        }
      }
      return { ok: true, body: body.body, status: response.status }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          ok: false,
          error: `${this.source} network failure: timeout after ${this.timeoutMs}ms`,
          diagnostic: this.diagnostic('timeout', `${this.source} request timed out`, startedAt),
        }
      }
      return {
        ok: false,
        error: `${this.source} network failure`,
        diagnostic: this.diagnostic('network_failure', `${this.source} network request failed`, startedAt),
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  private async readBoundedResponseText(response: Response, startedAt: number): Promise<{ ok: true; body: string } | { ok: false; error: string; diagnostic: HydrologyGovernmentIngestDiagnostic }> {
    if (!response.body) return { ok: true, body: '' }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let bytesRead = 0
    let body = ''
    let reading = true
    try {
      while (reading) {
        const { done, value } = await reader.read()
        if (done) {
          reading = false
          continue
        }
        bytesRead += value.byteLength
        if (this.maxResponseBytes !== undefined && bytesRead > this.maxResponseBytes) {
          await reader.cancel().catch(() => undefined)
          return this.tooLargeDiagnostic(startedAt)
        }
        body += decoder.decode(value, { stream: true })
        if (this.maxResponseChars !== undefined && body.length > this.maxResponseChars) {
          await reader.cancel().catch(() => undefined)
          return this.tooLargeDiagnostic(startedAt)
        }
      }
      body += decoder.decode()
      if (this.maxResponseChars !== undefined && body.length > this.maxResponseChars) return this.tooLargeDiagnostic(startedAt)
      return { ok: true, body }
    } finally {
      reader.releaseLock()
    }
  }

  private tooLargeDiagnostic(startedAt: number): { ok: false; error: string; diagnostic: HydrologyGovernmentIngestDiagnostic } {
    return { ok: false, error: `${this.source} response exceeded safe size limit`, diagnostic: this.diagnostic('response_too_large', `${this.source} response exceeded safe size limit`, startedAt) }
  }

  protected parseSafely(body: string, parse: (body: string) => NormalizedHydrologyTelemetry[]): ScraperResult {
    const startedAt = Date.now()
    try {
      return { ok: true, records: parse(body) }
    } catch (error) {
      void error
      return { ok: false, error: `${this.source} payload parse failure`, diagnostic: this.diagnostic('parse_failure', `${this.source} payload parse failed`, startedAt) }
    }
  }

  private diagnostic(failureKind: NonNullable<HydrologyGovernmentIngestDiagnostic['failureKind']>, reason: string, startedAt: number, extra: Partial<Pick<HydrologyGovernmentIngestDiagnostic, 'upstreamStatus'>> = {}): HydrologyGovernmentIngestDiagnostic {
    const safeUrl = safeProviderUrl(this.url)
    return {
      failureKind,
      reason,
      attempts: 1,
      timeoutMs: this.timeoutMs,
      elapsedMs: Math.max(0, Date.now() - startedAt),
      ...safeUrl,
      ...extra,
    }
  }
}

export class PnaHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) {
    super('PNA', options.url ?? process.env['HYDROLOGY_PNA_URL'] ?? FAST_PNA_URL, {
      ...options,
      userAgent: options.userAgent ?? process.env['HYDROLOGY_PNA_USER_AGENT'],
      timeoutMs: options.timeoutMs ?? parsePositiveInt(process.env['HYDROLOGY_PNA_TIMEOUT_MS'], DEFAULT_PNA_REQUEST_TIMEOUT_MS),
      maxResponseBytes: options.maxResponseBytes ?? DEFAULT_PNA_MAX_RESPONSE_BYTES,
      maxResponseChars: options.maxResponseChars ?? DEFAULT_PNA_MAX_RESPONSE_CHARS,
    })
  }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText()
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new PnaAdapter().parse(body)) : fetched
  }
}

export class SmnHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('SMN', options.url ?? process.env['HYDROLOGY_SMN_URL'] ?? 'https://www.smn.gob.ar/alertas', options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText('json')
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new SmnAdapter().parse(body)) : fetched
  }
}

export class InmetHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('INMET', options.url ?? process.env['HYDROLOGY_INMET_URL'] ?? defaultInmetUrl(), options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText('json')
    if (fetched.ok && fetched.status === 204) return { ok: true, records: [] }
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new InmetAdapter().parse(body)) : fetched
  }
}

export class InaHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('INA', options.url ?? process.env['HYDROLOGY_INA_URL'] ?? 'https://www.ina.gob.ar/alerta/index.php', options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText('json')
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new InaAdapter().parse(body)) : fetched
  }
}

function isJsonResponse(contentType: string, body: string): boolean {
  if (/\bjson\b/i.test(contentType)) return true
  if (!contentType) return /^\s*[[{]/.test(body)
  return false
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function defaultInmetUrl(): string {
  const date = new Date().toISOString().slice(0, 10)
  return `https://apitempo.inmet.gov.br/estacao/diaria/${date}`
}

function safeProviderUrl(url: string): Pick<HydrologyGovernmentIngestDiagnostic, 'providerHost' | 'providerPath'> {
  try {
    const parsed = new URL(url)
    return { providerHost: parsed.host, providerPath: parsed.pathname || '/' }
  } catch {
    return {}
  }
}
