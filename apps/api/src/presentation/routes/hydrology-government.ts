import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { ZodError } from 'zod'
import {
  agronautasContractErrorSchema,
  groundedChatRequestSchema,
  hydrologyGovernmentDashboardResponseSchema,
  hydrologyGovernmentIngestRequestSchema,
  hydrologyGovernmentIngestResponseSchema,
  hydrologyGovernmentMunicipalitiesResponseSchema,
  type HydrologyDenseContextV1,
  type HydrologyGovernmentHttpSummary,
  type HydrologyGovernmentIngestDiagnostic,
  type HydrologySource,
  type HydrologyTelemetry,
} from '@repo/zod-schemas'
import { HydrologyCopilotService, HydrologyRepository, InaHttpClient, InmetHttpClient, PnaHttpClient, SmnHttpClient, type MunicipalityTelemetryDashboard, type MunicipalityTelemetryView, type NormalizedHydrologyTelemetry, type ScraperResult } from '@repo/hydrology-engine'
import { getPostgresPool } from '../../infrastructure/database/postgres/pool'
import { logger } from '../../infrastructure/observability/logger'

interface HydrologyGovernmentRouterDeps {
  hydrologyRepository: Pick<HydrologyRepository, 'getMunicipalityTelemetryOverview' | 'getMunicipalityTelemetryDashboard'> & Partial<Pick<HydrologyRepository, 'saveIngestionRun'>>
  hydrologyCopilotService: Pick<HydrologyCopilotService, 'streamChat'>
  ingestionRunner: (input: { source?: HydrologySource; reason?: string; proofRunId?: string; runId?: string }) => Promise<GovernmentIngestionResponse>
  ingestionCoordinator: HydrologyIngestionCoordinator
}

type GovernmentIngestionRepository = Pick<HydrologyRepository, 'saveTelemetryDeduped'> & Partial<Pick<HydrologyRepository, 'saveIngestionRun'>>
type GovernmentSourceClient = { fetchTelemetry(signal?: AbortSignal): Promise<ScraperResult>; timeoutMs?: number }
type GovernmentIngestionSourceResult = { source: HydrologySource; status: 'success' | 'failed' | 'empty' | 'skipped'; recordsIngested: number; errorMessage?: string; provenanceUrl?: string; observedFrom?: string; observedTo?: string; httpSummary?: HydrologyGovernmentHttpSummary; diagnostic?: HydrologyGovernmentIngestDiagnostic }
export type GovernmentIngestionResponse = { contractVersion?: 'hydrology-government-ingest-v1'; runId?: string; proofRunId?: string; statusPath?: string; status: 'queued' | 'started' | 'completed' | 'partial' | 'failed'; requestedSources?: HydrologySource[]; results?: GovernmentIngestionSourceResult[]; sources: HydrologySource[]; sourceResults?: Array<{ source: HydrologySource; status: 'success' | 'failed'; recordsIngested: number; errorMessage?: string }> }
type CompletedGovernmentIngestionResponse = { runId: string; proofRunId: string; status: 'completed' | 'partial' | 'failed'; requestedSources: HydrologySource[]; results: GovernmentIngestionSourceResult[]; sources: HydrologySource[]; sourceResults: Array<{ source: HydrologySource; status: 'success' | 'failed'; recordsIngested: number; errorMessage?: string }> }
type HydrologyStartupOperation = 'runner_execution' | 'seed_municipalities'
type SanitizedErrorDetail = { name: string; message: string; code?: string }
type HydrologyStartupFailureDetails = { operation: HydrologyStartupOperation; errorName: string; message?: string; code?: string; aggregateErrors?: SanitizedErrorDetail[] }
export type HydrologyIngestionInput = { source?: HydrologySource; reason?: string; proofRunId?: string; runId?: string }
export interface HydrologyIngestionCoordinator {
  start(input: HydrologyIngestionInput, key: string): { ok: true; runId: string; proofRunId: string; status: 'queued'; promise: Promise<GovernmentIngestionResponse>; existing: boolean } | { ok: false; retryAfterMs: number }
  observe(runId: string, waitMs?: number): Promise<GovernmentIngestionResponse | undefined>
  run(input: HydrologyIngestionInput, key?: string): Promise<GovernmentIngestionResponse>
}

interface GovernmentIngestionRunnerDeps {
  repository?: GovernmentIngestionRepository
  clients?: Partial<Record<HydrologySource, GovernmentSourceClient>>
  seedDb?: { query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }> }
  now?: () => Date
  allowFixtureFallback?: boolean
}

const ALL_SOURCES: HydrologySource[] = ['PNA', 'INA', 'INMET', 'SMN']
const DEFAULT_SOURCE_RUNNER_TIMEOUT_MS = 12_000
const SOURCE_RUNNER_TIMEOUT_CUSHION_MS = 2_000
const SOURCE_RUNNER_TIMEOUT_CAP_MS = 60_000
const INGEST_RATE_WINDOW_MS = 60_000
const INGEST_RATE_LIMIT = 4
const INGEST_OBSERVATION_WAIT_CAP_MS = 60_000
const INGEST_OBSERVATION_TTL_MS = 15 * 60_000
const INGEST_OBSERVATION_MAX = 32
const PROVINCE = { provinceCode: 'AR-W', name: 'Corrientes' }
type FloodRiskRiver = 'Paraná' | 'Uruguay'
type PnaFloodRiskPort = {
  id: string
  localityId: string
  name: string
  provinceCode: 'AR-W'
  river: FloodRiskRiver
  alertHeightM: number
  evacuationHeightM: number
  primaryPnaPortId: string
  secondaryPnaPortIds: string[]
  inaStationIds: string[]
  smnRegionIds: string[]
  inmetStationIds: string[]
  boundaryWkt: string
  sourceMetadata: { source: 'PNA'; thresholdUnit: 'm'; thresholdReference: 'local_gauge_zero' }
}

export const AGRICULTURAL_CENTERS = [
  { id: 'gobernador-virasoro', name: 'Gobernador Virasoro', domain: 'agriculture' as const },
  { id: 'goya', name: 'Goya', domain: 'agriculture' as const },
]

