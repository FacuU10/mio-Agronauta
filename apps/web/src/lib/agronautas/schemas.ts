import { z } from 'zod'
import {
  AGRONAUTAS_CONTRACT_VERSION,
  agronautasSupportedCrops,
  alertSnapshotSchema,
  demoContactSubmissionResponseSchema,
  demoContactSubmissionSchema,
  fieldIntakeSchema,
  groundedChatRequestSchema,
  groundedChatResponseSchema,
  dashboardSnapshotSchema,
  monitoringStatusSchema,
  recomputeRequestResultSchema,
  riskSnapshotSchema,
  riskTimelineResponseSchema,
  weatherTimelineResponseSchema,
  fieldGeometryResponseSchema,
  fieldGeometryUpdateSchema,
} from '@repo/zod-schemas'

export {
  AGRONAUTAS_CONTRACT_VERSION,
  alertSnapshotSchema,
  demoContactSubmissionResponseSchema,
  demoContactSubmissionSchema,
  fieldIntakeSchema,
  groundedChatRequestSchema,
  groundedChatResponseSchema,
  monitoringStatusSchema,
  recomputeRequestResultSchema,
  riskSnapshotSchema,
  riskTimelineResponseSchema,
  weatherTimelineResponseSchema,
  dashboardSnapshotSchema,
  fieldGeometryResponseSchema,
  fieldGeometryUpdateSchema,
}

export const fieldCreatedSchema = z.object({
  fieldId: z.string().min(1),
  crop: z.string().min(1).optional(),
  coverage: z.object({
    locality: z.string().min(1),
    provinceCode: z.string().min(1),
    boundaryVersion: z.string().optional(),
    status: z.enum(['supported', 'unsupported-locality']).optional(),
  }),
})

export const fieldOverviewSchema = z.object({
  fieldId: z.string().min(1),
  externalFieldId: z.string().min(1),
  crop: z.enum(agronautasSupportedCrops),
  hectares: z.number().positive(),
  locality: z.string().min(1),
  provinceCode: z.string().min(1),
  centroid: z.object({ lat: z.number(), lng: z.number() }),
})

export const riskCurrentSchema = z.object({
  status: z.enum(['fresh', 'degraded', 'stale']),
  snapshot: riskSnapshotSchema,
  recompute: z.object({ status: z.enum(['enqueued', 'already_in_progress']) }).nullable().optional(),
})

export const alertsCurrentSchema = z.object({
  status: z.enum(['fresh', 'degraded', 'stale']),
  snapshot: riskSnapshotSchema.nullable(),
  alerts: z.array(alertSnapshotSchema),
  recompute: z.object({ status: z.enum(['enqueued', 'already_in_progress']) }).optional(),
  lineage: z.object({
    riskSnapshotId: z.string(),
    sourceRunIds: z.array(z.string()),
    acquisitionTimes: z.array(z.string()),
    engineId: z.string(),
    engineVersion: z.string(),
    alertSnapshotIds: z.array(z.string()),
  }).nullable().optional(),
})

export const alertsTimelineResponseSchema = z.object({
  fieldId: z.string().min(1),
  items: z.array(alertSnapshotSchema),
})

export const contractErrorSchema = z.object({
  contractVersion: z.literal(AGRONAUTAS_CONTRACT_VERSION),
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().default(false),
  details: z.record(z.unknown()).optional(),
})

export const runtimeInfoSchema = z.object({
  mode: z.enum(['real', 'demo']),
  routePrefix: z.string().min(1),
  compatibilityPrefix: z.string().min(1).optional(),
  contractVersion: z.literal(AGRONAUTAS_CONTRACT_VERSION),
})

export const hydrologySourceSchema = z.enum(['PNA', 'INA', 'INMET', 'SMN'])

export const hydrologyItemSchema = z.object({
  source: hydrologySourceSchema,
  stationId: z.string().min(1),
  observedAt: z.string().min(1),
  ingestedAt: z.string().min(1),
  lastSuccessfulObservedAt: z.string().nullable(),
  value: z.number(),
  unit: z.string().min(1),
  metric: z.enum(['river_height_m', 'rain_mm', 'storm_alert']),
  quality: z.enum(['observed', 'forecast', 'estimated', 'missing']),
  freshness: z.enum(['fresh', 'stale', 'degraded']),
  tendency: z.string().optional(),
  forecastHorizonDays: z.number().optional(),
  confidence: z.enum(['normal', 'speculative']).optional(),
  sourceUrl: z.string().url().nullable().optional(),
})

export const hydrologyDashboardSchema = z.object({
  contractVersion: z.literal('hydrology-dashboard-v1'),
  fieldId: z.string().min(1),
  zone: z.enum(['Mercedes', 'Ituzaingó', 'Virasoro']).nullable(),
  sources: z.array(hydrologySourceSchema),
  stations: z.array(z.object({
    id: z.string().min(1),
    source: hydrologySourceSchema,
    stationName: z.string().min(1),
    riverName: z.string().nullable(),
    zone: z.enum(['Mercedes', 'Ituzaingó', 'Virasoro']).nullable(),
    sourceUrl: z.string().url().nullable().optional(),
  })),
  status: z.object({
    riskLevel: z.enum(['low', 'moderate', 'high', 'unknown']),
    freshness: z.enum(['fresh', 'stale', 'degraded']),
    quality: z.enum(['observed', 'forecast', 'estimated', 'missing']),
    recommendation: z.string().min(1),
    lastSuccessfulObservedAt: z.string().nullable(),
  }),
  heights: z.array(hydrologyItemSchema),
  trends: z.array(hydrologyItemSchema),
  forecasts: z.array(hydrologyItemSchema),
  rain: z.array(hydrologyItemSchema),
  alerts: z.array(hydrologyItemSchema),
})

export type FieldCreated = z.infer<typeof fieldCreatedSchema>
export type FieldOverview = z.infer<typeof fieldOverviewSchema>
export type RiskCurrent = z.infer<typeof riskCurrentSchema>
export type AlertsCurrent = z.infer<typeof alertsCurrentSchema>
export type AlertsTimelineResponse = z.infer<typeof alertsTimelineResponseSchema>
export type ContractError = z.infer<typeof contractErrorSchema>
export type RuntimeInfo = z.infer<typeof runtimeInfoSchema>
export type HydrologyDashboard = z.infer<typeof hydrologyDashboardSchema>
export type HydrologyItem = z.infer<typeof hydrologyItemSchema>
export type DemoContactSubmission = z.infer<typeof demoContactSubmissionSchema>
export type DemoContactSubmissionResponse = z.infer<typeof demoContactSubmissionResponseSchema>
export type MonitoringStatus = z.infer<typeof monitoringStatusSchema>
export type RecomputeRequestResult = z.infer<typeof recomputeRequestResultSchema>
export type RiskTimelineResponse = z.infer<typeof riskTimelineResponseSchema>
export type WeatherTimelineResponse = z.infer<typeof weatherTimelineResponseSchema>
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>
export type FieldGeometryResponse = z.infer<typeof fieldGeometryResponseSchema>
export type FieldGeometryUpdate = z.infer<typeof fieldGeometryUpdateSchema>
export type GroundedChatRequest = z.infer<typeof groundedChatRequestSchema>
export type GroundedChatResponse = z.infer<typeof groundedChatResponseSchema>
