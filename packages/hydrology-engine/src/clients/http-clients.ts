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
}

const DEFAULT_USER_AGENT = 'Ibera-Alerta/1.0 (+https://agronautas.local; official flood-crisis monitoring)'

abstract class OfficialHttpClient {
  protected readonly fetchImpl: typeof fetch
  protected readonly userAgent: string

  protected constructor(protected readonly source: string, protected readonly url: string, options: ClientOptions = {}) {
    this.fetchImpl = options.fetch ?? fetch
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT
  }

  protected async fetchText(): Promise<{ ok: true; body: string } | { ok: false; error: string }> {
    try {
      const response = await this.fetchImpl(this.url, { headers: { 'user-agent': this.userAgent, accept: '*/*' } })
      if (!response.ok) return { ok: false, error: `${this.source} HTTP ${response.status} ${response.statusText}`.trim() }
      return { ok: true, body: await response.text() }
    } catch (error) {
      return { ok: false, error: `${this.source} network failure: ${error instanceof Error ? error.message : String(error)}` }
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
    const fetched = await this.fetchText()
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new SmnAdapter().parse(body)) : fetched
  }
}

export class InmetHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('INMET', options.url ?? 'https://portal.inmet.gov.br/dadoshistoricos', options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText()
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new InmetAdapter().parse(body)) : fetched
  }
}

export class InaHttpClient extends OfficialHttpClient {
  constructor(options: ClientOptions = {}) { super('INA', options.url ?? 'https://www.ina.gob.ar/alerta/index.php', options) }
  async fetchTelemetry(): Promise<ScraperResult> {
    const fetched = await this.fetchText()
    return fetched.ok ? this.parseSafely(fetched.body, (body) => new InaAdapter().parse(body)) : fetched
  }
}