export const PNA_FLOOD_RISK_PORTS: PnaFloodRiskPort[] = [
  pnaPort('ituzaingo', 'ituzaingo-corrientes', 'Ituzaingó', 'Paraná', 4.5, 5, -56.70, -27.55),
  pnaPort('ita-ibate', 'ita-ibate', 'Itá Ibaté', 'Paraná', 5.5, 6, -57.35, -27.43),
  pnaPort('yahape', 'yahape', 'Yahapé', 'Paraná', 6, 6.5, -57.65, -27.38),
  pnaPort('itati', 'itati', 'Itatí', 'Paraná', 7, 7.5, -58.25, -27.28),
  pnaPort('paso-de-la-patria', 'paso-de-la-patria', 'Paso de la Patria', 'Paraná', 6.5, 7, -58.57, -27.32, { primaryPnaPortId: 'paso_de_la_patria', secondaryPnaPortIds: ['corrientes'] }),
  pnaPort('corrientes', 'corrientes-capital', 'Corrientes Capital', 'Paraná', 6.5, 7, -58.80, -27.48, { secondaryPnaPortIds: ['paso_de_la_patria'], inaStationIds: ['6764'] }),
  pnaPort('empedrado', 'empedrado', 'Empedrado', 'Paraná', 6.2, 6.7, -58.78, -27.95),
  pnaPort('bella-vista', 'bella-vista', 'Bella Vista', 'Paraná', 5.7, 6.1, -58.68, -28.50, { inaStationIds: ['38469'] }),
  pnaPort('goya', 'goya-corrientes', 'Goya', 'Paraná', 5.2, 5.7, -59.26, -29.14),
  pnaPort('esquina', 'esquina', 'Esquina', 'Paraná', 5.1, 5.6, -59.53, -30.02),
  pnaPort('garruchos', 'garruchos', 'Garruchos', 'Uruguay', 12, 13, -55.65, -28.18),
  pnaPort('santo-tome', 'santo-tome', 'Santo Tomé', 'Uruguay', 10.5, 11.5, -56.04, -28.55, { primaryPnaPortId: 'santo_tome' }),
  pnaPort('alvear', 'alvear', 'Alvear', 'Uruguay', 9, 10, -56.55, -29.10),
  pnaPort('la-cruz', 'la-cruz', 'La Cruz', 'Uruguay', 8, 9, -56.65, -29.18),
  pnaPort('yapeyu', 'yapeyu', 'Yapeyú', 'Uruguay', 7.5, 8.5, -56.82, -29.47),
  pnaPort('paso-de-los-libres', 'paso-de-los-libres', 'Paso de los Libres', 'Uruguay', 7.5, 8.5, -57.08, -29.72, { primaryPnaPortId: 'paso_de_los_libres', inaStationIds: ['33988'] }),
  pnaPort('monte-caseros', 'monte-caseros', 'Monte Caseros', 'Uruguay', 7.5, 8.5, -57.65, -30.25),
]
const INA_SERIES_STATIONS = [
  { id: '6764', name: 'Corrientes', river: 'Paraná' },
  { id: '33988', name: 'Paso de los Libres', river: 'Uruguay' },
  { id: '38469', name: 'Bella Vista', river: 'Paraná' },
] as const
const EXCLUDED_TOPIC_RE = /(tiempo\s+de\s+(?:llegada|propagaci[oó]n|onda|lag)|lag\s*time|wave\s+(?:routing|propagation)|propagaci[oó]n\s+de\s+onda|caudal|descarga|turbinad[oa]s?|vertid[oa]s?|spilled|turbined|routing\s+hidr[aá]ulico|muskingum|evacuaci[oó]n|autoridad\s+de\s+evacuaci[oó]n)/i
const OUT_OF_SCOPE_MESSAGE = 'Entiendo la urgencia, pero esos cálculos están fuera del alcance de la Fase 1 de Iberá-Alerta. No calculo tiempos de propagación, routing de onda, caudales/descargas de represas, flujos turbinados o vertidos, ni decisiones de evacuación. Puedo limitar la respuesta a observaciones y pronósticos oficiales disponibles de PNA, INA, INMET y SMN.'

