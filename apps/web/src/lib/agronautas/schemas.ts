import { z } from 'zod'
import {
  AGRONAUTAS_CONTRACT_VERSION,
  alertSnapshotSchema,
  fieldIntakeSchema,
  riskSnapshotSchema,
} from '@repo/zod-schemas'

export { AGRONAUTAS_CONTRACT_VERSION, fieldIntakeSchema, alertSnapshotSchema, riskSnapshotSchema }

export const fieldCreatedSchema = z.object({
  fieldId: z.string().min(1),
  coverage: z.object({
    locality: z.string().min(1),
    provinceCode: z.string().min(1),
    boundaryVersion: z.string().optional(),
  }),
})

export const fieldOverviewSchema = z.object({
  fieldId: z.string().min(1),
  externalFieldId: z.string().min(1),
  crop: z.literal('rice'),
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
  contractVersion: z.literal(AGRONAUTAS_CONTRACT_VERSION),
})

export type FieldCreated = z.infer<typeof fieldCreatedSchema>
export type FieldOverview = z.infer<typeof fieldOverviewSchema>
export type RiskCurrent = z.infer<typeof riskCurrentSchema>
export type AlertsCurrent = z.infer<typeof alertsCurrentSchema>
export type ContractError = z.infer<typeof contractErrorSchema>
export type RuntimeInfo = z.infer<typeof runtimeInfoSchema>
