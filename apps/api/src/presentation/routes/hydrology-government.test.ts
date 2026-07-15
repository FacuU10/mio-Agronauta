import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import { AGRICULTURAL_CENTERS, PNA_FLOOD_RISK_PORTS, createGovernmentIngestionRunner, createHydrologyGovernmentRouter, describeHydrologyStartupFailure, seedGovernmentMunicipalitiesIfEmpty } from './hydrology-government'
import {
  hydrologyGovernmentDashboardResponseSchema,
  hydrologyGovernmentIngestResponseSchema,
  hydrologyGovernmentMunicipalitiesResponseSchema,
  hydrologyDenseContextV1Schema,
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

test('GET /api/hydrology/municipalities returns classified error when repository query fails', async () => {
  const response = await request(createTestApp({
    hydrologyRepository: {
      async getMunicipalityTelemetryOverview() { throw new Error('relation missing') },
      async getMunicipalityTelemetryDashboard() { return municipalityDashboard() },
    },
  }), '/api/hydrology/municipalities', { headers: { 'x-request-id': 'route-repo-failure' } })

  assert.equal(response.status, 503)
  assert.equal(response.headers.get('x-request-id'), 'route-repo-failure')
  const json = await response.json() as { code: string; details: { requestId: string; phase: string } }
  assert.equal(json.code, 'HYDROLOGY_MUNICIPALITIES_UNAVAILABLE')
  assert.equal(json.details.requestId, 'route-repo-failure')
  assert.equal(json.details.phase, 'repository_query')
})

test('GET /api/hydrology/municipalities strips bad telemetry when contract validation fails', async () => {
  const badMunicipality = municipalityView()
  badMunicipality.latestTelemetry = [{ ...badMunicipality.latestTelemetry[0]!, confidence: 'bad-confidence' as never }]
  const response = await request(createTestApp({
    hydrologyRepository: {
      async getMunicipalityTelemetryOverview() { return [badMunicipality] },
      async getMunicipalityTelemetryDashboard() { return municipalityDashboard() },
    },
  }), '/api/hydrology/municipalities', { headers: { 'x-request-id': 'route-parse-fallback' } })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-request-id'), 'route-parse-fallback')
  const json = hydrologyGovernmentMunicipalitiesResponseSchema.parse(await response.json())
  assert.equal(json.municipalities.length, 1)
  assert.deepEqual(json.municipalities[0]?.latestTelemetry, [])
})

test('GET /api/hydrology/municipalities never returns offline fixture telemetry or fixture-derived alerts', async () => {
  const fixtureMunicipality = municipalityView()
  fixtureMunicipality.latestTelemetry = [{
    ...fixtureMunicipality.latestTelemetry[3]!,
    sourceUrl: 'offline-fixture://smn/corrientes-alert',
  }]
  const response = await request(createTestApp({
    hydrologyRepository: {
      async getMunicipalityTelemetryOverview() { return [fixtureMunicipality] },
      async getMunicipalityTelemetryDashboard() { return municipalityDashboard() },
    },
  }), '/api/hydrology/municipalities')

  assert.equal(response.status, 200)
  const json = hydrologyGovernmentMunicipalitiesResponseSchema.parse(await response.json())
  assert.deepEqual(json.municipalities[0]?.latestTelemetry, [])
  assert.deepEqual(json.provinceAlerts, [])
  assert.doesNotMatch(JSON.stringify(json), /offline-fixture:\/\//)
})

test('GET /api/hydrology/municipalities/debug exposes non-sensitive diagnostics', async () => {
  const response = await request(createTestApp(), '/api/hydrology/municipalities/debug', { headers: { 'x-request-id': 'route-debug' } })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-request-id'), 'route-debug')
  const json = await response.json() as { contractVersion: string; requestId: string; hasDatabaseUrl: boolean }
  assert.equal(json.contractVersion, 'hydrology-government-diagnostics-v1')
  assert.equal(json.requestId, 'route-debug')
  assert.equal(typeof json.hasDatabaseUrl, 'boolean')
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
  const response = await request(createTestApp({ ingestionRunner: async (input) => ({ runId: `manual-${input.source ?? 'ALL'}`, status: 'completed', requestedSources: input.source ? [input.source] : ['PNA', 'INA', 'INMET', 'SMN'], sources: input.source ? [input.source] : ['PNA', 'INA', 'INMET', 'SMN'], results: [{ source: input.source ?? 'PNA', status: 'success', recordsIngested: 1 }] }) }), '/api/hydrology/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', source: 'PNA' }),
  })

  assert.equal(response.status, 202)
  const json = hydrologyGovernmentIngestResponseSchema.parse(await response.json())
  assert.equal(json.status, 'completed')
  assert.deepEqual(json.requestedSources, ['PNA'])
})

