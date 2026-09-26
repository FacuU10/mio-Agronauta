import { z } from 'zod'
import { agronautasEvidenceV2Schema, agronautasReadinessV2Schema } from '@repo/zod-schemas'
import type { AgronautasEvidenceV2, AgronautasReadinessV2 } from '@repo/zod-schemas'
import { dashboardSnapshotSchema, type DashboardSnapshot } from './schemas'

const MODE_LABEL = {
  live: 'Live',
  seam: 'Seam',
  mock: 'Mock',
  unavailable: 'Fallback',
} as const

const SOURCE_LABEL = {
  weather: 'Clima',
  hydric_soil: 'Suelo',
  satellite_vegetation: 'Satélite',
  alert: 'Alertas',
  fire: 'Fuego',
  hydrology: 'Hidrología',
} as const

const EVIDENCE_SOURCE_DEFINITIONS = {
  CLIMATE: { key: 'climate', label: 'Clima', signalTypes: ['climate'] },
  WEATHER: { key: 'weather', label: 'Tiempo', signalTypes: ['weather'] },
  SMN_ALERT: { key: 'smn-alert', label: 'Alertas SMN', signalTypes: ['weather_alert', 'smn_alert', 'alert'] },
  SATELLITE: { key: 'satellite', label: 'Satélite', signalTypes: ['satellite', 'satellite_vegetation'] },
} as const

const EVIDENCE_UI_STATUS = {
  FRESH: 'fresh',
  STALE: 'stale',
  DEGRADED: 'degraded',
  MISSING: 'missing',
  UNAVAILABLE: 'unavailable',
  EMPTY: 'empty',
} as const

type EvidenceUiStatus = (typeof EVIDENCE_UI_STATUS)[keyof typeof EVIDENCE_UI_STATUS]
export type EvidenceSourceKey = (typeof EVIDENCE_SOURCE_DEFINITIONS)[keyof typeof EVIDENCE_SOURCE_DEFINITIONS]['key'] | string

export interface EvidenceSourceRecord {
  key: EvidenceSourceKey
  label: string
  provider: string
  signalType: string
  providerMode: 'live' | 'seam' | 'mock' | 'unavailable'
  status: EvidenceUiStatus
  observedAt: string | null
  acquiredAt: string | null
  forecastAt: string | null
  retrievedAt: string | null
  confidence: number | null
  sourceUrl: string | null
  sourceKey: string | null
  runId: string | null
  requestId: string | null
  lastSuccessfulObservedAt: string | null
  freshnessPolicy: string | null
  degradationReasons: string[]
  retryable: boolean
  valueAvailable: boolean
  nextAction: string
}

const ingestionRecordSchema = z.object({
  provider: z.string().min(1),
  signalType: z.string().min(1),
  state: z.enum(['queued', 'running', 'succeeded', 'failed', 'maintenance', 'unavailable', 'retrying']),
  runId: z.string().min(1).nullable().optional(),
  retrievedAt: z.string().datetime().nullable().optional(),
  nextDueAt: z.string().datetime().nullable().optional(),
  retryable: z.boolean(),
  reason: z.string().min(1).nullable().optional(),
}).strict()

export type EvidenceIngestionRecord = z.infer<typeof ingestionRecordSchema>

export interface EvidenceReadinessRecord {
  source: string
  productSlice: string
  state: AgronautasReadinessV2['state']
  evaluatedAt: string
  evidenceRefs: string[]
  runIds: string[]
  retryable: boolean
  reason: string | null
}

export interface EvidenceDashboardModel {
  dashboard: DashboardSnapshot
  sources: EvidenceSourceRecord[]
  readiness: EvidenceReadinessRecord[]
  ingestion: EvidenceIngestionRecord[]
  overallState: 'available' | 'empty'
}