export function createHydrologyGovernmentRouter(deps: Partial<HydrologyGovernmentRouterDeps> = {}): Router {
  const hydrologyRepository = deps.hydrologyRepository ?? new HydrologyRepository(getPostgresPool())
  const ingestionRunner = deps.ingestionRunner ?? createGovernmentIngestionRunner()
  const resolved: HydrologyGovernmentRouterDeps = {
    hydrologyRepository,
    hydrologyCopilotService: deps.hydrologyCopilotService ?? new HydrologyCopilotService(),
    ingestionRunner,
    ingestionCoordinator: deps.ingestionCoordinator ?? createHydrologyIngestionCoordinator(ingestionRunner, hydrologyRepository),
  }
  const router = Router()

  router.get('/municipalities', async (req, res) => {
    const requestId = requestIdFor(req)
    logger.info({ requestId, phase: 'repository_query', provinceCode: PROVINCE.provinceCode }, 'Government hydrology municipalities overview requested')
    let municipalities: MunicipalityTelemetryView[]
    try {
      municipalities = (await resolved.hydrologyRepository.getMunicipalityTelemetryOverview(PROVINCE.provinceCode)).map((municipality) => ({
        ...municipality,
        officialAlerts: municipality.officialAlerts ?? [],
        latestTelemetry: municipality.latestTelemetry.filter((item) => !item.sourceUrl?.startsWith('offline-fixture://')),
      }))
      logger.info({ requestId, phase: 'repository_query', municipalityCount: municipalities.length, telemetryCount: municipalities.flatMap((item) => item.latestTelemetry).length }, 'Government hydrology municipalities repository query succeeded')
    } catch (error) {
      logHydrologyRouteError(requestId, 'repository_query', error)
      return respondHydrologyUnavailable(res, 503, requestId, 'repository_query')
    }

    const payloadInput = {
      contractVersion: 'hydrology-government-municipalities-v1',
      province: PROVINCE,
      sourceFreshness: sourceFreshnessFor(municipalities.flatMap((item) => item.latestTelemetry)),
      provinceAlerts: municipalities.flatMap(toProvinceAlerts),
      municipalities,
    }
    const parsed = hydrologyGovernmentMunicipalitiesResponseSchema.safeParse(payloadInput)
    if (parsed.success) return res.setHeader('x-request-id', requestId).json(parsed.data)

    logHydrologyRouteError(requestId, 'contract_validation', parsed.error)
    const fallbackMunicipalities = municipalities.map((item) => ({ ...item, latestTelemetry: [] }))
    const fallback = hydrologyGovernmentMunicipalitiesResponseSchema.safeParse({
      contractVersion: 'hydrology-government-municipalities-v1',
      province: PROVINCE,
      sourceFreshness: sourceFreshnessFor([]),
      provinceAlerts: [],
      municipalities: fallbackMunicipalities,
    })
    if (fallback.success) {
      logger.warn({ requestId, phase: 'contract_validation', municipalityCount: fallback.data.municipalities.length }, 'Government hydrology municipalities returned telemetry-stripped fallback after contract validation failure')
      return res.setHeader('x-request-id', requestId).json(fallback.data)
    }
    logHydrologyRouteError(requestId, 'contract_validation_fallback', fallback.error)
    return respondHydrologyUnavailable(res, 503, requestId, 'contract_validation')
  })

  router.get('/municipalities/debug', (req, res) => {
    const requestId = requestIdFor(req)
    const diagnostics = {
      contractVersion: 'hydrology-government-diagnostics-v1',
      requestId,
      nodeEnv: process.env['NODE_ENV'] ?? 'unset',
      hasDatabaseUrl: Boolean(process.env['DATABASE_URL']),
      hydrologyProvinceCode: PROVINCE.provinceCode,
      repository: 'HydrologyRepository.getMunicipalityTelemetryOverview',
    }
    logger.info(diagnostics, 'Government hydrology municipalities debug diagnostics requested')
    return res.setHeader('x-request-id', requestId).json(diagnostics)
  })

  router.get('/municipalities/:id/dashboard', async (req, res) => {
    const municipality = await resolved.hydrologyRepository.getMunicipalityTelemetryDashboard(req.params['id'] ?? '')
    if (!municipality) return respondContractError(res, 404, 'Municipio no encontrado')

    const payload = hydrologyGovernmentDashboardResponseSchema.parse({
      contractVersion: 'hydrology-government-dashboard-v1',
      municipality: { ...municipality.municipality, officialAlerts: municipality.officialAlerts ?? [] },
      gaugeMappings: municipality.gaugeMappings,
      telemetryCards: municipality.latestTelemetry.filter((item) => item.metric !== 'storm_alert'),
      inaPredictions30d: municipality.latestTelemetry.filter((item) => item.source === 'INA' && item.forecastHorizonDays != null && item.forecastHorizonDays <= 30),
      alerts: municipality.latestTelemetry.filter((item) => item.metric === 'storm_alert'),
      provenance: sourceFreshnessFor(municipality.latestTelemetry),
    })
    return res.json(payload)
  })

  router.get('/ingest/:runId', async (req, res) => {
    const requestId = requestIdFor(req)
    const runId = req.params['runId'] ?? ''
    const observed = await resolved.ingestionCoordinator.observe(runId, boundedObservationWait(req.query['waitMs']))
    if (!observed) {
      return res.status(404).setHeader('x-request-id', requestId).json({
        contractVersion: '1.0.0',
        code: 'HYDROLOGY_INGEST_NOT_FOUND',
        message: 'La ejecución de ingesta no está disponible para observación.',
        retryable: false,
        details: { requestId },
      })
    }
    return res
      .setHeader('x-request-id', requestId)
      .setHeader('Cache-Control', 'no-store')
      .json(hydrologyGovernmentIngestResponseSchema.parse({ ...observed, contractVersion: 'hydrology-government-ingest-v1' }))
  })

  router.post('/ingest', async (req, res) => {
    if (!isHydrologyIngestAuthorized(req)) return respondHydrologyIngestUnauthorized(res)
    const parsed = hydrologyGovernmentIngestRequestSchema.safeParse(req.body)
    if (!parsed.success) return respondContractError(res, 400, 'Payload inválido', { issues: parsed.error.flatten() })
    const runId = `manual-${randomUUID()}`
    const proofRunId = parsed.data.proofRunId?.trim() || runId
    const admission = resolved.ingestionCoordinator.start({ ...parsed.data, runId, proofRunId }, req.ip || 'unknown')
    if (!admission.ok) return res.setHeader('Retry-After', String(Math.ceil(admission.retryAfterMs / 1000))).status(429).json({ ...agronautasContractErrorSchema.parse({ contractVersion: '1.0.0', code: 'INVALID_CONTRACT', message: 'La ingesta hidrológica está limitada temporalmente.', retryable: true }), details: { retryAfterMs: admission.retryAfterMs } })

    const responseRunId = admission.runId
    const responseProofRunId = admission.proofRunId
    const requestedSources = parsed.data.source ? [parsed.data.source] : ALL_SOURCES
    void admission.promise
      .then((result) => logger.info({ runId: responseRunId, proofRunId: responseProofRunId, status: result.status, sources: result.results?.map(({ source, status, recordsIngested }) => ({ source, status, recordsIngested })) ?? [] }, 'Government hydrology ingestion completed in background'))
      .catch((error) => {
        const startupFailure = describeHydrologyStartupFailure(error, 'runner_execution')
        logger.error({ runId: responseRunId, proofRunId: responseProofRunId, ...startupFailure }, 'Government hydrology ingestion failed in background')
      })
      .finally(() => undefined)
      .catch(() => undefined)

    return res.status(202).json(hydrologyGovernmentIngestResponseSchema.parse({
      contractVersion: 'hydrology-government-ingest-v1',
      runId: responseRunId,
      proofRunId: responseProofRunId,
      statusPath: `/api/hydrology/ingest/${encodeURIComponent(responseRunId)}`,
      status: 'queued',
      requestedSources,
      results: [],
      sources: requestedSources,
      sourceResults: [],
    }))
  })

  router.post('/ingest/verify', (req, res) => {
    if (!isHydrologyIngestAuthorized(req)) return respondHydrologyIngestUnauthorized(res)
    return res
      .setHeader('Cache-Control', 'no-store')
      .status(200)
      .json({ contractVersion: '1.0.0', authorized: true })
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
       for await (const event of resolved.hydrologyCopilotService.streamChat({ message: parsed.data.message, context: buildMunicipalCopilotContext(municipality) })) {
        writeSse(res, event.type, event.data)
      }
      return res.end()
    } catch (error) {
      writeSse(res, 'error', { message: 'El copiloto hidrológico no está disponible.', reason: 'upstream_unavailable' })
      return res.end()
    }
  })

  return router
}

