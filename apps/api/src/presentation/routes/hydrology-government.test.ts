import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import { AGRICULTURAL_CENTERS, PNA_FLOOD_RISK_PORTS, createGovernmentIngestionRunner, createHydrologyGovernmentRouter, seedGovernmentMunicipalitiesIfEmpty } from './hydrology-government'
import {
  hydrologyGovernmentDashboardResponseSchema,
  hydrologyGovernmentIngestResponseSchema,
  hydrologyGovernmentMunicipalitiesResponseSchema,
} from '@repo/zod-schemas'

test('GET /api/hydrology/municipalities devuelve resumen provincial y municipios con provenance', async () => {
  const response = await request(createTestApp(), '/api/hydrology/municipalities')

  assert.equal(response.status, 200)
  const json = hydrologyGovernmentMunicipalitiesResponseSchema.parse(await response.json())
  assert.equal(json.contractVersion, 'hydrology-government-municipalities-v1')
  assert.equal(json.province.provinceCode, 'AR-W')
  assert.equal(json.province.name, 'Corrientes')
  assert.equal(json.municipalities.length, 1)
  assert.equal(json.municipalities[0]?.name, 'Mercedes')
  assert.equal(json.sourceFreshness[0]?.label, 'Último dato obtenido: 23/06/2026 10:30')
  assert.equal(json.provinceAlerts[0]?.zone, 'Mercedes')
})

test('GET /api/hydrology/municipalities/:id/dashboard devuelve metadata, cards, pronósticos INA, alertas y provenance', async () => {
  const response = await request(createTestApp(), '/api/hydrology/municipalities/mercedes/dashboard')

  assert.equal(response.status, 200)
  const json = hydrologyGovernmentDashboardResponseSchema.parse(await response.json())
  assert.equal(json.contractVersion, 'hydrology-government-dashboard-v1')
  assert.equal(json.municipality.id, 'mercedes')
  assert.equal(json.telemetryCards.length, 3)
  assert.equal(json.inaPredictions30d.length, 1)
  assert.equal(json.inaPredictions30d[0]?.forecastHorizonDays, 20)
  assert.equal(json.inaPredictions30d[0]?.confidence, 'speculative')
  assert.equal(json.alerts[0]?.source, 'SMN')
  assert.equal(json.provenance[0]?.label, 'Último dato obtenido: 23/06/2026 10:30')
})

test('POST /api/hydrology/ingest dispara ingesta manual y valida contrato', async () => {
  const response = await request(createTestApp({ ingestionRunner: async (input) => ({ runId: `manual-${input.source ?? 'ALL'}`, status: 'queued', sources: input.source ? [input.source] : ['PNA', 'INA', 'INMET', 'SMN'] }) }), '/api/hydrology/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', source: 'PNA' }),
  })

  assert.equal(response.status, 202)
  const json = hydrologyGovernmentIngestResponseSchema.parse(await response.json())
  assert.equal(json.status, 'queued')
  assert.deepEqual(json.sources, ['PNA'])
})

test('default government ingestion runner saves all source fixtures when live clients fail or return empty', async () => {
  const saved: Array<{ source: string; records: number }> = []
  const runner = createGovernmentIngestionRunner({
    now: () => new Date('2026-06-26T12:00:00.000Z'),
    clients: {
      PNA: { async fetchTelemetry() { return { ok: false as const, error: 'offline' } } },
      INA: { async fetchTelemetry() { return { ok: true as const, records: [] } } },
      INMET: { async fetchTelemetry() { return { ok: false as const, error: 'timeout' } } },
      SMN: { async fetchTelemetry() { return { ok: true as const, records: [] } } },
    },
    allowFixtureFallback: true,
    repository: {
      async saveTelemetryDeduped(records, run) {
        saved.push({ source: run.source, records: records.length })
        assert.equal(run.status, 'success')
        assert.equal(run.lastSuccessfulObservedAt?.toISOString(), '2026-06-26T12:00:00.000Z')
        return { inserted: records.length, unchanged: 0 }
      },
    },
    seedDb: {
      async query(sql: string) {
        if (/SELECT COUNT\(\*\)::int AS count FROM agronautas_municipalities/.test(sql)) return { rows: [{ count: 17 }], rowCount: 1 }
        return { rows: [], rowCount: 1 }
      },
    },
  })

  const result = await runner({})

  assert.equal(result.status, 'completed')
  assert.deepEqual(result.sources, ['PNA', 'INA', 'INMET', 'SMN'])
  assert.deepEqual(saved.map((item) => item.source), ['PNA', 'INA', 'INMET', 'SMN'])
  assert.ok(saved.every((item) => item.records > 0))
})

