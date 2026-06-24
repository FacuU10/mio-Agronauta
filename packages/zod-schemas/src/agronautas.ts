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
export const hydrologySources = ['PNA', 'INA', 'INMET', 'SMN'] as const
export const hydrologyFreshnessStates = ['fresh', 'stale', 'degraded'] as const
export const hydrologyQualityStates = ['ok', 'estimated', 'degraded', 'missing'] as const
export const hydrologyTargetZones = ['Mercedes', 'Ituzaingó', 'Virasoro'] as const
export const hydrologyMetrics = ['river_height_m', 'rain_mm', 'storm_alert'] as const
export const hydrologyForecastConfidence = ['normal', 'speculative'] as const
export const hydrologyExcludedSources = ['DMH_PARAGUAY'] as const
export const hydrologyExcludedInputs = [
  'itaipu_discharge',
  'yacyreta_discharge',
  'turbined_flow',
  'spilled_flow',
  'custom_hydraulic_model',
  'muskingum_cunge',
  'discharge_to_height_conversion',
] as const
export const agronautasContractErrorCodes = [
  'INVALID_CONTRACT',
  'OUT_OF_SUPPORTED_AREA',
  'UNSUPPORTED_CROP',
  'MISSING_CONTEXT',
  'STALE_SNAPSHOT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'WORKER_UNAVAILABLE',
] as const

const trimmedString = (max: number) => z.string().trim().min(1).max(max)
const optionalTrimmedString = (max: number) => z.string().trim().max(max).optional().transform((value) => value && value.length > 0 ? value : undefined)

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
const hydrologySourceSchema = z.enum(hydrologySources)
const hydrologyFreshnessSchema = z.enum(hydrologyFreshnessStates)
const hydrologyQualitySchema = z.enum(hydrologyQualityStates)
const hydrologyTargetZoneSchema = z.enum(hydrologyTargetZones)
const hydrologyMetricSchema = z.enum(hydrologyMetrics)
const hydrologyForecastConfidenceSchema = z.enum(hydrologyForecastConfidence)

export const hydrologyExcludedSourceSchema = z.enum(hydrologyExcludedSources)
export const hydrologyExcludedInputSchema = z.enum(hydrologyExcludedInputs)

export const hydrologyProviderPayloadGuardSchema = z.object({
  source: z.union([hydrologySourceSchema, hydrologyExcludedSourceSchema]),
  excludedInputs: z.array(hydrologyExcludedInputSchema).default([]),
}).superRefine((value, ctx) => {
  if (value.source === 'DMH_PARAGUAY') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'DMH Paraguay queda fuera de Fase 1; usar PNA/INA/INMET/SMN.',
      path: ['source'],
    })
  }

  if (value.excludedInputs.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fase 1 excluye descargas de Itaipú/Yacyretá y modelos hidráulicos propios.',
      path: ['excludedInputs'],
    })
  }
})

export const demoContactSubmissionSchema = z.object({
  contractVersion: contractVersionSchema,
  name: trimmedString(120),
  email: z.string().trim().email().max(160),
  phone: optionalTrimmedString(40),
  organization: optionalTrimmedString(120),
  role: optionalTrimmedString(120),
  hectaresRange: optionalTrimmedString(80),
  locality: optionalTrimmedString(120),
  message: optionalTrimmedString(1000),
  website: z.string().trim().max(120).optional().default(''),
})

export const demoContactSubmissionResponseSchema = z.object({
  contractVersion: contractVersionSchema,
  submissionId: z.string().min(1).max(80),
  status: z.literal('received'),
})

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

export const hydrologyStationReferenceSchema = z.object({
  stationId: z.string().min(1).max(80),
  source: hydrologySourceSchema,
  name: z.string().min(1).max(160),
  river: z.string().min(1).max(120).nullable().optional(),
  zone: hydrologyTargetZoneSchema.nullable(),
  sourceUrl: z.string().url().optional(),
})

