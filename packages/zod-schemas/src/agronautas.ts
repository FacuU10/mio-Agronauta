import { z } from 'zod'

export const AGRONAUTAS_CONTRACT_VERSION = '1.0.0' as const

export const agronautasGrowthStages = ['emergence', 'tillering', 'panicle_initiation', 'flowering', 'maturity'] as const
export const agronautasCropCategories = ['cereal', 'oilseed', 'horticulture', 'forage', 'fruit', 'other'] as const
export const agronautasSupportedCrops = ['rice', 'maize', 'soybean', 'wheat', 'sunflower', 'pasture', 'citrus', 'other'] as const
export const agronautasSupportedProvinceCodes = ['AR-W'] as const
export const agronautasCountryCodes = ['AR'] as const
export const agronautasSignalTypes = ['weather', 'alert', 'satellite_vegetation', 'fire', 'hydric_soil', 'hydrology'] as const
export const agronautasSignalStatuses = ['fresh', 'stale', 'degraded', 'missing'] as const
export const agronautasFieldGeometryStatuses = ['saved', 'point_only', 'unavailable'] as const
export const agronautasFieldGeometrySources = ['operator', 'google', 'fallback'] as const
export const agronautasProviderModes = ['live', 'seam', 'mock', 'unavailable'] as const
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
export const hydrologyGovernmentIngestFailureKinds = ['timeout', 'network_failure', 'http_status', 'unexpected_content_type', 'parse_failure', 'empty_response', 'runner_timeout', 'startup_failure', 'response_too_large'] as const
export const hydrologyGovernmentSourceRunStatuses = ['success', 'empty', 'failed'] as const
export const hydrologyOperatorReceiptScopes = ['local', 'production'] as const
export const hydrologyOperatorReceiptChatModes = ['groq', 'degraded-fallback', 'not_run'] as const
export const hydrologyOperatorReceiptRunnerModes = ['direct', 'proxy'] as const
export const hydrologyExcludedSources = ['DMH_PARAGUAY'] as const
export const hydrologyIberaRunStatuses = ['queued', 'started', 'completed', 'partial', 'failed'] as const
export const hydrologyIberaCitationKinds = ['observed', 'forecast', 'alert'] as const
export const hydrologyIberaCitationModes = ['validated-context', 'context-only', 'none'] as const
export const hydrologyIberaCoverageStatus = ['supported', 'partial', 'unavailable', 'stale', 'failed', 'blocked', 'unverified'] as const
export const hydrologyIberaGeometryStatuses = ['verified', 'unverified', 'unavailable'] as const
export const hydrologyIberaRegistryReviewStatuses = ['reviewed', 'pending', 'blocked'] as const
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
export const agronautasWorkspaceStatuses = ['active'] as const
export const agronautasActivitySourceTypes = ['field', 'risk_snapshot', 'alert_snapshot', 'ingestion_run', 'recompute_run'] as const
export const agronautasIntelligenceStates = ['available', 'unavailable', 'insufficient_evidence'] as const
export const agronautasIntelligenceContractVersion = 'agronautas-intelligence-v1' as const
export const agronautasRiskSelectionStatuses = ['undecided'] as const
export const agronautasPlanningAvailabilityStates = ['available', 'unavailable', 'insufficient_evidence'] as const
export const agronautasPlanningDomains = ['soil', 'prices', 'fx', 'external_economics'] as const
export const agronautasPlanningContextContractVersion = 'agronautas-campaign-planning-context-v1' as const
export const agronautasAssumptionSimulationContractVersion = 'agronautas-assumption-simulation-v1' as const

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
const cropCategorySchema = z.enum(agronautasCropCategories)
const supportedCropSchema = z.enum(agronautasSupportedCrops)
const supportedProvinceCodeSchema = z.enum(agronautasSupportedProvinceCodes)
const countryCodeSchema = z.enum(agronautasCountryCodes)
const signalTypeSchema = z.enum(agronautasSignalTypes)
const signalStatusSchema = z.enum(agronautasSignalStatuses)
const providerModeSchema = z.enum(agronautasProviderModes)
const hydrologySourceSchema = z.enum(hydrologySources)
const hydrologyFreshnessSchema = z.enum(hydrologyFreshnessStates)
const hydrologyQualitySchema = z.enum(hydrologyQualityStates)
const hydrologyTargetZoneSchema = z.enum(hydrologyTargetZones)
const hydrologyMetricSchema = z.enum(hydrologyMetrics)
const hydrologyGovernmentSourceRunStatusSchema = z.enum(hydrologyGovernmentSourceRunStatuses)
const hydrologyForecastConfidenceSchema = z.enum(hydrologyForecastConfidence)
export const hydrologyIberaCoverageStatusSchema = z.enum(hydrologyIberaCoverageStatus)
export const hydrologyIberaGeometryStatusSchema = z.enum(hydrologyIberaGeometryStatuses)
const hydrologyIberaRegistryReviewStatusSchema = z.enum(hydrologyIberaRegistryReviewStatuses)
const hydrologyGovernmentIngestFailureKindSchema = z.enum(hydrologyGovernmentIngestFailureKinds)

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

const geoPointSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
})

const polygonWktSchema = z.string().trim().min(1).max(100_000).refine((value) => /^POLYGON\s*\(\(/i.test(value), 'Only POLYGON WKT is supported')

const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number().finite()).length(2)).min(4)).length(1),
})

const evidenceStateSchema = z.enum(['observed', 'forecast', 'degraded', 'missing', 'point_only', 'unavailable'])
const cursorSchema = z.string().trim().min(1).max(240).nullable()

