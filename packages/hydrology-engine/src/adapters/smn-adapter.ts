import type { NormalizedHydrologyTelemetry } from '../types.js'
import { boundedRssItems, xmlTag } from './rss-parser.js'

const SMN_URL = 'https://ssl.smn.gob.ar/feeds/CAP/rss_alertaCAP_nuevo_2026.xml'
const relevantProvinces = new Set(['Misiones', 'Corrientes'])
const MAX_RSS_ITEMS = 120

export class SmnAdapter {
  constructor(private readonly sourceUrl = SMN_URL) {}

  parse(payload: string | { rainfall?: unknown[]; alerts?: unknown[]; data?: unknown[] }, ingestedAt = new Date()): NormalizedHydrologyTelemetry[] {
    if (typeof payload === 'string' && /<rss\b/i.test(payload)) return parseOfficialRss(payload, ingestedAt, this.sourceUrl)
    const data = typeof payload === 'string' ? JSON.parse(payload) as { rainfall?: unknown[]; alerts?: unknown[]; data?: unknown[] } : payload
    const rows = readArray(data.rainfall ?? data.data).map(normalizeRainfall).filter((row): row is NonNullable<ReturnType<typeof normalizeRainfall>> => row !== null)
    const rainfall = rows.filter((row) => relevantProvinces.has(row.province)).map((row) => ({ source: 'SMN' as const, stationId: row.stationId, observedAt: new Date(row.observedAt), ingestedAt, lastSuccessfulObservedAt: new Date(row.observedAt), value: row.rainMm, unit: 'mm', metric: 'rain_mm' as const, quality: 'ok' as const, freshness: 'fresh' as const, sourceUrl: this.sourceUrl, raw: { province: row.province } }))
    const alerts = readArray(data.alerts).map(normalizeAlert).filter((row): row is NonNullable<ReturnType<typeof normalizeAlert>> => row !== null).filter((row) => relevantProvinces.has(row.province)).map((row) => ({ source: 'SMN' as const, stationId: row.regionId, providerAlertId: row.regionId, observedAt: new Date(row.observedAt), ingestedAt, lastSuccessfulObservedAt: new Date(row.observedAt), value: row.severity, unit: 'severity', metric: 'storm_alert' as const, quality: 'ok' as const, freshness: 'fresh' as const, sourceUrl: this.sourceUrl, raw: { province: row.province, title: row.title, providerAlertId: row.regionId } }))
    return [...rainfall, ...alerts]
  }
}

function parseOfficialRss(payload: string, ingestedAt: Date, sourceUrl: string): NormalizedHydrologyTelemetry[] {
  return boundedRssItems(payload, MAX_RSS_ITEMS).flatMap((item) => {
    const title = xmlTag(item, 'title')
    const link = xmlTag(item, 'link') ?? xmlTag(item, 'guid')
    const observedAt = asDateText(xmlTag(item, 'pubDate'))
    const stationId = link?.match(/CAP_(\d+)_/)?.[1]
    const description = xmlTag(item, 'description')
    if (!title || !link || !stationId || !observedAt || /no se han emitido/i.test(description ?? '')) return []
    const coverageKey = /corrientes/i.test(`${title} ${description ?? ''}`) ? 'smn-corrientes' : undefined
    const stableStationId = coverageKey ?? 'smn-alerts'
    return [{
      source: 'SMN' as const,
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
      raw: { title: title.slice(0, 256), description: (description ?? '').slice(0, 4096), link, providerAlertId: stationId, ...(coverageKey ? { coverageKey } : {}) },
    }]
  })
}

function normalizeRainfall(value: unknown): { stationId: string; province: string; observedAt: string; rainMm: number } | null {
  if (!isRecord(value)) return null
  const stationId = asText(value['stationId'] ?? value['station_id'] ?? value['id'] ?? value['regionId'])
  const province = normalizeProvince(asText(value['province'] ?? value['provincia'] ?? value['region']))
  const observedAt = asDateText(value['observedAt'] ?? value['observed_at'] ?? value['fecha'] ?? value['date'])
  const rainMm = asNumber(value['rainMm'] ?? value['rain_mm'] ?? value['precipitacion'] ?? value['lluvia'] ?? value['value'])
  return stationId && province && observedAt && rainMm !== undefined ? { stationId, province, observedAt, rainMm } : null
}

function normalizeAlert(value: unknown): { regionId: string; province: string; observedAt: string; severity: number; title: string } | null {
  if (!isRecord(value)) return null
  const regionId = asText(value['regionId'] ?? value['region_id'] ?? value['id'] ?? value['zone'])
  const province = normalizeProvince(asText(value['province'] ?? value['provincia'] ?? value['region']))
  const observedAt = asDateText(value['observedAt'] ?? value['observed_at'] ?? value['fecha'] ?? value['date'])
  const severity = asNumber(value['severity'] ?? value['nivel'] ?? value['level'] ?? 1)
  return regionId && province && observedAt && severity !== undefined ? { regionId, province, observedAt, severity, title: asText(value['title'] ?? value['titulo']) ?? 'Alerta oficial SMN' } : null
}

function readArray(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function asText(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : undefined }
function asNumber(value: unknown): number | undefined { const text = asText(value); const parsed = typeof value === 'number' ? value : text ? Number(text.replace(',', '.').replace(/[^\d.-]/g, '')) : NaN; return Number.isFinite(parsed) ? parsed : undefined }
function asDateText(value: unknown): string | undefined { const text = asText(value); if (!text) return undefined; const date = new Date(text); return Number.isFinite(date.getTime()) ? date.toISOString() : undefined }
function normalizeProvince(value: string | undefined): string | undefined {
  if (!value) return undefined
  if (/corrientes/i.test(value)) return 'Corrientes'
  if (/misiones/i.test(value)) return 'Misiones'
  return value
}