export const hydrologyTelemetrySchema = z.object({
  source: hydrologySourceSchema,
  stationId: z.string().min(1).max(80),
  observedAt: z.string().datetime(),
  ingestedAt: z.string().datetime().optional(),
  lastSuccessfulObservedAt: z.string().datetime(),
  value: z.number().nullable(),
  unit: z.string().min(1).max(24),
  metric: hydrologyMetricSchema,
  quality: hydrologyQualitySchema,
  freshness: hydrologyFreshnessSchema,
  tendency: z.string().min(1).max(80).optional(),
  forecastHorizonDays: z.number().int().min(0).max(30).optional(),
  confidence: hydrologyForecastConfidenceSchema.optional(),
  sourceUrl: z.string().url().optional(),
}).superRefine((value, ctx) => {
  if (value.forecastHorizonDays === undefined) return

  const expectedConfidence = value.forecastHorizonDays > 14 ? 'speculative' : 'normal'
  if (value.confidence !== expectedConfidence) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: value.forecastHorizonDays > 14
        ? 'Los pronósticos de 15 a 30 días deben marcarse como planificación especulativa/baja confianza.'
        : 'Los pronósticos de hasta 14 días deben marcarse con confianza normal.',
      path: ['confidence'],
    })
  }
})

export const hydrologyRiskSnapshotSchema = z.object({
  riskLevel: z.enum(['low', 'moderate', 'high', 'unknown']),
  freshness: hydrologyFreshnessSchema,
  quality: hydrologyQualitySchema.optional(),
  recommendation: z.string().min(1).max(500),
  lastSuccessfulObservedAt: z.string().datetime().nullable(),
})

export const hydrologyDenseContextV1Schema = z.object({
  contractVersion: z.literal('hydrology-dense-context-v1'),
  fieldId: z.string().min(1).max(80),
  zone: hydrologyTargetZoneSchema.nullable(),
  sources: z.array(hydrologySourceSchema).default([]),
  stations: z.array(hydrologyStationReferenceSchema).default([]),
  snapshot: hydrologyRiskSnapshotSchema,
  telemetry: z.array(hydrologyTelemetrySchema).default([]),
}).superRefine((value, ctx) => {
  if (value.zone === null && (value.sources.length > 0 || value.stations.length > 0 || value.telemetry.length > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Los lotes fuera de Virasoro, Ituzaingó y Mercedes no deben incluir estaciones, fuentes ni telemetría en Fase 1.',
      path: ['zone'],
    })
  }
})

export const hydrologyGovernmentFreshnessSchema = z.object({
  source: hydrologySourceSchema,
  lastSuccessfulObservedAt: z.string().datetime().nullable(),
  freshness: hydrologyFreshnessSchema,
  label: z.string().min(1).max(120),
})

export const hydrologyGovernmentMunicipalitySchema = z.object({
  id: z.string().min(1).max(80),
  localityId: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  provinceCode: z.string().min(1).max(16),
  alertHeightM: z.number().optional(),
  evacuationHeightM: z.number().optional(),
  gaugeMappings: z.object({
    primaryPnaPortId: z.string().min(1).max(80).nullable(),
    secondaryPnaPortIds: z.array(z.string().min(1).max(80)).default([]),
    inaStationIds: z.array(z.string().min(1).max(80)).default([]),
    smnRegionIds: z.array(z.string().min(1).max(80)).default([]),
    inmetStationIds: z.array(z.string().min(1).max(80)).default([]),
  }),
  latestTelemetry: z.array(hydrologyTelemetrySchema).default([]),
})

export const hydrologyGovernmentProvinceAlertSchema = z.object({
  zone: z.string().min(1).max(160),
  source: hydrologySourceSchema,
  stationId: z.string().min(1).max(80),
  observedAt: z.string().datetime(),
  lastSuccessfulObservedAt: z.string().datetime(),
  message: z.string().min(1).max(300),
  sourceUrl: z.string().url().optional(),
})

