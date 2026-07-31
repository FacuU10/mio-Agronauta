import { alertSnapshotSchema, riskSnapshotSchema, type FieldIntake } from '@repo/zod-schemas'
import { ApiError, apiClient } from '@/lib/api-client'
import {
  demoContactSubmissionResponseSchema,
  demoContactSubmissionSchema,
  dashboardSnapshotSchema,
  monitoringStatusSchema,
  recomputeRequestResultSchema,
  riskTimelineResponseSchema,
  weatherTimelineResponseSchema,
  AGRONAUTAS_CONTRACT_VERSION,
  alertsCurrentSchema,
  alertsTimelineResponseSchema,
  contractErrorSchema,
  fieldCreatedSchema,
  fieldOverviewSchema,
  groundedChatResponseSchema,
  hydrologyDashboardSchema,
  riskCurrentSchema,
  runtimeInfoSchema,
} from './schemas'
import type { AlertsCurrent, AlertsTimelineResponse, DashboardSnapshot, DemoContactSubmission, DemoContactSubmissionResponse, FieldCreated, FieldOverview, GroundedChatRequest, GroundedChatResponse, HydrologyDashboard, MonitoringStatus, RecomputeRequestResult, RiskCurrent, RiskTimelineResponse, RuntimeInfo, WeatherTimelineResponse } from './schemas'
import type { SseEvent } from '@/lib/visibility/sse'

const AGRONAUTAS_REQUEST_MODES = {
  DEMO: 'demo',
} as const

type AgronautasRequestMode = (typeof AGRONAUTAS_REQUEST_MODES)[keyof typeof AGRONAUTAS_REQUEST_MODES]

export interface AgronautasApiServiceOptions {
  mode?: AgronautasRequestMode
}

export async function submitDemoContact(input: DemoContactSubmission): Promise<DemoContactSubmissionResponse> {
  demoContactSubmissionSchema.parse(input)
  return demoContactSubmissionResponseSchema.parse(await apiClient('/contact/demo', {
    method: 'POST',
    headers: { 'X-Source-Path': typeof window !== 'undefined' ? window.location.pathname : '/probar-demo' },
    body: JSON.stringify(input),
  }))
}

export interface AgronautasService {
  getRuntime(): Promise<RuntimeInfo>
  createFieldIntake(input: FieldIntake): Promise<FieldCreated>
  getField(fieldId: string): Promise<FieldOverview>
  getCurrentRisk(fieldId: string): Promise<RiskCurrent>
  getCurrentAlerts(fieldId: string): Promise<AlertsCurrent>
  getAlertsTimeline(fieldId: string): Promise<AlertsTimelineResponse>
  getRiskTimeline(fieldId: string): Promise<RiskTimelineResponse>
  getWeatherTimeline(fieldId: string): Promise<WeatherTimelineResponse>
  getMonitoringStatus(fieldId: string): Promise<MonitoringStatus>
  getDashboard(fieldId: string): Promise<DashboardSnapshot>
  getHydrologyDashboard(fieldId: string): Promise<HydrologyDashboard>
  requestRecompute(fieldId: string): Promise<RecomputeRequestResult>
  askFieldChat(fieldId: string, input: GroundedChatRequest): Promise<GroundedChatResponse>
  askHydrologyCopilot(fieldId: string, input: GroundedChatRequest, onEvent: (event: SseEvent) => void): Promise<void>
}

