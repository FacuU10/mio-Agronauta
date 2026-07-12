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
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000
const DEFAULT_PNA_REQUEST_TIMEOUT_MS = 10_000
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
  protected readonly timeoutMs: number

  protected constructor(protected readonly source: string, protected readonly url: string, options: ClientOptions = {}) {
    this.fetchImpl = options.fetch ?? fetch
    this.userAgent = options.userAgent ?? CHROME_USER_AGENT
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  }

  protected async fetchText(expectedContent: 'any' | 'json' = 'any'): Promise<{ ok: true; body: string } | { ok: false; error: string; diagnostic: HydrologyGovernmentIngestDiagnostic }> {
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
      const contentType = response.headers.get('content-type') ?? ''
      const body = await response.text()
      if (expectedContent === 'json' && !isJsonResponse(contentType, body)) {
        return {
          ok: false,
          error: `${this.source} unexpected content-type ${contentType || 'unknown'}; expected JSON payload`,
          diagnostic: this.diagnostic('unexpected_content_type', `${this.source} returned unsupported content type`, startedAt),
        }
      }
      return { ok: true, body }
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
    super('PNA', options.url ?? process.env['HYDROLOGY_PNA_URL'] ?? 'https://www.prefecturanaval.gob.ar/alturas', {
      ...options,
      userAgent: options.userAgent ?? process.env['HYDROLOGY_PNA_USER_AGENT'],
      timeoutMs: options.timeoutMs ?? parsePositiveInt(process.env['HYDROLOGY_PNA_TIMEOUT_MS'], DEFAULT_PNA_REQUEST_TIMEOUT_MS),
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
  constructor(options: ClientOptions = {}) { super('INMET', options.url ?? process.env['HYDROLOGY_INMET_URL'] ?? 'https://portal.inmet.gov.br/dadoshistoricos', options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText('json')
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

function safeProviderUrl(url: string): Pick<HydrologyGovernmentIngestDiagnostic, 'providerHost' | 'providerPath'> {
  try {
    const parsed = new URL(url)
    return { providerHost: parsed.host, providerPath: parsed.pathname || '/' }
  } catch {
    return {}
  }
}
