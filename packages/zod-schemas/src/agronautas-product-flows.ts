import { z } from 'zod'

export const AGRONAUTAS_PRODUCT_FLOWS_CONTRACT_VERSION = 'agronautas-product-flows-v2' as const
export const AGRONAUTAS_LOCATION_V2_CONTRACT_VERSION = 'agronautas-location-v2' as const
export const AGRONAUTAS_EVIDENCE_V2_CONTRACT_VERSION = 'agronautas-evidence-v2' as const
export const AGRONAUTAS_READINESS_V2_CONTRACT_VERSION = 'agronautas-readiness-v2' as const
export const AGRONAUTAS_MANAGEMENT_V2_CONTRACT_VERSION = 'agronautas-management-v2' as const

export const AGRONAUTAS_MANAGEMENT_KIND = {
  SEASON: 'season',
  CAMPAIGN: 'campaign',
  OPERATION: 'operation',
  TASK: 'task',
} as const

export type AgronautasManagementKind = (typeof AGRONAUTAS_MANAGEMENT_KIND)[keyof typeof AGRONAUTAS_MANAGEMENT_KIND]

export const AGRONAUTAS_MANAGEMENT_STATUS = {
  PLANNED: 'planned',
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export type AgronautasManagementStatus = (typeof AGRONAUTAS_MANAGEMENT_STATUS)[keyof typeof AGRONAUTAS_MANAGEMENT_STATUS]

export const AGRONAUTAS_LOCATION_GEOMETRY_TYPE = {
  POINT: 'point',
  POLYGON: 'polygon',
} as const

export type AgronautasLocationGeometryType = (typeof AGRONAUTAS_LOCATION_GEOMETRY_TYPE)[keyof typeof AGRONAUTAS_LOCATION_GEOMETRY_TYPE]

export const AGRONAUTAS_LOCATION_COVERAGE_STATUS = {
  SUPPORTED: 'supported',
  PARTIAL: 'partial',
  UNAVAILABLE: 'unavailable',
  UNVERIFIED: 'unverified',
} as const

export type AgronautasLocationCoverageStatus = (typeof AGRONAUTAS_LOCATION_COVERAGE_STATUS)[keyof typeof AGRONAUTAS_LOCATION_COVERAGE_STATUS]

export const AGRONAUTAS_LOCATION_SELECTION_SOURCE = {
  OPERATOR: 'operator',
  CONFIGURED_PROVIDER: 'configured-provider',
  LOCALITY_FALLBACK: 'locality-fallback',
  REVIEWED_POLYGON: 'reviewed-polygon',
} as const

export type AgronautasLocationSelectionSource = (typeof AGRONAUTAS_LOCATION_SELECTION_SOURCE)[keyof typeof AGRONAUTAS_LOCATION_SELECTION_SOURCE]

export const AGRONAUTAS_EVIDENCE_PROVIDER_MODE = {
  LIVE: 'live',
  SEAM: 'seam',
  MOCK: 'mock',
  UNAVAILABLE: 'unavailable',
} as const

export type AgronautasEvidenceProviderMode = (typeof AGRONAUTAS_EVIDENCE_PROVIDER_MODE)[keyof typeof AGRONAUTAS_EVIDENCE_PROVIDER_MODE]

export const AGRONAUTAS_EVIDENCE_STATUS = {
  FRESH: 'fresh',
  STALE: 'stale',
  DEGRADED: 'degraded',
  MISSING: 'missing',
  UNAVAILABLE: 'unavailable',
} as const

export type AgronautasEvidenceStatus = (typeof AGRONAUTAS_EVIDENCE_STATUS)[keyof typeof AGRONAUTAS_EVIDENCE_STATUS]

export const AGRONAUTAS_READINESS_STATE = {
  READY: 'ready',
  DEGRADED: 'degraded',
  STALE: 'stale',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
  UNVERIFIED: 'unverified',
} as const

export type AgronautasReadinessState = (typeof AGRONAUTAS_READINESS_STATE)[keyof typeof AGRONAUTAS_READINESS_STATE]

export const AGRONAUTAS_LOCATION_RESOLUTION_STATUS = {
  ACCEPTED: 'accepted',
  UNAUTHORIZED: 'unauthorized',
  INVALID: 'invalid',
  UNAVAILABLE: 'unavailable',
} as const

export type AgronautasLocationResolutionStatus = (typeof AGRONAUTAS_LOCATION_RESOLUTION_STATUS)[keyof typeof AGRONAUTAS_LOCATION_RESOLUTION_STATUS]

export const AGRONAUTAS_BOUNDARY_ACTION = {
  LOCATION_READ: 'location_read',
  EVIDENCE_READ: 'evidence_read',
  READINESS_READ: 'readiness_read',
  COPILOT_READ: 'copilot_read',
} as const

export type AgronautasBoundaryAction = (typeof AGRONAUTAS_BOUNDARY_ACTION)[keyof typeof AGRONAUTAS_BOUNDARY_ACTION]

export const AGRONAUTAS_FORBIDDEN_FINANCIAL_ACTION = {
  PAYMENT: 'payment',
  PAYOUT: 'payout',
  CHECKOUT: 'checkout',
  MONEY_OUT: 'money_out',
  SETTLEMENT: 'settlement',
  ESCROW: 'escrow',
  CUSTODY: 'custody',
  FINANCIAL_GUARANTEE: 'financial_guarantee',
} as const

const isoDateTimeSchema = z.string().datetime()
const identifierSchema = z.string().trim().min(1).max(160)
const fieldIdentifierSchema = z.string().trim().min(1).max(160)
const workspaceIdentifierSchema = z.string().trim().min(1).max(160)

const scopeSchema = z.object({
  actorId: identifierSchema,
  sessionId: identifierSchema,
  workspaceId: workspaceIdentifierSchema,
  fieldId: fieldIdentifierSchema,
  scopes: z.array(z.enum(['read', 'write', 'recompute', 'admin'])).min(1).optional(),
}).strict()

export const agronautasProductScopeSchema = scopeSchema
export type AgronautasProductScope = z.infer<typeof agronautasProductScopeSchema>

const pointCoordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).strict()

