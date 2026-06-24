import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import { createHydrologyGovernmentRouter } from './hydrology-government'
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
  assert.equal(json.telemetryCards.length, 2)
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