export interface IngestionAdminRow {
  provider: string
  signalType: string
  modeLabel: string
  nextRunLabel: string
  currentState: 'Running' | 'Idle' | 'Failed' | 'Stale'
  triggerEnabled: boolean
  triggerLabel: string
  reason: string
}

export interface SourceFreshnessCard {
  sourceLabel: string
  freshnessLabel: 'fresh' | 'stale' | 'unavailable'
  lastSuccessLabel: string
  nextDueLabel: string
  slaLabel: string
}

export interface OperationalAlertIndicator {
  label: string
  stateLabel: string
  safetyLabel: string
}

export function normalizeEvidenceDashboard(payload: unknown): EvidenceDashboardModel {
  const dashboard = dashboardSnapshotSchema.parse(payload)
  const record = asRecord(payload)
  const canonicalEvidence = parseOptionalArray(record?.['evidence'], agronautasEvidenceV2Schema)
  const readiness = parseOptionalArray(record?.['readiness'], agronautasReadinessV2Schema).map(toReadinessRecord)
  const ingestion = parseOptionalArray(record?.['ingestion'], ingestionRecordSchema)
  const hasEvidence = dashboard.provenance.length > 0 || dashboard.signals.length > 0 || canonicalEvidence.length > 0
  const signalConfidence = new Map<string, number | null>(dashboard.signals.map((signal) => [signal.signalType, signal.confidence]))
  const legacySources = dashboard.provenance.map((evidence) => toLegacySource(evidence, signalConfidence.get(evidence.signalType) ?? null))
  const canonicalSources = canonicalEvidence.map((evidence) => toCanonicalSource(evidence, signalConfidence.get(evidence.signalType) ?? null))
  const availableSources = canonicalSources.length ? canonicalSources : legacySources
  const requiredSources = Object.values(EVIDENCE_SOURCE_DEFINITIONS).map((definition) => {
    const match = availableSources.find((source) => definition.signalTypes.some((signalType) => signalType === source.signalType))
    return match ?? createMissingSource(definition, dashboard.field.fieldId, hasEvidence)
  })
  const extraSources = availableSources.filter((source) => !requiredSources.some((required) => required.runId === source.runId && required.signalType === source.signalType))

  return {
    dashboard,
    sources: [...requiredSources, ...extraSources],
    readiness,
    ingestion,
    overallState: hasEvidence ? 'available' : 'empty',
  }
}

function toCanonicalSource(evidence: AgronautasEvidenceV2, confidence: number | null): EvidenceSourceRecord {
  return {
    key: sourceKeyForSignal(evidence.signalType),
    label: sourceLabelForSignal(evidence.signalType),
    provider: evidence.provider,
    signalType: evidence.signalType,
    providerMode: evidence.providerMode,
    status: evidence.status,
    observedAt: evidence.observedAt,
    acquiredAt: evidence.acquiredAt,
    forecastAt: evidence.forecastAt,
    retrievedAt: evidence.retrievedAt,
    confidence,
    sourceUrl: evidence.sourceUrl,
    sourceKey: evidence.sourceKey ?? null,
    runId: evidence.runId,
    requestId: evidence.requestId,
    lastSuccessfulObservedAt: evidence.lastSuccessfulObservedAt ?? null,
    freshnessPolicy: evidence.freshnessPolicy,
    degradationReasons: evidence.degradationReasons,
    retryable: evidence.retryable,
    valueAvailable: evidence.value !== undefined,
    nextAction: nextActionForStatus(evidence.status, evidence.retryable),
  }
}

