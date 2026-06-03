import { z } from 'zod'

export const AGRONAUTAS_CONTRACT_VERSION = '1.0.0' as const

export const agronautasGrowthStages = ['emergence', 'tillering', 'panicle_initiation', 'flowering', 'maturity'] as const
export const degradationReasons = [
  'weather_data_unavailable',
  'weather_data_stale',
  'satellite_data_unavailable',
  'satellite_data_stale',
  'boundary_source_pending_verification',
  'locality_unverified',
  'manual_context_missing',
] as const
export const agronautasAlertTypes = ['flood', 'water_stress', 'thermal_stress'] as const
export const agronautasRiskLevels = ['low', 'medium', 'high'] as const
export const agronautasContractErrorCodes = [
  'INVALID_CONTRACT',
  'OUT_OF_SUPPORTED_AREA',
  'UNSUPPORTED_CROP',
  'MISSING_CONTEXT',
  'STALE_SNAPSHOT',
] as const

export const corrientesRiceZoneBoundarySource = {
  sourceName: 'IDERA / IGN / Gobierno de Corrientes (placeholder de normalización)',
  sourceUrl: 'https://www.idera.gob.ar/',
  sourceVersion: 'pending-ingest',
  normalizationStatus: 'placeholder-pending-ingest',
  notes: 'Placeholder oficial hasta incorporar el boundary normalizado y versionado en Slice 2.',
} as const

const contractVersionSchema = z.literal(AGRONAUTAS_CONTRACT_VERSION)
const degradationReasonSchema = z.enum(degradationReasons)
const growthStageSchema = z.enum(agronautasGrowthStages)

export const fieldIntakeSchema = z.object({
  contractVersion: contractVersionSchema,
  fieldId: z.string().min(1).max(80),
  crop: z.literal('rice'),
  hectares: z.number().positive(),
  locality: z.string().min(1).max(120),
  growthStage: growthStageSchema.optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    polygonWkt: z.string().min(1).optional(),
  }),
})

export const riskDriverSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  weight: z.number().min(0).max(1),
  value: z.number(),
})

export const riskSnapshotSchema = z.object({
  contractVersion: contractVersionSchema,
  snapshotId: z.string().min(1).max(80),
  fieldId: z.string().min(1).max(80),
  score: z.number().min(0).max(100),
  level: z.enum(agronautasRiskLevels),
  confidence: z.number().min(0).max(1),
  computedAt: z.string().datetime(),
  validUntil: z.string().datetime(),
  ruleVersion: z.string().min(1).max(40),
  degradationReasons: z.array(degradationReasonSchema).default([]),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  drivers: z.array(riskDriverSchema).min(1),
})

export const alertSnapshotSchema = z.object({
  contractVersion: contractVersionSchema,
  alertId: z.string().min(1).max(80),
  fieldId: z.string().min(1).max(80),
  basedOnSnapshotId: z.string().min(1).max(80),
  type: z.enum(agronautasAlertTypes),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  confidence: z.number().min(0).max(1),
  freshness: z.enum(['fresh', 'stale', 'degraded']),
  degradationReasons: z.array(degradationReasonSchema).default([]),
})

export const copilotSnapshotReferenceSchema = z.object({
  snapshotId: z.string().min(1).max(80),
  score: z.number().min(0).max(100),
  level: z.enum(agronautasRiskLevels),
  confidence: z.number().min(0).max(1),
  freshness: z.enum(['fresh', 'stale', 'degraded']),
  computedAt: z.string().datetime(),
  validUntil: z.string().datetime(),
  ruleVersion: z.string().min(1).max(40),
  degradationReasons: z.array(degradationReasonSchema).default([]),
  evidenceRefs: z.array(z.string().min(1)).min(1),
})

export const copilotAlertReferenceSchema = z.object({
  alertId: z.string().min(1).max(80),
  basedOnSnapshotId: z.string().min(1).max(80),
  type: z.enum(agronautasAlertTypes),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  confidence: z.number().min(0).max(1),
  freshness: z.enum(['fresh', 'stale', 'degraded']),
  degradationReasons: z.array(degradationReasonSchema).default([]),
})

export const copilotContextSchema = z.object({
  contractVersion: contractVersionSchema,
  fieldId: z.string().min(1).max(80),
  crop: z.literal('rice'),
  growthStage: growthStageSchema.optional(),
  requestedWindow: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
  latestSnapshotId: z.string().min(1).max(80).optional(),
  alertIds: z.array(z.string().min(1)).default([]),
  degradationReasons: z.array(degradationReasonSchema).default([]),
  snapshot: copilotSnapshotReferenceSchema.optional(),
  alerts: z.array(copilotAlertReferenceSchema).default([]),
})

