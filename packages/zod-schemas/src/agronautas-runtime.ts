import { z } from 'zod'
import { riskSnapshotSchema, type RiskSnapshot } from './agronautas.js'

export const RUNTIME_STATE = {
  QUEUED: 'queued',
  LEASED: 'leased',
  RUNNING: 'running',
  WAITING: 'waiting',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  DLQ: 'dlq',
  CANCELLED: 'cancelled',
} as const

export type RuntimeState = (typeof RUNTIME_STATE)[keyof typeof RUNTIME_STATE]

export const RUNTIME_OPERATION = {
  RISK_RECOMPUTE: 'risk-recompute',
  SCHEDULED_WINDOW: 'scheduled-window',
} as const

export type RuntimeOperation = (typeof RUNTIME_OPERATION)[keyof typeof RUNTIME_OPERATION]

export const AVAILABILITY = {
  AVAILABLE: 'available',
  DEGRADED: 'degraded',
  UNAVAILABLE: 'unavailable',
} as const

export type Availability = (typeof AVAILABILITY)[keyof typeof AVAILABILITY]

export const FRESHNESS = {
  FRESH: 'fresh',
  DEGRADED: 'degraded',
  STALE: 'stale',
  MISSING: 'missing',
} as const

export type Freshness = (typeof FRESHNESS)[keyof typeof FRESHNESS]

export const RUNTIME_MODE = { REAL: 'real', DEMO: 'demo' } as const
export type RuntimeMode = (typeof RUNTIME_MODE)[keyof typeof RUNTIME_MODE]

export const RUNTIME_MAX_ATTEMPTS = 3 as const

export const PROVIDER_MODE = { LIVE: 'live', SEAM: 'seam', MOCK: 'mock', UNAVAILABLE: 'unavailable' } as const
export type ProviderMode = (typeof PROVIDER_MODE)[keyof typeof PROVIDER_MODE]

export const DEGRADATION_REASON = {
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  PROVIDER_TIMEOUT: 'provider_timeout',
  WORKER_UNAVAILABLE: 'worker_unavailable',
  COORDINATES_UNAVAILABLE: 'coordinates_unavailable',
  PROCESSOR_NOT_CONFIGURED: 'processor_not_configured',
  STALE_PROVIDER_DATA: 'stale_provider_data',
  INVALID_PROVIDER_PAYLOAD: 'invalid_provider_payload',
  DUPLICATE_RUN: 'duplicate_run',
  LEASE_EXPIRED: 'lease_expired',
  SCHEDULER_DISABLED: 'scheduler-disabled',
  CREDENTIAL_LICENSE_BLOCKED: 'credential/license-blocked',
  RETRYABLE_TRANSPORT: 'retryable-transport',
  EXHAUSTED_FAILURE: 'exhausted-failure',
  ENGINE_UNDECIDED: 'engine-undecided',
} as const

export type DegradationReason = (typeof DEGRADATION_REASON)[keyof typeof DEGRADATION_REASON]

const valuesOf = <T extends string>(value: Record<string, T>): [T, ...T[]] => Object.values(value) as [T, ...T[]]

const runtimeStateSchema = z.enum(valuesOf(RUNTIME_STATE))
const runtimeOperationSchema = z.enum(valuesOf(RUNTIME_OPERATION))
const availabilitySchema = z.enum(valuesOf(AVAILABILITY))
const freshnessSchema = z.enum(valuesOf(FRESHNESS))
const runtimeModeSchema = z.enum(valuesOf(RUNTIME_MODE))
const providerModeSchema = z.enum(valuesOf(PROVIDER_MODE))
const degradationReasonSchema = z.enum(valuesOf(DEGRADATION_REASON))

const traceContextSchema = z.object({
  traceId: z.string().trim().min(1).max(160),
  correlationId: z.string().trim().min(1).max(160),
  causationId: z.string().trim().min(1).max(160),
}).strict()

export const leaseMetadataSchema = z.object({
  attempt: z.number().int().min(1).max(RUNTIME_MAX_ATTEMPTS),
  maxAttempts: z.number().int().min(1).max(RUNTIME_MAX_ATTEMPTS),
  leaseExpiresAt: z.string().datetime().nullable(),
}).strict().refine((lease) => lease.attempt <= lease.maxAttempts, 'attempt cannot exceed maxAttempts')

export const providerLineageSchema = z.object({
  sourceRunIds: z.array(z.string().trim().min(1).max(160)).min(1),
  providerRunIds: z.array(z.string().trim().min(1).max(160)).min(1),
  retrievedAt: z.string().datetime(),
  observedAt: z.string().datetime().nullable(),
  forecastAt: z.string().datetime().nullable(),
  providerMode: providerModeSchema,
  units: z.record(z.string().trim().min(1).max(80)).refine((units) => Object.keys(units).length > 0, 'lineage units are required'),
  httpStatus: z.number().int().min(100).max(599).nullable(),
  schemaStatus: z.enum(['valid', 'invalid', 'unavailable']),
  lastSuccessfulObservedAt: z.string().datetime().nullable(),
}).strict().superRefine((lineage, ctx) => {
  if (lineage.observedAt !== null && lineage.forecastAt !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'forecastAt must not become observedAt', path: ['observedAt'] })
  }
})

