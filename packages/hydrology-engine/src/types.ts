import type { HydrologyFreshness, HydrologyGovernmentIngestDiagnostic, HydrologyIberaRunStatus, HydrologyIberaSourceResult, HydrologyQuality, HydrologySource, HydrologyTargetZone } from '@repo/zod-schemas'

export type HydrologyMetric = 'river_height_m' | 'rain_mm' | 'storm_alert'
export type ForecastConfidence = 'normal' | 'speculative'

export interface NormalizedHydrologyTelemetry {
  source: HydrologySource
  stationId: string
  providerAlertId?: string
  coverageKey?: string
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

/**
 * Brazil is an explicit future extension point only. No Brazilian stations,
 * municipalities, or influence coefficients are production data until they
 * are backed by verifiable official identifiers and a documented BR→Corrientes
 * hydrological relationship.
 */
export const HYDROLOGY_BRAZIL_EXTENSION = {
  countryCode: 'BR',
  stationIds: [] as const,
  municipalityIds: [] as const,
  upstreamInfluence: { fromCountryCode: 'BR', toProvinceCode: 'AR-W', relation: 'requires_official_source_and_verified_model' },
} as const

export interface IngestionRunInput {
  source: HydrologySource
  proofRunId?: string
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
  iberaRunId?: string
  diagnostics?: HydrologyGovernmentIngestDiagnostic
}

export interface IberaIngestRunInput {
  id: string
  proofRunId: string
  status: HydrologyIberaRunStatus
  requestedSources: HydrologySource[]
  sourceResults: HydrologyIberaSourceResult[]
  diagnostics: Record<string, unknown>
  scheduledSlot?: string
  leaseOwner?: string
  leaseExpiresAt?: Date
  reason?: string
  startedAt: Date
  finishedAt?: Date
  expiresAt: Date
}

export interface IberaIngestRunRecord extends IberaIngestRunInput {
  createdAt?: Date
  updatedAt?: Date
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
