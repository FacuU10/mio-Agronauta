import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AGRONAUTAS_CONTRACT_VERSION,
  dashboardSnapshotSchema,
  demoContactSubmissionSchema,
  fieldIntakeSchema,
  groundedChatRequestSchema,
  hydrologyGovernmentIngestDiagnosticSchema,
  hydrologyDenseContextV1Schema,
  hydrologyGovernmentIngestResponseSchema,
  hydrologyOperatorReceiptSchema,
  hydrologyProviderPayloadGuardSchema,
  hydrologyTelemetrySchema,
  pdfReportRequestSchema,
  schedulerStatusSchema,
  signalEvidenceSchema,
  sourceCadenceSchema,
} from './agronautas.js'

test('hydrology government ingest schema acepta completed, partial y failed', () => {
  const base = { contractVersion: 'hydrology-government-ingest-v1' as const, requestedSources: ['PNA', 'SMN'] }
  const completed = hydrologyGovernmentIngestResponseSchema.parse({
    ...base,
    runId: 'run-completed',
    status: 'completed',
    results: [{ source: 'PNA', status: 'success', recordsIngested: 2, provenanceUrl: 'https://example.com/pna', observedFrom: '2026-06-23T10:00:00.000Z', observedTo: '2026-06-23T10:30:00.000Z' }],
  })
  const partial = hydrologyGovernmentIngestResponseSchema.parse({
    ...base,
    status: 'partial',
    results: [{ source: 'PNA', status: 'success', recordsIngested: 1 }, { source: 'SMN', status: 'failed', recordsIngested: 0, errorMessage: 'offline' }],
  })
  const failed = hydrologyGovernmentIngestResponseSchema.parse({
    ...base,
    status: 'failed',
    results: [{ source: 'SMN', status: 'failed', recordsIngested: 0, errorMessage: 'timeout' }],
  })

  assert.equal(completed.status, 'completed')
  assert.equal(partial.results[1]?.status, 'failed')
  assert.equal(failed.results[0]?.recordsIngested, 0)
})

test('hydrology government ingest schema accepts public bounded diagnostics', () => {
  const parsed = hydrologyGovernmentIngestResponseSchema.parse({
    contractVersion: 'hydrology-government-ingest-v1',
    status: 'failed',
    requestedSources: ['PNA'],
    results: [{
      source: 'PNA',
      status: 'failed',
      recordsIngested: 0,
      errorMessage: 'Hydrology ingestion failed for PNA: timeout',
      provenanceUrl: 'https://www.prefecturanaval.gob.ar/alturas',
      diagnostic: {
        failureKind: 'response_too_large',
        reason: 'PNA response exceeded safe size limit',
        attempts: 1,
        timeoutMs: 10_000,
        durationMs: 10_001,
        providerHost: 'www.prefecturanaval.gob.ar',
        providerPath: '/alturas',
      },
    }],
  })

  assert.equal(parsed.results[0]?.diagnostic?.failureKind, 'response_too_large')
  assert.equal(parsed.results[0]?.diagnostic?.attempts, 1)
  assert.equal(parsed.results[0]?.diagnostic?.providerPath, '/alturas')
})

test('hydrology government ingest schema carries proof run id and safe http summary', () => {
  const parsed = hydrologyGovernmentIngestResponseSchema.parse({
    contractVersion: 'hydrology-government-ingest-v1',
    runId: 'manual-run-1',
    proofRunId: 'proof-20260714T000000Z',
    status: 'partial',
    requestedSources: ['INA'],
    results: [{
      source: 'INA',
      status: 'failed',
      recordsIngested: 0,
      httpSummary: {
        host: 'www.ina.gob.ar',
        path: '/alerta/index.php',
        status: 200,
        elapsedMs: 321,
        attempts: 2,
        timeoutMs: 15_000,
        responseBytes: 2048,
        responseChars: 1024,
      },
      diagnostic: { failureKind: 'parse_failure', reason: 'INA payload parse failed', attempts: 2, durationMs: 322 },
    }],
  })

  assert.equal(parsed.proofRunId, 'proof-20260714T000000Z')
  assert.equal(parsed.results[0]?.httpSummary?.host, 'www.ina.gob.ar')
  assert.equal(parsed.results[0]?.httpSummary?.attempts, 2)
})