function toLegacySource(evidence: DashboardSnapshot['provenance'][number], confidence: number | null): EvidenceSourceRecord {
  return {
    key: sourceKeyForSignal(evidence.signalType),
    label: sourceLabelForSignal(evidence.signalType),
    provider: evidence.provider,
    signalType: evidence.signalType,
    providerMode: evidence.providerMode,
    status: evidence.freshness,
    observedAt: evidence.observedAt,
    acquiredAt: evidence.acquiredAt ?? null,
    forecastAt: null,
    retrievedAt: evidence.ingestedAt,
    confidence: evidence.confidence ?? confidence,
    sourceUrl: evidence.sourceUrl,
    sourceKey: evidence.provider,
    runId: evidence.sourceRunId ?? evidence.evidenceId,
    requestId: null,
    lastSuccessfulObservedAt: evidence.lastSuccessfulObservedAt ?? null,
    freshnessPolicy: null,
    degradationReasons: evidence.degradationReasons,
    retryable: Boolean(evidence.failureReason) || evidence.freshness !== 'fresh',
    valueAvailable: evidence.freshness !== 'missing' && evidence.providerMode !== 'unavailable',
    nextAction: nextActionForStatus(evidence.freshness, Boolean(evidence.failureReason) || evidence.freshness !== 'fresh'),
  }
}

function createMissingSource(definition: (typeof EVIDENCE_SOURCE_DEFINITIONS)[keyof typeof EVIDENCE_SOURCE_DEFINITIONS], fieldId: string, hasEvidence: boolean): EvidenceSourceRecord {
  const status: EvidenceUiStatus = hasEvidence ? EVIDENCE_UI_STATUS.UNAVAILABLE : EVIDENCE_UI_STATUS.EMPTY
  return {
    key: definition.key,
    label: definition.label,
    provider: 'not-returned',
    signalType: definition.signalTypes[0],
    providerMode: 'unavailable',
    status,
    observedAt: null,
    acquiredAt: null,
    forecastAt: null,
    retrievedAt: null,
    confidence: null,
    sourceUrl: null,
    sourceKey: `field:${fieldId}:${definition.key}`,
    runId: null,
    requestId: null,
    lastSuccessfulObservedAt: null,
    freshnessPolicy: null,
    degradationReasons: [hasEvidence ? 'source_not_returned' : 'no_evidence_records'],
    retryable: true,
    valueAvailable: false,
    nextAction: 'No se recibió un registro verificable; reintentá la sincronización.',
  }
}

function toReadinessRecord(readiness: AgronautasReadinessV2): EvidenceReadinessRecord {
  return {
    source: readiness.source,
    productSlice: readiness.productSlice,
    state: readiness.state,
    evaluatedAt: readiness.evaluatedAt,
    evidenceRefs: readiness.evidenceRefs,
    runIds: readiness.runIds,
    retryable: readiness.retryable,
    reason: readiness.reason ?? null,
  }
}

