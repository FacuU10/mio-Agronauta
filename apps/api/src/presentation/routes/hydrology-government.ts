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
import { HydrologyCopilotService, HydrologyRepository, InaHttpClient, InmetHttpClient, PnaHttpClient, SmnHttpClient, type MunicipalityTelemetryDashboard, type MunicipalityTelemetryView, type NormalizedHydrologyTelemetry, type ScraperResult } from '@repo/hydrology-engine'
import { getPostgresPool } from '../../infrastructure/database/postgres/pool'
import { logger } from '../../infrastructure/observability/logger'

interface HydrologyGovernmentRouterDeps {
  hydrologyRepository: Pick<HydrologyRepository, 'getMunicipalityTelemetryOverview' | 'getMunicipalityTelemetryDashboard'>
  hydrologyCopilotService: Pick<HydrologyCopilotService, 'streamChat'>
  ingestionRunner: (input: { source?: HydrologySource; reason?: string }) => Promise<{ runId: string; status: 'queued' | 'started' | 'completed'; sources: HydrologySource[] }>
}

type GovernmentIngestionRepository = Pick<HydrologyRepository, 'saveTelemetryDeduped'>
type GovernmentSourceClient = { fetchTelemetry(): Promise<ScraperResult> }

interface GovernmentIngestionRunnerDeps {
  repository?: GovernmentIngestionRepository
  clients?: Partial<Record<HydrologySource, GovernmentSourceClient>>
  seedDb?: { query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }> }
  now?: () => Date
  allowFixtureFallback?: boolean
}

const ALL_SOURCES: HydrologySource[] = ['PNA', 'INA', 'INMET', 'SMN']
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
  pnaPort('corrientes', 'corrientes-capital', 'Corrientes Capital', 'Paraná', 6.5, 7, -58.80, -27.48, { secondaryPnaPortIds: ['paso_de_la_patria'] }),
  pnaPort('empedrado', 'empedrado', 'Empedrado', 'Paraná', 6.2, 6.7, -58.78, -27.95),
  pnaPort('bella-vista', 'bella-vista', 'Bella Vista', 'Paraná', 5.7, 6.1, -58.68, -28.50),
  pnaPort('goya', 'goya-corrientes', 'Goya', 'Paraná', 5.2, 5.7, -59.26, -29.14),
  pnaPort('esquina', 'esquina', 'Esquina', 'Paraná', 5.1, 5.6, -59.53, -30.02),
  pnaPort('garruchos', 'garruchos', 'Garruchos', 'Uruguay', 12, 13, -55.65, -28.18),
  pnaPort('santo-tome', 'santo-tome', 'Santo Tomé', 'Uruguay', 10.5, 11.5, -56.04, -28.55, { primaryPnaPortId: 'santo_tome' }),
  pnaPort('alvear', 'alvear', 'Alvear', 'Uruguay', 9, 10, -56.55, -29.10),
  pnaPort('la-cruz', 'la-cruz', 'La Cruz', 'Uruguay', 8, 9, -56.65, -29.18),
  pnaPort('yapeyu', 'yapeyu', 'Yapeyú', 'Uruguay', 7.5, 8.5, -56.82, -29.47),
  pnaPort('paso-de-los-libres', 'paso-de-los-libres', 'Paso de los Libres', 'Uruguay', 7.5, 8.5, -57.08, -29.72, { primaryPnaPortId: 'paso_de_los_libres' }),
  pnaPort('monte-caseros', 'monte-caseros', 'Monte Caseros', 'Uruguay', 7.5, 8.5, -57.65, -30.25),
]
const EXCLUDED_TOPIC_RE = /(tiempo\s+de\s+(?:llegada|propagaci[oó]n|onda|lag)|lag\s*time|wave\s+(?:routing|propagation)|propagaci[oó]n\s+de\s+onda|caudal|descarga|turbinad[oa]s?|vertid[oa]s?|spilled|turbined|routing\s+hidr[aá]ulico|muskingum|evacuaci[oó]n|autoridad\s+de\s+evacuaci[oó]n)/i
const OUT_OF_SCOPE_MESSAGE = 'Entiendo la urgencia, pero esos cálculos están fuera del alcance de la Fase 1 de Iberá-Alerta. No calculo tiempos de propagación, routing de onda, caudales/descargas de represas, flujos turbinados o vertidos, ni decisiones de evacuación. Puedo limitar la respuesta a observaciones y pronósticos oficiales disponibles de PNA, INA, INMET y SMN.'