const polygonCoordinatesSchema = z.array(
  z.array(z.array(z.number().finite()).length(2)).min(4),
).min(1)

export const agronautasLocationGeometrySchema = z.object({
  type: z.enum([AGRONAUTAS_LOCATION_GEOMETRY_TYPE.POINT, AGRONAUTAS_LOCATION_GEOMETRY_TYPE.POLYGON]),
  coordinates: z.union([pointCoordinatesSchema, polygonCoordinatesSchema]),
}).strict().superRefine((geometry, ctx) => {
  const isPoint = geometry.type === AGRONAUTAS_LOCATION_GEOMETRY_TYPE.POINT
  const isPointCoordinates = 'latitude' in geometry.coordinates
  if (isPoint !== isPointCoordinates) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'geometry type must match its coordinate representation', path: ['coordinates'] })
  }
})

const geometrySchema = agronautasLocationGeometrySchema

const coverageSchema = z.object({
  status: z.enum([
    AGRONAUTAS_LOCATION_COVERAGE_STATUS.SUPPORTED,
    AGRONAUTAS_LOCATION_COVERAGE_STATUS.PARTIAL,
    AGRONAUTAS_LOCATION_COVERAGE_STATUS.UNAVAILABLE,
    AGRONAUTAS_LOCATION_COVERAGE_STATUS.UNVERIFIED,
  ]),
  evidenceRef: identifierSchema.optional(),
  reason: z.string().trim().min(1).max(300).optional(),
}).strict().superRefine((coverage, ctx) => {
  if (coverage.status === AGRONAUTAS_LOCATION_COVERAGE_STATUS.SUPPORTED && !coverage.evidenceRef) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'supported coverage requires a coverage evidence reference', path: ['evidenceRef'] })
  }
  if (coverage.status !== AGRONAUTAS_LOCATION_COVERAGE_STATUS.SUPPORTED && !coverage.reason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'non-supported coverage requires a reason', path: ['reason'] })
  }
})

const selectionLineageSchema = z.object({
  selectionId: identifierSchema,
  selectedAt: isoDateTimeSchema,
  source: z.enum([
    AGRONAUTAS_LOCATION_SELECTION_SOURCE.OPERATOR,
    AGRONAUTAS_LOCATION_SELECTION_SOURCE.CONFIGURED_PROVIDER,
    AGRONAUTAS_LOCATION_SELECTION_SOURCE.LOCALITY_FALLBACK,
    AGRONAUTAS_LOCATION_SELECTION_SOURCE.REVIEWED_POLYGON,
  ]),
  provider: identifierSchema.optional(),
  sourceReference: identifierSchema.optional(),
}).strict()

