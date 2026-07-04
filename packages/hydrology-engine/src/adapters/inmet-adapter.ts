import type { NormalizedHydrologyTelemetry } from '../types.js'

const INMET_URL = 'https://portal.inmet.gov.br/dadoshistoricos'
const relevantStates = new Set(['PR', 'SC', 'RS'])

interface InmetRow { stationId: string; uf: string; basin?: string; observedAt: string; rainMm: number }

export class InmetAdapter {
  parse(payload: string | { measurements: InmetRow[] }, ingestedAt = new Date()): NormalizedHydrologyTelemetry[] {
    const data = typeof payload === 'string' ? JSON.parse(payload) as { measurements: InmetRow[] } : payload
    return data.measurements
      .filter((row) => relevantStates.has(row.uf) || /paran[aá]|igua[cç]u|uruguai|uruguay/i.test(row.basin ?? ''))
      .map((row) => ({
        source: 'INMET', stationId: row.stationId, observedAt: new Date(row.observedAt), ingestedAt, lastSuccessfulObservedAt: new Date(row.observedAt), value: row.rainMm,
        unit: 'mm', metric: 'rain_mm', quality: 'ok', freshness: 'fresh', sourceUrl: INMET_URL, raw: { uf: row.uf, basin: row.basin },
      }))
  }
}