export function createHydrologyGovernmentRouter(deps: Partial<HydrologyGovernmentRouterDeps> = {}): Router {
  const resolved: HydrologyGovernmentRouterDeps = {
    hydrologyRepository: deps.hydrologyRepository ?? new HydrologyRepository(getPostgresPool()),
    hydrologyCopilotService: deps.hydrologyCopilotService ?? new HydrologyCopilotService(),
    ingestionRunner: deps.ingestionRunner ?? createGovernmentIngestionRunner(),
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
      inaPredictions30d: municipality.latestTelemetry.filter((item) => item.source === 'INA' && item.forecastHorizonDays != null && item.forecastHorizonDays <= 30),
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

  return async (input: { source?: HydrologySource }): Promise<{ runId: string; status: 'completed'; sources: HydrologySource[] }> => {
    const sources = input.source ? [input.source] : ALL_SOURCES
    const runId = `manual-${randomUUID()}`
    await seedGovernmentMunicipalitiesIfEmpty(deps.seedDb ?? pool)

    for (const source of sources) {
      const startedAt = now()
      const result = await fetchWithDeadline(clients[source], 12_000)
      const liveRecords = result.ok ? result.records : []
      const fallbackReason = !result.ok ? result.error : liveRecords.length === 0 ? `${source} returned no records` : undefined
      if (fallbackReason && !allowFixtureFallback) {
        const finishedAt = now()
        const errorMessage = `Hydrology ingestion failed for ${source}: ${fallbackReason}`
        await repository.saveTelemetryDeduped([], {
          source,
          status: 'failed',
          startedAt,
          finishedAt,
          recordsIngested: 0,
          errorMessage,
        })
        logger.error({ runId, source, error: fallbackReason }, 'Government hydrology ingestion failed')
        throw new Error(errorMessage)
      }
      const records = fallbackReason ? governmentFallbackTelemetry(source, now()) : liveRecords
      const observedTimes = records.map((record) => record.observedAt).sort((a, b) => a.getTime() - b.getTime())
      const observedFrom = observedTimes.at(0)
      const observedTo = observedTimes.at(-1)
      const saveResult = await repository.saveTelemetryDeduped(records, {
        source,
        status: 'success',
        startedAt,
        finishedAt: now(),
        observedFrom,
        observedTo,
        lastSuccessfulObservedAt: now(),
        recordsIngested: records.length,
        errorMessage: fallbackReason ? `Fallback offline fixture used: ${fallbackReason}` : undefined,
        provenanceUrl: records[0]?.sourceUrl,
      })
      void saveResult
    }

    return { runId, status: 'completed', sources }
  }
}

async function fetchWithDeadline(client: GovernmentSourceClient, timeoutMs: number): Promise<ScraperResult> {
  let timeout: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      client.fetchTelemetry(),
      new Promise<ScraperResult>((resolve) => { timeout = setTimeout(() => resolve({ ok: false, error: `timeout after ${timeoutMs}ms` }), timeoutMs) }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
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
  await db.query('CREATE EXTENSION IF NOT EXISTS postgis')
  const pnaIds = PNA_FLOOD_RISK_PORTS.map((municipality) => municipality.id)
  const existing = await db.query('SELECT COUNT(*)::int AS count FROM agronautas_municipalities WHERE id = ANY($1)', [pnaIds])
  if (Number(existing.rows[0]?.['count'] ?? 0) === PNA_FLOOD_RISK_PORTS.length) return { inserted: 0, skipped: true }

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
       ON CONFLICT (id) DO NOTHING`,
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

function pnaPort(id: string, localityId: string, name: string, river: FloodRiskRiver, alertHeightM: number, evacuationHeightM: number, lng: number, lat: number, overrides: Partial<Pick<PnaFloodRiskPort, 'primaryPnaPortId' | 'secondaryPnaPortIds'>> = {}): PnaFloodRiskPort {
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
    inaStationIds: [`ina-${id}`],
    smnRegionIds: ['smn-corrientes'],
    inmetStationIds: river === 'Paraná' ? ['inmet-parana'] : ['inmet-uruguay-headwaters'],
    boundaryWkt: squareBoundary(lng, lat),
    sourceMetadata: { source: 'PNA', thresholdUnit: 'm', thresholdReference: 'local_gauge_zero' },
  }
}

function squareBoundary(lng: number, lat: number): string {
  const delta = 0.12
  return `POLYGON((${(lng - delta).toFixed(2)} ${(lat - delta).toFixed(2)},${(lng + delta).toFixed(2)} ${(lat - delta).toFixed(2)},${(lng + delta).toFixed(2)} ${(lat + delta).toFixed(2)},${(lng - delta).toFixed(2)} ${(lat + delta).toFixed(2)},${(lng - delta).toFixed(2)} ${(lat - delta).toFixed(2)}))`
}

export type { HydrologyGovernmentRouterDeps }