test('POST /api/hydrology/ingest echoes the requested proofRunId when the runner omits it', async () => {
  let receivedProofRunId: string | undefined
  const response = await request(createTestApp({ ingestionRunner: async (input) => {
    receivedProofRunId = input.proofRunId
    return { runId: 'manual-proof', status: 'completed', requestedSources: ['PNA'], sources: ['PNA'], results: [{ source: 'PNA', status: 'success', recordsIngested: 1 }], sourceResults: [{ source: 'PNA', status: 'success', recordsIngested: 1 }] }
  } }), '/api/hydrology/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', source: 'PNA', proofRunId: 'proof-route-contract-1' }),
  })

  assert.equal(response.status, 202)
  assert.equal(receivedProofRunId, 'proof-route-contract-1')
  assert.equal((await response.json() as { proofRunId?: string }).proofRunId, 'proof-route-contract-1')
})

test('POST /api/hydrology/ingest does not allow a runner proofRunId to replace the request correlation ID', async () => {
  const response = await request(createTestApp({ ingestionRunner: async () => ({
    runId: 'manual-proof-mismatch',
    proofRunId: 'runner-proof-mismatch',
    status: 'completed',
    requestedSources: ['PNA'],
    sources: ['PNA'],
    results: [{ source: 'PNA', status: 'success', recordsIngested: 1 }],
    sourceResults: [{ source: 'PNA', status: 'success', recordsIngested: 1 }],
  }) }), '/api/hydrology/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', source: 'PNA', proofRunId: 'proof-route-contract-2' }),
  })

  assert.equal(response.status, 202)
  assert.equal((await response.json() as { proofRunId?: string }).proofRunId, 'proof-route-contract-2')
})

test('POST /api/hydrology/ingest returns 202 with per-source diagnostics when all providers fail after execution starts', async () => {
  let runnerCalls = 0
  const allSources = ['PNA', 'INA', 'INMET', 'SMN'] as const
  const response = await request(createTestApp({
    ingestionRunner: async () => {
      runnerCalls += 1
      const results = allSources.map((source, index) => ({
        source,
        status: 'failed' as const,
        recordsIngested: 0,
        errorMessage: `Hydrology ingestion failed for ${source}: provider degraded`,
        diagnostic: {
          failureKind: index === 0 ? 'timeout' as const : index === 3 ? 'http_status' as const : 'unexpected_content_type' as const,
          reason: `${source} provider failed safely`,
          attempts: 1 as const,
          timeoutMs: 12_000,
          elapsedMs: 25 + index,
          providerHost: `${source.toLowerCase()}.example`,
          providerPath: '/feed',
          upstreamStatus: index === 3 ? 403 : undefined,
        },
      }))
      return {
        runId: 'manual-all-source-provider-failures',
        status: 'failed' as const,
        requestedSources: [...allSources],
        sources: [...allSources],
        results,
        sourceResults: results.map(({ source, recordsIngested, errorMessage }) => ({ source, status: 'failed' as const, recordsIngested, errorMessage })),
      }
    },
  }), '/api/hydrology/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', reason: 'local-real-parity' }),
  })

  assert.equal(response.status, 202)
  assert.equal(runnerCalls, 1)
  const json = hydrologyGovernmentIngestResponseSchema.parse(await response.json())
  assert.equal(json.status, 'failed')
  assert.deepEqual(json.requestedSources, [...allSources])
  assert.deepEqual(json.results.map((item) => [item.source, item.status, item.recordsIngested, item.diagnostic?.attempts]), [
    ['PNA', 'failed', 0, 1],
    ['INA', 'failed', 0, 1],
    ['INMET', 'failed', 0, 1],
    ['SMN', 'failed', 0, 1],
  ])
  assert.equal(json.results[0]?.diagnostic?.failureKind, 'timeout')
  assert.equal(json.results[3]?.diagnostic?.upstreamStatus, 403)
  assert.deepEqual(json.sourceResults.map((item) => [item.source, item.status]), [['PNA', 'failed'], ['INA', 'failed'], ['INMET', 'failed'], ['SMN', 'failed']])
  assert.doesNotMatch(JSON.stringify(json), /startup_failure|secret|password|postgres/i)
})