function sourceFreshnessFor(telemetry: HydrologyTelemetry[]) {
  return ALL_SOURCES.map((source) => {
    const rows = telemetry.filter((item) => item.source === source && !item.sourceUrl?.startsWith('offline-fixture://')).sort((a, b) => a.lastSuccessfulObservedAt.localeCompare(b.lastSuccessfulObservedAt))
    const latest = rows.at(-1)
    return {
      source,
      lastSuccessfulObservedAt: latest?.lastSuccessfulObservedAt ?? null,
      freshness: latest?.freshness ?? 'degraded',
      label: latest?.lastSuccessfulObservedAt ? `Último dato obtenido: ${formatArgentinaDateTime(latest.lastSuccessfulObservedAt)}` : 'Fuente oficial no disponible',
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

export function buildMunicipalCopilotContext(municipality: MunicipalityTelemetryDashboard): HydrologyDenseContextV1 {
  const zone = MUNICIPAL_COPILOT_ZONES.includes(municipality.municipality.name as MunicipalCopilotZone) ? municipality.municipality.name as MunicipalCopilotZone : null
  const telemetry = zone === null ? [] : municipality.latestTelemetry
  const sources = [...new Set(telemetry.map((item) => item.source))]
  const latest = zone === null ? null : sourceFreshnessFor(telemetry).map((item) => item.lastSuccessfulObservedAt).filter(Boolean).sort().at(-1) ?? null
  return {
    contractVersion: 'hydrology-dense-context-v1',
    fieldId: municipality.municipality.id,
    zone,
    sources,
    stations: [],
    snapshot: {
      riskLevel: 'unknown',
      freshness: telemetry.length > 0 ? 'fresh' : 'degraded',
      quality: telemetry.length > 0 ? 'ok' : 'missing',
      recommendation: 'Usar únicamente observaciones, alertas y pronósticos oficiales disponibles para el municipio.',
      lastSuccessfulObservedAt: latest,
    },
    telemetry,
  }
}

const MUNICIPAL_COPILOT_ZONES = ['Mercedes', 'Ituzaingó', 'Virasoro'] as const
type MunicipalCopilotZone = (typeof MUNICIPAL_COPILOT_ZONES)[number]

function createIngestAdmission() {
  const requests = new Map<string, number[]>()
  return {
    tryAcquire(key: string): { ok: true; release: () => void } | { ok: false; retryAfterMs: number } {
      const now = Date.now()
      const recent = (requests.get(key) ?? []).filter((startedAt) => now - startedAt < INGEST_RATE_WINDOW_MS)
      if (recent.length >= INGEST_RATE_LIMIT) return { ok: false, retryAfterMs: Math.max(1_000, INGEST_RATE_WINDOW_MS - (now - (recent[0] ?? now))) }
      requests.set(key, [...recent, now])
      return { ok: true, release: () => undefined }
    },
  }
}

export function createHydrologyIngestionCoordinator(runner: (input: HydrologyIngestionInput) => Promise<GovernmentIngestionResponse> = createGovernmentIngestionRunner(), failureRepository?: Partial<Pick<HydrologyRepository, 'saveIngestionRun'>>): HydrologyIngestionCoordinator {
  const admission = createIngestAdmission()
  const repository = failureRepository ?? new HydrologyRepository(getPostgresPool())
  const active = new Map<string, { runId: string; proofRunId: string; promise: Promise<GovernmentIngestionResponse> }>()
  const observations = new Map<string, { response: GovernmentIngestionResponse; promise: Promise<GovernmentIngestionResponse>; expiresAt: number }>()
  const pruneObservations = (now = Date.now()) => {
    for (const [runId, observation] of observations) if (observation.expiresAt <= now) observations.delete(runId)
    while (observations.size > INGEST_OBSERVATION_MAX) observations.delete(observations.keys().next().value as string)
  }
  const start = (input: HydrologyIngestionInput, key: string) => {
    const sourceKey = input.source ?? 'ALL'
    const existing = active.get(sourceKey)
    if (existing) return { ok: true as const, ...existing, status: 'queued' as const, existing: true }
    const runId = input.runId?.trim() || `manual-${randomUUID()}`
    const proofRunId = input.proofRunId?.trim() || runId
    const acquired = admission.tryAcquire(key)
    if (!acquired.ok) return acquired
    const requestedSources = input.source ? [input.source] : ALL_SOURCES
    const queued: GovernmentIngestionResponse = { contractVersion: 'hydrology-government-ingest-v1', runId, proofRunId, status: 'queued', requestedSources, results: [], sources: requestedSources, sourceResults: [] }
    const promise = Promise.resolve()
      .then(() => runner({ ...input, runId, proofRunId: input.proofRunId?.trim() || undefined }))
      .catch(async (error) => {
        await persistHydrologyRunFailure(repository, input.source ? [input.source] : ALL_SOURCES, proofRunId, error)
        throw error
      })
    const observedPromise = promise
      .then((response) => {
        observations.set(runId, { response, promise: observedPromise, expiresAt: Date.now() + INGEST_OBSERVATION_TTL_MS })
        pruneObservations()
        return response
      })
      .catch(() => {
        const response: GovernmentIngestionResponse = { contractVersion: 'hydrology-government-ingest-v1', runId, proofRunId, status: 'failed', requestedSources, results: requestedSources.map((source) => ({ source, status: 'failed', recordsIngested: 0, errorMessage: 'Hydrology ingestion startup failed' })), sources: requestedSources, sourceResults: requestedSources.map((source) => ({ source, status: 'failed', recordsIngested: 0, errorMessage: 'Hydrology ingestion startup failed' })) }
        observations.set(runId, { response, promise: observedPromise, expiresAt: Date.now() + INGEST_OBSERVATION_TTL_MS })
        pruneObservations()
        return response
      })
    observations.set(runId, { response: queued, promise: observedPromise, expiresAt: Date.now() + INGEST_OBSERVATION_TTL_MS })
    pruneObservations()
    active.set(sourceKey, { runId, proofRunId, promise })
    void promise.finally(() => { if (active.get(sourceKey)?.promise === promise) active.delete(sourceKey); acquired.release() }).catch(() => undefined)
    return { ok: true as const, runId, proofRunId, status: 'queued' as const, promise, existing: false }
  }
  const observe = async (runId: string, waitMs = 0) => {
    pruneObservations()
    const observation = observations.get(runId)
    if (!observation || observation.response.status !== 'queued' || waitMs <= 0) return observation?.response
    await waitForObservation(observation.promise, Math.min(waitMs, INGEST_OBSERVATION_WAIT_CAP_MS))
    return observations.get(runId)?.response ?? observation.response
  }
  return { start, observe, run: (input, key = 'scheduler') => { const result = start(input, key); return result.ok ? result.promise : Promise.reject(new Error(`hydrology ingest admission retry after ${result.retryAfterMs}ms`)) } }
}

export async function waitForObservation(promise: Promise<GovernmentIngestionResponse>, waitMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, waitMs)
    void promise.then(() => { clearTimeout(timeout); resolve() }, () => { clearTimeout(timeout); resolve() })
  })
}

function boundedObservationWait(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : 0
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, INGEST_OBSERVATION_WAIT_CAP_MS) : 0
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

type MunicipalitiesFailurePhase = 'repository_query' | 'contract_validation' | 'contract_validation_fallback'

function requestIdFor(req: Request): string {
  return req.header('x-request-id') || randomUUID()
}

function logHydrologyRouteError(requestId: string, phase: MunicipalitiesFailurePhase, error: unknown) {
  if (error instanceof ZodError) {
    logger.error({ requestId, phase, issueCount: error.issues.length, issues: error.issues.slice(0, 8).map((issue) => ({ path: issue.path.join('.'), code: issue.code, message: issue.message })) }, 'Government hydrology municipalities contract validation failed')
    return
  }
  logger.error({ requestId, phase, errorName: error instanceof Error ? error.name : typeof error, errorMessage: error instanceof Error ? error.message : String(error) }, 'Government hydrology municipalities failed')
}

function respondHydrologyUnavailable(res: Response, status: number, requestId: string, phase: Exclude<MunicipalitiesFailurePhase, 'contract_validation_fallback'>) {
  return res
    .status(status)
    .setHeader('x-request-id', requestId)
    .json({
      contractVersion: '1.0.0',
      code: 'HYDROLOGY_MUNICIPALITIES_UNAVAILABLE',
      message: 'El servicio de municipios hidrológicos no está disponible temporalmente.',
      retryable: true,
      details: { requestId, phase },
    })
}

export function createGovernmentIngestionRunner(deps: GovernmentIngestionRunnerDeps = {}) {
  const pool = getPostgresPool()
  const repository = deps.repository ?? new HydrologyRepository(pool)
  const clients: Record<HydrologySource, GovernmentSourceClient> = {
    PNA: deps.clients?.PNA ?? new PnaHttpClient(),
    INA: deps.clients?.INA ?? new InaHttpClient(),
    INMET: deps.clients?.INMET ?? new InmetHttpClient(),
    SMN: deps.clients?.SMN ?? new SmnHttpClient(),
  }
  const now = deps.now ?? (() => new Date())

  const allowFixtureFallback = deps.allowFixtureFallback ?? process.env['NODE_ENV'] === 'test'
  let municipalitySeed: Promise<{ inserted: number; skipped: boolean }> | undefined
  const ensureMunicipalitiesSeeded = () => municipalitySeed ??= runHydrologyStartupOperation('seed_municipalities', () => seedGovernmentMunicipalitiesIfEmpty(deps.seedDb ?? pool)).catch((error) => {
    municipalitySeed = undefined
    throw error
  })

  return async (input: { source?: HydrologySource; proofRunId?: string; runId?: string }): Promise<CompletedGovernmentIngestionResponse> => {
    const sources = input.source ? [input.source] : ALL_SOURCES
    const runId = input.runId?.trim() || `manual-${randomUUID()}`
    const proofRunId = input.proofRunId?.trim() || runId
    await ensureMunicipalitiesSeeded()
    const results: GovernmentIngestionSourceResult[] = []

    for (const source of sources) {
      const startedAt = now()
      const runnerTimeoutMs = runnerTimeoutFor(clients[source])
      const result = await fetchWithDeadline(clients[source], source, runnerTimeoutMs)
      const liveRecords = result.ok ? result.records : []
      const fallbackReason = !result.ok ? result.error : liveRecords.length === 0 ? `${source} returned no records` : undefined
      if (fallbackReason && !allowFixtureFallback) {
        const finishedAt = now()
        const errorMessage = `Hydrology ingestion failed for ${source}: ${fallbackReason}`
        const diagnostic = mergeIngestDiagnostic(result.ok ? emptyResponseDiagnostic(source, runnerTimeoutMs) : result.diagnostic ?? genericFailureDiagnostic(source, fallbackReason, runnerTimeoutMs), startedAt, finishedAt, runnerTimeoutMs)
        const persisted = await persistHydrologySourceRun(repository, {
          source,
          status: result.ok ? 'partial' : 'failed',
          startedAt,
          finishedAt,
          recordsIngested: 0,
            proofRunId,
            errorMessage,
          }, [], runId, source)
        logger.error({ runId, source, failureKind: diagnostic.failureKind, error: fallbackReason }, 'Government hydrology ingestion failed')
        results.push({ source, status: result.ok ? 'empty' : 'failed', recordsIngested: 0, errorMessage: persisted ? errorMessage : `${errorMessage}; provider failure recorded; persistence write failed`, httpSummary: result.httpSummary, diagnostic })
        continue
      }
      const records = fallbackReason ? governmentFallbackTelemetry(source, now()) : liveRecords
      const observedTimes = records.map((record) => record.observedAt).sort((a, b) => a.getTime() - b.getTime())
      const observedFrom = observedTimes.at(0)
      const observedTo = observedTimes.at(-1)
      const persisted = await persistHydrologySourceRun(repository, {
        source,
        status: 'success',
        startedAt,
        finishedAt: now(),
        observedFrom,
        observedTo,
        lastSuccessfulObservedAt: observedTo,
        recordsIngested: records.length,
        proofRunId,
        errorMessage: fallbackReason ? `Fallback offline fixture used: ${fallbackReason}` : undefined,
        provenanceUrl: records[0]?.sourceUrl,
      }, records, runId, source)
      results.push({ source, status: persisted ? records.length > 0 ? 'success' : 'empty' : 'failed', recordsIngested: persisted ? records.length : 0, provenanceUrl: records[0]?.sourceUrl, observedFrom: observedFrom?.toISOString(), observedTo: observedTo?.toISOString(), errorMessage: persisted ? fallbackReason ? `Fallback offline fixture used: ${fallbackReason}` : undefined : `${source} provider data fetched; persistence write failed`, httpSummary: result.ok ? result.httpSummary : result.httpSummary, diagnostic: persisted ? undefined : genericFailureDiagnostic(source, `${source} persistence write failed`, runnerTimeoutMs) })
    }

    return { runId, proofRunId, status: ingestionStatus(results), requestedSources: sources, results, sources, sourceResults: toSourceResults(results) }
  }
}

async function runHydrologyStartupOperation<T>(operation: HydrologyStartupOperation, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    throw new HydrologyStartupError(operation, error)
  }
}