test('hydrology operator receipt records redacted Cron, source, chat and row correlation evidence', () => {
  const parsed = hydrologyOperatorReceiptSchema.parse({
    verifier: 'ibera-alerta-operator-v1',
    evidenceScope: 'production',
    capturedAt: '2026-07-18T12:00:00.000Z',
    runtime: {
      service: 'agronautas-api',
      revision: 'render-revision-redacted',
      config: {
        schedulerEnabled: false,
        secretNames: ['HYDROLOGY_INGEST_TOKEN', 'GROQ_API_KEY'],
        regionalRunner: { mode: 'proxy', allowlisted: true },
      },
    },
    request: {
      requestId: 'request-1',
      method: 'POST',
      path: '/api/hydrology/ingest',
      acknowledgementStatus: 202,
      responseShape: {
        contractVersion: 'hydrology-government-ingest-v1',
        status: 'partial',
        proofRunId: 'proof-1',
        hasStatusPath: true,
        resultCount: 4,
      },
    },
    sourceOutcomes: [
      { source: 'PNA', status: 'success', recordsIngested: 1, attempts: 1 },
      { source: 'INA', status: 'empty', recordsIngested: 0, attempts: 1 },
      { source: 'INMET', status: 'failed', recordsIngested: 0, attempts: 1 },
      { source: 'SMN', status: 'success', recordsIngested: 1, attempts: 1 },
    ],
    rowCorrelation: [
      { rowId: 'row-1', source: 'PNA', proofRunId: 'proof-1', status: 'success', recordsIngested: 1, correlated: true },
      { rowId: 'row-2', source: 'INA', proofRunId: 'proof-1', status: 'empty', recordsIngested: 0, correlated: true },
      { rowId: 'row-3', source: 'INMET', proofRunId: 'proof-1', status: 'failed', recordsIngested: 0, correlated: true },
      { rowId: 'row-4', source: 'SMN', proofRunId: 'proof-1', status: 'success', recordsIngested: 1, correlated: true },
    ],
    chat: { mode: 'degraded-fallback', status: 'degraded', eventTypes: ['metadata', 'token', 'done'], rawContentIncluded: false },
    passed: true,
  })

  assert.equal(parsed.request.acknowledgementStatus, 202)
  assert.equal(parsed.rowCorrelation[0]?.proofRunId, parsed.request.responseShape.proofRunId)
  assert.equal(parsed.chat.rawContentIncluded, false)
})

test('hydrology operator receipt rejects secret values, raw chat, and mismatched row correlation', () => {
  const base = {
    verifier: 'ibera-alerta-operator-v1' as const,
    evidenceScope: 'local' as const,
    capturedAt: '2026-07-18T12:00:00.000Z',
    runtime: { service: 'api', revision: 'local', config: { schedulerEnabled: false, secretNames: ['HYDROLOGY_INGEST_TOKEN'], regionalRunner: { mode: 'direct' as const, allowlisted: true } } },
    request: { requestId: 'request-1', method: 'POST' as const, path: '/api/hydrology/ingest' as const, acknowledgementStatus: 202 as const, responseShape: { contractVersion: 'hydrology-government-ingest-v1' as const, status: 'completed' as const, proofRunId: 'proof-1', hasStatusPath: true, resultCount: 1 } },
    sourceOutcomes: [{ source: 'PNA' as const, status: 'success' as const, recordsIngested: 1, attempts: 1 as const }],
    rowCorrelation: [{ rowId: 'row-1', source: 'PNA' as const, proofRunId: 'proof-1', status: 'success' as const, recordsIngested: 1, correlated: true as const }],
    chat: { mode: 'not_run' as const, status: 'not_run' as const, eventTypes: [] as const, rawContentIncluded: false as const },
    passed: true,
  }
  const secretValue = hydrologyOperatorReceiptSchema.safeParse({ ...base, runtime: { ...base.runtime, config: { ...base.runtime.config, ingestToken: 'must-not-appear' } } })
  const rawChat = hydrologyOperatorReceiptSchema.safeParse({ ...base, chat: { ...base.chat, rawContentIncluded: true } })
  const mismatchedRow = hydrologyOperatorReceiptSchema.safeParse({ ...base, rowCorrelation: [{ ...base.rowCorrelation[0], proofRunId: 'other-proof' }] })

  assert.equal(secretValue.success, false)
  assert.equal(rawChat.success, false)
  assert.equal(mismatchedRow.success, false)
})