test('POST /api/hydrology/ingest accepts a direct request without credentials', async () => {
  const response = await request(createTestApp({ ingestionRunner: async () => ({ runId: 'manual-direct', status: 'queued', sources: ['PNA'] }) }), '/api/hydrology/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', source: 'PNA' }),
  })
  assert.equal(response.status, 202)
})

test('POST /api/hydrology/ingest rejects overlapping work while retaining the first bounded run', async () => {
  let signalRunnerStarted: () => void = () => undefined
  let releaseRunner: () => void = () => undefined
  const runnerStarted = new Promise<void>((resolve) => { signalRunnerStarted = resolve })
  const runnerRelease = new Promise<void>((resolve) => { releaseRunner = resolve })
  const app = createTestApp({ ingestionRunner: async () => {
    signalRunnerStarted()
    await runnerRelease
    return { runId: 'manual-overlap', status: 'queued', sources: ['PNA'] }
  } })

  const first = request(app, '/api/hydrology/ingest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: '1.0.0', source: 'PNA' }) })
  await runnerStarted
  const second = await request(app, '/api/hydrology/ingest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: '1.0.0', source: 'PNA' }) })
  assert.equal(second.status, 429)
  releaseRunner()
  assert.equal((await first).status, 202)
})

test('POST /api/hydrology/ingest returns a safe contract error when ingest startup fails', async () => {
  const response = await request(createTestApp({ ingestionRunner: async () => { throw new Error('database password secret: postgres://user:pass@example') } }), '/api/hydrology/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', reason: 'cron' }),
  })

  assert.equal(response.status, 503)
  const json = hydrologyGovernmentIngestResponseSchema.parse(await response.json())
  assert.equal(json.contractVersion, 'hydrology-government-ingest-v1')
  assert.equal(json.status, 'failed')
  assert.deepEqual(json.requestedSources, ['PNA', 'INA', 'INMET', 'SMN'])
  assert.equal(json.results[0]?.diagnostic?.failureKind, 'startup_failure')
  assert.doesNotMatch(JSON.stringify(json), /postgres|password|secret|pass@example/i)
})