test('default government ingestion runner fails fast outside tests without writing fixtures', async () => {
  const previousNodeEnv = process.env['NODE_ENV']
  process.env['NODE_ENV'] = 'production'
  const saved: Array<{ source: string; status: string; records: number; errorMessage?: string }> = []
  try {
    const runner = createGovernmentIngestionRunner({
      now: () => new Date('2026-06-26T12:00:00.000Z'),
      clients: { PNA: { async fetchTelemetry() { return { ok: false as const, error: 'offline' } } } },
      repository: {
        async saveTelemetryDeduped(records, run) {
          saved.push({ source: run.source, status: run.status, records: records.length, errorMessage: run.errorMessage })
          return { inserted: 0, unchanged: 0 }
        },
      },
      seedDb: {
        async query(sql: string) {
          if (/SELECT COUNT\(\*\)::int AS count FROM agronautas_municipalities/.test(sql)) return { rows: [{ count: 17 }], rowCount: 1 }
          return { rows: [], rowCount: 1 }
        },
      },
    })

    await assert.rejects(() => runner({ source: 'PNA' }), /Hydrology ingestion failed for PNA: offline/)
    assert.deepEqual(saved, [{ source: 'PNA', status: 'failed', records: 0, errorMessage: 'Hydrology ingestion failed for PNA: offline' }])
  } finally {
    if (previousNodeEnv === undefined) delete process.env['NODE_ENV']
    else process.env['NODE_ENV'] = previousNodeEnv
  }
})

test('government municipality seeding inserts Corrientes PNA municipalities only when empty', async () => {
  const queries: Array<{ sql: string; params?: unknown[] }> = []
  const db = {
    async query(sql: string, params?: unknown[]) {
      queries.push({ sql, params })
      if (/SELECT COUNT\(\*\)::int AS count FROM agronautas_municipalities/.test(sql)) return { rows: [{ count: 0 }], rowCount: 1 }
      return { rows: [], rowCount: 1 }
    },
  }

  const result = await seedGovernmentMunicipalitiesIfEmpty(db)

  assert.equal(result.inserted, 17)
  const insertMunicipalities = queries.find((query) => /INSERT INTO agronautas_municipalities/.test(query.sql))
  const insertMappings = queries.find((query) => /INSERT INTO municipality_gauge_mappings/.test(query.sql))
  assert.ok(insertMunicipalities)
  assert.ok(insertMappings)
  assert.match(insertMunicipalities.sql, /ST_Multi\(ST_GeomFromText\(\$5, 4326\)\)/)
  assert.deepEqual(insertMunicipalities.params?.slice(0, 4), ['ituzaingo', 'ituzaingo-corrientes', 'Ituzaingó', 'AR-W'])
  assert.equal(insertMunicipalities.params?.[5], 4.5)
  assert.equal(insertMunicipalities.params?.[6], 5)
})

