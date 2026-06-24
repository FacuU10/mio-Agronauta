import { randomUUID } from 'node:crypto'
import { Router, type Response } from 'express'
import {
  agronautasContractErrorSchema,
  groundedChatRequestSchema,
  hydrologyGovernmentDashboardResponseSchema,
  hydrologyGovernmentIngestRequestSchema,
  hydrologyGovernmentIngestResponseSchema,
  hydrologyGovernmentMunicipalitiesResponseSchema,
  type HydrologyDenseContextV1,
  type HydrologySource,
  type HydrologyTelemetry,
} from '@repo/zod-schemas'
import { HydrologyCopilotService, HydrologyRepository, type MunicipalityTelemetryDashboard, type MunicipalityTelemetryView } from '@repo/hydrology-engine'
import { getPostgresPool } from '../../infrastructure/database/postgres/pool'

interface HydrologyGovernmentRouterDeps {
  hydrologyRepository: Pick<HydrologyRepository, 'getMunicipalityTelemetryOverview' | 'getMunicipalityTelemetryDashboard'>
  hydrologyCopilotService: Pick<HydrologyCopilotService, 'streamChat'>
  ingestionRunner: (input: { source?: HydrologySource; reason?: string }) => Promise<{ runId: string; status: 'queued' | 'started' | 'completed'; sources: HydrologySource[] }>
}

const ALL_SOURCES: HydrologySource[] = ['PNA', 'INA', 'INMET', 'SMN']
const PROVINCE = { provinceCode: 'AR-W', name: 'Corrientes' }
const EXCLUDED_TOPIC_RE = /(tiempo\s+de\s+(?:llegada|propagaci[oó]n|onda|lag)|lag\s*time|wave\s+(?:routing|propagation)|propagaci[oó]n\s+de\s+onda|caudal|descarga|turbinad[oa]s?|vertid[oa]s?|spilled|turbined|routing\s+hidr[aá]ulico|muskingum|evacuaci[oó]n|autoridad\s+de\s+evacuaci[oó]n)/i
const OUT_OF_SCOPE_MESSAGE = 'Entiendo la urgencia, pero esos cálculos están fuera del alcance de la Fase 1 de Iberá-Alerta. No calculo tiempos de propagación, routing de onda, caudales/descargas de represas, flujos turbinados o vertidos, ni decisiones de evacuación. Puedo limitar la respuesta a observaciones y pronósticos oficiales disponibles de PNA, INA, INMET y SMN.'

export function createHydrologyGovernmentRouter(deps: Partial<HydrologyGovernmentRouterDeps> = {}): Router {
  const resolved: HydrologyGovernmentRouterDeps = {
    hydrologyRepository: deps.hydrologyRepository ?? new HydrologyRepository(getPostgresPool()),
    hydrologyCopilotService: deps.hydrologyCopilotService ?? new HydrologyCopilotService(),
    ingestionRunner: deps.ingestionRunner ?? defaultIngestionRunner,
  }
  const router = Router()

  router.get('/municipalities', async (_req, res) => {
    const municipalities = await resolved.hydrologyRepository.getMunicipalityTelemetryOverview(PROVINCE.provinceCode)
    const payload = hydrologyGovernmentMunicipalitiesResponseSchema.parse({
      contractVersion: 'hydrology-government-municipalities-v1',
      province: PROVINCE,
      sourceFreshness: sourceFreshnessFor(municipalities.flatMap((item) => item.latestTelemetry)),
      provinceAlerts: municipalities.flatMap(toProvinceAlerts),
      municipalities,
    })
    return res.json(payload)
  })

  router.get('/municipalities/:id/dashboard', async (req, res) => {
    const municipality = await resolved.hydrologyRepository.getMunicipalityTelemetryDashboard(req.params['id'] ?? '')
    if (!municipality) return respondContractError(res, 404, 'Municipio no encontrado')

    const payload = hydrologyGovernmentDashboardResponseSchema.parse({
      contractVersion: 'hydrology-government-dashboard-v1',
      municipality: municipality.municipality,
      gaugeMappings: municipality.gaugeMappings,
      telemetryCards: municipality.latestTelemetry.filter((item) => item.metric !== 'storm_alert'),
      inaPredictions30d: municipality.latestTelemetry.filter((item) => item.source === 'INA' && item.forecastHorizonDays !== undefined && item.forecastHorizonDays <= 30),
      alerts: municipality.latestTelemetry.filter((item) => item.metric === 'storm_alert'),
      provenance: sourceFreshnessFor(municipality.latestTelemetry),
    })
    return res.json(payload)
  })

  router.post('/ingest', async (req, res) => {
    const parsed = hydrologyGovernmentIngestRequestSchema.safeParse(req.body)
    if (!parsed.success) return respondContractError(res, 400, 'Payload inválido', { issues: parsed.error.flatten() })

    const result = await resolved.ingestionRunner(parsed.data)
    return res.status(202).json(hydrologyGovernmentIngestResponseSchema.parse({ contractVersion: 'hydrology-government-ingest-v1', ...result }))
  })

  router.post('/municipalities/:id/copilot/chat', async (req, res) => {
    const parsed = groundedChatRequestSchema.safeParse(req.body)
    if (!parsed.success) return respondContractError(res, 400, 'Payload inválido', { issues: parsed.error.flatten() })

    const municipality = await resolved.hydrologyRepository.getMunicipalityTelemetryDashboard(req.params['id'] ?? '')
    if (!municipality) return respondContractError(res, 404, 'Municipio no encontrado')

    startSse(res)
    if (EXCLUDED_TOPIC_RE.test(parsed.data.message)) {
      writeSse(res, 'metadata', { contractVersion: 'hydrology-government-copilot-v1', municipalityId: municipality.municipality.id, outOfScope: true })
      writeSse(res, 'token', OUT_OF_SCOPE_MESSAGE)
      writeSse(res, 'done', { outOfScope: true })
      return res.end()
    }

    try {
      for await (const event of resolved.hydrologyCopilotService.streamChat({ message: parsed.data.message, context: toMunicipalityCopilotContext(municipality) })) {
        writeSse(res, event.type, event.data)
      }
      return res.end()
    } catch (error) {
      writeSse(res, 'error', { message: 'El copiloto hidrológico no está disponible.', reason: error instanceof Error ? error.message : 'unknown_error' })
      return res.end()
    }
  })

  return router
}