export const fieldIntakeSchema = z.object({
  contractVersion: contractVersionSchema,
  fieldId: z.string().min(1).max(80),
  cropCategory: z.string().min(1).max(80).default('other'),
  crop: z.string().min(1).max(80),
  hectares: z.number().positive(),
  locality: z.string().min(1).max(120),
  provinceCode: z.string().min(1).max(16).default('AR-W'),
  countryCode: z.string().min(1).max(2).default('AR'),
  growthStage: growthStageSchema.optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    polygonWkt: polygonWktSchema.optional(),
    geoJson: geoJsonPolygonSchema.optional(),
  }).refine((location) => !(location.polygonWkt && location.geoJson), 'Provide exactly one polygon representation'),
}).superRefine((value, ctx) => {
  if (!countryCodeSchema.safeParse(value.countryCode).success || !supportedProvinceCodeSchema.safeParse(value.provinceCode).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'OUT_OF_SUPPORTED_AREA', path: ['provinceCode'] })
  }

  if (!cropCategorySchema.safeParse(value.cropCategory).success || !supportedCropSchema.safeParse(value.crop).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'UNSUPPORTED_CROP', path: ['crop'] })
  }
})

export const signalEvidenceSchema = z.object({
  evidenceId: z.string().min(1).max(120),
  provider: z.string().min(1).max(80),
  signalType: signalTypeSchema,
  sourceRunId: z.string().min(1).max(120).optional(),
  observedAt: z.string().datetime(),
  acquiredAt: z.string().datetime().optional(),
  ingestedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  rawHash: z.string().min(1).max(160),
  confidence: z.number().min(0).max(1),
  freshness: signalStatusSchema,
  providerMode: providerModeSchema.default('unavailable'),
  lastSuccessfulObservedAt: z.string().datetime().nullable().optional(),
  nextDueAt: z.string().datetime().nullable().optional(),
  failureReason: z.string().min(1).max(240).optional(),
  degradationReasons: z.array(degradationReasonSchema).default([]),
})

export const sourceCadenceSchema = z.object({
  provider: z.string().min(1).max(80),
  signalType: signalTypeSchema,
  updateCadence: z.string().min(1).max(80),
  rateLimit: z.string().min(1).max(160),
  freshnessSla: z.string().min(1).max(80),
  researchedAt: z.string().datetime(),
  sourceRef: z.string().url(),
})

export const schedulerStatusSchema = z.object({
  lastRunAt: z.string().datetime().nullable(),
  nextRunAt: z.string().datetime().nullable(),
  lockStatus: z.enum(['available', 'locked', 'unknown']),
  failures: z.array(z.object({ provider: z.string().min(1).max(80), signalType: signalTypeSchema, reason: z.string().min(1).max(240) })).default([]),
  nextDueBySource: z.array(z.object({ provider: z.string().min(1).max(80), signalType: signalTypeSchema, dueAt: z.string().datetime(), cadence: sourceCadenceSchema, lastSuccessfulObservedAt: z.string().datetime().nullable().optional(), overdue: z.boolean().default(false) })).default([]),
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
  engineId: z.string().min(1).max(80).optional(),
  engineVersion: z.string().min(1).max(80).optional(),
  sourceRunIds: z.array(z.string().min(1).max(120)).optional(),
  acquisitionTimes: z.array(z.string().datetime()).optional(),
  alertSnapshotIds: z.array(z.string().min(1).max(80)).optional(),
  degradationReasons: z.array(degradationReasonSchema).default([]),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  drivers: z.array(riskDriverSchema).min(1),
})

export const dashboardSignalSchema = z.object({
  signalType: signalTypeSchema,
  status: signalStatusSchema,
  evidenceRefs: z.array(z.string().min(1)).default([]),
  sourceRunId: z.string().min(1).max(120).optional(),
  acquisitionTimes: z.array(z.string().datetime()).default([]),
  confidence: z.number().min(0).max(1),
  degradationReasons: z.array(degradationReasonSchema).default([]),
})

export const dashboardSnapshotSchema = z.object({
  contractVersion: contractVersionSchema,
  snapshotId: z.string().min(1).max(80),
  field: z.object({
    fieldId: z.string().min(1).max(80),
    cropCategory: cropCategorySchema,
    crop: supportedCropSchema,
    provinceCode: supportedProvinceCodeSchema,
    locality: z.string().min(1).max(120),
  }),
  status: signalStatusSchema,
  freshness: signalStatusSchema,
  signals: z.array(dashboardSignalSchema).default([]),
  risk: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(agronautasRiskLevels),
    confidence: z.number().min(0).max(1),
    drivers: z.array(riskDriverSchema).default([]),
  }),
  alerts: z.array(z.unknown()).default([]),
  provenance: z.array(signalEvidenceSchema).default([]),
  scheduler: schedulerStatusSchema,
  generatedAt: z.string().datetime(),
  lastDataFetchedAt: z.string().datetime(),
  presentation: z.object({
    disclaimer: z.string().min(1).max(500),
    confidenceLabel: z.enum(['alta', 'media', 'baja']),
    sourcesUnavailable: z.boolean(),
    staleFlags: z.array(degradationReasonSchema).default([]),
  }),
  lineage: z.object({
    riskSnapshotId: z.string().min(1),
    sourceRunIds: z.array(z.string().min(1)),
    acquisitionTimes: z.array(z.string().datetime()),
    engineId: z.string().min(1),
    engineVersion: z.string().min(1),
    alertSnapshotIds: z.array(z.string().min(1)),
  }).optional(),
})