export const agronautasCanonicalLocationSchema = z.object({
  contractVersion: z.literal(AGRONAUTAS_LOCATION_V2_CONTRACT_VERSION),
  locationId: identifierSchema,
  workspaceId: workspaceIdentifierSchema,
  fieldId: fieldIdentifierSchema,
  actorScope: scopeSchema,
  geometry: geometrySchema,
  coverage: coverageSchema,
  selectionLineage: selectionLineageSchema,
}).strict().superRefine((location, ctx) => {
  if (location.actorScope.workspaceId !== location.workspaceId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'location workspace and actor scope workspace must match', path: ['actorScope', 'workspaceId'] })
  }
  if (location.actorScope.fieldId !== location.fieldId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'location field and actor scope field must match', path: ['actorScope', 'fieldId'] })
  }
})

export type AgronautasCanonicalLocation = z.infer<typeof agronautasCanonicalLocationSchema>

export const agronautasLocationSelectionRequestSchema = z.object({
  contractVersion: z.literal(AGRONAUTAS_PRODUCT_FLOWS_CONTRACT_VERSION),
  workspaceId: workspaceIdentifierSchema,
  fieldId: fieldIdentifierSchema,
  geometry: agronautasLocationGeometrySchema,
  selection: z.object({
    source: z.enum([
      AGRONAUTAS_LOCATION_SELECTION_SOURCE.OPERATOR,
      AGRONAUTAS_LOCATION_SELECTION_SOURCE.CONFIGURED_PROVIDER,
      AGRONAUTAS_LOCATION_SELECTION_SOURCE.LOCALITY_FALLBACK,
      AGRONAUTAS_LOCATION_SELECTION_SOURCE.REVIEWED_POLYGON,
    ]),
    provider: identifierSchema.optional(),
    sourceReference: identifierSchema.optional(),
  }).strict(),
}).strict().superRefine((selection, ctx) => {
  if (selection.selection.source === AGRONAUTAS_LOCATION_SELECTION_SOURCE.CONFIGURED_PROVIDER && (!selection.selection.provider || !selection.selection.sourceReference)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'configured provider selections require provider metadata and a source reference', path: ['selection'] })
  }
  if (selection.selection.source === AGRONAUTAS_LOCATION_SELECTION_SOURCE.LOCALITY_FALLBACK && selection.geometry.type !== AGRONAUTAS_LOCATION_GEOMETRY_TYPE.POINT) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'locality fallback selections are point-only', path: ['geometry', 'type'] })
  }
  if (selection.selection.source === AGRONAUTAS_LOCATION_SELECTION_SOURCE.REVIEWED_POLYGON && selection.geometry.type !== AGRONAUTAS_LOCATION_GEOMETRY_TYPE.POLYGON) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'reviewed polygon selections require polygon geometry', path: ['geometry', 'type'] })
  }
})

export type AgronautasLocationSelectionRequest = z.infer<typeof agronautasLocationSelectionRequestSchema>

export const agronautasLocationResolutionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal(AGRONAUTAS_LOCATION_RESOLUTION_STATUS.ACCEPTED), location: agronautasCanonicalLocationSchema }).strict(),
  z.object({ status: z.literal(AGRONAUTAS_LOCATION_RESOLUTION_STATUS.UNAUTHORIZED), reason: z.string().trim().min(1).max(300) }).strict(),
  z.object({ status: z.literal(AGRONAUTAS_LOCATION_RESOLUTION_STATUS.INVALID), reason: z.string().trim().min(1).max(300) }).strict(),
  z.object({ status: z.literal(AGRONAUTAS_LOCATION_RESOLUTION_STATUS.UNAVAILABLE), reason: z.string().trim().min(1).max(300), retryable: z.boolean() }).strict(),
])

export type AgronautasLocationResolution = z.infer<typeof agronautasLocationResolutionSchema>

const evidenceSourceSchema = z.object({
  sourceUrl: z.string().url().nullable(),
  sourceKey: identifierSchema.optional(),
}).strict().superRefine((source, ctx) => {
  if (source.sourceUrl === null && !source.sourceKey) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'evidence requires a source URL or stable source key', path: ['sourceKey'] })
  }
})