export type ProviderLineage = z.infer<typeof providerLineageSchema>

export const engineDescriptorSchema = z.object({
  id: z.string().trim().min(1).max(100),
  version: z.string().trim().min(1).max(100),
  selectionStatus: z.literal('undecided'),
  calibrationStatus: z.literal('not_established'),
}).strict()

export type EngineDescriptor = z.infer<typeof engineDescriptorSchema>

export const riskPayloadSchema = z.object({
  score: z.number().finite().min(0).max(100),
  level: z.enum(['low', 'medium', 'high']),
  drivers: z.array(z.record(z.unknown())),
}).strict()

export const runtimeResultSchema = z.object({
  status: availabilitySchema,
  freshness: freshnessSchema,
  confidence: z.number().finite().min(0).max(1).optional(),
  uncertainty: z.literal('not_calibrated'),
  degradationReasons: z.array(degradationReasonSchema).max(8),
  lineage: providerLineageSchema,
  engine: engineDescriptorSchema.optional(),
  risk: riskPayloadSchema.optional(),
}).strict().superRefine((result, ctx) => {
  if (result['status'] === AVAILABILITY.UNAVAILABLE && result.risk) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'unavailable results must omit risk', path: ['risk'] })
  }

  if (result['status'] === AVAILABILITY.UNAVAILABLE && result.degradationReasons.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'unavailable results require a degradation reason', path: ['degradationReasons'] })
  }

  if ((result['status'] === AVAILABILITY.AVAILABLE || result['status'] === AVAILABILITY.DEGRADED) && (result.confidence === undefined || !result.engine || !result.risk)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'available and degraded results require confidence, engine, and risk' })
  }

  if (result['freshness'] === FRESHNESS.STALE && !result.lineage['lastSuccessfulObservedAt']) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'stale results require latest-good lineage', path: ['lineage', 'lastSuccessfulObservedAt'] })
  }
})

export type RuntimeResult = z.infer<typeof runtimeResultSchema>
export const riskRuntimeResultSchema = runtimeResultSchema
export type RiskRuntimeResult = RuntimeResult

const runtimeSourceWindowSchema = z.object({
  provider: z.string().trim().min(1).max(80),
  signalType: z.enum(['climate', 'weather', 'satellite', 'weather_alert', 'fire', 'soil']),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  runId: z.string().trim().min(1).max(160),
  locationId: z.string().trim().min(1).max(160).optional(),
  workspaceId: z.string().trim().min(1).max(160).optional(),
  fieldId: z.string().trim().min(1).max(160).optional(),
}).strict().superRefine((window, ctx) => {
  if (new Date(window.windowEnd).getTime() <= new Date(window.windowStart).getTime()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'windowEnd must be after windowStart', path: ['windowEnd'] })
  }
  const scopeCount = [window.locationId, window.workspaceId, window.fieldId].filter(Boolean).length
  if (scopeCount !== 0 && scopeCount !== 3) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'source window scope must include location, workspace, and field', path: ['locationId'] })
})

export const runtimeJobEnvelopeSchema = z.object({
  contractVersion: z.literal('2.0.0'),
  jobId: z.string().trim().min(1).max(160),
  runId: z.string().trim().min(1).max(160),
  operation: runtimeOperationSchema,
  fieldId: z.string().trim().min(1).max(160).nullable(),
  requestedAt: z.string().datetime(),
  trace: traceContextSchema,
  runtime: z.object({ mode: runtimeModeSchema }).strict(),
  state: runtimeStateSchema,
  lease: leaseMetadataSchema,
  sourceWindow: runtimeSourceWindowSchema.optional(),
  result: runtimeResultSchema.optional(),
}).strict().superRefine((job, ctx) => {
  if (job.operation === RUNTIME_OPERATION.SCHEDULED_WINDOW && !job.sourceWindow) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'scheduled-window envelopes require sourceWindow', path: ['sourceWindow'] })
  }
  if (job.operation === RUNTIME_OPERATION.RISK_RECOMPUTE && job.sourceWindow) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'risk-recompute envelopes must not contain sourceWindow', path: ['sourceWindow'] })
  }
  if (job.sourceWindow && job.sourceWindow.runId !== job.runId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'sourceWindow runId must match envelope runId', path: ['sourceWindow', 'runId'] })
  }
})

export type RuntimeJobEnvelope = z.infer<typeof runtimeJobEnvelopeSchema>

export const LEGACY_READ_SOURCE = {
  WORKFLOW_JOB_V1: 'workflow-job.v1',
  RISK_SNAPSHOT_V1: 'risk-snapshot.v1',
} as const

export type LegacyReadSource = (typeof LEGACY_READ_SOURCE)[keyof typeof LEGACY_READ_SOURCE]
export const ENGINE_SELECTION_STATUS = { UNDECIDED: 'undecided' } as const
type EngineSelectionStatus = (typeof ENGINE_SELECTION_STATUS)[keyof typeof ENGINE_SELECTION_STATUS]