export const fieldGeometryUpdateSchema = z.object({
  polygonWkt: polygonWktSchema.optional(),
  geoJson: geoJsonPolygonSchema.optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
}).strict().refine((value) => Boolean(value.polygonWkt) !== Boolean(value.geoJson), 'Provide exactly one polygon representation')

export const fieldGeometryResponseSchema = z.object({
  fieldId: z.string().min(1).max(80),
  polygonWkt: polygonWktSchema,
  centroid: geoPointSchema,
  areaM2: z.number().finite().positive(),
  hectares: z.number().finite().positive(),
  perimeterM: z.number().finite().positive(),
  status: z.enum(agronautasFieldGeometryStatuses),
  source: z.enum(agronautasFieldGeometrySources),
  updatedAt: z.string().datetime().nullable(),
})

export const agronautasEvidenceSchema = z.object({
  state: evidenceStateSchema,
  label: z.string().min(1).max(120),
  source: z.string().min(1).max(160).nullable(),
  observedAt: z.string().datetime().nullable(),
  lastSuccessfulObservedAt: z.string().datetime().nullable(),
  sourceRunIds: z.array(z.string().min(1).max(120)).default([]),
  detail: z.string().min(1).max(300).nullable(),
})

export const agronautasFieldIndexItemSchema = z.object({
  fieldId: z.string().min(1).max(80), externalFieldId: z.string().min(1).max(120), crop: z.string().min(1).max(80), hectares: z.number().positive(), locality: z.string().min(1).max(120), provinceCode: z.string().min(1).max(16), centroid: geoPointSchema,
  geometryStatus: z.enum(agronautasFieldGeometryStatuses), geometrySource: z.enum(agronautasFieldGeometrySources), geometryUpdatedAt: z.string().datetime().nullable().optional(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(), sourceRunIds: z.array(z.string().min(1).max(120)).default([]),
})

export const agronautasFieldIndexResponseSchema = z.object({ contractVersion: z.literal('agronautas-field-index-v1'), items: z.array(agronautasFieldIndexItemSchema), nextCursor: cursorSchema })
const workspaceContractVersionSchema = z.literal('agronautas-management-v1')
const workspaceFieldContractVersionSchema = z.literal('agronautas-workspace-fields-v1')
const activityContractVersionSchema = z.literal('agronautas-activity-v1')
const workspaceStatusSchema = z.enum(agronautasWorkspaceStatuses)
const activitySourceTypeSchema = z.enum(agronautasActivitySourceTypes)
const workspaceTimestampSchema = z.string().datetime()

export const agronautasWorkspaceContextSchema = z.object({
  contractVersion: workspaceContractVersionSchema,
  workspaceId: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  status: workspaceStatusSchema,
  fieldCount: z.number().int().nonnegative(),
  createdAt: workspaceTimestampSchema,
  updatedAt: workspaceTimestampSchema,
})

const planningWorkspaceIdSchema = z.literal('agronautas-default-workspace')
const planningAvailabilityStateSchema = z.enum(agronautasPlanningAvailabilityStates)
const planningDomainSchema = z.enum(agronautasPlanningDomains)
const planningFieldIdSchema = z.string().trim().min(1).max(80)

export const campaignPlanningContextRequestSchema = z.object({
  contractVersion: z.literal(agronautasPlanningContextContractVersion),
  workspaceId: planningWorkspaceIdSchema,
  campaignName: z.string().trim().min(1).max(120),
  season: z.string().trim().min(1).max(40),
  fieldIds: z.array(planningFieldIdSchema).min(1).max(50),
}).strict()

export const campaignPlanningFieldSchema = z.object({
  fieldId: planningFieldIdSchema,
  externalFieldId: z.string().min(1).max(80),
  crop: supportedCropSchema,
  hectares: z.number().finite().positive(),
  locality: z.string().min(1).max(120),
  geometryStatus: z.enum(['saved', 'point_only', 'unavailable']),
}).strict()

export const planningAvailabilitySchema = z.object({
  domain: planningDomainSchema,
  state: planningAvailabilityStateSchema,
  reason: z.string().min(1).max(300),
  dependency: z.string().min(1).max(180),
}).strict()

export const planningEvidenceSchema = z.object({
  fieldId: planningFieldIdSchema,
  climate: z.object({ state: z.literal('available'), source: z.string().min(1), observedAt: z.string().datetime(), freshness: z.enum(['fresh', 'stale', 'degraded']), provenance: z.array(z.string().min(1)) }).strict().or(z.object({ state: z.literal('unavailable'), reason: z.string().min(1) }).strict()),
  risk: z.object({ state: z.literal('available'), source: z.string().min(1), observedAt: z.string().datetime(), freshness: z.enum(['fresh', 'stale', 'degraded']), provenance: z.array(z.string().min(1)), engine: z.object({ selectionStatus: z.literal('undecided') }).strict() }).strict().or(z.object({ state: z.literal('unavailable'), reason: z.string().min(1), engine: z.object({ selectionStatus: z.literal('undecided') }).strict() }).strict()),
}).strict()

export const campaignPlanningContextResponseSchema = z.object({
  contractVersion: z.literal(agronautasPlanningContextContractVersion),
  persistent: z.literal(false),
  workspace: z.object({ workspaceId: planningWorkspaceIdSchema, name: z.string().min(1), status: z.literal('active') }).strict(),
  campaignName: z.string().min(1).max(120),
  season: z.string().min(1).max(40),
  fields: z.array(campaignPlanningFieldSchema),
  evidence: z.array(planningEvidenceSchema),
  availability: z.array(planningAvailabilitySchema),
}).strict()

const finiteNonNegativeNumber = z.number().finite().nonnegative()
const positiveNumber = z.number().finite().positive()
const simulationUnitsSchema = z.object({ area: z.literal('ha'), expectedYield: z.literal('kg/ha'), price: z.literal('currency/kg'), variableCost: z.literal('currency/ha'), fixedCost: z.literal('currency') }).strict()

export const assumptionSimulationRequestSchema = z.object({
  contractVersion: z.literal(agronautasAssumptionSimulationContractVersion),
  areaHa: positiveNumber,
  expectedYieldKgPerHa: positiveNumber,
  pricePerKg: finiteNonNegativeNumber,
  variableCostPerHa: finiteNonNegativeNumber,
  fixedCost: finiteNonNegativeNumber,
  currency: z.string().regex(/^[A-Z]{3}$/),
  precision: z.number().int().min(0).max(6),
  units: simulationUnitsSchema,
  assumptions: z.array(z.string().trim().min(1).max(240)).min(1).max(20),
}).strict()

export const assumptionSimulationResultSchema = z.object({
  label: z.literal('user_assumption_simulation'),
  currency: z.string().regex(/^[A-Z]{3}$/),
  units: simulationUnitsSchema,
  assumptions: z.array(z.string().min(1)),
  inputs: z.object({ areaHa: z.number(), expectedYieldKgPerHa: z.number(), pricePerKg: z.number(), variableCostPerHa: z.number(), fixedCost: z.number() }).strict(),
  outputs: z.object({ productionKg: z.number(), grossValue: z.number(), totalCost: z.number(), scenarioDifference: z.number() }).strict(),
}).strict()

export const assumptionSimulationResponseSchema = z.union([
  z.object({ contractVersion: z.literal(agronautasAssumptionSimulationContractVersion), status: z.literal('complete'), result: assumptionSimulationResultSchema }).strict(),
  z.object({ contractVersion: z.literal(agronautasAssumptionSimulationContractVersion), status: z.literal('insufficient_evidence'), missingInputs: z.array(z.string().min(1)), reason: z.string().min(1).max(300) }).strict(),
])

export const agronautasWorkspaceFieldPageSchema = z.object({
  contractVersion: workspaceFieldContractVersionSchema,
  workspaceId: z.string().min(1).max(80),
  items: z.array(agronautasFieldIndexItemSchema),
  nextCursor: cursorSchema,
})

export const agronautasActivityItemSchema = z.object({
  activityId: z.string().min(1).max(180),
  sourceType: activitySourceTypeSchema,
  sourceId: z.string().min(1).max(120),
  occurredAt: z.string().datetime(),
  title: z.string().min(1).max(180),
})

export const agronautasActivityResponseSchema = z.object({
  contractVersion: activityContractVersionSchema,
  fieldId: z.string().min(1).max(80),
  items: z.array(agronautasActivityItemSchema),
})
export const agronautasReportMetadataSchema = z.object({ contractVersion: z.literal('agronautas-report-v1'), fieldId: z.string().min(1).max(80), snapshotId: z.string().min(1).max(80), snapshotAt: z.string().datetime(), evidenceState: evidenceStateSchema, geometryStatus: z.enum(agronautasFieldGeometryStatuses), geometryUpdatedAt: z.string().datetime().nullable(), sourceRunIds: z.array(z.string().min(1).max(120)).default([]) })
export const agronautasRiskClimateExplanationSchema = z.object({ contractVersion: z.literal('agronautas-risk-climate-v1'), fieldId: z.string().min(1).max(80), score: z.number().min(0).max(100), level: z.enum(agronautasRiskLevels), drivers: z.array(riskDriverSchema), validFrom: z.string().datetime(), validUntil: z.string().datetime(), nextReviewAction: z.string().min(1).max(240), evidence: z.array(agronautasEvidenceSchema), engine: z.object({ id: z.string().min(1).max(80), version: z.string().min(1).max(80), selectionStatus: z.literal('undecided') }), sourceRunIds: z.array(z.string().min(1).max(120)).default([]) })

const intelligenceStateSchema = z.enum(agronautasIntelligenceStates)
const intelligenceUnavailableStateSchema = z.object({
  state: z.enum(['unavailable', 'insufficient_evidence']),
  reason: z.string().min(1).max(300),
  missingInputs: z.array(z.string().min(1).max(120)).optional(),
}).strict()

export const observationMetadataSchema = z.object({
  source: z.string().min(1).max(160),
  unit: z.string().min(1).max(80),
  currency: z.string().min(1).max(16).optional(),
  observedAt: z.string().datetime(),
  retrievedAt: z.string().datetime(),
  lineage: z.object({
    sourceRunIds: z.array(z.string().min(1).max(120)),
    observationRefs: z.array(z.string().min(1).max(240)),
  }).strict(),
}).strict()

const availableClimateSchema = z.object({
  state: z.literal('available'),
  value: z.object({
    temperatureC: z.number(),
    rainfallMm7d: z.number(),
    humidityPct: z.number().optional(),
    freshness: signalStatusSchema,
    freshnessHours: z.number().nonnegative(),
    degradationReasons: z.array(degradationReasonSchema),
  }).strict(),
  metadata: observationMetadataSchema,
}).strict()

const availableRiskSchema = z.object({
  state: z.literal('available'),
  value: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(agronautasRiskLevels),
    confidence: z.number().min(0).max(1),
    freshness: z.enum(['fresh', 'stale', 'degraded']),
    degradationReasons: z.array(degradationReasonSchema),
    drivers: z.array(riskDriverSchema),
    engine: z.object({ id: z.string().min(1).max(80), version: z.string().min(1).max(80), selectionStatus: z.literal('undecided') }).strict(),
  }).strict(),
  metadata: observationMetadataSchema,
}).strict()

