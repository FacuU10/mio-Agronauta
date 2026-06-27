import { InaAdapter } from '../adapters/ina-adapter'
import { InmetAdapter } from '../adapters/inmet-adapter'
import { PnaAdapter } from '../adapters/pna-adapter'
import { SmnAdapter } from '../adapters/smn-adapter'
import type { NormalizedHydrologyTelemetry } from '../types'

export type ScraperResult = { ok: true; records: NormalizedHydrologyTelemetry[] } | { ok: false; error: string }

interface ClientOptions {
  url?: string
  fetch?: typeof fetch
  userAgent?: string
  timeoutMs?: number
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000
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

  protected async fetchText(expectedContent: 'any' | 'json' = 'any'): Promise<{ ok: true; body: string } | { ok: false; error: string }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchImpl(this.url, { headers: { ...DEFAULT_HEADERS, 'user-agent': this.userAgent }, signal: controller.signal })
      if (!response.ok) return { ok: false, error: `${this.source} HTTP ${response.status} ${response.statusText}`.trim() }
      const contentType = response.headers.get('content-type') ?? ''
      const body = await response.text()
      if (expectedContent === 'json' && !isJsonResponse(contentType, body)) {
        return { ok: false, error: `${this.source} unexpected content-type ${contentType || 'unknown'}; expected JSON payload` }
      }
      return { ok: true, body }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return { ok: false, error: `${this.source} network failure: timeout after ${this.timeoutMs}ms` }
      return { ok: false, error: `${this.source} network failure: ${error instanceof Error ? error.message : String(error)}` }
    } finally {
      clearTimeout(timeout)
    }
  }

  protected parseSafely(body: string, parse: (body: string) => NormalizedHydrologyTelemetry[]): ScraperResult {
    try {
      return { ok: true, records: parse(body) }
    } catch (error) {
      return { ok: false, error: `${this.source} payload parse failure: ${error instanceof Error ? error.message : String(error)}` }
    }
  }
}

export class PnaHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('PNA', options.url ?? 'https://www.prefecturanaval.gob.ar/alturas', options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText()
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new PnaAdapter().parse(body)) : fetched
  }
}

export class SmnHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('SMN', options.url ?? 'https://www.smn.gob.ar/alertas', options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText('json')
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new SmnAdapter().parse(body)) : fetched
  }
}

export class InmetHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('INMET', options.url ?? 'https://portal.inmet.gov.br/dadoshistoricos', options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText('json')
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new InmetAdapter().parse(body)) : fetched
  }
}

export class InaHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('INA', options.url ?? 'https://www.ina.gob.ar/alerta/index.php', options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText('json')
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new InaAdapter().parse(body)) : fetched
  }
}

function isJsonResponse(contentType: string, body: string): boolean {
  if (/\bjson\b/i.test(contentType)) return true
  if (!contentType) return /^\s*[\[{]/.test(body)
  return false
}