const legacyWorkflowJobV1Schema = z.object({
  contractVersion: z.literal('1.0.0'),
  jobId: z.string().min(1),
  workflowId: z.string().min(1),
  runId: z.string().min(1),
  kind: z.string().min(1),
  status: z.string().min(1),
  priority: z.number().int(),
  createdAt: z.string().datetime(),
  trace: z.record(z.unknown()),
  payload: z.unknown(),
  lease: z.record(z.unknown()),
}).passthrough()

export type LegacyWorkflowJobV1 = z.infer<typeof legacyWorkflowJobV1Schema>

export interface LegacyWorkflowJobRead {
  source: LegacyReadSource
  job: LegacyWorkflowJobV1
  selectionStatus: EngineSelectionStatus
}

export interface LegacyRiskSnapshotRead {
  source: LegacyReadSource
  snapshot: RiskSnapshot
  engine: EngineDescriptor
}

export function adaptLegacyWorkflowJob(value: unknown): LegacyWorkflowJobRead {
  return {
    source: LEGACY_READ_SOURCE.WORKFLOW_JOB_V1,
    job: legacyWorkflowJobV1Schema.parse(value),
    selectionStatus: 'undecided',
  }
}

export function adaptLegacyRiskSnapshot(value: unknown): LegacyRiskSnapshotRead {
  const snapshot = riskSnapshotSchema.parse(value)
  const id = snapshot.engineId ?? snapshot.ruleVersion
  const version = snapshot.engineVersion ?? snapshot.ruleVersion
  return {
    source: LEGACY_READ_SOURCE.RISK_SNAPSHOT_V1,
    snapshot,
    engine: {
      id,
      version,
      selectionStatus: 'undecided',
      calibrationStatus: 'not_established',
    },
  }
}

const LEGAL_TRANSITIONS: Readonly<Record<RuntimeState, readonly RuntimeState[]>> = {
  queued: ['leased'],
  leased: ['running'],
  running: ['succeeded', 'failed', 'waiting', 'dlq', 'cancelled'],
  waiting: ['leased'],
  succeeded: [],
  failed: [],
  dlq: [],
  cancelled: [],
}

export function isLegalRuntimeTransition(from: unknown, to: unknown): boolean {
  if (!isRuntimeState(from) || !isRuntimeState(to)) return false
  return LEGAL_TRANSITIONS[from].includes(to)
}

export function isRuntimeState(value: unknown): value is RuntimeState {
  return typeof value === 'string' && (Object.values(RUNTIME_STATE) as readonly string[]).includes(value)
}

export interface LeaseReclaimCandidate {
  state: unknown
  leaseExpiresAt: string
  now: string
}

export function isLeaseReclaimable(candidate: LeaseReclaimCandidate): boolean {
  if (candidate.state !== RUNTIME_STATE.LEASED) return false
  const expiresAt = Date.parse(candidate.leaseExpiresAt)
  const now = Date.parse(candidate.now)
  return Number.isFinite(expiresAt) && Number.isFinite(now) && expiresAt <= now
}

export function isIdempotentDuplicate(existing: Pick<RuntimeJobEnvelope, 'jobId' | 'runId'>, incoming: Pick<RuntimeJobEnvelope, 'jobId' | 'runId'>): boolean {
  return existing.jobId === incoming.jobId && existing.runId === incoming.runId
}

export function isUnavailableWithoutRisk(value: unknown): boolean {
  if (!isRecord(value) || value['status'] !== AVAILABILITY.UNAVAILABLE) return false
  const reasons = value['degradationReasons']
  return !('risk' in value)
    && !('score' in value)
    && !('level' in value)
    && !('drivers' in value)
    && !('recommendations' in value)
    && Array.isArray(reasons)
    && reasons.length > 0
    && reasons.length <= 8
    && reasons.every(isTypedDegradationReason)
}

export function isAvailabilityTruthful(value: unknown): boolean {
  if (!isRecord(value) || typeof value['status'] !== 'string') return false
  if (value['status'] === AVAILABILITY.UNAVAILABLE) return isUnavailableWithoutRisk(value)
  return (value['status'] === AVAILABILITY.AVAILABLE || value['status'] === AVAILABILITY.DEGRADED) && 'risk' in value && 'engine' in value
}

export function isForecastLineageSafe(value: unknown): boolean {
  if (!isRecord(value)) return false
  const observedAt = value['observedAt']
  const forecastAt = value['forecastAt']
  const validObservedAt = observedAt === null || observedAt === undefined || typeof observedAt === 'string'
  const validForecastAt = forecastAt === null || forecastAt === undefined || typeof forecastAt === 'string'
  return validObservedAt && validForecastAt && !(typeof observedAt === 'string' && typeof forecastAt === 'string')
}

export function isTypedDegradationReason(value: unknown): value is DegradationReason {
  return typeof value === 'string' && (Object.values(DEGRADATION_REASON) as readonly string[]).includes(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