test('hydrology ingest diagnostic schema rejects unsafe or unbounded public fields', () => {
  const withSecretField = hydrologyGovernmentIngestDiagnosticSchema.safeParse({
    failureKind: 'network_failure',
    reason: 'network request failed',
    attempts: 1,
    stack: 'Error: password=secret',
  })
  const withQueryString = hydrologyGovernmentIngestDiagnosticSchema.safeParse({
    failureKind: 'timeout',
    reason: 'timed out',
    attempts: 1,
    providerHost: 'www.prefecturanaval.gob.ar',
    providerPath: '/alturas?token=secret',
  })
  const withRetryAttempt = hydrologyGovernmentIngestDiagnosticSchema.safeParse({
    failureKind: 'timeout',
    reason: 'timed out',
    attempts: 2,
  })

  assert.equal(withSecretField.success, false)
  assert.equal(withQueryString.success, false)
  assert.equal(withRetryAttempt.success, true)
})

test('demo contact schema acepta payload válido y trimmea campos', () => {
  const parsed = demoContactSubmissionSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: '  Ada Lovelace  ',
    email: '  ada@example.com ',
    organization: '  Agronautas  ',
    message: '  Necesito una demo para el equipo.  ',
    website: '',
  })

  assert.equal(parsed.name, 'Ada Lovelace')
  assert.equal(parsed.email, 'ada@example.com')
  assert.equal(parsed.organization, 'Agronautas')
  assert.equal(parsed.message, 'Necesito una demo para el equipo.')
})

test('demo contact schema rechaza email inválido y nombre faltante', () => {
  const invalidEmail = demoContactSubmissionSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: 'Ada',
    email: 'no-es-email',
    website: '',
  })
  const missingName = demoContactSubmissionSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: '   ',
    email: 'ada@example.com',
    website: '',
  })

  assert.equal(invalidEmail.success, false)
  assert.equal(missingName.success, false)
})

test('demo contact schema rechaza mensaje oversized y acepta honeypot poblado contractual', () => {
  const oversized = demoContactSubmissionSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: 'Ada',
    email: 'ada@example.com',
    message: 'x'.repeat(1001),
    website: '',
  })
  const honeypot = demoContactSubmissionSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: 'Ada',
    email: 'ada@example.com',
    website: 'bot-value',
  })

  assert.equal(oversized.success, false)
  assert.equal(honeypot.website, 'bot-value')
})

test('grounded chat schema trimmea y limita el mensaje a 500 caracteres', () => {
  const parsed = groundedChatRequestSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    message: '  Riesgo actual del lote  ',
  })
  const oversized = groundedChatRequestSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    message: 'x'.repeat(501),
  })

  assert.equal(parsed.message, 'Riesgo actual del lote')
  assert.equal(oversized.success, false)
})

test('hydrology telemetry exige fuentes oficiales y timestamp de último dato exitoso', () => {
  const parsed = hydrologyTelemetrySchema.parse({
    source: 'PNA',
    stationId: 'ituzaingo',
    observedAt: '2026-06-23T10:30:00.000Z',
    lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z',
    value: 4.2,
    unit: 'm',
    metric: 'river_height_m',
    quality: 'ok',
    freshness: 'fresh',
    forecastHorizonDays: 7,
    confidence: 'normal',
  })
  const invalidSource = hydrologyTelemetrySchema.safeParse({ ...parsed, source: 'DMH_PARAGUAY' })

  assert.equal(parsed.lastSuccessfulObservedAt, '2026-06-23T10:30:00.000Z')
  assert.equal(invalidSource.success, false)
})