const availableObservationSchema = z.object({
  state: z.literal('available'),
  value: z.unknown(),
  metadata: observationMetadataSchema,
}).strict()

const climateTimelineItemSchema = availableClimateSchema.shape.value
const riskTimelineItemSchema = availableRiskSchema.shape.value

export const agronautasIntelligenceSchema = z.object({
  contractVersion: z.literal(agronautasIntelligenceContractVersion),
  field: z.object({ fieldId: z.string().min(1).max(80), crop: supportedCropSchema, hectares: z.number().positive(), locality: z.string().min(1).max(120) }).strict(),
  climate: z.union([availableClimateSchema, intelligenceUnavailableStateSchema]),
  risk: z.union([availableRiskSchema, intelligenceUnavailableStateSchema]),
  soil: z.union([availableObservationSchema, intelligenceUnavailableStateSchema]),
  prices: z.union([availableObservationSchema, intelligenceUnavailableStateSchema]),
  dollar: z.union([availableObservationSchema, intelligenceUnavailableStateSchema]),
  economics: z.union([availableObservationSchema, intelligenceUnavailableStateSchema]),
  recommendation: z.union([availableObservationSchema, intelligenceUnavailableStateSchema]),
  explanation: z.object({
    context: z.object({ locality: z.string(), growthStage: z.string().nullable(), localityConfidence: z.number().min(0).max(1) }).strict().nullable(),
    climateTimeline: z.array(climateTimelineItemSchema),
    riskTimeline: z.array(riskTimelineItemSchema),
    evidenceRefs: z.array(z.string().min(1).max(240)),
  }).strict(),
}).strict()

