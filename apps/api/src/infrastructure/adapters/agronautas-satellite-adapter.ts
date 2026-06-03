import type { SatelliteSummary } from '../../domain/entities/agronautas'

export interface SatelliteAdapterResult {
  observedAt: Date
  ndvi?: number
  evi?: number
  waterStressIndex?: number
  confidence?: number
  provenance?: string[]
}

export interface SatelliteAdapter {
  readonly provider: string
  fetch(fieldId: string): Promise<SatelliteAdapterResult>
}

export function toSatelliteSummary(provider: string, result: SatelliteAdapterResult, reference = new Date()): SatelliteSummary {
  return {
    provider,
    observedAt: result.observedAt,
    freshnessHours: Math.max(0, Number(((reference.getTime() - result.observedAt.getTime()) / 3_600_000).toFixed(2))),
    confidence: Number((result.confidence ?? 0.75).toFixed(3)),
    provenance: result.provenance ?? [`adapter:${provider}:satellite`],
    ndvi: result.ndvi,
    evi: result.evi,
    waterStressIndex: result.waterStressIndex,
  }
}