test('hydrology forecast de 15 a 30 días debe ser especulativo y no supera un mes', () => {
  const speculative = hydrologyTelemetrySchema.safeParse({
    source: 'INA',
    stationId: 'corrientes',
    observedAt: '2026-06-23T10:30:00.000Z',
    lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z',
    value: 5.1,
    unit: 'm',
    metric: 'river_height_m',
    quality: 'estimated',
    freshness: 'fresh',
    forecastHorizonDays: 20,
    confidence: 'speculative',
  })
  const overHorizon = hydrologyTelemetrySchema.safeParse({
    source: 'INA',
    stationId: 'corrientes',
    observedAt: '2026-06-23T10:30:00.000Z',
    lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z',
    value: 5.1,
    unit: 'm',
    metric: 'river_height_m',
    quality: 'estimated',
    freshness: 'fresh',
    forecastHorizonDays: 31,
    confidence: 'speculative',
  })

  assert.equal(speculative.success, true)
  assert.equal(overHorizon.success, false)
})

test('hydrology dense context deja vacías fuentes y estaciones fuera de zonas objetivo', () => {
  const outsideZone = hydrologyDenseContextV1Schema.parse({
    contractVersion: 'hydrology-dense-context-v1',
    fieldId: 'field-outside',
    zone: null,
    sources: [],
    stations: [],
    snapshot: {
      riskLevel: 'unknown',
      freshness: 'degraded',
      quality: 'missing',
      recommendation: 'No hay datos oficiales disponibles para este lote en Fase 1.',
      lastSuccessfulObservedAt: null,
    },
    telemetry: [],
  })
  const invalidOutsideZone = hydrologyDenseContextV1Schema.safeParse({
    ...outsideZone,
    sources: ['PNA'],
  })

  assert.equal(outsideZone.zone, null)
  assert.equal(invalidOutsideZone.success, false)
})

test('hydrology phase 1 rechaza DMH Paraguay, descargas de represas y modelos hidráulicos', () => {
  const dmh = hydrologyProviderPayloadGuardSchema.safeParse({ source: 'DMH_PARAGUAY' })
  const damDischarge = hydrologyProviderPayloadGuardSchema.safeParse({
    source: 'PNA',
    excludedInputs: ['itaipu_discharge'],
  })
  const customModel = hydrologyProviderPayloadGuardSchema.safeParse({
    source: 'SMN',
    excludedInputs: ['custom_hydraulic_model'],
  })

  assert.equal(dmh.success, false)
  assert.equal(damDischarge.success, false)
  assert.equal(customModel.success, false)
})

test('field intake acepta agricultura general de Corrientes sin limitar a arroz', () => {
  const parsed = fieldIntakeSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    fieldId: 'field-maiz-corrientes',
    cropCategory: 'cereal',
    crop: 'maize',
    hectares: 42,
    locality: 'Mercedes',
    provinceCode: 'AR-W',
    countryCode: 'AR',
    location: { lat: -29.184, lng: -58.075 },
  })

  assert.equal(parsed.crop, 'maize')
  assert.equal(parsed.cropCategory, 'cereal')
  assert.equal(parsed.provinceCode, 'AR-W')
})

test('field intake devuelve errores tipados para provincia o cultivo no soportados', () => {
  const unsupportedRegion = fieldIntakeSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    fieldId: 'field-outside',
    cropCategory: 'cereal',
    crop: 'maize',
    hectares: 12,
    locality: 'Rosario',
    provinceCode: 'AR-S',
    countryCode: 'AR',
    location: { lat: -32.95, lng: -60.66 },
  })
  const unsupportedCrop = fieldIntakeSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    fieldId: 'field-crop',
    cropCategory: 'unsupported',
    crop: 'cotton',
    hectares: 12,
    locality: 'Mercedes',
    provinceCode: 'AR-W',
    countryCode: 'AR',
    location: { lat: -29.184, lng: -58.075 },
  })

  assert.equal(unsupportedRegion.success, false)
  assert.equal(unsupportedRegion.error.issues[0]?.message, 'OUT_OF_SUPPORTED_AREA')
  assert.equal(unsupportedCrop.success, false)
  assert.equal(unsupportedCrop.error.issues[0]?.message, 'UNSUPPORTED_CROP')
})

