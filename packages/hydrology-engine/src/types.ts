import type { HydrologyFreshness, HydrologyGovernmentIngestDiagnostic, HydrologyIberaCoverageStatus, HydrologyIberaRunStatus, HydrologyIberaSourceResult, HydrologyQuality, HydrologySource, HydrologyTargetZone } from '@repo/zod-schemas'

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

export interface IberaIngestRunPage { items: IberaIngestRunRecord[]; nextCursor: string | null }

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

export const IBERA_GEOMETRY_STATUS = { VERIFIED: 'verified', UNVERIFIED: 'unverified', UNAVAILABLE: 'unavailable' } as const
export type IberaGeometryStatus = (typeof IBERA_GEOMETRY_STATUS)[keyof typeof IBERA_GEOMETRY_STATUS]

export interface IberaRegistryAssociation {
  municipalityId: string
  source: HydrologySource
  officialIdentifier: string | null
  stationId: string | null
  coverageKey: string | null
  sourceUrl: string | null
  freshnessPolicy: string | null
  registryVersion: string | null
  reviewStatus: 'reviewed' | 'pending' | 'blocked'
  reviewedAt: Date | null
  geometryStatus: IberaGeometryStatus
}

export interface IberaEvidenceQuery {
  municipalityId: string
  from: Date | null
  to: Date | null
  limit: number
  cursor: Date | null
}

export interface IberaEvidenceEvent {
  id: string
  kind: 'telemetry' | 'official_alert'
  occurredAt: string
  source: HydrologySource
  sourceUrl: string | null
  evidenceState: 'observed' | 'forecast' | 'degraded' | 'missing'
  title: string
  detail: string
}

export interface IberaEvidenceTimeline {
  events: IberaEvidenceEvent[]
  nextCursor: string | null
  currentStatus: HydrologyIberaCoverageStatus
  lastKnownEvidence: string | null
}

export function isReviewedIberaRegistryAssociation(value: IberaRegistryAssociation): boolean {
  return value.reviewStatus === 'reviewed'
    && Boolean(value.municipalityId && value.officialIdentifier && value.sourceUrl && value.freshnessPolicy && value.registryVersion && value.reviewedAt)
    && Boolean(value.stationId || value.coverageKey)
}

export function getIberaCoverageStatus(states: Array<{ status: HydrologyIberaCoverageStatus }>): HydrologyIberaCoverageStatus {
  if (states.length === 0) return 'unavailable'
  const unique = new Set(states.map((item) => item.status))
  if (unique.size === 1) return states[0]!.status
  if (unique.has('failed')) return 'failed'
  if (unique.has('blocked')) return 'blocked'
  if (unique.has('stale')) return 'stale'
  return 'partial'
}

export function summarizeObservedTendency(series: Array<{ value: number | null }>): 'rising' | 'falling' | 'stable' | null {
  const values = series.map((item) => item.value).filter((value): value is number => value !== null && Number.isFinite(value))
  if (values.length < 2) return null
  const first = values[0]!
  const last = values.at(-1)!
  if (last > first) return 'rising'
  if (last < first) return 'falling'
  return 'stable'
}
