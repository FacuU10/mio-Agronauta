import { alertSnapshotSchema, riskSnapshotSchema, type FieldIntake } from '@repo/zod-schemas'
import { ApiError, apiClient } from '@/lib/api-client'
import {
  AGRONAUTAS_CONTRACT_VERSION,
  alertsCurrentSchema,
  contractErrorSchema,
  fieldCreatedSchema,
  fieldOverviewSchema,
  riskCurrentSchema,
} from './schemas'
import type { AlertsCurrent, FieldCreated, FieldOverview, RiskCurrent } from './schemas'

export interface AgronautasService {
  createFieldIntake(input: FieldIntake): Promise<FieldCreated>
  getField(fieldId: string): Promise<FieldOverview>
  getCurrentRisk(fieldId: string): Promise<RiskCurrent>
  getCurrentAlerts(fieldId: string): Promise<AlertsCurrent>
}

export function createAgronautasApiService(): AgronautasService {
  return {
    createFieldIntake: async (input) => fieldCreatedSchema.parse(await apiClient('/agronautas/fields', { method: 'POST', body: JSON.stringify(input) })),
    getField: async (fieldId) => fieldOverviewSchema.parse(await apiClient(`/agronautas/fields/${fieldId}`)),
    getCurrentRisk: async (fieldId) => riskCurrentSchema.parse(await apiClient(`/agronautas/fields/${fieldId}/risk/current`)),
    getCurrentAlerts: async (fieldId) => alertsCurrentSchema.parse(await apiClient(`/agronautas/fields/${fieldId}/alerts/current`)),
  }
}

export function createAgronautasMockService(): AgronautasService {
  return {
    async createFieldIntake(input) {
      if (input.location.lat < -32 || input.location.lat > -27 || input.location.lng < -60.5 || input.location.lng > -56) {
        throw new ApiError(422, 'El lote queda fuera del alcance Corrientes arroz', contractErrorSchema.parse({
          contractVersion: AGRONAUTAS_CONTRACT_VERSION,
          code: 'OUT_OF_SUPPORTED_AREA',
          message: 'El lote queda fuera del alcance Corrientes arroz',
          retryable: false,
        }))
      }

      return fieldCreatedSchema.parse({
        fieldId: `field-${input.fieldId}`,
        coverage: { locality: input.locality, provinceCode: 'AR-W', boundaryVersion: 'mock-v1' },
      })
    },
    async getField(fieldId) {
      return fieldOverviewSchema.parse({
        fieldId,
        externalFieldId: fieldId.replace(/^field-/, ''),
        crop: 'rice',
        hectares: 42.5,
        locality: 'Mercedes',
        provinceCode: 'AR-W',
        centroid: { lat: -29.1846, lng: -58.0759 },
      })
    },
    async getCurrentRisk(fieldId) {
      const snapshot = riskSnapshotSchema.parse({
        contractVersion: AGRONAUTAS_CONTRACT_VERSION,
        snapshotId: `${fieldId}-risk-001`,
        fieldId,
        score: 74,
        level: 'high',
        confidence: 0.63,
        computedAt: '2026-06-03T00:00:00.000Z',
        validUntil: '2026-06-03T01:00:00.000Z',
        ruleVersion: 'risk-v0',
        degradationReasons: ['satellite_data_stale'],
        evidenceRefs: ['weather:open-meteo:2026-06-03T00:00:00Z', 'satellite:sentinel:2026-06-02T12:00:00Z'],
        drivers: [
          { key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.42, value: 0.82 },
          { key: 'heat_pressure', label: 'Presión térmica', weight: 0.28, value: 0.77 },
          { key: 'satellite_stress', label: 'Estrés satelital', weight: 0.3, value: 0.69 },
        ],
      })

      return riskCurrentSchema.parse({
        status: 'stale',
        snapshot,
        recompute: { status: 'enqueued' },
      })
    },
    async getCurrentAlerts(fieldId) {
      const snapshot = (await this.getCurrentRisk(fieldId)).snapshot
      const alerts = [
        alertSnapshotSchema.parse({
          contractVersion: AGRONAUTAS_CONTRACT_VERSION,
          alertId: `${fieldId}-alert-flood`,
          fieldId,
          basedOnSnapshotId: snapshot.snapshotId,
          type: 'flood',
          priority: 1,
          confidence: 0.71,
          freshness: 'stale',
          degradationReasons: ['satellite_data_stale'],
        }),
      ]

      return alertsCurrentSchema.parse({
        status: 'stale',
        snapshot,
        alerts,
        recompute: { status: 'enqueued' },
      })
    },
  }
}

export function resolveAgronautasService(): AgronautasService {
  return process.env['NEXT_PUBLIC_AGRONAUTAS_USE_MOCKS'] === 'true'
    ? createAgronautasMockService()
    : createAgronautasApiService()
}