test('evidence, cadence, scheduler, dashboard y PDF contract fields are explicit', () => {
  const evidence = signalEvidenceSchema.parse({
    evidenceId: 'ev-weather-smn-1',
    provider: 'SMN',
    signalType: 'weather',
    observedAt: '2026-07-04T10:00:00.000Z',
    ingestedAt: '2026-07-04T10:05:00.000Z',
    sourceUrl: 'https://www.smn.gob.ar/',
    rawHash: 'sha256:abc123',
    confidence: 0.88,
    freshness: 'fresh',
    providerMode: 'live',
    lastSuccessfulObservedAt: '2026-07-04T10:00:00.000Z',
    nextDueAt: '2026-07-04T11:00:00.000Z',
    degradationReasons: [],
  })
  const cadence = sourceCadenceSchema.parse({
    provider: 'SMN',
    signalType: 'weather',
    updateCadence: 'PT1H',
    rateLimit: '60 requests/hour',
    freshnessSla: 'PT3H',
    researchedAt: '2026-07-04T09:00:00.000Z',
    sourceRef: 'https://www.smn.gob.ar/',
  })
  const scheduler = schedulerStatusSchema.parse({
    lastRunAt: '2026-07-04T10:00:00.000Z',
    nextRunAt: '2026-07-04T11:00:00.000Z',
    lockStatus: 'available',
    failures: [],
    nextDueBySource: [{ provider: 'SMN', signalType: 'weather', dueAt: '2026-07-04T11:00:00.000Z', cadence, lastSuccessfulObservedAt: '2026-07-04T10:00:00.000Z', overdue: false }],
  })
  const dashboard = dashboardSnapshotSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    snapshotId: 'dash-1',
    field: {
      fieldId: 'field-maiz-corrientes',
      cropCategory: 'cereal',
      crop: 'maize',
      provinceCode: 'AR-W',
      locality: 'Mercedes',
    },
    status: 'degraded',
    freshness: 'degraded',
    signals: [{ signalType: 'weather', status: 'fresh', evidenceRefs: ['ev-weather-smn-1'], confidence: 0.88, degradationReasons: [] }],
    risk: { score: 35, level: 'low', confidence: 0.88, drivers: [{ key: 'rain', label: 'Rainfall', weight: 0.4, value: 12 }] },
    alerts: [],
    provenance: [evidence],
    scheduler,
    generatedAt: '2026-07-04T10:06:00.000Z',
    lastDataFetchedAt: '2026-07-04T10:00:00.000Z',
    presentation: {
      disclaimer: 'Los indicadores son soporte operativo y no reemplazan criterio agronómico local.',
      confidenceLabel: 'alta',
      sourcesUnavailable: true,
      staleFlags: ['weather_data_stale'],
    },
  })
  const pdfRequest = pdfReportRequestSchema.parse({ fieldId: dashboard.field.fieldId, snapshotId: dashboard.snapshotId })

  assert.equal(dashboard.provenance[0]?.rawHash, 'sha256:abc123')
  assert.equal(dashboard.provenance[0]?.providerMode, 'live')
  assert.equal(dashboard.scheduler.nextDueBySource[0]?.overdue, false)
  assert.equal(dashboard.scheduler.nextDueBySource[0]?.cadence.updateCadence, 'PT1H')
  assert.equal(dashboard.lastDataFetchedAt, '2026-07-04T10:00:00.000Z')
  assert.equal(dashboard.presentation.confidenceLabel, 'alta')
  assert.match(dashboard.presentation.disclaimer, /criterio agronómico local/i)
  assert.deepEqual(pdfRequest, { fieldId: 'field-maiz-corrientes', snapshotId: 'dash-1' })
})