class HydrologyStartupError extends Error {
  constructor(readonly operation: HydrologyStartupOperation, readonly rootCause: unknown) {
    super('Hydrology ingest startup operation failed')
    this.name = 'HydrologyStartupError'
  }
}

async function persistHydrologySourceRun(repository: GovernmentIngestionRepository, run: Parameters<GovernmentIngestionRepository['saveTelemetryDeduped']>[1], records: NormalizedHydrologyTelemetry[], runId: string, source: HydrologySource): Promise<boolean> {
  try {
    await repository.saveTelemetryDeduped(records, run)
    return true
  } catch (error) {
    logger.error({ runId, source, operation: 'save_source_run', recordsAttempted: records.length, proofRunId: run.proofRunId, ...safeErrorLogFields(error) }, 'Government hydrology source persistence failed after provider execution')
    return false
  }
}

function ingestionStatus(results: GovernmentIngestionSourceResult[]): 'completed' | 'partial' | 'failed' {
  const successCount = results.filter((item) => item.status === 'success' || item.status === 'empty').length
  if (successCount === results.length) return 'completed'
  if (successCount > 0) return 'partial'
  return 'failed'
}

function toSourceResults(results: GovernmentIngestionSourceResult[]): Array<{ source: HydrologySource; status: 'success' | 'failed'; recordsIngested: number; errorMessage?: string }> {
  return results.map((result) => ({
    source: result.source,
    status: result.status === 'failed' ? 'failed' : 'success',
    recordsIngested: result.recordsIngested,
    errorMessage: result.errorMessage,
  }))
}