export const agronautasEvidenceV2Schema = z.object({
  contractVersion: z.literal(AGRONAUTAS_EVIDENCE_V2_CONTRACT_VERSION),
  evidenceId: identifierSchema,
  locationId: identifierSchema,
  workspaceId: workspaceIdentifierSchema,
  fieldId: fieldIdentifierSchema,
  provider: identifierSchema,
  signalType: identifierSchema,
  providerMode: z.enum([
    AGRONAUTAS_EVIDENCE_PROVIDER_MODE.LIVE,
    AGRONAUTAS_EVIDENCE_PROVIDER_MODE.SEAM,
    AGRONAUTAS_EVIDENCE_PROVIDER_MODE.MOCK,
    AGRONAUTAS_EVIDENCE_PROVIDER_MODE.UNAVAILABLE,
  ]),
  status: z.enum([
    AGRONAUTAS_EVIDENCE_STATUS.FRESH,
    AGRONAUTAS_EVIDENCE_STATUS.STALE,
    AGRONAUTAS_EVIDENCE_STATUS.DEGRADED,
    AGRONAUTAS_EVIDENCE_STATUS.MISSING,
    AGRONAUTAS_EVIDENCE_STATUS.UNAVAILABLE,
  ]),
  sourceUrl: z.string().url().nullable(),
  sourceKey: identifierSchema.optional(),
  observedAt: isoDateTimeSchema.nullable(),
  acquiredAt: isoDateTimeSchema.nullable(),
  forecastAt: isoDateTimeSchema.nullable(),
  retrievedAt: isoDateTimeSchema,
  units: z.record(z.string().trim().min(1).max(80)),
  schemaVersion: identifierSchema,
  httpStatus: z.number().int().min(100).max(599).nullable(),
  schemaStatus: z.enum(['valid', 'invalid', 'unavailable']),
  runId: identifierSchema,
  requestId: identifierSchema,
  rawHash: identifierSchema.nullable(),
  model: identifierSchema.optional(),
  forecastHorizonDays: z.number().int().nonnegative().max(366).optional(),
  freshnessPolicy: identifierSchema,
  lastSuccessfulObservedAt: isoDateTimeSchema.optional(),
  degradationReasons: z.array(z.string().trim().min(1).max(240)).max(8),
  retryable: z.boolean(),
  value: z.unknown().optional(),
}).strict().superRefine((evidence, ctx) => {
  const source = evidenceSourceSchema.safeParse({ sourceUrl: evidence.sourceUrl, sourceKey: evidence.sourceKey })
  if (!source.success) {
    for (const issue of source.error.issues) ctx.addIssue({ ...issue, path: ['sourceKey'] })
  }

  if (evidence.observedAt !== null && evidence.forecastAt !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'observed and forecast timestamps cannot be conflated', path: ['forecastAt'] })
  }

  if (evidence.status === AGRONAUTAS_EVIDENCE_STATUS.FRESH && evidence.observedAt === null && evidence.acquiredAt === null && evidence.forecastAt === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'fresh evidence requires observed, acquired, or forecast time', path: ['observedAt'] })
  }
  if (evidence.status === AGRONAUTAS_EVIDENCE_STATUS.FRESH && evidence.value === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'fresh evidence requires a provider value', path: ['value'] })
  }
  if (evidence.status === AGRONAUTAS_EVIDENCE_STATUS.STALE && !evidence.lastSuccessfulObservedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'stale evidence requires last-known successful observation time', path: ['lastSuccessfulObservedAt'] })
  }
  if (evidence.status === AGRONAUTAS_EVIDENCE_STATUS.UNAVAILABLE && evidence.value !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'unavailable evidence must not carry a provider value', path: ['value'] })
  }
  if (evidence.providerMode === AGRONAUTAS_EVIDENCE_PROVIDER_MODE.UNAVAILABLE && evidence.status === AGRONAUTAS_EVIDENCE_STATUS.FRESH) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'unavailable provider mode cannot be fresh', path: ['status'] })
  }
  if (evidence.status !== AGRONAUTAS_EVIDENCE_STATUS.FRESH && evidence.degradationReasons.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'non-fresh evidence requires a degradation reason', path: ['degradationReasons'] })
  }
})

