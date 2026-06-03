import { alertSnapshotSchema, riskSnapshotSchema, type FieldIntake } from '@repo/zod-schemas'
import { ApiError, apiClient } from '@/lib/api-client'
import {
  monitoringStatusSchema,
  recomputeRequestResultSchema,
  riskTimelineResponseSchema,
  weatherTimelineResponseSchema,
  AGRONAUTAS_CONTRACT_VERSION,
  alertsCurrentSchema,
  contractErrorSchema,
  fieldCreatedSchema,
  fieldOverviewSchema,
  groundedChatResponseSchema,
  riskCurrentSchema,
  runtimeInfoSchema,
} from './schemas'
import type { AlertsCurrent, FieldCreated, FieldOverview, GroundedChatRequest, GroundedChatResponse, MonitoringStatus, RecomputeRequestResult, RiskCurrent, RiskTimelineResponse, RuntimeInfo, WeatherTimelineResponse } from './schemas'

export interface AgronautasService {
  getRuntime(): Promise<RuntimeInfo>
  createFieldIntake(input: FieldIntake): Promise<FieldCreated>
  getField(fieldId: string): Promise<FieldOverview>
  getCurrentRisk(fieldId: string): Promise<RiskCurrent>
  getCurrentAlerts(fieldId: string): Promise<AlertsCurrent>
  getRiskTimeline(fieldId: string): Promise<RiskTimelineResponse>
  getWeatherTimeline(fieldId: string): Promise<WeatherTimelineResponse>
  getMonitoringStatus(fieldId: string): Promise<MonitoringStatus>
  requestRecompute(fieldId: string): Promise<RecomputeRequestResult>
  askFieldChat(fieldId: string, input: GroundedChatRequest): Promise<GroundedChatResponse>
}

export function createAgronautasApiService(): AgronautasService {
  return {
    getRuntime: async () => runtimeInfoSchema.parse(await apiClient('/agronautas/runtime')),
    createFieldIntake: async (input) => fieldCreatedSchema.parse(await apiClient('/agronautas/fields', { method: 'POST', body: JSON.stringify(input) })),
    getField: async (fieldId) => fieldOverviewSchema.parse(await apiClient(`/agronautas/fields/${fieldId}`)),
    getCurrentRisk: async (fieldId) => riskCurrentSchema.parse(await apiClient(`/agronautas/fields/${fieldId}/risk/current`)),
    getCurrentAlerts: async (fieldId) => alertsCurrentSchema.parse(await apiClient(`/agronautas/fields/${fieldId}/alerts/current`)),
    getRiskTimeline: async (fieldId) => riskTimelineResponseSchema.parse(await apiClient(`/agronautas/fields/${fieldId}/risk/timeline`)),
    getWeatherTimeline: async (fieldId) => weatherTimelineResponseSchema.parse(await apiClient(`/agronautas/fields/${fieldId}/weather/timeline`)),
    getMonitoringStatus: async (fieldId) => monitoringStatusSchema.parse(await apiClient(`/agronautas/fields/${fieldId}/status`)),
    requestRecompute: async (fieldId) => recomputeRequestResultSchema.parse(await apiClient(`/agronautas/fields/${fieldId}/recompute`, { method: 'POST' })),
    askFieldChat: async (fieldId, input) => groundedChatResponseSchema.parse(await apiClient(`/agronautas/fields/${fieldId}/chat`, { method: 'POST', body: JSON.stringify(input) })),
  }
}

export function createAgronautasMockService(): AgronautasService {
  const recomputeRuns = new Map<string, number>()

  return {
    async getRuntime() {
      return runtimeInfoSchema.parse({ mode: 'demo', routePrefix: '/agronautas', contractVersion: AGRONAUTAS_CONTRACT_VERSION })
    },
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
    async getRiskTimeline(fieldId) {
      return riskTimelineResponseSchema.parse({
        fieldId,
        items: [await this.getCurrentRisk(fieldId).then((result) => result.snapshot)],
      })
    },
    async getWeatherTimeline(fieldId) {
      return weatherTimelineResponseSchema.parse({
        fieldId,
        items: [{
          provider: 'open-meteo',
          observedAt: '2026-06-03T00:00:00.000Z',
          freshnessHours: 12,
          confidence: 0.64,
          staleCause: 'demo_mode',
          temperatureC: 31.5,
          rainfallMm7d: 82,
          humidityPct: 74,
        }],
      })
    },
    async getMonitoringStatus(fieldId) {
      const risk = await this.getCurrentRisk(fieldId)
      const alerts = await this.getCurrentAlerts(fieldId)

      return monitoringStatusSchema.parse({
        contractVersion: AGRONAUTAS_CONTRACT_VERSION,
        fieldId,
        fieldStatus: 'stale',
        riskStatus: risk.status,
        alertsStatus: alerts.status,
        alertCount: alerts.alerts.length,
        lastUpdatedAt: risk.snapshot.computedAt,
        validUntil: risk.snapshot.validUntil,
        degradationReasons: risk.snapshot.degradationReasons,
      })
    },
    async requestRecompute(fieldId) {
      const attempts = (recomputeRuns.get(fieldId) ?? 0) + 1
      recomputeRuns.set(fieldId, attempts)

      return recomputeRequestResultSchema.parse({
        status: attempts === 1 ? 'enqueued' : 'already_in_progress',
        runId: `${fieldId}-recompute-${attempts}`,
      })
    },
    async askFieldChat(fieldId, input) {
      const risk = await this.getCurrentRisk(fieldId)
      const alerts = await this.getCurrentAlerts(fieldId)
      const lowered = input.message.toLowerCase()
      const isDisabled = lowered.includes('deshabilitado')
      const isFailure = lowered.includes('falla')

      return groundedChatResponseSchema.parse({
        contractVersion: AGRONAUTAS_CONTRACT_VERSION,
        fieldId,
        answer: isFailure
          ? 'No pude completar el resumen del chat ahora mismo, pero el dashboard sigue mostrando el último estado persistido.'
          : isDisabled
            ? 'El chat está degradado porque Groq no está configurado. Igual puedo devolverte el estado persistido del lote desde el backend.'
            : `El lote ${fieldId} sigue en riesgo ${risk.snapshot.level} con score ${risk.snapshot.score}. Hay ${alerts.alerts.length} alerta(s) activas y la frescura actual es ${risk.status}.`,
        executedAction: lowered.includes('alert') ? 'GET_ALERTS' : 'GET_RISK_SUMMARY',
        supportingFacts: [
          { label: 'Score', value: String(risk.snapshot.score) },
          { label: 'Nivel', value: risk.snapshot.level },
          { label: 'Alertas activas', value: String(alerts.alerts.length) },
        ],
        citations: risk.snapshot.evidenceRefs.slice(0, 2),
        trace: [
          { action: lowered.includes('alert') ? 'GET_ALERTS' : 'GET_RISK_SUMMARY', status: 'executed' },
          { action: 'FINAL_RESPONSE', status: isDisabled || isFailure ? 'fallback' : 'executed' },
        ],
        degraded: isDisabled || isFailure,
        unavailableReason: isDisabled ? 'groq_disabled' : isFailure ? 'groq_temporarily_unavailable' : undefined,
      })
    },
  }
}

export function resolveAgronautasService(): AgronautasService {
  return createAgronautasApiService()
}
