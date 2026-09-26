import test from 'node:test'
import assert from 'node:assert/strict'
import type { DashboardSnapshot } from './schemas'
import { buildIngestionAdminRows, buildSourceFreshnessCards, deriveSafeOperationalAlerts, formatNextRun, normalizeEvidenceDashboard } from './ingestion-status'

const dashboard = {
  contractVersion: '1.0.0',
  snapshotId: 'risk-1',
  field: { fieldId: 'field-1', cropCategory: 'cereal', crop: 'maize', provinceCode: 'AR-W', locality: 'Mercedes' },
  status: 'degraded',
  freshness: 'degraded',
  signals: [
    { signalType: 'weather', status: 'fresh', evidenceRefs: ['weather:open-meteo'], confidence: 0.86, acquisitionTimes: ['2026-06-03T00:00:00.000Z'], degradationReasons: [] },
    { signalType: 'hydric_soil', status: 'stale', evidenceRefs: ['soil:inta'], confidence: 0.58, acquisitionTimes: ['2026-06-01T12:00:00.000Z'], degradationReasons: ['weather_data_stale'] },
    { signalType: 'satellite_vegetation', status: 'missing', evidenceRefs: ['satellite:sentinel'], confidence: 0.22, acquisitionTimes: [], degradationReasons: ['satellite_data_unavailable'] },
  ],
  risk: {
    score: 81,
    level: 'high',
    confidence: 0.77,
    drivers: [
      { key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.86 },
      { key: 'heat_pressure', label: 'Presión térmica', weight: 0.25, value: 0.74 },
    ],
  },
  alerts: [],
  provenance: [
    { evidenceId: 'open-meteo-weather', provider: 'open-meteo', signalType: 'weather', observedAt: '2026-06-03T00:00:00.000Z', ingestedAt: '2026-06-03T00:05:00.000Z', sourceUrl: 'https://api.open-meteo.com/', rawHash: 'hash-1', confidence: 0.86, freshness: 'fresh', providerMode: 'live', lastSuccessfulObservedAt: '2026-06-03T00:00:00.000Z', nextDueAt: '2026-06-03T01:00:00.000Z', degradationReasons: [] },
    { evidenceId: 'inta-soil', provider: 'inta-soil', signalType: 'hydric_soil', observedAt: '2026-06-01T12:00:00.000Z', ingestedAt: '2026-06-03T00:05:00.000Z', sourceUrl: 'https://www.inta.gob.ar/', rawHash: 'hash-2', confidence: 0.58, freshness: 'stale', providerMode: 'seam', lastSuccessfulObservedAt: '2026-06-01T12:00:00.000Z', nextDueAt: '2026-06-02T12:00:00.000Z', failureReason: 'adapter seam pendiente', degradationReasons: ['weather_data_stale'] },
    { evidenceId: 'sentinel-satellite', provider: 'sentinel-hub', signalType: 'satellite_vegetation', observedAt: '2026-05-20T12:00:00.000Z', ingestedAt: '2026-06-03T00:05:00.000Z', sourceUrl: 'https://sentinel.esa.int/', rawHash: 'hash-3', confidence: 0.22, freshness: 'missing', providerMode: 'unavailable', lastSuccessfulObservedAt: null, nextDueAt: '2026-06-08T12:00:00.000Z', failureReason: 'satellite_data_unavailable', degradationReasons: ['satellite_data_unavailable'] },
  ],
  scheduler: {
    lastRunAt: '2026-06-03T00:05:00.000Z',
    nextRunAt: '2026-06-03T01:00:00.000Z',
    lockStatus: 'available',
    failures: [{ provider: 'sentinel-hub', signalType: 'satellite_vegetation', reason: 'satellite_data_unavailable' }],
    nextDueBySource: [
      { provider: 'open-meteo', signalType: 'weather', dueAt: '2026-06-03T01:00:00.000Z', lastSuccessfulObservedAt: '2026-06-03T00:00:00.000Z', overdue: false, cadence: { provider: 'open-meteo', signalType: 'weather', updateCadence: '1h', rateLimit: 'safe hourly', freshnessSla: '2h', researchedAt: '2026-06-01T00:00:00.000Z', sourceRef: 'https://open-meteo.com/' } },
      { provider: 'inta-soil', signalType: 'hydric_soil', dueAt: '2026-06-02T12:00:00.000Z', lastSuccessfulObservedAt: '2026-06-01T12:00:00.000Z', overdue: true, cadence: { provider: 'inta-soil', signalType: 'hydric_soil', updateCadence: '24h', rateLimit: 'daily', freshnessSla: '24h', researchedAt: '2026-06-01T00:00:00.000Z', sourceRef: 'https://www.inta.gob.ar/' } },
    ],
  },
  generatedAt: '2026-06-03T00:05:00.000Z',
  lastDataFetchedAt: '2026-06-03T00:00:00.000Z',
  presentation: { disclaimer: 'Soporte operativo.', confidenceLabel: 'alta', sourcesUnavailable: true, staleFlags: ['satellite_data_unavailable'] },
} satisfies DashboardSnapshot