async function fetchWithDeadline(client: GovernmentSourceClient, source: HydrologySource, timeoutMs: number): Promise<ScraperResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let providerPromise: Promise<ScraperResult>
  let deadlineTimer: NodeJS.Timeout | undefined
  try {
    providerPromise = client.fetchTelemetry(controller.signal)
    void providerPromise.catch(() => undefined)
    const result = await Promise.race([
      providerPromise,
      new Promise<ScraperResult>((resolve) => {
        deadlineTimer = setTimeout(() => resolve({
          ok: false,
          error: `timeout after ${timeoutMs}ms`,
          diagnostic: { failureKind: 'runner_timeout', reason: `${source} runner timed out`, attempts: 1, timeoutMs },
        }), timeoutMs)
      }),
    ])
    return controller.signal.aborted ? { ok: false, error: `timeout after ${timeoutMs}ms`, diagnostic: { failureKind: 'runner_timeout', reason: `${source} runner timed out`, attempts: 1, timeoutMs } } : result
  } catch (error) {
    if (controller.signal.aborted) return { ok: false, error: `timeout after ${timeoutMs}ms`, diagnostic: { failureKind: 'runner_timeout', reason: `${source} runner timed out`, attempts: 1, timeoutMs } }
    return thrownProviderFailureDiagnostic(source, error, timeoutMs)
  } finally {
    clearTimeout(timeout)
    if (deadlineTimer) clearTimeout(deadlineTimer)
  }
}

async function persistHydrologyRunFailure(repository: Partial<Pick<HydrologyRepository, 'saveIngestionRun'>>, sources: HydrologySource[], proofRunId: string, error: unknown): Promise<void> {
  if (!repository.saveIngestionRun) {
    logger.warn({ proofRunId, sources, operation: 'save_ingestion_failure' }, 'Government hydrology background failure could not be persisted: repository API unavailable')
    return
  }
  const writes = await Promise.allSettled(sources.map(async (source) => repository.saveIngestionRun!({ source, proofRunId, status: 'failed', startedAt: new Date(), finishedAt: new Date(), recordsIngested: 0, errorMessage: `Hydrology ingestion background failure: ${describeHydrologyStartupFailure(error, 'runner_execution').operation}` })))
  const failedWrites = writes.filter((write) => write.status === 'rejected').length
  if (failedWrites > 0) logger.error({ proofRunId, sources, failedWrites, operation: 'save_ingestion_failure' }, 'Government hydrology background failure persistence was partial')
}

function thrownProviderFailureDiagnostic(source: HydrologySource, error: unknown, timeoutMs: number): ScraperResult {
  const message = error instanceof Error ? error.message : String(error)
  const upstreamStatus = statusFromThrownProviderMessage(message)
  return {
    ok: false,
    error: upstreamStatus ? `${source} upstream returned HTTP ${upstreamStatus}` : `${source} provider execution failed`,
    diagnostic: {
      failureKind: upstreamStatus ? 'http_status' : 'network_failure',
      reason: upstreamStatus ? `${source} upstream returned HTTP ${upstreamStatus}` : `${source} provider request failed`,
      attempts: 1,
      timeoutMs,
      ...(upstreamStatus ? { upstreamStatus } : {}),
    },
  }
}

function statusFromThrownProviderMessage(message: string): number | undefined {
  const match = /\bHTTP\s+([1-5]\d{2})\b/i.exec(message)
  if (!match?.[1]) return undefined
  const status = Number.parseInt(match[1], 10)
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined
}