export const pdfReportRequestSchema = z.object({
  fieldId: z.string().min(1).max(80),
  snapshotId: z.string().min(1).max(80),
})

export const alertSnapshotSchema = z.object({
  contractVersion: contractVersionSchema,
  alertId: z.string().min(1).max(80),
  fieldId: z.string().min(1).max(80),
  basedOnSnapshotId: z.string().min(1).max(80),
  runId: z.string().min(1).max(120).optional(),
  sourceRunIds: z.array(z.string().min(1).max(120)).optional(),
  acquisitionTimes: z.array(z.string().datetime()).optional(),
  engineId: z.string().min(1).max(80).optional(),
  engineVersion: z.string().min(1).max(80).optional(),
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
  crop: supportedCropSchema,
  cropCategory: cropCategorySchema.optional(),
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
  providerAlertId: z.string().min(1).max(160).optional(),
  coverageKey: z.string().min(1).max(120).optional(),
  observedAt: z.string().datetime(),
  ingestedAt: z.string().datetime().optional(),
  lastSuccessfulObservedAt: z.string().datetime(),
  value: z.number().nullable(),
  unit: z.string().min(1).max(24),
  metric: hydrologyMetricSchema,
  quality: hydrologyQualitySchema,
  freshness: hydrologyFreshnessSchema,
  tendency: z.string().min(1).max(80).nullable().optional(),
  forecastHorizonDays: z.number().int().min(0).max(30).nullable().optional(),
  confidence: hydrologyForecastConfidenceSchema.nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.forecastHorizonDays === undefined || value.forecastHorizonDays === null) return

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
  status: hydrologyGovernmentSourceRunStatusSchema.optional(),
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
  officialAlerts: z.array(z.object({
    source: z.enum(['SMN', 'INMET']),
    coverageKey: z.string().min(1).max(120),
    message: z.string().min(1).max(300),
    observedAt: z.string().datetime(),
    lastSuccessfulObservedAt: z.string().datetime(),
    freshness: z.enum(['fresh', 'degraded']),
    sourceUrl: z.string().url().optional(),
  })).default([]),
  coverageGaps: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
  coverageStatus: hydrologyIberaCoverageStatusSchema.default('unavailable'),
  geometryStatus: hydrologyIberaGeometryStatusSchema.default('unverified'),
  sourceRegistry: z.array(z.lazy(() => hydrologyIberaSourceProvenanceSchema)).default([]),
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
  inaPredictions30d: z.array(hydrologyTelemetrySchema.refine((value) => value.source === 'INA' && value.forecastHorizonDays !== undefined && value.forecastHorizonDays !== null && value.forecastHorizonDays <= 30, 'Debe ser pronóstico INA hasta 30 días')).default([]),
  alerts: z.array(hydrologyTelemetrySchema.refine((value) => value.source === 'SMN' || value.source === 'INMET', 'Las alertas municipales provienen de SMN/INMET en Fase 1')).default([]),
  provenance: z.array(hydrologyGovernmentFreshnessSchema).default([]),
  coverageGaps: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
  explanation: z.lazy(() => hydrologyMunicipalityExplanationSchema).optional(),
  timeline: z.lazy(() => hydrologyMunicipalityTimelineSchema).optional(),
})

