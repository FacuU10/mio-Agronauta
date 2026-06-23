import type { HydrologyFreshness, HydrologyQuality, HydrologySource, HydrologyTargetZone } from '@repo/zod-schemas'

export type HydrologyMetric = 'river_height_m' | 'rain_mm' | 'storm_alert'
export type ForecastConfidence = 'normal' | 'speculative'

export interface NormalizedHydrologyTelemetry {
  source: HydrologySource
  stationId: string
  observedAt: Date
  ingestedAt?: Date
  lastSuccessfulObservedAt: Date
  value: number | null
  unit: string
  metric: HydrologyMetric
  quality: HydrologyQuality
  freshness: HydrologyFreshness
  tendency?: string
  forecastHorizonDays?: number
  confidence?: ForecastConfidence
  sourceUrl?: string
  raw?: Record<string, unknown>
}

export interface IngestionRunInput {
  source: HydrologySource
  stationId?: string
  status: 'success' | 'partial' | 'failed' | 'excluded'
  startedAt: Date
  finishedAt?: Date
  observedFrom?: Date
  observedTo?: Date
  lastSuccessfulObservedAt?: Date
  recordsIngested: number
  excludedMetrics?: string[]
  errorMessage?: string
  provenanceUrl?: string
}

export interface FieldHydrologyMapping {
  fieldId: string
  zone: HydrologyTargetZone | null
  referencePorts: string[]
}

export const referencePortsByZone: Record<HydrologyTargetZone, string[]> = {
  Ituzaingó: ['ituzaingo'],
  Mercedes: ['paso_de_la_patria', 'corrientes'],
  Virasoro: ['santo_tome'],
}

export const isForecastWithinPhase1Horizon = (days?: number): boolean => days === undefined || days <= 30
export const forecastConfidenceForHorizon = (days?: number): ForecastConfidence | undefined => {
  if (days === undefined) return undefined
  return days > 14 ? 'speculative' : 'normal'
}
