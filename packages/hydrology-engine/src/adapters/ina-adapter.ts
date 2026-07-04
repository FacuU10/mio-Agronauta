import { forecastConfidenceForHorizon, isForecastWithinPhase1Horizon, type NormalizedHydrologyTelemetry } from '../types.js'

const INA_URL = 'https://www.ina.gob.ar/alerta/index.php'

interface InaRow { stationId: string; observedAt: string; heightM?: number; tendency?: string; forecast?: Array<{ horizonDays: number; heightM: number }> }

export class InaAdapter {
  parse(payload: string | { predictions: InaRow[] }, ingestedAt = new Date()): NormalizedHydrologyTelemetry[] {
    const data = typeof payload === 'string' ? JSON.parse(payload) as { predictions: InaRow[] } : payload
    return data.predictions.flatMap((row) => {
      const observedAt = new Date(row.observedAt)
      const items: NormalizedHydrologyTelemetry[] = []
      if (row.heightM !== undefined) items.push(record(row.stationId, observedAt, ingestedAt, row.heightM, row.tendency))
      for (const forecast of row.forecast ?? []) {
        if (!isForecastWithinPhase1Horizon(forecast.horizonDays)) continue
        items.push({ ...record(row.stationId, observedAt, ingestedAt, forecast.heightM, row.tendency), forecastHorizonDays: forecast.horizonDays, confidence: forecastConfidenceForHorizon(forecast.horizonDays) })
      }
      return items
    })
  }
}

const record = (stationId: string, observedAt: Date, ingestedAt: Date, value: number, tendency?: string): NormalizedHydrologyTelemetry => ({
  source: 'INA', stationId, observedAt, ingestedAt, lastSuccessfulObservedAt: observedAt, value, unit: 'm', metric: 'river_height_m', quality: 'ok', freshness: 'fresh', tendency, sourceUrl: INA_URL,
})
