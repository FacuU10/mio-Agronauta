import { forecastConfidenceForHorizon, isForecastWithinPhase1Horizon, type NormalizedHydrologyTelemetry } from '../types.js'

const PNA_URL = 'https://www.prefecturanaval.gob.ar/alturas'

export class PnaAdapter {
  parse(html: string, ingestedAt = new Date()): NormalizedHydrologyTelemetry[] {
    const rows = [...html.matchAll(/<tr[^>]*data-station="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/gi)]
    return rows.flatMap((match) => this.parseRow(match[1] ?? '', match[2] ?? '', ingestedAt)).filter(Boolean) as NormalizedHydrologyTelemetry[]
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
