import { forecastConfidenceForHorizon, isForecastWithinPhase1Horizon, type NormalizedHydrologyTelemetry } from '../types.js'

const PNA_URL = 'https://contenidosweb.prefecturanaval.gob.ar/alturas/'
const MAX_OFFICIAL_TABLE_ROWS = 256
const MAX_OFFICIAL_TABLE_CELLS_PER_ROW = 12
const MAX_OFFICIAL_TABLE_CELL_CHARS = 120

const MONITORED_STATIONS = new Map([
  ['ITUZAINGO', 'ituzaingo'],
  ['ITA IBATE', 'ita_ibate'],
  ['ITAIBATE', 'ita_ibate'],
  ['YAHAPE', 'yahape'],
  ['ITATI', 'itati'],
  ['PASO DE LA PATRIA', 'paso_de_la_patria'],
  ['CORRIENTES', 'corrientes'],
  ['CORRIENTES CAPITAL', 'corrientes'],
  ['EMPEDRADO', 'empedrado'],
  ['BELLA VISTA', 'bella_vista'],
  ['GOYA', 'goya'],
  ['ESQUINA', 'esquina'],
  ['GARRUCHOS', 'garruchos'],
  ['SANTO TOME', 'santo_tome'],
  ['ALVEAR', 'alvear'],
  ['LA CRUZ', 'la_cruz'],
  ['YAPEYU', 'yapeyu'],
  ['PASO DE LOS LIBRES', 'paso_de_los_libres'],
  ['MONTE CASEROS', 'monte_caseros'],
])

export class PnaAdapter {
  parse(html: string, ingestedAt = new Date()): NormalizedHydrologyTelemetry[] {
    const rows = [...html.matchAll(/<tr[^>]*data-station="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/gi)]
    const legacyRows = rows.flatMap((match) => this.parseRow(match[1] ?? '', match[2] ?? '', ingestedAt)).filter(Boolean) as NormalizedHydrologyTelemetry[]
    return [...legacyRows, ...parseOfficialTableRows(html, ingestedAt)]
  }

  private parseRow(stationId: string, row: string, ingestedAt: Date): NormalizedHydrologyTelemetry[] {
    const text = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const observedAt = readDate(row) ?? ingestedAt
    const height = readNumber(text, /altura\s*:?\s*([\d,.]+)/i)
    const tendency = text.match(/tend(?:encia)?\s*:?\s*([a-záéíóúñ ]+)/i)?.[1]?.trim()
    const telemetry: NormalizedHydrologyTelemetry[] = []
    if (height !== undefined) telemetry.push(base(stationId, observedAt, ingestedAt, height, tendency))

    for (const match of row.matchAll(/data-forecast-days="(\d+)"[^>]*>([\d,.]+)/gi)) {
      const days = Number(match[1])
      if (!isForecastWithinPhase1Horizon(days)) continue
      telemetry.push({ ...base(stationId, observedAt, ingestedAt, Number((match[2] ?? '0').replace(',', '.')), tendency), forecastHorizonDays: days, confidence: forecastConfidenceForHorizon(days) })
    }
    return telemetry
  }
}

const base = (stationId: string, observedAt: Date, ingestedAt: Date, value: number, tendency?: string): NormalizedHydrologyTelemetry => ({
  source: 'PNA', stationId, observedAt, ingestedAt, lastSuccessfulObservedAt: observedAt, value, unit: 'm', metric: 'river_height_m', quality: 'ok', freshness: 'fresh', tendency, sourceUrl: PNA_URL,
})

const readDate = (text: string): Date | undefined => {
  const iso = text.match(/data-observed-at="([^"]+)"/i)?.[1]
  return iso ? new Date(iso) : undefined
}
const readNumber = (text: string, pattern: RegExp): number | undefined => {
  const value = text.match(pattern)?.[1]
  return value ? Number(value.replace(',', '.')) : undefined
}

function parseOfficialTableRows(html: string, ingestedAt: Date): NormalizedHydrologyTelemetry[] {
  const telemetry: NormalizedHydrologyTelemetry[] = []
  let parsedRows = 0
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    if (parsedRows >= MAX_OFFICIAL_TABLE_ROWS) break
    parsedRows += 1
    const cells: string[] = []
    for (const cellMatch of (rowMatch[1] ?? '').matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
      if (cells.length >= MAX_OFFICIAL_TABLE_CELLS_PER_ROW) break
      cells.push(cleanCell(cellMatch[1] ?? ''))
    }
    if (cells.length < 2 || cells.some((cell) => /^puerto$|^altura$/i.test(cell))) continue
    const stationIndex = cells.findIndex((cell) => MONITORED_STATIONS.has(normalizeStationName(cell)))
    if (stationIndex < 0) continue
    const stationName = normalizeStationName(cells[stationIndex] ?? '')
    const stationId = MONITORED_STATIONS.get(stationName)
    const valueIndex = cells.findIndex((cell, index) => index !== stationIndex && parseHeightCell(cell) !== undefined)
    if (!stationId || valueIndex < 0) continue
    const value = parseHeightCell(cells[valueIndex] ?? '')
    if (value === undefined) continue
    const observedAt = parseObservedAt(cells, ingestedAt)
    const tendency = cells.map(normalizeTendency).find(Boolean)
    telemetry.push(base(stationId, observedAt, ingestedAt, value, tendency))
  }
  return telemetry
}

function cleanCell(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_OFFICIAL_TABLE_CELL_CHARS)
}

function normalizeStationName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toUpperCase()
}

function parseDecimal(value: string): number | undefined {
  const match = /-?\d+(?:[.,]\d+)?/.exec(value)
  if (!match?.[0]) return undefined
  const parsed = Number(match[0].replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseHeightCell(value: string): number | undefined {
  if (/\b\d{1,2}:\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i.test(value)) return undefined
  return parseDecimal(value)
}

function parseObservedAt(cells: string[], fallback: Date): Date {
  const dateText = cells.find((cell) => /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(cell))
  if (!dateText) return fallback
  const match = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/.exec(dateText)
  if (!match?.[1] || !match[2] || !match[3]) return fallback
  const timeText = cells.find((cell) => /\b\d{1,2}:\d{2}\b/.test(cell))
  const time = /\b(\d{1,2}):(\d{2})\b/.exec(timeText ?? '')
  const year = match[3].length === 2 ? `20${match[3]}` : match[3]
  const hours = time?.[1]?.padStart(2, '0') ?? '00'
  const minutes = time?.[2] ?? '00'
  const parsed = new Date(`${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}T${hours}:${minutes}:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function normalizeTendency(value: string): string | undefined {
  const normalized = normalizeStationName(value).toLowerCase()
  if (/creciente|sube|ascendente/.test(normalized)) return 'creciente'
  if (/bajante|baja|descendente/.test(normalized)) return 'bajante'
  if (/estacionario|estable|sin variacion/.test(normalized)) return 'estacionario'
  return undefined
}
