import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type { EvidenceEnvelope } from '@repo/zod-schemas'
import { getPostgresPool } from '../database/postgres/pool'
import { getAgronautasRuntimeConfig } from './agronautas-runtime'
import type { AgronautasTelemetry } from '../observability/agronautas-telemetry'

export type ProviderMode = EvidenceEnvelope['providerMode']

const PROVIDER_BOUNDARY_STATUS = {
  LIVE: 'live',
  BLOCKED: 'blocked',
  NOT_RUN: 'not_run',
  UNAVAILABLE: 'unavailable',
} as const

export type ProviderBoundaryStatus = (typeof PROVIDER_BOUNDARY_STATUS)[keyof typeof PROVIDER_BOUNDARY_STATUS]

export interface ProviderEvidence extends EvidenceEnvelope {
  proofRef: string
  mode: ProviderMode
  boundaryStatus: ProviderBoundaryStatus
}

export interface ProviderEvidencePort {
  getEvidence(provider: string, signalType: string, fieldId?: string): Promise<ProviderEvidence>
}

export type ProviderEvidenceTelemetry = Pick<AgronautasTelemetry, 'onProviderEvidence'>

const PLACEHOLDERS = [
  'replace-with-secret-manager-reference',
  'your-secret-key-change-in-production',
  'replace-with-operator-token',
  'reader-token',
  'operator-token',
  'admin-token',
  'replace-me-if-required',
  'user:password',
]

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true
  const lower = value.toLowerCase().trim()
  return PLACEHOLDERS.some((placeholder) => lower.includes(placeholder.toLowerCase()))
}

