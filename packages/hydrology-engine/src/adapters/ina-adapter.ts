import { forecastConfidenceForHorizon, isForecastWithinPhase1Horizon, type NormalizedHydrologyTelemetry } from '../types.js'

const INA_URL = 'https://alerta.ina.gob.ar/a5/getObservaciones'

interface InaRow { stationId: string; observedAt: string; heightM?: number; tendency?: string; forecast?: Array<{ horizonDays: number; heightM: number }> }

export class InaAdapter {
  constructor(private readonly sourceUrl = INA_URL) {}

  parse(payload: string | { predictions?: unknown[]; data?: unknown[]; rows?: unknown[] }, ingestedAt = new Date()): NormalizedHydrologyTelemetry[] {
    if (typeof payload === 'string' && /^\s*</.test(payload)) return parseOfficialHtml(payload, ingestedAt)
    if (typeof payload === 'string' && !/^\s*[{[]/.test(payload)) return parseOfficialCsv(payload, ingestedAt, this.sourceUrl)
    const data = typeof payload === 'string' ? JSON.parse(payload) as { predictions?: unknown[]; data?: unknown[]; rows?: unknown[] } : payload
    return readArray(data.predictions ?? data.data ?? data.rows).flatMap((item) => {
      const row = normalizeInaRow(item)
      if (!row) return []
      const observedAt = new Date(row.observedAt)
      const records: NormalizedHydrologyTelemetry[] = []
      if (row.heightM !== undefined) records.push(record(row.stationId, observedAt, ingestedAt, row.heightM, row.tendency, this.sourceUrl))
      for (const forecast of row.forecast ?? []) {
        if (!isForecastWithinPhase1Horizon(forecast.horizonDays)) continue
        records.push({ ...record(row.stationId, observedAt, ingestedAt, forecast.heightM, row.tendency, this.sourceUrl), forecastHorizonDays: forecast.horizonDays, confidence: forecastConfidenceForHorizon(forecast.horizonDays) })
      }
      return records
    })
  }
}

function parseOfficialHtml(payload: string, ingestedAt: Date): NormalizedHydrologyTelemetry[] {
  const rows = [...payload.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  return rows.flatMap((match) => {
    const cells = [...(match[1] ?? '').matchAll(/<t[dh][^>]*>\s*([^<]+?)\s*<\/t[dh]>/gi)].map((cell) => decodeHtml(cell[1] ?? '').trim())
    if (cells.length < 3) return []
    const stationId = cells[0]?.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
    const heightM = asNumber(cells.find((cell) => /(?:altura|nivel)\s*:/i.test(cell))?.replace(/.*?:/, ''))
    const observedAt = cells.map(asDateText).find((value): value is string => value !== undefined)
    if (!stationId || heightM === undefined || !observedAt) return []
    return [record(stationId, new Date(observedAt), ingestedAt, heightM, cells.find((cell) => /tendencia/i.test(cell))?.replace(/.*?:/, '').trim())]
  })
}

function parseOfficialCsv(payload: string, ingestedAt: Date, sourceUrl: string): NormalizedHydrologyTelemetry[] {
  const [headerLine, ...lines] = payload.trim().split(/\r?\n/)
  if (!headerLine) return []
  const headers = parseCsvLine(headerLine).map((value) => value.trim().toLowerCase())
  return lines.flatMap((line) => {
    const values = parseCsvLine(line)
    if (values.length !== headers.length) return []
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
    const stationId = asText(row['series_id'] ?? row['seriesid'] ?? row['station_id'] ?? row['estacion'])
    const observedAt = asDateText(row['timestart'] ?? row['time'] ?? row['fecha_hora'] ?? row['fecha'])
    const heightM = asNumber(row['valor'] ?? row['value'] ?? row['altura'] ?? row['nivel'])
    return stationId && observedAt && heightM !== undefined
      ? [record(stationId, new Date(observedAt), ingestedAt, heightM, undefined, sourceUrl)]
      : []
  })
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index] ?? ''
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else quoted = !quoted
    } else if (character === ',' && !quoted) {
      values.push(value)
      value = ''
    } else value += character
  }
  values.push(value)
  return values
}

function decodeHtml(value: string): string {
  return value.replace(/&nbsp;/gi, ' ').replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í').replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
}

const record = (stationId: string, observedAt: Date, ingestedAt: Date, value: number, tendency?: string, sourceUrl = INA_URL): NormalizedHydrologyTelemetry => ({
  source: 'INA', stationId, observedAt, ingestedAt, lastSuccessfulObservedAt: observedAt, value, unit: 'm', metric: 'river_height_m', quality: 'ok', freshness: 'fresh', tendency, sourceUrl,
})

function normalizeInaRow(value: unknown): InaRow | null {
  if (!isRecord(value)) return null
  const stationId = asText(value['stationId'] ?? value['station_id'] ?? value['id'] ?? value['estacion'] ?? value['station'])
  const observedAt = asDateText(value['observedAt'] ?? value['observed_at'] ?? value['fecha'] ?? value['date'])
  if (!stationId || !observedAt) return null
  const heightM = asNumber(value['heightM'] ?? value['height_m'] ?? value['altura'] ?? value['nivel'] ?? value['value'])
  const forecast = readArray(value['forecast'] ?? value['pronostico'] ?? value['predictions']).map((item) => {
    if (!isRecord(item)) return null
    const horizonDays = asNumber(item['horizonDays'] ?? item['horizon_days'] ?? item['dias'] ?? item['day'])
    const forecastHeightM = asNumber(item['heightM'] ?? item['height_m'] ?? item['altura'] ?? item['nivel'] ?? item['value'])
    return horizonDays !== undefined && forecastHeightM !== undefined ? { horizonDays, heightM: forecastHeightM } : null
  }).filter((item): item is { horizonDays: number; heightM: number } => item !== null)
  return { stationId, observedAt, heightM, tendency: asText(value['tendency'] ?? value['tendencia']), forecast }
}

function readArray(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function asText(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : undefined }
function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return undefined
  const parsed = Number(value.replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}
function asDateText(value: unknown): string | undefined {
  const text = asText(value)
  if (!text) return undefined
  const date = /^\d{2}\/\d{2}\/\d{4}/.test(text) ? new Date(text.replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')) : new Date(text)
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}