test('admin panel rows expose provider mode, next run and safe trigger state', () => {
  const rows = buildIngestionAdminRows(dashboard)

  assert.deepEqual(rows.map((row) => [row.provider, row.modeLabel, row.currentState, row.nextRunLabel, row.triggerEnabled]), [
    ['open-meteo', 'Live', 'Idle', '03/06/2026, 01:00', true],
    ['inta-soil', 'Seam', 'Stale', '02/06/2026, 12:00', false],
    ['sentinel-hub', 'Fallback', 'Failed', '08/06/2026, 12:00', false],
  ])
})

test('source freshness cards map weather soil and satellite to fresh stale unavailable', () => {
  const cards = buildSourceFreshnessCards(dashboard)

  assert.deepEqual(cards.map((card) => [card.sourceLabel, card.freshnessLabel, card.slaLabel]), [
    ['Clima', 'fresh', 'SLA 2h'],
    ['Suelo', 'stale', 'SLA 24h'],
    ['Satélite', 'unavailable', 'SLA no verificado'],
  ])
})

test('next run formatting and safe alert derivation are explicit', () => {
  assert.equal(formatNextRun('2026-06-03T01:00:00.000Z'), '03/06/2026, 01:00')
  assert.equal(formatNextRun(null), 'Sin corrida programada')

  assert.deepEqual(deriveSafeOperationalAlerts(dashboard).map((alert) => alert.label), [
    'Anegamiento',
    'Estrés térmico',
    'Heladas',
  ])
  assert.ok(deriveSafeOperationalAlerts(dashboard).every((alert) => alert.safetyLabel.includes('no producción')))
})

test('normalizes canonical evidence records without losing source, timestamps, confidence or lineage', () => {
  const normalized = normalizeEvidenceDashboard({
    ...dashboard,
    evidence: [{
      contractVersion: 'agronautas-evidence-v2',
      evidenceId: 'evidence-weather-1',
      locationId: 'location-1',
      workspaceId: 'workspace-1',
      fieldId: 'field-1',
      provider: 'open-meteo-weather',
      signalType: 'weather',
      providerMode: 'live',
      status: 'fresh',
      sourceUrl: 'https://api.open-meteo.com/v1/forecast',
      observedAt: '2026-06-03T00:00:00.000Z',
      acquiredAt: '2026-06-03T00:02:00.000Z',
      forecastAt: null,
      retrievedAt: '2026-06-03T00:03:00.000Z',
      units: { temperature: '°C' },
      schemaVersion: 'open-meteo-weather-v1',
      httpStatus: 200,
      schemaStatus: 'valid',
      runId: 'run-weather-1',
      requestId: 'request-weather-1',
      rawHash: 'raw-weather-1',
      freshnessPolicy: 'observed-at-retrieval',
      degradationReasons: [],
      retryable: false,
      value: { temperatureC: 26.4 },
    }],
    readiness: [{
      contractVersion: 'agronautas-readiness-v2',
      locationId: 'location-1',
      workspaceId: 'workspace-1',
      fieldId: 'field-1',
      productSlice: 'signals',
      source: 'open-meteo-weather',
      state: 'ready',
      evaluatedAt: '2026-06-03T00:04:00.000Z',
      evidenceRefs: ['evidence-weather-1'],
      runIds: ['run-weather-1'],
      retryable: false,
    }],
    ingestion: [{
      provider: 'open-meteo-weather',
      signalType: 'weather',
      state: 'succeeded',
      runId: 'run-weather-1',
      retrievedAt: '2026-06-03T00:03:00.000Z',
      nextDueAt: '2026-06-03T01:00:00.000Z',
      retryable: false,
    }],
  })

  const weather = normalized.sources.find((source) => source.key === 'weather')
  assert.equal(weather?.providerMode, 'live')
  assert.equal(weather?.status, 'fresh')
  assert.equal(weather?.observedAt, '2026-06-03T00:00:00.000Z')
  assert.equal(weather?.acquiredAt, '2026-06-03T00:02:00.000Z')
  assert.equal(weather?.retrievedAt, '2026-06-03T00:03:00.000Z')
  assert.equal(weather?.confidence, 0.86)
  assert.equal(weather?.runId, 'run-weather-1')
  assert.equal(normalized.readiness[0]?.state, 'ready')
  assert.equal(normalized.ingestion[0]?.state, 'succeeded')
})

test('keeps empty provider records explicit and never fills unavailable sources with demo values', () => {
  const emptyDashboard = {
    ...dashboard,
    signals: [],
    provenance: [],
  } satisfies DashboardSnapshot
  const normalized = normalizeEvidenceDashboard(emptyDashboard)

  assert.equal(normalized.overallState, 'empty')
  assert.deepEqual(normalized.sources.map((source) => [source.key, source.status, source.providerMode]), [
    ['climate', 'empty', 'unavailable'],
    ['weather', 'empty', 'unavailable'],
    ['smn-alert', 'empty', 'unavailable'],
    ['satellite', 'empty', 'unavailable'],
  ])
  assert.equal(normalized.sources.some((source) => source.provider === 'demo'), false)
  assert.equal(normalized.sources.some((source) => source.valueAvailable), false)
})