export function createAgronautasApiService(options: AgronautasApiServiceOptions = {}): AgronautasService {
  const fieldEndpoint = (fieldId: string, suffix: string) => withRequestMode(`/fields/${fieldId}${suffix}`, options.mode)

  return {
    getRuntime: async () => runtimeInfoSchema.parse(await apiClient('/runtime')),
    createFieldIntake: async (input) => fieldCreatedSchema.parse(await apiClient('/fields', { method: 'POST', body: JSON.stringify(input) })),
    getField: async (fieldId) => fieldOverviewSchema.parse(await apiClient(fieldEndpoint(fieldId, ''))),
    getCurrentRisk: async (fieldId) => riskCurrentSchema.parse(await apiClient(fieldEndpoint(fieldId, '/risk/current'))),
    getCurrentAlerts: async (fieldId) => alertsCurrentSchema.parse(await apiClient(fieldEndpoint(fieldId, '/alerts/current'))),
    getAlertsTimeline: async (fieldId) => alertsTimelineResponseSchema.parse(await apiClient(fieldEndpoint(fieldId, '/alerts/timeline'))),
    getRiskTimeline: async (fieldId) => riskTimelineResponseSchema.parse(await apiClient(fieldEndpoint(fieldId, '/risk/timeline'))),
    getWeatherTimeline: async (fieldId) => weatherTimelineResponseSchema.parse(await apiClient(fieldEndpoint(fieldId, '/weather/timeline'))),
    getMonitoringStatus: async (fieldId) => monitoringStatusSchema.parse(await apiClient(fieldEndpoint(fieldId, '/status'))),
    getDashboard: async (fieldId) => dashboardSnapshotSchema.parse(await apiClient(fieldEndpoint(fieldId, '/dashboard'))),
    getHydrologyDashboard: async (fieldId) => hydrologyDashboardSchema.parse(await apiClient(`/fields/${fieldId}/hydrology/dashboard`)),
    requestRecompute: async (fieldId) => recomputeRequestResultSchema.parse(await apiClient(fieldEndpoint(fieldId, '/recompute'), { method: 'POST' })),
    askFieldChat: async (fieldId, input) => groundedChatResponseSchema.parse(await apiClient(`/fields/${fieldId}/chat`, { method: 'POST', body: JSON.stringify(input) })),
    askHydrologyCopilot: (fieldId, input, onToken) => streamHydrologyCopilot(fieldId, input, onToken),
  }
}