test('PNA flood-risk dictionary contains the 17 monitored Corrientes ports with official thresholds', () => {
  assert.equal(PNA_FLOOD_RISK_PORTS.length, 17)
  assert.deepEqual(
    PNA_FLOOD_RISK_PORTS.map((port) => [port.name, port.river, port.alertHeightM, port.evacuationHeightM]),
    [
      ['Ituzaingó', 'Paraná', 4.5, 5],
      ['Itá Ibaté', 'Paraná', 5.5, 6],
      ['Yahapé', 'Paraná', 6, 6.5],
      ['Itatí', 'Paraná', 7, 7.5],
      ['Paso de la Patria', 'Paraná', 6.5, 7],
      ['Corrientes Capital', 'Paraná', 6.5, 7],
      ['Empedrado', 'Paraná', 6.2, 6.7],
      ['Bella Vista', 'Paraná', 5.7, 6.1],
      ['Goya', 'Paraná', 5.2, 5.7],
      ['Esquina', 'Paraná', 5.1, 5.6],
      ['Garruchos', 'Uruguay', 12, 13],
      ['Santo Tomé', 'Uruguay', 10.5, 11.5],
      ['Alvear', 'Uruguay', 9, 10],
      ['La Cruz', 'Uruguay', 8, 9],
      ['Yapeyú', 'Uruguay', 7.5, 8.5],
      ['Paso de los Libres', 'Uruguay', 7.5, 8.5],
      ['Monte Caseros', 'Uruguay', 7.5, 8.5],
    ],
  )
})

test('PNA flood-risk dictionary remains separate from Agronautas agriculture localities', () => {
  assert.deepEqual(AGRICULTURAL_CENTERS.map((center) => center.name), ['Gobernador Virasoro', 'Goya'])
  assert.ok(PNA_FLOOD_RISK_PORTS.some((port) => port.name === 'Goya'))
  assert.equal(PNA_FLOOD_RISK_PORTS.some((port) => port.name === 'Gobernador Virasoro' || port.name === 'Virasoro'), false)
})

test('government municipality seeding inserts all PNA flood-risk municipalities without agricultural-only centers', async () => {
  const municipalityParams: unknown[][] = []
  const mappingParams: unknown[][] = []
  const db = {
    async query(sql: string, params?: unknown[]) {
      if (/SELECT COUNT\(\*\)::int AS count FROM agronautas_municipalities/.test(sql)) return { rows: [{ count: 0 }], rowCount: 1 }
      if (/INSERT INTO agronautas_municipalities/.test(sql) && params) municipalityParams.push(params)
      if (/INSERT INTO municipality_gauge_mappings/.test(sql) && params) mappingParams.push(params)
      return { rows: [], rowCount: 1 }
    },
  }

  const result = await seedGovernmentMunicipalitiesIfEmpty(db)

  assert.equal(result.inserted, 17)
  assert.equal(municipalityParams.length, 17)
  assert.equal(mappingParams.length, 17)
  assert.deepEqual(municipalityParams.map((params) => params[2]), PNA_FLOOD_RISK_PORTS.map((port) => port.name))
  assert.equal(municipalityParams.some((params) => params[2] === 'Gobernador Virasoro' || params[2] === 'Virasoro'), false)
  const goya = municipalityParams.find((params) => params[2] === 'Goya')
  assert.deepEqual(goya?.slice(0, 7), ['goya', 'goya-corrientes', 'Goya', 'AR-W', PNA_FLOOD_RISK_PORTS.find((port) => port.id === 'goya')?.boundaryWkt, 5.2, 5.7])
})

test('POST /api/hydrology/municipalities/:id/copilot/chat streamea rechazo español para temas excluidos', async () => {
  let serviceCalls = 0
  const response = await request(createTestApp({ hydrologyCopilotService: { async *streamChat() { serviceCalls += 1; yield { type: 'token' as const, data: 'No debería llamarse.' } } } }), '/api/hydrology/municipalities/mercedes/copilot/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', message: 'Calculá el tiempo de propagación de onda y caudal turbinado de Yacyretá' }),
  })

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/)
  const body = await response.text()
  assert.match(body, /fuera del alcance de la Fase 1/)
  assert.match(body, /observaciones y pronósticos oficiales/)
  assert.doesNotMatch(body, /No debería llamarse/)
  assert.equal(serviceCalls, 0)
})

