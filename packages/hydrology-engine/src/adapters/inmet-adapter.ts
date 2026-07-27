import type { NormalizedHydrologyTelemetry } from '../types.js'
import { boundedRssItems, xmlTag } from './rss-parser.js'

const INMET_URL = 'https://apiprevmet3.inmet.gov.br/avisos/rss'
const relevantStates = new Set(['PR', 'SC', 'RS'])
const relevantStations = new Set(['A830', 'A809', 'A846', 'A826'])
const MAX_RSS_ITEMS = 100
const INMET_NO_ALERT_TEXT = 'nao ha avisos meteorologicos ativos'

export class InmetAdapter {
  constructor(private readonly sourceUrl = INMET_URL, private readonly stationId?: string) {}

  parse(payload: string | { measurements?: unknown[]; data?: unknown[] }, ingestedAt = new Date()): NormalizedHydrologyTelemetry[] {
    if (typeof payload === 'string' && isOfficialNoAlertText(payload)) return []
    if (typeof payload === 'string' && /<rss\b/i.test(payload)) return parseOfficialRss(payload, ingestedAt, this.sourceUrl)
    const data = typeof payload === 'string' ? JSON.parse(payload) as { measurements?: unknown[]; data?: unknown[] } : payload
    return readArray(data.measurements ?? data.data ?? data)
      .map(normalizeInmetRow)
      .filter((row): row is NonNullable<ReturnType<typeof normalizeInmetRow>> => row !== null)
      .filter((row) => relevantStations.has(row.stationId) || relevantStates.has(row.uf) || /paran[aá]|igua[cç]u|uruguai|uruguay/i.test(row.basin ?? ''))
      .map((row) => ({ source: 'INMET', stationId: row.stationId, observedAt: new Date(row.observedAt), ingestedAt, lastSuccessfulObservedAt: new Date(row.observedAt), value: row.rainMm, unit: 'mm', metric: 'rain_mm', quality: 'ok', freshness: 'fresh', sourceUrl: this.sourceUrl, raw: { uf: row.uf, basin: row.basin } }))
  }
}

function normalizeNoAlertText(payload: string): string {
  return payload.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/gu, ' ').toLowerCase()
}

function isOfficialNoAlertText(payload: string): boolean {
  const normalized = normalizeNoAlertText(payload)
  return normalized === INMET_NO_ALERT_TEXT || normalized === `${INMET_NO_ALERT_TEXT}.`
}

function parseOfficialRss(payload: string, ingestedAt: Date, sourceUrl: string): NormalizedHydrologyTelemetry[] {
  return boundedRssItems(payload, MAX_RSS_ITEMS).flatMap((item) => {
    const title = xmlTag(item, 'title')
    const link = xmlTag(item, 'link') ?? xmlTag(item, 'guid')
    const observedAt = asDateText(xmlTag(item, 'pubDate'))
    const stationId = link?.match(/\/(\d+)(?:\.xml)?$/)?.[1]
    if (!title || !link || !stationId || !observedAt) return []
    const coverageKey = `${title} ${xmlTag(item, 'description') ?? ''}`.match(/\b(A830|A809|A846|A826)\b/i)?.[1]?.toUpperCase()
    const stableStationId = coverageKey ?? 'inmet-alerts'
    return [{
      source: 'INMET' as const,
      stationId: stableStationId,
      providerAlertId: stationId,
      coverageKey,
      observedAt: new Date(observedAt),
      ingestedAt,
      lastSuccessfulObservedAt: new Date(observedAt),
      value: null,
      unit: 'alert',
      metric: 'storm_alert' as const,
      quality: 'ok' as const,
      freshness: 'fresh' as const,
      sourceUrl,
      raw: { title: title.slice(0, 256), description: (xmlTag(item, 'description') ?? '').slice(0, 4096), link, providerAlertId: stationId, ...(coverageKey ? { coverageKey } : {}) },
    }]
  })
}

function normalizeInmetRow(value: unknown): { stationId: string; uf: string; basin?: string; observedAt: string; rainMm: number } | null {
  if (!isRecord(value)) return null
  const stationId = asText(value['stationId'] ?? value['station_id'] ?? value['CD_ESTACAO'] ?? value['codigo'] ?? value['id'])
  const uf = asText(value['uf'] ?? value['UF'] ?? value['state'])
  const observedAt = asDateText(value['observedAt'] ?? value['observed_at'] ?? value['DT_MEDICAO'] ?? value['data'] ?? value['date'])
  const rainMm = asNumber(value['rainMm'] ?? value['rain_mm'] ?? value['CHUVA'] ?? value['precipitacao'] ?? value['rain'])
  if (!stationId || !uf || !observedAt || rainMm === undefined) return null
  return { stationId, uf, basin: asText(value['basin'] ?? value['bacia']), observedAt, rainMm }
}

function readArray(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function asText(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : undefined }
function asNumber(value: unknown): number | undefined { const text = asText(value); const parsed = typeof value === 'number' ? value : text ? Number(text.replace(',', '.').replace(/[^\d.-]/g, '')) : NaN; return Number.isFinite(parsed) ? parsed : undefined }
function asDateText(value: unknown): string | undefined { const text = asText(value); if (!text) return undefined; const date = new Date(text); return Number.isFinite(date.getTime()) ? date.toISOString() : undefined }