function mergeIngestDiagnostic(diagnostic: HydrologyGovernmentIngestDiagnostic, startedAt: Date, finishedAt: Date, timeoutMs: number): HydrologyGovernmentIngestDiagnostic {
  return {
    ...diagnostic,
    attempts: 1,
    timeoutMs: diagnostic.timeoutMs ?? timeoutMs,
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    elapsedMs: diagnostic.elapsedMs ?? Math.max(0, finishedAt.getTime() - startedAt.getTime()),
  }
}

export function runnerTimeoutFor(client: GovernmentSourceClient): number {
  const sourceTimeout = Number.isFinite(client.timeoutMs) && (client.timeoutMs ?? 0) > 0 ? client.timeoutMs as number : DEFAULT_SOURCE_RUNNER_TIMEOUT_MS
  return Math.min(SOURCE_RUNNER_TIMEOUT_CAP_MS, sourceTimeout + SOURCE_RUNNER_TIMEOUT_CUSHION_MS)
}

function emptyResponseDiagnostic(source: HydrologySource, timeoutMs = DEFAULT_SOURCE_RUNNER_TIMEOUT_MS): HydrologyGovernmentIngestDiagnostic {
  return { failureKind: 'empty_response', reason: `${source} returned no records`, attempts: 1, timeoutMs }
}

function genericFailureDiagnostic(source: HydrologySource, reason: string, timeoutMs = DEFAULT_SOURCE_RUNNER_TIMEOUT_MS): HydrologyGovernmentIngestDiagnostic {
  return { failureKind: 'network_failure', reason: reason.length > 120 ? `${source} ingest failed` : reason, attempts: 1, timeoutMs }
}

export function describeHydrologyStartupFailure(error: unknown, fallbackOperation: HydrologyStartupOperation): HydrologyStartupFailureDetails {
  const startupError = error instanceof HydrologyStartupError ? error : undefined
  const cause = startupError?.rootCause ?? error
  return {
    operation: startupError?.operation ?? fallbackOperation,
    ...safeErrorLogFields(cause),
  }
}

function safeErrorLogFields(error: unknown): Omit<HydrologyStartupFailureDetails, 'operation'> {
  const base = error instanceof Error
    ? { errorName: error.name || 'Error', message: safeErrorMessage(error.message), ...safeErrorCode(error) }
    : { errorName: typeof error, message: safeErrorMessage(String(error)) }
  const aggregateErrors = aggregateErrorDetails(error)
  return aggregateErrors ? { ...base, aggregateErrors } : base
}

function aggregateErrorDetails(error: unknown): SanitizedErrorDetail[] | undefined {
  if (!(error instanceof AggregateError)) return undefined
  return error.errors.slice(0, 2).map((item: unknown) => {
    if (item instanceof Error) return { name: item.name || 'Error', message: safeErrorMessage(item.message), ...safeErrorCode(item) }
    return { name: typeof item, message: safeErrorMessage(String(item)) }
  })
}

function safeErrorCode(error: Error): { code?: string } {
  const code = (error as Error & { code?: unknown }).code
  return typeof code === 'string' && /^[A-Z0-9_]{2,16}$/.test(code) ? { code } : {}
}

function safeErrorMessage(message: string): string {
  if (!message.trim()) return 'error message unavailable'
  if (/[/:@]|password|secret|token|key|credential|postgres|database|db\.|internal|\d+\.\d+\.\d+\.\d+/i.test(message)) return 'sanitized error message hidden'
  return message.slice(0, 160)
}

function governmentFallbackTelemetry(source: HydrologySource, observedAt: Date): NormalizedHydrologyTelemetry[] {
  const base = { observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, quality: 'estimated' as const, freshness: 'fresh' as const }
  if (source === 'PNA') return [
    { ...base, source, stationId: 'corrientes', value: 3.42, unit: 'm', metric: 'river_height_m', tendency: 'creciente', sourceUrl: 'offline-fixture://pna/corrientes', raw: { fixture: true, stationName: 'Corrientes' } },
    { ...base, source, stationId: 'paso_de_la_patria', value: 3.18, unit: 'm', metric: 'river_height_m', tendency: 'estable', sourceUrl: 'offline-fixture://pna/paso-de-la-patria', raw: { fixture: true, stationName: 'Paso de la Patria' } },
    { ...base, source, stationId: 'ituzaingo', value: 2.74, unit: 'm', metric: 'river_height_m', tendency: 'bajante', sourceUrl: 'offline-fixture://pna/ituzaingo', raw: { fixture: true, stationName: 'Ituzaingó' } },
    { ...base, source, stationId: 'santo_tome', value: 4.05, unit: 'm', metric: 'river_height_m', tendency: 'creciente', sourceUrl: 'offline-fixture://pna/santo-tome', raw: { fixture: true, stationName: 'Santo Tomé / Virasoro' } },
  ]
  if (source === 'INA') return Array.from({ length: 30 }, (_, index) => ({ ...base, source, stationId: index % 2 === 0 ? 'ina-corrientes' : 'ina-ituzaingo', value: Number((3.25 + index * 0.025).toFixed(2)), unit: 'm', metric: 'river_height_m' as const, forecastHorizonDays: index + 1, confidence: index + 1 > 14 ? 'speculative' as const : 'normal' as const, sourceUrl: 'offline-fixture://ina/30-day-forecast', raw: { fixture: true, horizonDays: index + 1 } }))
  if (source === 'INMET') return [
    { ...base, source, stationId: 'inmet-parana', value: 18.4, unit: 'mm', metric: 'rain_mm', sourceUrl: 'offline-fixture://inmet/parana', raw: { fixture: true, stationName: 'Paraná headwaters' } },
    { ...base, source, stationId: 'inmet-foz-iguacu', value: 26.8, unit: 'mm', metric: 'rain_mm', sourceUrl: 'offline-fixture://inmet/foz-iguacu', raw: { fixture: true, stationName: 'Foz do Iguaçu' } },
  ]
  return [
    { ...base, source, stationId: 'smn-corrientes', value: 22, unit: 'mm', metric: 'rain_mm', sourceUrl: 'offline-fixture://smn/corrientes-rain', raw: { fixture: true, region: 'Corrientes' } },
    { ...base, source, stationId: 'smn-misiones', value: null, unit: 'alerta', metric: 'storm_alert', sourceUrl: 'offline-fixture://smn/misiones-alert', raw: { fixture: true, severity: 'vigilancia por tormentas' } },
  ]
}