export function createAgronautasMockService(): AgronautasService {
  const recomputeRuns = new Map<string, number>()

  return {
    async getRuntime() {
      return runtimeInfoSchema.parse({ mode: 'demo', routePrefix: '/agronautas', compatibilityPrefix: '/agronautas/v1', contractVersion: AGRONAUTAS_CONTRACT_VERSION })
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
    async getAlertsTimeline(fieldId) {
      const alerts = await this.getCurrentAlerts(fieldId)
      return alertsTimelineResponseSchema.parse({ fieldId, items: alerts.alerts })
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
    async getDashboard(fieldId) {
      const [field, risk, alerts, weather] = await Promise.all([this.getField(fieldId), this.getCurrentRisk(fieldId), this.getCurrentAlerts(fieldId), this.getWeatherTimeline(fieldId)])
      const firstWeather = weather.items[0]
      const staleFlags = [...risk.snapshot.degradationReasons, ...alerts.alerts.flatMap((alert) => alert.degradationReasons)]
      const degraded = risk.status !== 'fresh' || alerts.status !== 'fresh' || staleFlags.length > 0 || Boolean(firstWeather?.staleCause)
      return dashboardSnapshotSchema.parse({
        contractVersion: AGRONAUTAS_CONTRACT_VERSION,
        snapshotId: risk.snapshot.snapshotId,
        field: { fieldId, cropCategory: 'cereal', crop: field.crop, provinceCode: 'AR-W', locality: field.locality },
        status: degraded ? 'degraded' : risk.status,
        freshness: degraded ? 'degraded' : risk.status,
        signals: firstWeather ? [
          { signalType: 'weather', status: firstWeather.staleCause ? 'degraded' : 'fresh', evidenceRefs: risk.snapshot.evidenceRefs, confidence: firstWeather.confidence, degradationReasons: firstWeather.staleCause ? ['weather_data_stale'] : [] },
          { signalType: 'hydric_soil', status: 'stale', evidenceRefs: ['soil:inta:2026-06-01T12:00:00Z'], confidence: 0.58, degradationReasons: ['weather_data_stale'] },
          { signalType: 'satellite_vegetation', status: 'missing', evidenceRefs: ['satellite:sentinel:2026-05-20T12:00:00Z'], confidence: 0.22, degradationReasons: ['satellite_data_unavailable'] },
        ] : [],
        risk: { score: risk.snapshot.score, level: risk.snapshot.level, confidence: risk.snapshot.confidence, drivers: risk.snapshot.drivers },
        alerts: alerts.alerts,
        provenance: firstWeather ? [
          { evidenceId: `${firstWeather.provider}:weather:${firstWeather.observedAt}`, provider: firstWeather.provider, signalType: 'weather', observedAt: firstWeather.observedAt, ingestedAt: risk.snapshot.computedAt, sourceUrl: 'https://api.open-meteo.com/', rawHash: 'mock-hash', confidence: firstWeather.confidence, freshness: firstWeather.staleCause ? 'degraded' : 'fresh', providerMode: 'mock', lastSuccessfulObservedAt: firstWeather.observedAt, nextDueAt: risk.snapshot.validUntil, failureReason: firstWeather.staleCause, degradationReasons: firstWeather.staleCause ? ['weather_data_stale'] : [] },
          { evidenceId: 'inta-soil:hydric_soil:2026-06-01T12:00:00.000Z', provider: 'inta-soil', signalType: 'hydric_soil', observedAt: '2026-06-01T12:00:00.000Z', ingestedAt: risk.snapshot.computedAt, sourceUrl: 'https://www.inta.gob.ar/', rawHash: 'mock-soil-hash', confidence: 0.58, freshness: 'stale', providerMode: 'seam', lastSuccessfulObservedAt: '2026-06-01T12:00:00.000Z', nextDueAt: '2026-06-02T12:00:00.000Z', failureReason: 'adapter seam pendiente', degradationReasons: ['weather_data_stale'] },
          { evidenceId: 'sentinel-hub:satellite_vegetation:2026-05-20T12:00:00.000Z', provider: 'sentinel-hub', signalType: 'satellite_vegetation', observedAt: '2026-05-20T12:00:00.000Z', ingestedAt: risk.snapshot.computedAt, sourceUrl: 'https://sentinel.esa.int/', rawHash: 'mock-satellite-hash', confidence: 0.22, freshness: 'missing', providerMode: 'unavailable', lastSuccessfulObservedAt: null, nextDueAt: '2026-06-08T12:00:00.000Z', failureReason: 'satellite_data_unavailable', degradationReasons: ['satellite_data_unavailable'] },
        ] : [],
        scheduler: { lastRunAt: risk.snapshot.computedAt, nextRunAt: risk.snapshot.validUntil, lockStatus: 'available', failures: degraded ? [{ provider: 'sentinel-hub', signalType: 'satellite_vegetation', reason: 'satellite_data_unavailable' }] : [], nextDueBySource: [
          { provider: firstWeather?.provider ?? 'open-meteo', signalType: 'weather', dueAt: risk.snapshot.validUntil, lastSuccessfulObservedAt: firstWeather?.observedAt ?? risk.snapshot.computedAt, overdue: false, cadence: { provider: firstWeather?.provider ?? 'open-meteo', signalType: 'weather', updateCadence: '1h', rateLimit: 'safe hourly', freshnessSla: '2h', researchedAt: '2026-06-01T00:00:00.000Z', sourceRef: 'https://open-meteo.com/' } },
          { provider: 'inta-soil', signalType: 'hydric_soil', dueAt: '2026-06-02T12:00:00.000Z', lastSuccessfulObservedAt: '2026-06-01T12:00:00.000Z', overdue: true, cadence: { provider: 'inta-soil', signalType: 'hydric_soil', updateCadence: '24h', rateLimit: 'daily', freshnessSla: '24h', researchedAt: '2026-06-01T00:00:00.000Z', sourceRef: 'https://www.inta.gob.ar/' } },
          { provider: 'sentinel-hub', signalType: 'satellite_vegetation', dueAt: '2026-06-08T12:00:00.000Z', lastSuccessfulObservedAt: null, overdue: false, cadence: { provider: 'sentinel-hub', signalType: 'satellite_vegetation', updateCadence: '5d', rateLimit: 'scene availability', freshnessSla: 'no verificado', researchedAt: '2026-06-01T00:00:00.000Z', sourceRef: 'https://sentinel.esa.int/' } },
        ] },
        generatedAt: '2026-06-03T00:05:00.000Z',
        lastDataFetchedAt: firstWeather?.observedAt ?? risk.snapshot.computedAt,
        presentation: { disclaimer: 'Los indicadores son soporte operativo y no reemplazan criterio agronómico local.', confidenceLabel: confidenceLabel(risk.snapshot.confidence), sourcesUnavailable: degraded, staleFlags: [...staleFlags, ...(firstWeather?.staleCause ? ['weather_data_stale' as const] : [])] },
      })
    },
    async getHydrologyDashboard(fieldId) {
      return hydrologyDashboardSchema.parse(createMockHydrologyDashboard(fieldId))
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
    async askHydrologyCopilot(fieldId, input, onEvent) {
      const dashboard = await this.getHydrologyDashboard(fieldId)
      const answer = input.message.toLowerCase().includes('patria')
        ? 'Paso de la Patria se referencia dentro de la tarjeta Mercedes. No se mezclan alertas fuera de su zona.'
        : `Copilot Hidrológico: ${dashboard.zone ?? 'zona sin mapear'} tiene ${dashboard.alerts.length} alerta(s) activas y pronóstico INA hasta ${Math.max(...dashboard.forecasts.map((item) => item.forecastHorizonDays ?? 0))} días. Revisá los días 15 a 30 como planificación especulativa, no certeza operativa.`
      const receivedAt = '2026-06-23T13:35:00.000-03:00'
      onEvent({ type: 'metadata', sequence: 1, receivedAt, metadata: { fieldId, model: 'demo-copilot', sources: dashboard.sources, observedAt: dashboard.status.lastSuccessfulObservedAt, limits: ['Pronóstico INA de 15 a 30 días: planificación especulativa'] } })
      answer.split(' ').forEach((token, index) => onEvent({ type: 'token', sequence: index + 2, receivedAt, token: `${token} ` }))
      onEvent({ type: 'done', sequence: answer.split(' ').length + 2, receivedAt })
    },
  }
}

async function streamHydrologyCopilot(fieldId: string, input: GroundedChatRequest, onEvent: (event: SseEvent) => void): Promise<void> {
  const response = await fetch(`/api/agronautas/v1/fields/${fieldId}/copilot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok || !response.body) throw new ApiError(response.status, 'No se pudo abrir el streaming del Copilot Hidrológico')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sequence = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const event of events) {
      const dataLine = event.split('\n').find((line) => line.startsWith('data:'))
      if (!dataLine) continue
      const eventName = event.split('\n').find((line) => line.startsWith('event:'))?.replace(/^event:\s*/, '')
      const payload = JSON.parse(dataLine.replace(/^data:\s*/, '')) as unknown
      const receivedAt = new Date().toISOString()
      sequence += 1
      if (eventName === 'token') {
        const token = typeof payload === 'string' ? payload : (payload as { token?: unknown }).token
        if (typeof token === 'string') onEvent({ type: 'token', sequence, receivedAt, token })
      } else if (eventName === 'metadata') {
        onEvent({ type: 'metadata', sequence, receivedAt, metadata: payload && typeof payload === 'object' ? payload as Record<string, unknown> : {} })
      } else if (eventName === 'done') {
        onEvent({ type: 'done', sequence, receivedAt })
      } else if (eventName === 'error') {
        const error = payload && typeof payload === 'object' && typeof (payload as { message?: unknown }).message === 'string' ? (payload as { message: string }).message : 'El Copilot Hidrológico no está disponible'
        onEvent({ type: 'error', sequence, receivedAt, error })
      }
    }
  }
}

function createMockHydrologyDashboard(fieldId: string): HydrologyDashboard {
  const base = {
    observedAt: '2026-06-23T13:30:00.000-03:00',
    ingestedAt: '2026-06-23T13:35:00.000-03:00',
    lastSuccessfulObservedAt: '2026-06-23T13:30:00.000-03:00',
    quality: 'observed' as const,
    freshness: 'fresh' as const,
  }
  const forecasts = [3, 7, 14, 21, 30].map((day, index) => ({
    ...base,
    source: 'INA' as const,
    stationId: 'ina-paso-de-la-patria',
    value: 4.8 + index * 0.22,
    unit: 'm',
    metric: 'river_height_m' as const,
    quality: 'forecast' as const,
    forecastHorizonDays: day,
    confidence: day > 14 ? 'speculative' as const : 'normal' as const,
    sourceUrl: 'https://www.ina.gob.ar/',
  }))

  return {
    contractVersion: 'hydrology-dashboard-v1',
    fieldId,
    zone: 'Mercedes',
    sources: ['PNA', 'INA', 'INMET', 'SMN'],
    stations: [
      { id: 'pna-paso-de-la-patria', source: 'PNA', stationName: 'Paso de la Patria', riverName: 'Paraná', zone: 'Mercedes', sourceUrl: 'https://contenidosweb.prefecturanaval.gob.ar/alturas/' },
      { id: 'ina-paso-de-la-patria', source: 'INA', stationName: 'Paso de la Patria', riverName: 'Paraná', zone: 'Mercedes', sourceUrl: 'https://www.ina.gob.ar/' },
    ],
    status: { riskLevel: 'high', freshness: 'fresh', quality: 'observed', recommendation: 'Revisar caminos bajos y movimiento de maquinaria antes de nuevas lluvias.', lastSuccessfulObservedAt: base.lastSuccessfulObservedAt },
    heights: [{ ...base, source: 'PNA', stationId: 'pna-paso-de-la-patria', value: 5.42, unit: 'm', metric: 'river_height_m', tendency: 'Crece', sourceUrl: 'https://contenidosweb.prefecturanaval.gob.ar/alturas/' }],
    trends: [{ ...base, source: 'PNA', stationId: 'pna-paso-de-la-patria', value: 0.18, unit: 'm/24h', metric: 'river_height_m', tendency: 'Crece', sourceUrl: 'https://contenidosweb.prefecturanaval.gob.ar/alturas/' }],
    forecasts,
    rain: [{ ...base, source: 'SMN', stationId: 'smn-corrientes', value: 46, unit: 'mm/24h', metric: 'rain_mm', sourceUrl: 'https://www.smn.gob.ar/' }],
    alerts: [{ ...base, source: 'SMN', stationId: 'paso-de-la-patria', value: 1, unit: 'alerta', metric: 'storm_alert', sourceUrl: 'https://www.smn.gob.ar/alertas' }],
  }
}

function confidenceLabel(confidence: number): 'alta' | 'media' | 'baja' {
  if (confidence >= 0.75) return 'alta'
  if (confidence >= 0.5) return 'media'
  return 'baja'
}

export function resolveAgronautasService(options: AgronautasApiServiceOptions = {}): AgronautasService {
  return createAgronautasApiService(options)
}

function withRequestMode(endpoint: string, mode?: AgronautasRequestMode): string {
  if (mode !== AGRONAUTAS_REQUEST_MODES.DEMO) return endpoint
  return `${endpoint}?mode=${encodeURIComponent(AGRONAUTAS_REQUEST_MODES.DEMO)}`
}