test('default government ingestion runner saves all source fixtures when live clients fail or return empty', async () => {
  const saved: Array<{ source: string; records: number }> = []
  const runner = createGovernmentIngestionRunner({
    now: () => new Date('2026-06-26T12:00:00.000Z'),
    clients: {
      PNA: { async fetchTelemetry() { return { ok: false as const, error: 'offline', diagnostic: { failureKind: 'network_failure' as const, reason: 'network request failed', attempts: 1 } } } },
      INA: { async fetchTelemetry() { return { ok: true as const, records: [] } } },
      INMET: { async fetchTelemetry() { return { ok: false as const, error: 'timeout', diagnostic: { failureKind: 'timeout' as const, reason: 'INMET request timed out', attempts: 1, timeoutMs: 12_000 } } } },
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

test('default government ingestion runner returns partial production results and continues after one source fails', async () => {
  const previousNodeEnv = process.env['NODE_ENV']
  process.env['NODE_ENV'] = 'production'
  const clientCalls: string[] = []
  const saved: Array<{ source: string; status: string; records: number; errorMessage?: string }> = []
  try {
    const runner = createGovernmentIngestionRunner({
      now: () => new Date('2026-06-26T12:00:00.000Z'),
      clients: {
        PNA: { async fetchTelemetry() { clientCalls.push('PNA'); return { ok: false as const, error: 'offline', diagnostic: { failureKind: 'network_failure' as const, reason: 'network request failed', attempts: 1 } } } },
        INA: { async fetchTelemetry() { clientCalls.push('INA'); return { ok: true as const, records: [telemetryRecord('INA')] } } },
        INMET: { async fetchTelemetry() { clientCalls.push('INMET'); return { ok: true as const, records: [telemetryRecord('INMET')] } } },
        SMN: { async fetchTelemetry() { clientCalls.push('SMN'); return { ok: true as const, records: [telemetryRecord('SMN')] } } },
      },
      repository: {
        async saveTelemetryDeduped(records, run) {
          saved.push({ source: run.source, status: run.status, records: records.length, errorMessage: run.errorMessage })
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

    assert.equal(result.status, 'partial')
    assert.deepEqual(result.sources, ['PNA', 'INA', 'INMET', 'SMN'])
    assert.deepEqual(clientCalls, ['PNA', 'INA', 'INMET', 'SMN'])
    assert.deepEqual(saved.map((item) => [item.source, item.status, item.records]), [
      ['PNA', 'failed', 0],
      ['INA', 'success', 1],
      ['INMET', 'success', 1],
      ['SMN', 'success', 1],
    ])
    assert.deepEqual(result.sourceResults.map((item) => [item.source, item.status, item.recordsIngested]), [
      ['PNA', 'failed', 0],
      ['INA', 'success', 1],
      ['INMET', 'success', 1],
      ['SMN', 'success', 1],
    ])
    assert.match(result.sourceResults[0]?.errorMessage ?? '', /Hydrology ingestion failed for PNA: offline/)
  } finally {
    if (previousNodeEnv === undefined) delete process.env['NODE_ENV']
    else process.env['NODE_ENV'] = previousNodeEnv
  }
})

test('default government ingestion runner returns failed for one production source failure without fixture writes', async () => {
  const previousNodeEnv = process.env['NODE_ENV']
  process.env['NODE_ENV'] = 'production'
  const saved: Array<{ source: string; status: string; records: number; errorMessage?: string }> = []
  try {
    const runner = createGovernmentIngestionRunner({
      now: () => new Date('2026-06-26T12:00:00.000Z'),
      clients: { PNA: { async fetchTelemetry() { return { ok: false as const, error: 'offline', diagnostic: { failureKind: 'network_failure' as const, reason: 'network request failed', attempts: 1, timeoutMs: 10_000, providerHost: 'pna.example', providerPath: '/alturas' } } } } },
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

    const result = await runner({ source: 'PNA' })

    assert.equal(result.status, 'failed')
    assert.equal(result.results[0]?.status, 'failed')
    assert.equal(result.results[0]?.diagnostic?.failureKind, 'network_failure')
    assert.equal(result.results[0]?.diagnostic?.attempts, 1)
    assert.equal(result.results[0]?.diagnostic?.timeoutMs, 10_000)
    assert.deepEqual(result.sourceResults, [{ source: 'PNA', status: 'failed', recordsIngested: 0, errorMessage: 'Hydrology ingestion failed for PNA: offline' }])
    assert.deepEqual(saved, [{ source: 'PNA', status: 'failed', records: 0, errorMessage: 'Hydrology ingestion failed for PNA: offline' }])
  } finally {
    if (previousNodeEnv === undefined) delete process.env['NODE_ENV']
    else process.env['NODE_ENV'] = previousNodeEnv
  }
})

test('default government ingestion runner reports partial with safe diagnostics and one client call per source', async () => {
  const calls: { PNA: number; SMN: number } = { PNA: 0, SMN: 0 }
  const saved: Array<{ source: string; status: string; records: number; errorMessage?: string }> = []
  const observedAt = new Date('2026-06-26T10:30:00.000Z')
  const runner = createGovernmentIngestionRunner({
    now: () => new Date('2026-06-26T12:00:00.000Z'),
    allowFixtureFallback: false,
    clients: {
      PNA: { async fetchTelemetry() { calls.PNA += 1; return { ok: false as const, error: 'timeout after 10000ms', diagnostic: { failureKind: 'timeout' as const, reason: 'PNA request timed out', attempts: 1, timeoutMs: 10_000, providerHost: 'www.prefecturanaval.gob.ar', providerPath: '/alturas' } } } },
      INA: { async fetchTelemetry() { return { ok: true as const, records: [] } } },
      INMET: { async fetchTelemetry() { return { ok: true as const, records: [] } } },
      SMN: { async fetchTelemetry() { calls.SMN += 1; return { ok: true as const, records: [{ source: 'SMN' as const, stationId: 'smn-corrientes', observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, value: null, unit: 'alerta', metric: 'storm_alert' as const, quality: 'ok' as const, freshness: 'fresh' as const, sourceUrl: 'https://example.com/smn' }] } } },
    },
    repository: {
      async saveTelemetryDeduped(records, run) {
        saved.push({ source: run.source, status: run.status, records: records.length, errorMessage: run.errorMessage })
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

  const result = await runner({ source: undefined })

  assert.equal(result.status, 'partial')
  assert.equal(calls.PNA, 1)
  assert.equal(calls.SMN, 1)
  assert.equal(result.results.find((item) => item.source === 'PNA')?.diagnostic?.failureKind, 'timeout')
  assert.equal(result.results.find((item) => item.source === 'PNA')?.diagnostic?.attempts, 1)
  assert.equal(result.results.find((item) => item.source === 'SMN')?.status, 'success')
  assert.ok(saved.some((item) => item.source === 'PNA' && item.status === 'failed' && item.records === 0))
})

test('default government ingestion runner captures thrown provider failures and continues each source once', async () => {
  const calls: Record<'PNA' | 'INA' | 'INMET' | 'SMN', number> = { PNA: 0, INA: 0, INMET: 0, SMN: 0 }
  const saved: Array<{ source: string; status: string; records: number; errorMessage?: string }> = []
  const runner = createGovernmentIngestionRunner({
    now: () => new Date('2026-06-26T12:00:00.000Z'),
    allowFixtureFallback: false,
    clients: {
      PNA: { async fetchTelemetry() { calls.PNA += 1; throw new Error('socket secret should stay private') } },
      INA: { async fetchTelemetry() { calls.INA += 1; throw new TypeError('invalid json payload') } },
      INMET: { async fetchTelemetry() { calls.INMET += 1; throw new Error('html parser failed') } },
      SMN: { async fetchTelemetry() { calls.SMN += 1; throw new Error('HTTP 403 Forbidden') } },
    },
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

  const result = await runner({ source: undefined })

  assert.equal(result.status, 'failed')
  assert.deepEqual(calls, { PNA: 1, INA: 1, INMET: 1, SMN: 1 })
  assert.deepEqual(result.results.map((item) => [item.source, item.status, item.recordsIngested, item.diagnostic?.failureKind, item.diagnostic?.attempts]), [
    ['PNA', 'failed', 0, 'network_failure', 1],
    ['INA', 'failed', 0, 'network_failure', 1],
    ['INMET', 'failed', 0, 'network_failure', 1],
    ['SMN', 'failed', 0, 'http_status', 1],
  ])
  assert.deepEqual(saved.map((item) => [item.source, item.status, item.records]), [['PNA', 'failed', 0], ['INA', 'failed', 0], ['INMET', 'failed', 0], ['SMN', 'failed', 0]])
  assert.doesNotMatch(JSON.stringify(result), /secret should stay private|invalid json payload|html parser failed/i)
})

test('default government ingestion runner uses client timeout cushion instead of masking provider diagnostics', async () => {
  const saved: Array<{ source: string; status: string; records: number; errorMessage?: string }> = []
  const client = {
    timeoutMs: 25_000,
    async fetchTelemetry() {
      return {
        ok: false as const,
        error: 'PNA network failure: timeout after 25000ms',
        diagnostic: { failureKind: 'timeout' as const, reason: 'PNA request timed out', attempts: 1 as const, timeoutMs: 25_000, elapsedMs: 25_001, providerHost: 'contenidosweb.prefecturanaval.gob.ar', providerPath: '/alturas/' },
      }
    },
  }
  const runner = createGovernmentIngestionRunner({
    now: () => new Date('2026-06-26T12:00:00.000Z'),
    allowFixtureFallback: false,
    clients: { PNA: client },
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

  const result = await runner({ source: 'PNA' })

  assert.equal(result.results[0]?.diagnostic?.failureKind, 'timeout')
  assert.equal(result.results[0]?.diagnostic?.timeoutMs, 25_000)
  assert.equal(result.results[0]?.diagnostic?.durationMs, 0)
  assert.equal(result.results[0]?.diagnostic?.providerHost, 'contenidosweb.prefecturanaval.gob.ar')
  assert.deepEqual(saved, [{ source: 'PNA', status: 'failed', records: 0, errorMessage: 'Hydrology ingestion failed for PNA: PNA network failure: timeout after 25000ms' }])
})

test('default government ingestion runner keeps provider diagnostics when failed-source persistence rejects', async () => {
  const calls: Record<'PNA' | 'INA' | 'INMET' | 'SMN', number> = { PNA: 0, INA: 0, INMET: 0, SMN: 0 }
  const attemptedPersistence: string[] = []
  const runner = createGovernmentIngestionRunner({
    now: () => new Date('2026-06-26T12:00:00.000Z'),
    allowFixtureFallback: false,
    clients: {
      PNA: { async fetchTelemetry() { calls.PNA += 1; return { ok: false as const, error: 'timeout after 10000ms', diagnostic: { failureKind: 'timeout' as const, reason: 'PNA request timed out', attempts: 1, timeoutMs: 10_000, providerHost: 'www.prefecturanaval.gob.ar', providerPath: '/alturas' } } } },
      INA: { async fetchTelemetry() { calls.INA += 1; return { ok: false as const, error: 'HTML payload', diagnostic: { failureKind: 'unexpected_content_type' as const, reason: 'INA returned unsupported content type', attempts: 1, timeoutMs: 15_000, providerHost: 'www.ina.gob.ar', providerPath: '/alerta/index.php' } } } },
      INMET: { async fetchTelemetry() { calls.INMET += 1; return { ok: false as const, error: 'HTML payload', diagnostic: { failureKind: 'unexpected_content_type' as const, reason: 'INMET returned unsupported content type', attempts: 1, timeoutMs: 15_000, providerHost: 'portal.inmet.gov.br', providerPath: '/dadoshistoricos' } } } },
      SMN: { async fetchTelemetry() { calls.SMN += 1; return { ok: false as const, error: 'HTTP 403 Forbidden', diagnostic: { failureKind: 'http_status' as const, reason: 'SMN upstream returned HTTP 403', attempts: 1, timeoutMs: 15_000, providerHost: 'www.smn.gob.ar', providerPath: '/alertas', upstreamStatus: 403 } } } },
    },
    repository: {
      async saveTelemetryDeduped(_records, run) {
        attemptedPersistence.push(run.source)
        throw new AggregateError([Object.assign(new Error('connect ETIMEDOUT db.internal secret=hidden'), { code: 'ETIMEDOUT' })], 'All promises were rejected')
      },
    },
    seedDb: {
      async query(sql: string) {
        if (/SELECT COUNT\(\*\)::int AS count FROM agronautas_municipalities/.test(sql)) return { rows: [{ count: 17 }], rowCount: 1 }
        return { rows: [], rowCount: 1 }
      },
    },
  })

  const result = await runner({ source: undefined })

  assert.equal(result.status, 'failed')
  assert.deepEqual(calls, { PNA: 1, INA: 1, INMET: 1, SMN: 1 })
  assert.deepEqual(attemptedPersistence, ['PNA', 'INA', 'INMET', 'SMN'])
  assert.deepEqual(result.results.map((item) => [item.source, item.status, item.diagnostic?.failureKind, item.diagnostic?.attempts]), [
    ['PNA', 'failed', 'timeout', 1],
    ['INA', 'failed', 'unexpected_content_type', 1],
    ['INMET', 'failed', 'unexpected_content_type', 1],
    ['SMN', 'failed', 'http_status', 1],
  ])
  assert.ok(result.results.every((item) => /provider failure recorded; persistence write failed/.test(item.errorMessage ?? '')))
  assert.doesNotMatch(JSON.stringify(result), /secret=hidden|db\.internal|ETIMEDOUT/)
})

test('describeHydrologyStartupFailure returns bounded sanitized AggregateError diagnostics', () => {
  const error = new AggregateError([
    Object.assign(new Error('connect ETIMEDOUT postgres://user:pass@db.internal:5432/app'), { code: 'ETIMEDOUT' }),
    Object.assign(new TypeError('password leaked in inner cause'), { code: '28P01' }),
    new Error('third hidden error'),
  ], 'All promises were rejected')

  const details = describeHydrologyStartupFailure(error, 'seed_municipalities')

  assert.equal(details.operation, 'seed_municipalities')
  assert.equal(details.errorName, 'AggregateError')
  assert.equal(details.message, 'All promises were rejected')
  assert.deepEqual(details.aggregateErrors?.map((item) => item.name), ['Error', 'TypeError'])
  assert.deepEqual(details.aggregateErrors?.map((item) => item.code), ['ETIMEDOUT', '28P01'])
  assert.doesNotMatch(JSON.stringify(details), /postgres:\/\/|user:pass|db\.internal|password leaked|third hidden/)
})

test('POST /api/hydrology/ingest returns safe structured startup failure response', async () => {
  const response = await request(createTestApp({ ingestionRunner: async () => { throw new Error('database password secret') } }), '/api/hydrology/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', source: 'PNA' }),
  })

  assert.equal(response.status, 503)
  const json = hydrologyGovernmentIngestResponseSchema.parse(await response.json())
  assert.equal(json.status, 'failed')
  assert.equal(json.results[0]?.diagnostic?.failureKind, 'startup_failure')
  assert.equal(json.results[0]?.diagnostic?.attempts, 1)
  assert.doesNotMatch(JSON.stringify(json), /password secret/)
})

test('default government ingestion runner continues when one source fails and persists degraded run', async () => {
  const saved: Array<{ source: string; status: string; records: number; errorMessage?: string; observedTo?: string }> = []
  const observedAt = new Date('2026-06-26T10:30:00.000Z')
  const runner = createGovernmentIngestionRunner({
    now: () => new Date('2026-06-26T12:00:00.000Z'),
    allowFixtureFallback: false,
    clients: {
      PNA: { async fetchTelemetry() { return { ok: true as const, records: [{ source: 'PNA' as const, stationId: 'corrientes', observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, value: 3.4, unit: 'm', metric: 'river_height_m' as const, quality: 'ok' as const, freshness: 'fresh' as const, sourceUrl: 'https://example.com/pna' }] } } },
      INA: { async fetchTelemetry() { return { ok: true as const, records: [] } } },
      INMET: { async fetchTelemetry() { return { ok: true as const, records: [] } } },
      SMN: { async fetchTelemetry() { return { ok: false as const, error: 'upstream unavailable', diagnostic: { failureKind: 'network_failure' as const, reason: 'SMN network request failed', attempts: 1 } } } },
    },
    repository: {
      async saveTelemetryDeduped(records, run) {
        saved.push({ source: run.source, status: run.status, records: records.length, errorMessage: run.errorMessage, observedTo: run.observedTo?.toISOString() })
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

  const result = await runner({ source: undefined })

  assert.equal(result.status, 'partial')
  assert.equal(result.results.find((item) => item.source === 'PNA')?.status, 'success')
  assert.equal(result.results.find((item) => item.source === 'SMN')?.status, 'failed')
  assert.ok(saved.some((item) => item.source === 'PNA' && item.status === 'success' && item.observedTo === observedAt.toISOString()))
  assert.ok(saved.some((item) => item.source === 'SMN' && item.status === 'failed' && item.records === 0 && /upstream unavailable/.test(item.errorMessage ?? '')))
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
  const response = await request(createTestApp({ hydrologyCopilotService: { async *streamChat(input) { const context = hydrologyDenseContextV1Schema.parse(input.context); assert.equal(context.zone, 'Mercedes'); yield { type: 'metadata' as const, data: { municipalityId: input.context.fieldId } }; yield { type: 'token' as const, data: 'Respuesta basada en SMN.' }; yield { type: 'done' as const, data: { model: 'test' } } } } }), '/api/hydrology/municipalities/mercedes/copilot/chat', {
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

function telemetryRecord(source: 'INA' | 'INMET' | 'SMN') {
  return {
    source,
    stationId: `${source.toLowerCase()}-station`,
    observedAt: new Date('2026-06-26T12:00:00.000Z'),
    ingestedAt: new Date('2026-06-26T12:00:00.000Z'),
    lastSuccessfulObservedAt: new Date('2026-06-26T12:00:00.000Z'),
    value: 1,
    unit: source === 'SMN' ? 'alerta' : 'm',
    metric: source === 'SMN' ? 'storm_alert' as const : 'river_height_m' as const,
    quality: 'ok' as const,
    freshness: 'fresh' as const,
    sourceUrl: `https://example.com/${source.toLowerCase()}`,
    raw: { source },
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

async function withEnv<T>(values: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key])
    const value = values[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return await run()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}