function parseOptionalArray<T>(value: unknown, schema: z.ZodType<T>): T[] {
  if (value === undefined) return []
  return z.array(schema).parse(value)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function sourceKeyForSignal(signalType: string): string {
  const definition = Object.values(EVIDENCE_SOURCE_DEFINITIONS).find((candidate) => candidate.signalTypes.some((candidateSignalType) => candidateSignalType === signalType))
  return definition?.key ?? signalType
}

function sourceLabelForSignal(signalType: string): string {
  const definition = Object.values(EVIDENCE_SOURCE_DEFINITIONS).find((candidate) => candidate.signalTypes.some((candidateSignalType) => candidateSignalType === signalType))
  return definition?.label ?? SOURCE_LABEL[signalType as keyof typeof SOURCE_LABEL] ?? signalType
}

function nextActionForStatus(status: EvidenceUiStatus | AgronautasEvidenceV2['status'], retryable: boolean): string {
  if (status === 'fresh') return 'Sin acción inmediata; revisar la próxima actualización.'
  if (status === 'stale') return retryable ? 'Reintentá para confirmar una observación vigente.' : 'Usá el último dato con la limitación visible.'
  if (status === 'degraded') return retryable ? 'Reintentá la fuente y conservá el último dato conocido.' : 'La fuente sigue degradada; no la trates como actual.'
  if (status === 'missing' || status === 'empty') return 'No hay un registro verificable; no se completa con un placeholder.'
  return retryable ? 'La fuente no está disponible; reintentá cuando exista el servicio.' : 'La fuente no está disponible y no es reintentable.'
}

export function buildIngestionAdminRows(dashboard: DashboardSnapshot): IngestionAdminRow[] {
  return dashboard.provenance.map((evidence) => {
    const due = dashboard.scheduler.nextDueBySource.find((item) => item.provider === evidence.provider && item.signalType === evidence.signalType)
    const failed = dashboard.scheduler.failures.some((failure) => failure.provider === evidence.provider && failure.signalType === evidence.signalType)
    const stale = evidence.freshness === 'stale' || due?.overdue === true
    const safeToTrigger = evidence.providerMode === 'live' && !failed && !stale && dashboard.scheduler.lockStatus === 'available'

    return {
      provider: evidence.provider,
      signalType: evidence.signalType,
      modeLabel: MODE_LABEL[evidence.providerMode],
      nextRunLabel: formatNextRun(due?.dueAt ?? evidence.nextDueAt ?? dashboard.scheduler.nextRunAt),
      currentState: dashboard.scheduler.lockStatus === 'locked' ? 'Running' : failed || evidence.freshness === 'missing' ? 'Failed' : stale ? 'Stale' : 'Idle',
      triggerEnabled: safeToTrigger,
      triggerLabel: safeToTrigger ? 'Trigger seguro disponible' : 'Trigger seguro deshabilitado',
      reason: evidence.failureReason ?? due?.cadence.rateLimit ?? 'Sin fallas reportadas',
    }
  })
}

export function buildSourceFreshnessCards(dashboard: DashboardSnapshot): SourceFreshnessCard[] {
  return dashboard.signals.map((signal) => {
    const evidence = dashboard.provenance.find((item) => item.signalType === signal.signalType)
    const due = evidence ? dashboard.scheduler.nextDueBySource.find((item) => item.provider === evidence.provider && item.signalType === signal.signalType) : undefined
    return {
      sourceLabel: SOURCE_LABEL[signal.signalType] ?? signal.signalType,
      freshnessLabel: signal.status === 'fresh' ? 'fresh' : signal.status === 'stale' || signal.status === 'degraded' ? 'stale' : 'unavailable',
      lastSuccessLabel: formatNextRun(evidence?.lastSuccessfulObservedAt ?? null),
      nextDueLabel: formatNextRun(due?.dueAt ?? evidence?.nextDueAt ?? null),
      slaLabel: due?.cadence.freshnessSla ? `SLA ${due.cadence.freshnessSla}` : 'SLA no verificado',
    }
  })
}

export function deriveSafeOperationalAlerts(dashboard: DashboardSnapshot): OperationalAlertIndicator[] {
  const hasFlood = dashboard.risk.drivers.some((driver) => driver.key.includes('rainfall') && driver.value >= 0.75) || dashboard.alerts.length > 0
  const hasHeat = dashboard.risk.drivers.some((driver) => driver.key.includes('heat') && driver.value >= 0.7)
  const canTrustProduction = dashboard.freshness === 'fresh' && dashboard.presentation.sourcesUnavailable === false

  return [
    { label: 'Anegamiento', stateLabel: hasFlood ? 'riesgo detectado' : 'sin señal crítica', safetyLabel: canTrustProduction ? 'producción segura' : 'alerta no producción · revisar evidencia' },
    { label: 'Estrés térmico', stateLabel: hasHeat ? 'riesgo detectado' : 'sin señal crítica', safetyLabel: canTrustProduction ? 'producción segura' : 'alerta no producción · revisar evidencia' },
    { label: 'Heladas', stateLabel: 'monitoreo sin señal crítica', safetyLabel: canTrustProduction ? 'producción segura' : 'alerta no producción · revisar evidencia' },
  ]
}

export function formatNextRun(value: string | null | undefined): string {
  if (!value) return 'Sin corrida programada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date)
}