export type AgronautasEvidenceV2 = z.infer<typeof agronautasEvidenceV2Schema>

export const agronautasReadinessV2Schema = z.object({
  contractVersion: z.literal(AGRONAUTAS_READINESS_V2_CONTRACT_VERSION),
  locationId: identifierSchema,
  workspaceId: workspaceIdentifierSchema,
  fieldId: fieldIdentifierSchema,
  productSlice: identifierSchema,
  source: identifierSchema,
  state: z.enum([
    AGRONAUTAS_READINESS_STATE.READY,
    AGRONAUTAS_READINESS_STATE.DEGRADED,
    AGRONAUTAS_READINESS_STATE.STALE,
    AGRONAUTAS_READINESS_STATE.BLOCKED,
    AGRONAUTAS_READINESS_STATE.UNAVAILABLE,
    AGRONAUTAS_READINESS_STATE.UNVERIFIED,
  ]),
  evaluatedAt: isoDateTimeSchema,
  evidenceRefs: z.array(identifierSchema).max(32),
  runIds: z.array(identifierSchema).max(32),
  lastSuccessfulObservedAt: isoDateTimeSchema.optional(),
  retryable: z.boolean(),
  reason: z.string().trim().min(1).max(300).optional(),
}).strict().superRefine((readiness, ctx) => {
  if (readiness.state === AGRONAUTAS_READINESS_STATE.READY && (readiness.evidenceRefs.length === 0 || readiness.runIds.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ready readiness requires evidence and run lineage', path: ['evidenceRefs'] })
  }
  if (readiness.state !== AGRONAUTAS_READINESS_STATE.READY && !readiness.reason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'non-ready readiness requires a reason', path: ['reason'] })
  }
  if (readiness.state === AGRONAUTAS_READINESS_STATE.STALE && !readiness.lastSuccessfulObservedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'stale readiness requires last-known successful observation time', path: ['lastSuccessfulObservedAt'] })
  }
})

export type AgronautasReadinessV2 = z.infer<typeof agronautasReadinessV2Schema>

const managementContractVersionSchema = z.literal(AGRONAUTAS_MANAGEMENT_V2_CONTRACT_VERSION)
const managementKindSchema = z.enum([
  AGRONAUTAS_MANAGEMENT_KIND.SEASON,
  AGRONAUTAS_MANAGEMENT_KIND.CAMPAIGN,
  AGRONAUTAS_MANAGEMENT_KIND.OPERATION,
  AGRONAUTAS_MANAGEMENT_KIND.TASK,
])
const managementStatusSchema = z.enum([
  AGRONAUTAS_MANAGEMENT_STATUS.PLANNED,
  AGRONAUTAS_MANAGEMENT_STATUS.ACTIVE,
  AGRONAUTAS_MANAGEMENT_STATUS.BLOCKED,
  AGRONAUTAS_MANAGEMENT_STATUS.COMPLETED,
  AGRONAUTAS_MANAGEMENT_STATUS.CANCELLED,
])
const managementIdentifierSchema = z.string().trim().min(1).max(160)
const managementCreateSchema = z.object({
  contractVersion: managementContractVersionSchema,
  workspaceId: managementIdentifierSchema,
  fieldId: managementIdentifierSchema.optional(),
  parentId: managementIdentifierSchema.optional(),
  name: z.string().trim().min(1).max(180),
  status: managementStatusSchema.default(AGRONAUTAS_MANAGEMENT_STATUS.PLANNED),
  responsibleActorId: managementIdentifierSchema.nullable().optional(),
  idempotencyKey: managementIdentifierSchema,
  sourceLocationIds: z.array(managementIdentifierSchema).max(32).default([]),
}).strict()

export const agronautasManagementCreateSeasonRequestSchema = managementCreateSchema.extend({ kind: z.literal(AGRONAUTAS_MANAGEMENT_KIND.SEASON) }).strict()
export const agronautasManagementCreateCampaignRequestSchema = managementCreateSchema.extend({ kind: z.literal(AGRONAUTAS_MANAGEMENT_KIND.CAMPAIGN) }).strict()
export const agronautasManagementCreateOperationRequestSchema = managementCreateSchema.extend({ kind: z.literal(AGRONAUTAS_MANAGEMENT_KIND.OPERATION), fieldId: managementIdentifierSchema }).strict()
export const agronautasManagementCreateTaskRequestSchema = managementCreateSchema.extend({ kind: z.literal(AGRONAUTAS_MANAGEMENT_KIND.TASK), fieldId: managementIdentifierSchema, parentId: managementIdentifierSchema.optional() }).strict()

