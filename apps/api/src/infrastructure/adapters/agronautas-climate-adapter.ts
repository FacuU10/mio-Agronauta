import type { ClimateSummary } from '../../domain/entities/agronautas'
export { createClimateProvider } from './agronautas-signal-provider'
export type { ProviderPort, ProviderPortOptions, ProviderRequest, ProviderScope } from './agronautas-signal-provider'

export interface ClimateAdapterResult {
  observedAt: Date
  acquiredAt?: Date
  sourceRunId?: string
  temperatureC: number
  rainfallMm7d: number
  humidityPct?: number
  confidence?: number
  provenance?: string[]
}

export interface ClimateAdapter {
  readonly provider: string
  fetch(fieldId: string): Promise<ClimateAdapterResult>
}

export function toClimateSummary(provider: string, result: ClimateAdapterResult, reference = new Date()): ClimateSummary {
  return {
    provider,
    observedAt: result.observedAt,
    sourceRunId: result.sourceRunId,
    acquiredAt: result.acquiredAt,
    freshnessHours: Math.max(0, Number(((reference.getTime() - result.observedAt.getTime()) / 3_600_000).toFixed(2))),
    confidence: Number((result.confidence ?? 0.8).toFixed(3)),
    freshness: 'fresh',
    degradationReasons: [],
    provenance: result.provenance ?? [`adapter:${provider}:climate`],
    temperatureC: result.temperatureC,
    rainfallMm7d: result.rainfallMm7d,
    humidityPct: result.humidityPct,
  }
}