export const agronautasContractErrorSchema = z.object({
  contractVersion: contractVersionSchema,
  code: z.enum(agronautasContractErrorCodes),
  message: z.string().min(1).max(240),
  retryable: z.boolean().default(false),
  details: z.record(z.unknown()).optional(),
})

export const recomputeRequestResultSchema = z.object({
  status: z.enum(['enqueued', 'already_in_progress']),
  runId: z.string().min(1).optional(),
  mode: z.enum(['demo']).optional(),
})

export const riskTimelineResponseSchema = z.object({
  fieldId: z.string().min(1).max(80),
  items: z.array(riskSnapshotSchema),
})

export const weatherTimelineItemSchema = z.object({
  provider: z.string().min(1),
  observedAt: z.string().datetime(),
  freshnessHours: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  staleCause: z.string().min(1).nullable().optional(),
  temperatureC: z.number(),
  rainfallMm7d: z.number(),
  humidityPct: z.number(),
})

export const weatherTimelineResponseSchema = z.object({
  fieldId: z.string().min(1).max(80),
  items: z.array(weatherTimelineItemSchema),
})

export const monitoringStatusSchema = z.object({
  contractVersion: contractVersionSchema,
  fieldId: z.string().min(1).max(80),
  fieldStatus: z.enum(['ready', 'stale', 'missing_data']),
  riskStatus: z.enum(['fresh', 'degraded', 'stale', 'missing']),
  alertsStatus: z.enum(['fresh', 'degraded', 'stale', 'missing']),
  alertCount: z.number().int().nonnegative(),
  lastUpdatedAt: z.string().datetime().nullable(),
  validUntil: z.string().datetime().nullable(),
  degradationReasons: z.array(degradationReasonSchema).default([]),
})

export const groundedChatActionTypeSchema = z.enum([
  'GET_FIELD_OVERVIEW',
  'GET_RISK_SUMMARY',
  'GET_ALERTS',
  'COMPARE_FIELDS',
  'FINAL_RESPONSE',
])

export const groundedChatRequestSchema = z.object({
  contractVersion: contractVersionSchema,
  message: z.string().min(1).max(800),
  comparisonFieldId: z.string().min(1).max(80).optional(),
})

export const groundedChatActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('GET_FIELD_OVERVIEW'),
    fieldId: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal('GET_RISK_SUMMARY'),
    fieldId: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal('GET_ALERTS'),
    fieldId: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal('COMPARE_FIELDS'),
    fieldId: z.string().min(1).max(80),
    comparisonFieldId: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal('FINAL_RESPONSE'),
    fieldId: z.string().min(1).max(80),
  }),
])

export const groundedChatFactSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(400),
})

export const groundedChatTraceSchema = z.object({
  action: groundedChatActionTypeSchema,
  status: z.enum(['selected', 'executed', 'fallback']),
})

export const groundedChatResponseSchema = z.object({
  contractVersion: contractVersionSchema,
  fieldId: z.string().min(1).max(80),
  answer: z.string().min(1).max(2000),
  executedAction: groundedChatActionTypeSchema,
  comparisonFieldId: z.string().min(1).max(80).optional(),
  supportingFacts: z.array(groundedChatFactSchema).max(8).default([]),
  citations: z.array(z.string().min(1).max(200)).max(8).default([]),
  trace: z.array(groundedChatTraceSchema).min(1).max(6),
  degraded: z.boolean().default(false),
  unavailableReason: z.string().min(1).max(240).optional(),
})

export type FieldIntake = z.infer<typeof fieldIntakeSchema>
export type RiskSnapshot = z.infer<typeof riskSnapshotSchema>
export type AlertSnapshot = z.infer<typeof alertSnapshotSchema>
export type CopilotContext = z.infer<typeof copilotContextSchema>
export type AgronautasContractError = z.infer<typeof agronautasContractErrorSchema>
export type RecomputeRequestResult = z.infer<typeof recomputeRequestResultSchema>
export type RiskTimelineResponse = z.infer<typeof riskTimelineResponseSchema>
export type WeatherTimelineItem = z.infer<typeof weatherTimelineItemSchema>
export type WeatherTimelineResponse = z.infer<typeof weatherTimelineResponseSchema>
export type MonitoringStatus = z.infer<typeof monitoringStatusSchema>
export type GroundedChatRequest = z.infer<typeof groundedChatRequestSchema>
export type GroundedChatAction = z.infer<typeof groundedChatActionSchema>
export type GroundedChatResponse = z.infer<typeof groundedChatResponseSchema>