export const hydrologyGovernmentMunicipalitiesResponseSchema = z.object({
  contractVersion: z.literal('hydrology-government-municipalities-v1'),
  province: z.object({ provinceCode: z.string().min(1).max(16), name: z.string().min(1).max(80) }),
  sourceFreshness: z.array(hydrologyGovernmentFreshnessSchema).default([]),
  provinceAlerts: z.array(hydrologyGovernmentProvinceAlertSchema).default([]),
  municipalities: z.array(hydrologyGovernmentMunicipalitySchema).default([]),
})

export const hydrologyGovernmentDashboardResponseSchema = z.object({
  contractVersion: z.literal('hydrology-government-dashboard-v1'),
  municipality: hydrologyGovernmentMunicipalitySchema.omit({ gaugeMappings: true, latestTelemetry: true }),
  gaugeMappings: hydrologyGovernmentMunicipalitySchema.shape.gaugeMappings,
  telemetryCards: z.array(hydrologyTelemetrySchema).default([]),
  inaPredictions30d: z.array(hydrologyTelemetrySchema.refine((value) => value.source === 'INA' && value.forecastHorizonDays !== undefined && value.forecastHorizonDays <= 30, 'Debe ser pronóstico INA hasta 30 días')).default([]),
  alerts: z.array(hydrologyTelemetrySchema.refine((value) => value.source === 'SMN' || value.source === 'INMET', 'Las alertas municipales provienen de SMN/INMET en Fase 1')).default([]),
  provenance: z.array(hydrologyGovernmentFreshnessSchema).default([]),
})

export const hydrologyGovernmentIngestRequestSchema = z.object({
  contractVersion: contractVersionSchema,
  source: hydrologySourceSchema.optional(),
  reason: z.string().trim().max(240).optional(),
})

export const hydrologyGovernmentIngestResponseSchema = z.object({
  contractVersion: z.literal('hydrology-government-ingest-v1'),
  runId: z.string().min(1).max(120),
  status: z.enum(['queued', 'started', 'completed']),
  sources: z.array(hydrologySourceSchema).min(1),
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
  message: z.string().trim().min(1).max(500),
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
export type HydrologySource = z.infer<typeof hydrologySourceSchema>
export type HydrologyFreshness = z.infer<typeof hydrologyFreshnessSchema>
export type HydrologyQuality = z.infer<typeof hydrologyQualitySchema>
export type HydrologyTargetZone = z.infer<typeof hydrologyTargetZoneSchema>
export type HydrologyStationReference = z.infer<typeof hydrologyStationReferenceSchema>
export type HydrologyTelemetry = z.infer<typeof hydrologyTelemetrySchema>
export type HydrologyRiskSnapshot = z.infer<typeof hydrologyRiskSnapshotSchema>
export type HydrologyDenseContextV1 = z.infer<typeof hydrologyDenseContextV1Schema>
export type HydrologyGovernmentMunicipalitiesResponse = z.infer<typeof hydrologyGovernmentMunicipalitiesResponseSchema>
export type HydrologyGovernmentDashboardResponse = z.infer<typeof hydrologyGovernmentDashboardResponseSchema>
export type HydrologyGovernmentIngestRequest = z.infer<typeof hydrologyGovernmentIngestRequestSchema>
export type HydrologyGovernmentIngestResponse = z.infer<typeof hydrologyGovernmentIngestResponseSchema>
export type MonitoringStatus = z.infer<typeof monitoringStatusSchema>
export type GroundedChatRequest = z.infer<typeof groundedChatRequestSchema>
export type GroundedChatAction = z.infer<typeof groundedChatActionSchema>
export type GroundedChatResponse = z.infer<typeof groundedChatResponseSchema>
export type DemoContactSubmission = z.infer<typeof demoContactSubmissionSchema>
export type DemoContactSubmissionResponse = z.infer<typeof demoContactSubmissionResponseSchema>
