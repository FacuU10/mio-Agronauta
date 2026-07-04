import type { NormalizedHydrologyTelemetry } from '../types.js'

const SMN_URL = 'https://www.smn.gob.ar/alertas'
const relevantProvinces = new Set(['Misiones', 'Corrientes'])

interface SmnPayload { rainfall: Array<{ stationId: string; province: string; observedAt: string; rainMm: number }>; alerts?: Array<{ regionId: string; province: string; observedAt: string; severity: number; title: string }> }

export class SmnAdapter {
  parse(payload: string | SmnPayload, ingestedAt = new Date()): NormalizedHydrologyTelemetry[] {
    const data = typeof payload === 'string' ? JSON.parse(payload) as SmnPayload : payload
    const rainfall = data.rainfall.filter((row) => relevantProvinces.has(row.province)).map((row) => ({
      source: 'SMN' as const, stationId: row.stationId, observedAt: new Date(row.observedAt), ingestedAt, lastSuccessfulObservedAt: new Date(row.observedAt), value: row.rainMm,
      unit: 'mm', metric: 'rain_mm' as const, quality: 'ok' as const, freshness: 'fresh' as const, sourceUrl: SMN_URL, raw: { province: row.province },
    }))
    const alerts = (data.alerts ?? []).filter((row) => relevantProvinces.has(row.province)).map((row) => ({
      source: 'SMN' as const, stationId: row.regionId, observedAt: new Date(row.observedAt), ingestedAt, lastSuccessfulObservedAt: new Date(row.observedAt), value: row.severity,
      unit: 'severity', metric: 'storm_alert' as const, quality: 'ok' as const, freshness: 'fresh' as const, sourceUrl: SMN_URL, raw: { province: row.province, title: row.title },
    }))
    return [...rainfall, ...alerts]
  }
}