export const agronautasManagementTransitionRequestSchema = z.object({
  contractVersion: managementContractVersionSchema,
  expectedRevision: z.number().int().positive(),
  status: managementStatusSchema,
  requestId: managementIdentifierSchema.optional(),
}).strict()

export const agronautasManagementItemSchema = z.object({
  id: managementIdentifierSchema,
  kind: managementKindSchema,
  workspaceId: managementIdentifierSchema,
  fieldId: managementIdentifierSchema.nullable(),
  parentId: managementIdentifierSchema.nullable(),
  name: z.string().min(1).max(180),
  status: managementStatusSchema,
  revision: z.number().int().positive(),
  responsibleActorId: managementIdentifierSchema.nullable(),
  createdByActorId: managementIdentifierSchema,
  idempotencyKey: managementIdentifierSchema,
  sourceLocationIds: z.array(managementIdentifierSchema).max(32),
  planningLabel: z.literal('assumption_only'),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}).strict()

export const agronautasManagementAuditItemSchema = z.object({
  auditId: managementIdentifierSchema,
  actorId: managementIdentifierSchema,
  action: z.enum(['create', 'transition', 'retry', 'assign']),
  targetId: managementIdentifierSchema,
  outcome: z.enum(['accepted', 'duplicate', 'conflict', 'forbidden', 'unavailable']),
  revisionBefore: z.number().int().positive().nullable(),
  revisionAfter: z.number().int().positive().nullable(),
  occurredAt: isoDateTimeSchema,
  requestId: managementIdentifierSchema,
}).strict()

export const agronautasManagementResponseSchema = z.object({
  contractVersion: managementContractVersionSchema,
  items: z.array(agronautasManagementItemSchema),
  audit: z.array(agronautasManagementAuditItemSchema),
}).strict()

export type AgronautasManagementItem = z.infer<typeof agronautasManagementItemSchema>
export type AgronautasManagementAuditItem = z.infer<typeof agronautasManagementAuditItemSchema>
export type AgronautasManagementCreateRequest = z.infer<typeof managementCreateSchema> & { kind: AgronautasManagementKind }
export type AgronautasManagementTransitionRequest = z.infer<typeof agronautasManagementTransitionRequestSchema>

export const agronautasBoundaryRequestSchema = z.object({
  contractVersion: z.literal(AGRONAUTAS_PRODUCT_FLOWS_CONTRACT_VERSION),
  action: z.enum([
    AGRONAUTAS_BOUNDARY_ACTION.LOCATION_READ,
    AGRONAUTAS_BOUNDARY_ACTION.EVIDENCE_READ,
    AGRONAUTAS_BOUNDARY_ACTION.READINESS_READ,
    AGRONAUTAS_BOUNDARY_ACTION.COPILOT_READ,
  ]),
  scope: scopeSchema,
  locationId: identifierSchema,
  workspaceId: workspaceIdentifierSchema,
  fieldId: fieldIdentifierSchema,
}).strict().superRefine((request, ctx) => {
  if (request.scope.workspaceId !== request.workspaceId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'request workspace and scope workspace must match', path: ['workspaceId'] })
  }
  if (request.scope.fieldId !== request.fieldId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'request field and scope field must match', path: ['fieldId'] })
  }
})

export type AgronautasBoundaryRequest = z.infer<typeof agronautasBoundaryRequestSchema>

const forbiddenFinancialActions = new Set<string>(Object.values(AGRONAUTAS_FORBIDDEN_FINANCIAL_ACTION))

export function isForbiddenFinancialAction(action: string): boolean {
  return forbiddenFinancialActions.has(action)
}

export function isScopeAuthorizedForLocation(scope: AgronautasProductScope, location: AgronautasCanonicalLocation): boolean {
  return scope.actorId === location.actorScope.actorId
    && scope.sessionId === location.actorScope.sessionId
    && scope.workspaceId === location.workspaceId
    && scope.fieldId === location.fieldId
}