function sourceFreshnessFor(telemetry: HydrologyTelemetry[]) {
  return ALL_SOURCES.map((source) => {
    const rows = telemetry.filter((item) => item.source === source).sort((a, b) => a.lastSuccessfulObservedAt.localeCompare(b.lastSuccessfulObservedAt))
    const latest = rows.at(-1)
    return {
      source,
      lastSuccessfulObservedAt: latest?.lastSuccessfulObservedAt ?? null,
      freshness: latest?.freshness ?? 'degraded',
      label: latest?.lastSuccessfulObservedAt ? `Último dato obtenido: ${formatArgentinaDateTime(latest.lastSuccessfulObservedAt)}` : 'Último dato obtenido: no disponible',
    }
  })
}

function toProvinceAlerts(municipality: MunicipalityTelemetryView) {
  return municipality.latestTelemetry
    .filter((item) => item.metric === 'storm_alert')
    .map((item) => ({
      zone: municipality.name,
      source: item.source,
      stationId: item.stationId,
      observedAt: item.observedAt,
      lastSuccessfulObservedAt: item.lastSuccessfulObservedAt,
      message: item.value === null ? 'Alerta oficial vigente o en seguimiento.' : `Alerta oficial: ${item.value} ${item.unit}`,
      sourceUrl: item.sourceUrl,
    }))
}

function toMunicipalityCopilotContext(municipality: MunicipalityTelemetryDashboard): HydrologyDenseContextV1 {
  const sources = [...new Set(municipality.latestTelemetry.map((item) => item.source))]
  const latest = sourceFreshnessFor(municipality.latestTelemetry).map((item) => item.lastSuccessfulObservedAt).filter(Boolean).sort().at(-1) ?? null
  return {
    contractVersion: 'hydrology-dense-context-v1',
    fieldId: municipality.municipality.id,
    zone: null,
    sources,
    stations: [],
    snapshot: {
      riskLevel: 'unknown',
      freshness: municipality.latestTelemetry.length > 0 ? 'fresh' : 'degraded',
      quality: municipality.latestTelemetry.length > 0 ? 'ok' : 'missing',
      recommendation: 'Usar únicamente observaciones, alertas y pronósticos oficiales disponibles para el municipio.',
      lastSuccessfulObservedAt: latest,
    },
    telemetry: municipality.latestTelemetry,
  }
}

function formatArgentinaDateTime(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function startSse(res: Response) {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
}

function writeSse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function respondContractError(res: Response, status: number, message: string, details?: Record<string, unknown>) {
  return res.status(status).json(agronautasContractErrorSchema.parse({ contractVersion: '1.0.0', code: 'INVALID_CONTRACT', message, retryable: false, details }))
}

async function defaultIngestionRunner(input: { source?: HydrologySource }): Promise<{ runId: string; status: 'queued'; sources: HydrologySource[] }> {
  return { runId: `manual-${randomUUID()}`, status: 'queued', sources: input.source ? [input.source] : ALL_SOURCES }
}

export type { HydrologyGovernmentRouterDeps }