export class RealProviderEvidencePort implements ProviderEvidencePort {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool(), private readonly telemetry?: ProviderEvidenceTelemetry) {}

  async getEvidence(provider: string, signalType: string, fieldId?: string): Promise<ProviderEvidence> {
    const runtimeConfig = getAgronautasRuntimeConfig()
    const retrievedAt = new Date().toISOString()
    const sourceUrl = sourceFor(provider)
    const envKey = `PROVIDER_MODE_${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
    const override = process.env[envKey] || process.env['PROVIDER_MODE_OVERRIDE']

    if (isProviderMode(override) && override !== 'live') {
      return this.record(createEvidence({ provider, signalType, sourceUrl, providerMode: override, retrievedAt, proofRef: `override-active-${override}`, failureReason: override === 'unavailable' ? 'weather_data_unavailable' : undefined }))
    }

    if (runtimeConfig.mode === 'demo') {
      return this.record(createEvidence({ provider, signalType, sourceUrl: `${sourceUrl}mock`, providerMode: 'mock', retrievedAt, proofRef: 'demo-mode-simulation' }))
    }

    const apiProof = hasProviderConfiguration(provider)
    let proofRef = 'no-db-proof'
    let observedAt: string | null = null
    let lastSuccessfulObservedAt: string | null = null
    let evidenceSourceUrl = sourceUrl
    let rawHash: string | null = null
    const degradationReasons: string[] = []
    let dbProof = false
    let schemaStatus: EvidenceEnvelope['schemaStatus'] = 'unavailable'
    let httpStatus: number | null = null

    try {
      const query = fieldId
        ? `SELECT status, observed_at, run_id, stale_cause, degradation_reason, evidence_payload
           FROM signal_ingestion_runs WHERE provider = $1 AND signal_type = $2 AND field_id = $3 ORDER BY started_at DESC LIMIT 1`
        : `SELECT status, observed_at, run_id, stale_cause, degradation_reason, evidence_payload
           FROM signal_ingestion_runs WHERE provider = $1 AND signal_type = $2 ORDER BY started_at DESC LIMIT 1`
      const params = fieldId ? [provider, signalType, fieldId] : [provider, signalType]
      const result = await this.pool.query(query, params)
      const row = result.rows[0] as Record<string, unknown> | undefined
      if (row) {
        const payload = isRecord(row['evidence_payload']) ? row['evidence_payload'] : {}
        proofRef = typeof row['run_id'] === 'string' ? `run-${row['run_id']}` : proofRef
        observedAt = toTimestamp(row['observed_at'])
        lastSuccessfulObservedAt = toTimestamp(payload['lastSuccessfulObservedAt'])
        evidenceSourceUrl = typeof payload['sourceUrl'] === 'string' ? payload['sourceUrl'] : typeof payload['provenance'] === 'string' ? payload['provenance'] : sourceUrl
        rawHash = typeof payload['rawHash'] === 'string' ? payload['rawHash'] : null
        httpStatus = typeof payload['httpStatus'] === 'number' ? payload['httpStatus'] : null
        schemaStatus = row['status'] === 'succeeded' ? 'valid' : 'invalid'
        if (row['status'] === 'succeeded' && !row['stale_cause'] && !row['degradation_reason']) dbProof = true
        if (typeof row['stale_cause'] === 'string') degradationReasons.push(row['stale_cause'])
        if (typeof row['degradation_reason'] === 'string') degradationReasons.push(row['degradation_reason'])
      }
    } catch {
      degradationReasons.push('database_error')
    }

    let providerMode: ProviderMode = 'unavailable'
    if (apiProof && dbProof) providerMode = 'live'
    else if (apiProof && !dbProof) providerMode = 'seam'
    else if (!apiProof && !dbProof && runtimeConfig.runtimeRequired === false) providerMode = 'seam'

    if (process.env['AGRONAUTAS_FORCE_MOCK_PROVIDERS'] === 'true') providerMode = 'mock'

    return this.record(createEvidence({
      provider,
      signalType,
      sourceUrl: evidenceSourceUrl,
      providerMode,
      observedAt,
      retrievedAt,
      lastSuccessfulObservedAt,
      rawHash,
      httpStatus,
      schemaStatus,
      proofRef,
      degradationReasons,
      parentRunId: proofRef.startsWith('run-') ? proofRef.slice(4) : null,
    }))
  }

  private record(evidence: ProviderEvidence): ProviderEvidence {
    this.telemetry?.onProviderEvidence(evidence)
    return evidence
  }
}

export function createRealProviderEvidencePort(
  telemetry?: ProviderEvidenceTelemetry,
  pool: Pick<Pool, 'query'> = getPostgresPool(),
): RealProviderEvidencePort {
  return new RealProviderEvidencePort(pool, telemetry)
}

function createEvidence(input: {
  provider: string
  signalType: string
  sourceUrl: string
  providerMode: ProviderMode
  retrievedAt: string
  proofRef: string
  observedAt?: string | null
  lastSuccessfulObservedAt?: string | null
  rawHash?: string | null
  httpStatus?: number | null
  schemaStatus?: EvidenceEnvelope['schemaStatus']
  failureReason?: string
  degradationReasons?: string[]
  parentRunId?: string | null
}): ProviderEvidence {
  const isUnavailable = input.providerMode === 'unavailable'
  const httpStatus = input.httpStatus ?? null
  const schemaStatus = input.schemaStatus ?? (isUnavailable ? 'unavailable' : 'valid')
  const degradationReasons = [...(input.degradationReasons ?? []), ...(input.failureReason ? [input.failureReason] : [])]
  const sourceUrl = sanitizeSourceUrl(input.sourceUrl)
  const boundaryStatus = providerBoundaryStatus(input.providerMode)
  const evidence: ProviderEvidence = {
    contractVersion: 'agronautas-evidence-v1',
    evidenceId: `${input.provider}:${input.signalType}:${randomUUID()}`,
    provider: input.provider,
    signalType: input.signalType,
    sourceUrl,
    providerMode: input.providerMode,
    mode: input.providerMode,
    observedAt: input.observedAt ?? null,
    forecastAt: null,
    retrievedAt: input.retrievedAt,
    timeStandard: input.provider === 'georef-2.1' ? 'retrieval-only' : 'UTC',
    forecastHorizonDays: null,
    model: null,
    units: unitsFor(input.provider),
    freshness: input.lastSuccessfulObservedAt && degradationReasons.length > 0 ? 'stale' : input.providerMode === 'live' ? 'fresh' : isUnavailable ? 'missing' : 'degraded',
    rawHash: input.rawHash ?? null,
    runId: input.parentRunId ?? `provider-status-${randomUUID()}`,
    requestId: randomUUID(),
    httpStatus,
    schemaStatus,
    http: { status: httpStatus, ok: httpStatus === 200 },
    schema: { status: schemaStatus },
    lineage: { sourceUrl, rawHash: input.rawHash ?? null, parentRunId: input.parentRunId ?? null },
    degradationReasons,
    ...(input.failureReason ? { failureReason: input.failureReason } : {}),
    lastSuccessfulObservedAt: input.lastSuccessfulObservedAt ?? null,
    latencyMs: 0,
    proofRef: input.proofRef,
    boundaryStatus,
  }
  Object.defineProperty(evidence, 'mode', { value: input.providerMode, enumerable: false })
  Object.defineProperty(evidence, 'proofRef', { value: input.proofRef, enumerable: false })
  Object.defineProperty(evidence, 'boundaryStatus', { value: boundaryStatus, enumerable: false })
  return evidence
}

function providerBoundaryStatus(providerMode: ProviderMode): ProviderBoundaryStatus {
  if (providerMode === 'live') return PROVIDER_BOUNDARY_STATUS.LIVE
  if (providerMode === 'mock') return PROVIDER_BOUNDARY_STATUS.NOT_RUN
  return providerMode === 'unavailable' ? PROVIDER_BOUNDARY_STATUS.UNAVAILABLE : PROVIDER_BOUNDARY_STATUS.BLOCKED
}

function sanitizeSourceUrl(value: string): string {
  try {
    const url = new URL(value)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return 'https://invalid.example.invalid/provider'
  }
}

function hasProviderConfiguration(provider: string): boolean {
  if (provider === 'nasa-firms' || provider === 'firms') return !isPlaceholder(process.env['FIRMS_API_KEY'] || process.env['NASA_FIRMS_API_KEY'])
  if (provider === 'sentinel-stac' || provider === 'sentinel-hub') return !isPlaceholder(process.env['SENTINEL_CLIENT_ID']) && !isPlaceholder(process.env['SENTINEL_CLIENT_SECRET'])
  return true
}

function sourceFor(provider: string): string {
  if (provider === 'georef-2.1' || provider === 'georef') return 'https://apis.datos.gob.ar/georef/api/localidades'
  if (provider === 'nasa-power-daily') return 'https://power.larc.nasa.gov/api/temporal/daily/point'
  if (provider === 'open-meteo') return 'https://api.open-meteo.com/v1/forecast'
  return `https://${provider}.example.com/`
}

function unitsFor(provider: string): Record<string, string> {
  if (provider === 'georef-2.1' || provider === 'georef') return { latitude: 'degrees', longitude: 'degrees', coordinateReferenceSystem: 'WGS84', code: 'code' }
  if (provider === 'nasa-power-daily') return { temperature: 'C', precipitation: 'mm/day' }
  if (provider === 'open-meteo') return { temperature: '°C', precipitation: 'mm' }
  return {}
}

function isProviderMode(value: string | undefined): value is ProviderMode {
  return value === 'live' || value === 'seam' || value === 'mock' || value === 'unavailable'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toTimestamp(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null
  return new Date(value).toISOString()
}
