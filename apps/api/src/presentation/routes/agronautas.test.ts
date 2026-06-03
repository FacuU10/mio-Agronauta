import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import type { FieldContextRepository, FieldRepository, SupportedCoverageResult } from '../../domain/repositories/agronautas'
import { Field, FieldContext, RiskSnapshotFoundation, type ClimateSummary, type SatelliteSummary } from '../../domain/entities/agronautas'
import { createAgronautasRouter } from './agronautas'

test('POST /fields acepta alta válida en Corrientes', async () => {
  const fieldStore = new Map<string, Field>()
  const contextStore = new Map<string, FieldContext>()
  const app = createTestApp({
    fieldRepository: createFieldRepository({
      coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W', boundaryVersion: 'v1', localityConfidence: 1 },
      fieldStore,
    }),
    fieldContextRepository: createFieldContextRepository(contextStore),
  })

  const response = await request(app, '/agronautas/fields', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', fieldId: 'ext-1', crop: 'rice', hectares: 25, locality: 'Mercedes', location: { lat: -29.2, lng: -58.1 } }),
  })

  assert.equal(response.status, 201)
  const json = (await response.json()) as { coverage: { locality: string } }
  assert.equal(json.coverage.locality, 'Mercedes')
  assert.equal(fieldStore.size, 1)
  assert.equal(contextStore.size, 1)
})

test('POST /fields rechaza punto fuera de alcance', async () => {
  const app = createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: false, staleCause: 'outside_corrientes_rice_zone' }, fieldStore: new Map() }),
  })

  const response = await request(app, '/agronautas/fields', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', fieldId: 'ext-2', crop: 'rice', hectares: 10, locality: 'Rosario', location: { lat: -32.9, lng: -60.7 } }),
  })

  assert.equal(response.status, 422)
  const json = (await response.json()) as { code: string }
  assert.equal(json.code, 'OUT_OF_SUPPORTED_AREA')
})

test('POST /fields rechaza cultivo fuera de alcance MVP', async () => {
  const app = createTestApp()

  const response = await request(app, '/agronautas/fields', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', fieldId: 'ext-unsupported-crop', crop: 'soy', hectares: 10, locality: 'Mercedes', location: { lat: -29.2, lng: -58.1 } }),
  })

  assert.equal(response.status, 400)
  const json = (await response.json()) as { code: string; message: string }
  assert.equal(json.code, 'INVALID_CONTRACT')
  assert.match(json.message, /Payload inválido/i)
})

test('GET /fields/:id/alerts/current responde stale y encola recompute sin duplicar', async () => {
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snap-1',
    fieldId: 'field-1',
    runId: 'run-1',
    score: 82,
    confidence: 0.88,
    computedAt: new Date('2026-06-03T00:00:00.000Z'),
    validUntil: new Date('2026-06-03T01:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [{ key: 'heat_pressure', label: 'Heat pressure', weight: 1, value: 0.91 }],
    evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-1'],
    degradationReasons: [],
  })
  const lockCalls: string[] = []
  const app = createTestApp({
    riskSnapshotRepository: {
      async save() {},
      async getLatest() { return snapshot },
      async listTimeline() { return [snapshot] },
    },
    alertSnapshotRepository: {
      async saveMany() {},
      async getLatestForField() { return [{ alertId: 'alert-1', fieldId: 'field-1', basedOnSnapshotId: 'snap-0', runId: 'run-0', type: 'thermal_stress', priority: 2, confidence: 0.7, freshness: 'fresh', degradationReasons: [] }] },
      async listTimeline() { return [] },
    },
    recomputeLockRepository: {
      async acquire(fieldId) { lockCalls.push(fieldId); return lockCalls.length === 1 },
      async release() {},
    },
  })

  const first = await request(app, '/agronautas/fields/field-1/alerts/current')
  const second = await request(app, '/agronautas/fields/field-1/alerts/current')

  assert.equal(first.status, 202)
  assert.equal(second.status, 202)
  assert.equal(((await first.json()) as { recompute: { status: string } }).recompute.status, 'enqueued')
  assert.equal(((await second.json()) as { recompute: { status: string } }).recompute.status, 'already_in_progress')
})