export async function seedGovernmentMunicipalitiesIfEmpty(db: { query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }> }): Promise<{ inserted: number; skipped: boolean }> {
  const pnaIds = PNA_FLOOD_RISK_PORTS.map((municipality) => municipality.id)
  const existing = await db.query('SELECT COUNT(*)::int AS count FROM agronautas_municipalities WHERE id = ANY($1)', [pnaIds])
  if (Number(existing.rows[0]?.['count'] ?? 0) === PNA_FLOOD_RISK_PORTS.length) return { inserted: 0, skipped: true }

  for (const station of INA_SERIES_STATIONS) {
    await db.query(
      `INSERT INTO hydrology_stations (id, source, station_code, station_name, river_name, zone, source_url, is_active, country_code)
       VALUES ($1, 'INA', $2, $3, $4, null, $5, true, 'AR')
       ON CONFLICT (id) DO UPDATE SET
         station_code = EXCLUDED.station_code,
         station_name = EXCLUDED.station_name,
         river_name = EXCLUDED.river_name,
         source_url = EXCLUDED.source_url,
         is_active = true,
         country_code = 'AR',
         updated_at = now()`,
      [station.id, station.id, station.name, station.river, `https://alerta.ina.gob.ar/a5/obs/puntual/series/${station.id}`],
    )
  }
  for (const municipality of PNA_FLOOD_RISK_PORTS) {
    const stationCode = municipality.primaryPnaPortId
    await db.query(
      `INSERT INTO hydrology_stations (id, source, station_code, station_name, river_name, zone, source_url, is_active, country_code)
       VALUES ($1, 'PNA', $2, $3, $4, null, $5, true, 'AR')
       ON CONFLICT (id) DO UPDATE SET
         station_code = EXCLUDED.station_code,
         station_name = EXCLUDED.station_name,
         river_name = EXCLUDED.river_name,
         zone = null,
         source_url = EXCLUDED.source_url,
         is_active = true,
         country_code = 'AR',
         updated_at = now()`,
      [municipality.primaryPnaPortId, stationCode, municipality.name, municipality.river, `https://www.argentina.gob.ar/prefecturanaval/alturas/${municipality.primaryPnaPortId}`],
    )
    await db.query(
      `INSERT INTO agronautas_municipalities (id, locality_id, name, province_code, boundary, alert_height_m, evacuation_height_m)
       VALUES ($1, $2, $3, $4, ST_Multi(ST_GeomFromText($5, 4326)), $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         locality_id = EXCLUDED.locality_id,
         name = EXCLUDED.name,
         province_code = EXCLUDED.province_code,
         boundary = EXCLUDED.boundary,
         alert_height_m = EXCLUDED.alert_height_m,
         evacuation_height_m = EXCLUDED.evacuation_height_m,
         updated_at = now()`,
      [municipality.id, municipality.localityId, municipality.name, municipality.provinceCode, municipality.boundaryWkt, municipality.alertHeightM, municipality.evacuationHeightM],
    )
    await db.query(
      `INSERT INTO municipality_gauge_mappings (municipality_id, primary_pna_port_id, secondary_pna_port_ids, ina_station_ids, smn_region_ids, inmet_station_ids)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (municipality_id) DO UPDATE SET
         primary_pna_port_id = EXCLUDED.primary_pna_port_id,
         secondary_pna_port_ids = EXCLUDED.secondary_pna_port_ids,
         ina_station_ids = EXCLUDED.ina_station_ids,
         smn_region_ids = EXCLUDED.smn_region_ids,
         inmet_station_ids = EXCLUDED.inmet_station_ids,
         updated_at = now()`,
      [municipality.id, municipality.primaryPnaPortId, municipality.secondaryPnaPortIds, municipality.inaStationIds, municipality.smnRegionIds, municipality.inmetStationIds],
    )
  }

  return { inserted: PNA_FLOOD_RISK_PORTS.length, skipped: false }
}

function isHydrologyIngestAuthorized(req: Request): boolean {
  const token = process.env['HYDROLOGY_INGEST_TOKEN']?.trim()
  return Boolean(token && req.header('x-hydrology-ingest-token') === token)
}

function respondHydrologyIngestUnauthorized(res: Response) {
  return res
    .setHeader('Cache-Control', 'no-store')
    .status(401)
    .json({ contractVersion: '1.0.0', code: 'HYDROLOGY_INGEST_UNAUTHORIZED', message: 'La ingesta hidrológica requiere una credencial interna.', retryable: false })
}

function pnaPort(id: string, localityId: string, name: string, river: FloodRiskRiver, alertHeightM: number, evacuationHeightM: number, lng: number, lat: number, overrides: Partial<Pick<PnaFloodRiskPort, 'primaryPnaPortId' | 'secondaryPnaPortIds' | 'inaStationIds' | 'inmetStationIds'>> = {}): PnaFloodRiskPort {
  return {
    id,
    localityId,
    name,
    provinceCode: 'AR-W',
    river,
    alertHeightM,
    evacuationHeightM,
    primaryPnaPortId: overrides.primaryPnaPortId ?? id.replaceAll('-', '_'),
    secondaryPnaPortIds: overrides.secondaryPnaPortIds ?? [],
    inaStationIds: overrides.inaStationIds ?? [`ina-${id}`],
    smnRegionIds: ['smn-corrientes'],
    inmetStationIds: overrides.inmetStationIds ?? (river === 'Paraná' ? ['A830', 'A809'] : ['A846', 'A826']),
    boundaryWkt: squareBoundary(lng, lat),
    sourceMetadata: { source: 'PNA', thresholdUnit: 'm', thresholdReference: 'local_gauge_zero' },
  }
}

function squareBoundary(lng: number, lat: number): string {
  const delta = 0.12
  return `POLYGON((${(lng - delta).toFixed(2)} ${(lat - delta).toFixed(2)},${(lng + delta).toFixed(2)} ${(lat - delta).toFixed(2)},${(lng + delta).toFixed(2)} ${(lat + delta).toFixed(2)},${(lng - delta).toFixed(2)} ${(lat + delta).toFixed(2)},${(lng - delta).toFixed(2)} ${(lat - delta).toFixed(2)}))`
}

export type { HydrologyGovernmentRouterDeps }