export const hydrologyGovernmentIngestRequestSchema = z.object({
  contractVersion: contractVersionSchema,
  source: hydrologySourceSchema.optional(),
  reason: z.string().trim().max(240).optional(),
  proofRunId: z.string().trim().min(1).max(120).optional(),
})

export const hydrologyGovernmentIngestDiagnosticSchema = z.object({
  failureKind: hydrologyGovernmentIngestFailureKindSchema.optional(),
  reason: z.string().trim().min(1).max(160).optional(),
  attempts: z.union([z.literal(1), z.literal(2)]),
  timeoutMs: z.number().int().positive().max(150_000).optional(),
  durationMs: z.number().int().nonnegative().max(150_000).optional(),
  elapsedMs: z.number().int().nonnegative().max(150_000).optional(),
  providerHost: z.string().trim().min(1).max(120).regex(/^[a-z0-9.-]+(?::\d{1,5})?$/i).optional(),
  providerPath: z.string().trim().min(1).max(240).regex(/^\/[^?#]*$/).optional(),
  upstreamStatus: z.number().int().min(100).max(599).optional(),
}).strict()

export const hydrologyGovernmentHttpSummarySchema = z.object({
  host: z.string().trim().min(1).max(120).regex(/^[a-z0-9.-]+(?::\d{1,5})?$/i),
  path: z.string().trim().min(1).max(240).regex(/^\/[^?#]*$/),
  status: z.number().int().min(100).max(599).optional(),
  elapsedMs: z.number().int().nonnegative().max(150_000),
  attempts: z.union([z.literal(1), z.literal(2)]),
  timeoutMs: z.number().int().positive().max(150_000),
  responseBytes: z.number().int().nonnegative().max(10_000_000).optional(),
  responseChars: z.number().int().nonnegative().max(10_000_000).optional(),
}).strict()

export const hydrologyGovernmentIngestResponseSchema = z.object({
  contractVersion: z.literal('hydrology-government-ingest-v1'),
  runId: z.string().min(1).max(120).optional(),
  proofRunId: z.string().min(1).max(120).optional(),
  statusPath: z.string().regex(/^\/api\/hydrology\/ingest\/[^/?#]+$/).optional(),
  status: z.enum(['queued', 'started', 'completed', 'partial', 'failed']),
  requestedSources: z.array(hydrologySourceSchema).default([]),
  results: z.array(z.object({
    source: hydrologySourceSchema,
    status: z.enum(['success', 'failed', 'empty', 'skipped']),
    recordsIngested: z.number().int().nonnegative(),
    errorMessage: z.string().min(1).max(500).optional(),
    provenanceUrl: z.string().min(1).max(500).optional(),
    observedFrom: z.string().datetime().optional(),
    observedTo: z.string().datetime().optional(),
    httpSummary: hydrologyGovernmentHttpSummarySchema.optional(),
    diagnostic: hydrologyGovernmentIngestDiagnosticSchema.optional(),
  })).default([]),
  sources: z.array(hydrologySourceSchema).default([]),
  sourceResults: z.array(z.object({
    source: hydrologySourceSchema,
    status: z.enum(['success', 'failed']),
    recordsIngested: z.number().int().nonnegative().default(0),
    errorMessage: z.string().min(1).max(240).optional(),
  })).default([]),
  coverageGaps: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
})

export const hydrologyIberaSourceResultSchema = z.object({
  source: hydrologySourceSchema,
  status: z.enum(['success', 'failed', 'empty', 'skipped']),
  recordsIngested: z.number().int().nonnegative(),
  errorMessage: z.string().min(1).max(500).optional(),
  provenanceUrl: z.string().min(1).max(500).optional(),
  observedFrom: z.string().datetime().optional(),
  observedTo: z.string().datetime().optional(),
  httpSummary: hydrologyGovernmentHttpSummarySchema.optional(),
  diagnostic: hydrologyGovernmentIngestDiagnosticSchema.optional(),
})

export const hydrologyIberaRunHistoryItemSchema = z.object({
  id: z.string().min(1).max(120), proofRunId: z.string().min(1).max(120), status: z.enum(hydrologyIberaRunStatuses), requestedSources: z.array(hydrologySourceSchema), sourceResults: z.array(hydrologyIberaSourceResultSchema), diagnostics: z.array(z.string().min(1).max(160)).default([]), startedAt: z.string().datetime(), finishedAt: z.string().datetime().nullable(), expiresAt: z.string().datetime(), freshness: z.enum(['fresh', 'degraded', 'missing']), lastSuccessfulObservedAt: z.string().datetime().nullable(),
})
export const hydrologyIberaRunHistoryResponseSchema = z.object({ contractVersion: z.literal('ibera-ingest-run-history-v1'), items: z.array(hydrologyIberaRunHistoryItemSchema), nextCursor: cursorSchema })
export const hydrologyMunicipalityExplanationSchema = z.object({
  contractVersion: z.literal('ibera-municipality-explanation-v1'), municipalityId: z.string().min(1).max(80), evidenceState: evidenceStateSchema, relationLabel: z.literal('source mapping / threshold comparison'), threshold: z.object({ alertHeightM: z.number().nullable(), evacuationHeightM: z.number().nullable() }), observed: z.object({ value: z.number().nullable(), unit: z.string().min(1).max(24), observedAt: z.string().datetime().nullable(), source: hydrologySourceSchema.nullable(), sourceUrl: z.string().url().nullable(), freshness: hydrologyFreshnessSchema.nullable(), comparison: z.enum(['below_alert', 'at_or_above_alert', 'unknown']) }), tendency: z.object({ value: z.string().min(1).max(80).nullable(), window: z.string().min(1).max(120) }), forecast: z.object({ horizonDays: z.number().int().min(0).max(30), confidence: z.enum(hydrologyForecastConfidence), label: z.enum(['operational', 'planning_only']), source: hydrologySourceSchema, sourceUrl: z.string().url().nullable(), observedAt: z.string().datetime() }).nullable(), lastSuccessfulObservedAt: z.string().datetime().nullable(), runId: z.string().min(1).max(120).nullable(),
})
export const hydrologyMunicipalityTimelineSchema = z.object({ contractVersion: z.literal('ibera-municipality-timeline-v1'), municipalityId: z.string().min(1).max(80), events: z.array(z.object({ id: z.string().min(1).max(160), kind: z.enum(['telemetry', 'official_alert']), occurredAt: z.string().datetime(), source: hydrologySourceSchema, sourceUrl: z.string().url().nullable(), evidenceState: evidenceStateSchema, title: z.string().min(1).max(160), detail: z.string().min(1).max(300) })) })

export const hydrologyIberaSourceProvenanceSchema = z.object({
  source: hydrologySourceSchema,
  stationId: z.string().min(1).max(120).nullable(),
  coverageKey: z.string().min(1).max(120).nullable(),
  sourceUrl: z.string().url(),
  freshnessPolicy: z.string().trim().min(1).max(120),
  registryVersion: z.string().trim().min(1).max(80),
  reviewStatus: hydrologyIberaRegistryReviewStatusSchema,
  reviewedAt: z.string().datetime().nullable(),
}).strict()

export const hydrologyIberaCoverageSummarySchema = z.object({
  currentStatus: hydrologyIberaCoverageStatusSchema,
  lastKnownEvidence: z.string().datetime().nullable(),
  geometryStatus: hydrologyIberaGeometryStatusSchema,
  geometryProvenance: z.object({ sourceUrl: z.string().url(), datasetVersion: z.string().min(1).max(80), crs: z.string().min(1).max(40), reviewedAt: z.string().datetime() }).nullable(),
  sources: z.array(hydrologyIberaSourceProvenanceSchema),
  gaps: z.array(z.string().trim().min(1).max(160)).max(8),
}).strict()

export const hydrologyIberaEvidenceTimelineResponseSchema = hydrologyMunicipalityTimelineSchema.extend({
  nextCursor: cursorSchema,
  currentStatus: hydrologyIberaCoverageStatusSchema,
  lastKnownEvidence: z.string().datetime().nullable(),
})

export const hydrologyIberaCitationSchema = z.object({
  id: z.string().trim().min(1).max(120),
  source: hydrologySourceSchema,
  stationId: z.string().trim().min(1).max(120).optional(),
  observedAt: z.string().datetime(),
  sourceUrl: z.string().url().optional(),
  kind: z.enum(hydrologyIberaCitationKinds),
  freshness: hydrologyFreshnessSchema,
}).strict()

export const hydrologyIberaCopilotMetadataSchema = z.object({
  citationMode: z.enum(hydrologyIberaCitationModes),
  citations: z.array(hydrologyIberaCitationSchema).max(16).default([]),
  unverifiedClaims: z.boolean(),
  citationUnavailable: z.boolean().optional(),
  unavailableReason: z.string().trim().min(1).max(240).optional(),
}).strict()

export const hydrologyOperatorReceiptSchema = z.object({
  verifier: z.literal('ibera-alerta-operator-v1'),
  evidenceScope: z.enum(hydrologyOperatorReceiptScopes),
  capturedAt: z.string().datetime(),
  runtime: z.object({
    service: z.string().trim().min(1).max(80),
    revision: z.string().trim().min(1).max(160),
    config: z.object({
      schedulerEnabled: z.boolean(),
      secretNames: z.array(z.string().trim().regex(/^[A-Z][A-Z0-9_]*$/)).max(20),
      regionalRunner: z.object({
        mode: z.enum(hydrologyOperatorReceiptRunnerModes),
        allowlisted: z.boolean(),
      }).strict(),
    }).strict(),
  }).strict(),
  request: z.object({
    requestId: z.string().trim().min(1).max(120),
    method: z.literal('POST'),
    path: z.literal('/api/hydrology/ingest'),
    acknowledgementStatus: z.literal(202),
    responseShape: z.object({
      contractVersion: z.literal('hydrology-government-ingest-v1'),
      status: z.enum(['queued', 'started', 'completed', 'partial', 'failed']).refine((value) => value !== 'queued', 'Receipt requires a terminal ingest status'),
      proofRunId: z.string().trim().min(1).max(120),
      hasStatusPath: z.boolean(),
      resultCount: z.number().int().nonnegative().max(4),
    }).strict(),
  }).strict(),
  sourceOutcomes: z.array(z.object({
    source: hydrologySourceSchema,
    status: z.enum(['success', 'failed', 'empty', 'skipped']),
    recordsIngested: z.number().int().nonnegative(),
    attempts: z.literal(1),
  }).strict()).min(1).max(4),
  rowCorrelation: z.array(z.object({
    rowId: z.string().trim().min(1).max(120),
    source: hydrologySourceSchema,
    proofRunId: z.string().trim().min(1).max(120),
    status: z.enum(['success', 'failed', 'empty', 'skipped']),
    recordsIngested: z.number().int().nonnegative(),
    correlated: z.literal(true),
  }).strict()).min(1).max(4),
  chat: z.object({
    mode: z.enum(hydrologyOperatorReceiptChatModes),
    status: z.enum(['completed', 'degraded', 'not_run']),
    eventTypes: z.array(z.enum(['metadata', 'token', 'done', 'error'])).max(4),
    rawContentIncluded: z.literal(false),
  }).strict(),
  passed: z.boolean(),
}).strict().superRefine((value, ctx) => {
  if (value.request.responseShape.proofRunId !== value.rowCorrelation[0]?.proofRunId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Row correlation must use the request proofRunId', path: ['rowCorrelation'] })
  }

  if (value.rowCorrelation.some((row) => row.proofRunId !== value.request.responseShape.proofRunId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Every correlated row must match the request proofRunId', path: ['rowCorrelation'] })
  }

  if (new Set(value.sourceOutcomes.map((outcome) => outcome.source)).size !== value.sourceOutcomes.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Source outcomes must not repeat a provider', path: ['sourceOutcomes'] })
  }
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
export type FieldGeometryUpdate = z.infer<typeof fieldGeometryUpdateSchema>
export type FieldGeometryResponse = z.infer<typeof fieldGeometryResponseSchema>
export type SignalEvidence = z.infer<typeof signalEvidenceSchema>
export type AgronautasProviderMode = z.infer<typeof providerModeSchema>
export type SourceCadence = z.infer<typeof sourceCadenceSchema>
export type SchedulerStatus = z.infer<typeof schedulerStatusSchema>
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>
export type AgronautasEvidence = z.infer<typeof agronautasEvidenceSchema>
export type AgronautasFieldIndexItem = z.infer<typeof agronautasFieldIndexItemSchema>
export type AgronautasFieldIndexResponse = z.infer<typeof agronautasFieldIndexResponseSchema>
export type AgronautasWorkspaceContext = z.infer<typeof agronautasWorkspaceContextSchema>
export type CampaignPlanningContextRequest = z.infer<typeof campaignPlanningContextRequestSchema>
export type CampaignPlanningContextResponse = z.infer<typeof campaignPlanningContextResponseSchema>
export type PlanningAvailability = z.infer<typeof planningAvailabilitySchema>
export type AssumptionSimulationRequest = z.infer<typeof assumptionSimulationRequestSchema>
export type AssumptionSimulationResponse = z.infer<typeof assumptionSimulationResponseSchema>
export type AgronautasWorkspaceFieldPage = z.infer<typeof agronautasWorkspaceFieldPageSchema>
export type AgronautasActivityItem = z.infer<typeof agronautasActivityItemSchema>
export type AgronautasActivityResponse = z.infer<typeof agronautasActivityResponseSchema>
export type AgronautasReportMetadata = z.infer<typeof agronautasReportMetadataSchema>
export type AgronautasRiskClimateExplanation = z.infer<typeof agronautasRiskClimateExplanationSchema>
export type ObservationMetadata = z.infer<typeof observationMetadataSchema>
export type AgronautasIntelligence = z.infer<typeof agronautasIntelligenceSchema>
export type PdfReportRequest = z.infer<typeof pdfReportRequestSchema>
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
export type HydrologyGovernmentIngestDiagnostic = z.infer<typeof hydrologyGovernmentIngestDiagnosticSchema>
export type HydrologyGovernmentHttpSummary = z.infer<typeof hydrologyGovernmentHttpSummarySchema>
export type HydrologyGovernmentIngestRequest = z.infer<typeof hydrologyGovernmentIngestRequestSchema>
export type HydrologyGovernmentIngestResponse = z.infer<typeof hydrologyGovernmentIngestResponseSchema>
export type HydrologyOperatorReceipt = z.infer<typeof hydrologyOperatorReceiptSchema>
export type HydrologyIberaRunStatus = (typeof hydrologyIberaRunStatuses)[number]
export type HydrologyIberaCoverageStatus = (typeof hydrologyIberaCoverageStatus)[number]
export type HydrologyIberaSourceResult = z.infer<typeof hydrologyIberaSourceResultSchema>
export type HydrologyIberaCitation = z.infer<typeof hydrologyIberaCitationSchema>
export type HydrologyIberaCopilotMetadata = z.infer<typeof hydrologyIberaCopilotMetadataSchema>
export type HydrologyIberaRunHistoryItem = z.infer<typeof hydrologyIberaRunHistoryItemSchema>
export type HydrologyIberaRunHistoryResponse = z.infer<typeof hydrologyIberaRunHistoryResponseSchema>
export type HydrologyMunicipalityExplanation = z.infer<typeof hydrologyMunicipalityExplanationSchema>
export type HydrologyMunicipalityTimeline = z.infer<typeof hydrologyMunicipalityTimelineSchema>
export type HydrologyIberaSourceProvenance = z.infer<typeof hydrologyIberaSourceProvenanceSchema>
export type HydrologyIberaCoverageSummary = z.infer<typeof hydrologyIberaCoverageSummarySchema>
export type HydrologyIberaEvidenceTimelineResponse = z.infer<typeof hydrologyIberaEvidenceTimelineResponseSchema>
export type MonitoringStatus = z.infer<typeof monitoringStatusSchema>
export type GroundedChatRequest = z.infer<typeof groundedChatRequestSchema>
export type GroundedChatAction = z.infer<typeof groundedChatActionSchema>
export type GroundedChatResponse = z.infer<typeof groundedChatResponseSchema>
export type DemoContactSubmission = z.infer<typeof demoContactSubmissionSchema>
export type DemoContactSubmissionResponse = z.infer<typeof demoContactSubmissionResponseSchema>