test('GET /fields/:id/copilot/context expone referencias persistidas sin recalcular riesgo', async () => {
  const fieldStore = new Map<string, Field>()
  const contextStore = new Map<string, FieldContext>()
  const lockCalls: string[] = []

  const field = new Field({
    id: 'field-ctx-1',
    externalFieldId: 'ext-ctx-1',
    crop: 'rice',
    hectares: 18,
    localityName: 'Mercedes',
    provinceCode: 'AR-W',
    centroid: { lat: -29.2, lng: -58.1 },
    boundaryMetadata: {
      sourceName: 'test',
      sourceUrl: 'https://example.com',
      sourceVersion: 'v1',
      normalizationStatus: 'official-source-referenced',
    },
  })
  fieldStore.set(field.props.id, field)
  contextStore.set(field.props.id, new FieldContext({ fieldId: field.props.id, growthStage: 'tillering', localityCanonical: 'Mercedes', localityConfidence: 1, contextPayload: {} }))

  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snap-ctx-1',
    fieldId: field.props.id,
    runId: 'run-ctx-1',
    score: 76,
    confidence: 0.84,
    computedAt: new Date('2026-06-03T00:00:00.000Z'),
    validUntil: new Date('2026-06-03T06:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
    evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-ctx-1'],
    degradationReasons: ['satellite_data_stale'],
  })

  const app = createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    fieldContextRepository: createFieldContextRepository(contextStore),
    riskSnapshotRepository: {
      async save() {},
      async getLatest() { return snapshot },
      async listTimeline() { return [snapshot] },
    },
    alertSnapshotRepository: {
      async saveMany() {},
      async getLatestForField() {
        return [{ alertId: 'alert-ctx-1', fieldId: field.props.id, basedOnSnapshotId: snapshot.props.snapshotId, runId: snapshot.props.runId, type: 'flood', priority: 1, confidence: 0.73, freshness: 'degraded', degradationReasons: ['satellite_data_stale'] }]
      },
      async listTimeline() { return [] },
    },
    recomputeLockRepository: {
      async acquire(fieldId) { lockCalls.push(fieldId); return true },
      async release() {},
    },
  })

  const response = await request(app, `/agronautas/fields/${field.props.id}/copilot/context?from=2026-06-01T00:00:00.000Z&to=2026-06-07T00:00:00.000Z`)
  assert.equal(response.status, 200)
  const json = (await response.json()) as {
    requestedWindow: { from: string; to: string }
    latestSnapshotId: string
    alertIds: string[]
    snapshot: { evidenceRefs: string[]; freshness: string }
    alerts: Array<{ alertId: string; basedOnSnapshotId: string }>
  }
  assert.deepEqual(json.requestedWindow, { from: '2026-06-01T00:00:00.000Z', to: '2026-06-07T00:00:00.000Z' })
  assert.equal(json.latestSnapshotId, 'snap-ctx-1')
  assert.deepEqual(json.alertIds, ['alert-ctx-1'])
  assert.equal(json.snapshot.freshness, 'stale')
  assert.deepEqual(json.snapshot.evidenceRefs, ['signal_ingestion_runs:weather-api:climate:run-ctx-1'])
  assert.equal(json.alerts[0]?.alertId, 'alert-ctx-1')
  assert.equal(json.alerts[0]?.basedOnSnapshotId, 'snap-ctx-1')
  assert.deepEqual(lockCalls, [])
})

test('GET /agronautas/runtime expone modo y prefijo activos', async () => {
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'demo'
  process.env['AGRONAUTAS_ROUTE_PREFIX'] = '/agronautas'

  const response = await request(createTestApp(), '/agronautas/runtime')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-agronautas-mode'), 'demo')
  assert.deepEqual(await response.json(), { mode: 'demo', routePrefix: '/agronautas', contractVersion: '1.0.0' })

  delete process.env['AGRONAUTAS_RUNTIME_MODE']
  delete process.env['AGRONAUTAS_ROUTE_PREFIX']
})

test('modo demo responde contratos backend-driven sin depender de repositorios', async () => {
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'demo'

  const app = createTestApp()
  const createResponse = await request(app, '/agronautas/fields', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', fieldId: 'demo-field', crop: 'rice', hectares: 25, locality: 'Mercedes', location: { lat: -29.2, lng: -58.1 } }),
  })
  assert.equal(createResponse.status, 201)

  const riskResponse = await request(app, '/agronautas/fields/demo-field/risk/current')
  assert.equal(riskResponse.status, 200)
  assert.equal(riskResponse.headers.get('x-agronautas-mode'), 'demo')
  const riskJson = await riskResponse.json() as { status: string; snapshot: { degradationReasons: string[] } }
  assert.equal(riskJson.status, 'stale')
  assert.deepEqual(riskJson.snapshot.degradationReasons, ['satellite_data_stale'])

  delete process.env['AGRONAUTAS_RUNTIME_MODE']
})

function createTestApp(overrides: Partial<Parameters<typeof createAgronautasRouter>[0]> = {}) {
  const app = express()
  app.use(express.json())
  app.use('/agronautas', createAgronautasRouter({
    fieldRepository: overrides.fieldRepository ?? createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map() }),
    fieldContextRepository: overrides.fieldContextRepository ?? createFieldContextRepository(new Map()),
    riskSnapshotRepository: overrides.riskSnapshotRepository ?? {
      async save() {},
      async getLatest() { return null },
      async listTimeline() { return [] },
    },
    signalSummaryRepository: overrides.signalSummaryRepository ?? {
      async getLatestClimateSummary(): Promise<ClimateSummary | null> { return null },
      async getLatestSatelliteSummary(): Promise<SatelliteSummary | null> { return null },
      async listClimateTimeline() { return [] },
    },
    recomputeLockRepository: overrides.recomputeLockRepository ?? { async acquire() { return true }, async release() {} },
    alertSnapshotRepository: overrides.alertSnapshotRepository ?? { async saveMany() {}, async getLatestForField() { return [] }, async listTimeline() { return [] } },
  }))
  return app
}

function createFieldRepository(input: { coverage: SupportedCoverageResult; fieldStore: Map<string, Field> }): FieldRepository {
  return {
    async save(field) { input.fieldStore.set(field.props.id, field) },
    async findById(fieldId) { return input.fieldStore.get(fieldId) ?? null },
    async findByExternalFieldId(fieldId) { return [...input.fieldStore.values()].find((field) => field.props.externalFieldId === fieldId) ?? null },
    async resolveCoverage() { return input.coverage },
  }
}

function createFieldContextRepository(store: Map<string, FieldContext>): FieldContextRepository {
  return {
    async save(context) { store.set(context.props.fieldId, context) },
    async getLatest(fieldId) { return store.get(fieldId) ?? null },
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