test('POST /api/hydrology/municipalities/:id/copilot/chat streamea eventos del copiloto con contexto municipal', async () => {
  const response = await request(createTestApp({ hydrologyCopilotService: { async *streamChat(input) { yield { type: 'metadata' as const, data: { municipalityId: input.context.fieldId } }; yield { type: 'token' as const, data: 'Respuesta basada en SMN.' }; yield { type: 'done' as const, data: { model: 'test' } } } } }), '/api/hydrology/municipalities/mercedes/copilot/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', message: '¿Qué alertas oficiales hay?' }),
  })

  assert.equal(response.status, 200)
  const body = await response.text()
  assert.match(body, /event: metadata/)
  assert.match(body, /municipalityId/) 
  assert.match(body, /Respuesta basada en SMN/)
  assert.match(body, /event: done/)
})

function createTestApp(overrides: Partial<Parameters<typeof createHydrologyGovernmentRouter>[0]> = {}) {
  const app = express()
  app.use(express.json())
  app.use('/api/hydrology', createHydrologyGovernmentRouter({
    hydrologyRepository: overrides.hydrologyRepository ?? {
      async getMunicipalityTelemetryOverview() { return [municipalityView()] },
      async getMunicipalityTelemetryDashboard() { return municipalityDashboard() },
    },
    hydrologyCopilotService: overrides.hydrologyCopilotService ?? { async *streamChat() { yield { type: 'metadata' as const, data: { model: 'test' } }; yield { type: 'token' as const, data: 'Respuesta oficial.' }; yield { type: 'done' as const, data: { model: 'test' } } } },
    ingestionRunner: overrides.ingestionRunner,
  }))
  return app
}

function municipalityDashboard() {
  const { gaugeMappings, latestTelemetry, ...municipality } = municipalityView()
  return { municipality, gaugeMappings, latestTelemetry }
}

function municipalityView() {
  return {
    id: 'mercedes',
    localityId: 'mercedes-corrientes',
    name: 'Mercedes',
    provinceCode: 'AR-W',
    alertHeightM: 4.8,
    evacuationHeightM: undefined,
    gaugeMappings: { primaryPnaPortId: 'pna-mercedes', secondaryPnaPortIds: [], inaStationIds: ['ina-mercedes'], smnRegionIds: ['smn-corrientes'], inmetStationIds: ['inmet-parana'] },
    latestTelemetry: [
      { source: 'PNA' as const, stationId: 'pna-mercedes', observedAt: '2026-06-23T10:30:00.000Z', ingestedAt: '2026-06-23T10:35:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', value: 3.2, unit: 'm', metric: 'river_height_m' as const, quality: 'ok' as const, freshness: 'fresh' as const, tendency: 'creciente', sourceUrl: 'https://example.com/pna' },
      { source: 'INA' as const, stationId: 'ina-mercedes', observedAt: '2026-07-13T10:30:00.000Z', ingestedAt: '2026-06-23T10:35:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', value: 3.8, unit: 'm', metric: 'river_height_m' as const, quality: 'estimated' as const, freshness: 'fresh' as const, forecastHorizonDays: 20, confidence: 'speculative' as const, sourceUrl: 'https://example.com/ina' },
      { source: 'INA' as const, stationId: 'ina-mercedes-null-horizon', observedAt: '2026-06-23T10:30:00.000Z', ingestedAt: '2026-06-23T10:35:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', value: 3.5, unit: 'm', metric: 'river_height_m' as const, quality: 'estimated' as const, freshness: 'fresh' as const, forecastHorizonDays: null, confidence: 'speculative' as const, sourceUrl: 'https://example.com/ina-null' },
      { source: 'SMN' as const, stationId: 'smn-corrientes', observedAt: '2026-06-23T09:00:00.000Z', ingestedAt: '2026-06-23T09:05:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z', value: null, unit: 'alerta', metric: 'storm_alert' as const, quality: 'ok' as const, freshness: 'fresh' as const, sourceUrl: 'https://example.com/smn' },
    ],
  }
}

async function request(app: express.Express, path: string, init?: RequestInit) {
  const server = createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('address not available')
  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}
