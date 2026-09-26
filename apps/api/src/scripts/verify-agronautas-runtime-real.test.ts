import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRuntimeManifest,
  classifyAuthEvidence,
  classifyEvidenceSeparation,
  classifyProviderEvidence,
  classifyScopeEvidence,
  evaluateHydrologyWriteGate,
  extractWorkerReadiness,
  resolveRuntimeVerificationConfig,
  resolveRuntimeExitCode,
  type RuntimeEvidenceCell,
} from './verify-agronautas-runtime-real'
import * as runtimeVerifier from './verify-agronautas-runtime-real'

const BOUNDARY_STATUS = {
  LIVE: 'live',
  DEGRADED: 'degraded',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  NOT_RUN: 'not_run',
} as const

type BoundaryStatus = (typeof BOUNDARY_STATUS)[keyof typeof BOUNDARY_STATUS]

interface RuntimeCompletionInput {
  requestId: string
  revisionId: string
  proofRunId: string
  jobId: string
  acknowledgementStatus: number
  workerStatus: 'queued' | 'running' | 'succeeded' | 'failed'
  durableRowId: string | null
}

interface BoundaryEvidenceInput {
  provider: BoundaryStatus
  auth: BoundaryStatus
  tenant: BoundaryStatus
  lead: BoundaryStatus
  ingest: BoundaryStatus
}

interface RuntimeVerifierRedBoundary {
  classifyRuntimeCompletion(input: RuntimeCompletionInput): RuntimeEvidenceCell
  classifyBoundaryEvidence(input: BoundaryEvidenceInput): {
    provider: BoundaryStatus
    auth: BoundaryStatus
    tenant: BoundaryStatus
    lead: BoundaryStatus
    ingest: BoundaryStatus
    overall: BoundaryStatus
  }
}

const redBoundary = runtimeVerifier as unknown as RuntimeVerifierRedBoundary

test('runtime verification defaults to local API/web endpoints and keeps writes disabled', () => {
  const config = resolveRuntimeVerificationConfig({})

  assert.deepEqual(config, {
    apiBaseUrl: 'http://127.0.0.1:3001',
    webBaseUrl: 'http://127.0.0.1:3000',
    artifactRoot: 'artifacts/agronautas-runtime',
    fieldId: null,
    accessToken: null,
    bffAssertionConfigured: false,
    queueProofEnabled: false,
    chatProofEnabled: false,
    hydrologyWriteEnabled: false,
    openMeteoCommercialUseApproved: false,
    renderServiceId: null,
    renderApiToken: null,
    environment: 'local',
    firmsApiKeyConfigured: false,
    satelliteCredentialsConfigured: false,
    unauthorizedFieldId: null,
  })
})

test('runtime verification trims configured values without turning a fixture into live evidence', () => {
  const config = resolveRuntimeVerificationConfig({
    PLAYWRIGHT_API_BASE_URL: ' https://api.example.test/ ',
    PLAYWRIGHT_BASE_URL: ' https://web.example.test/ ',
    AGRONAUTAS_RUNTIME_FIELD_ID: ' field-42 ',
    AGRONAUTAS_RUNTIME_ACCESS_TOKEN: ' reader-access-token ',
    AGRONAUTAS_BFF_BEARER_TOKEN: ' bff-assertion-secret ',
    AGRONAUTAS_RUNTIME_QUEUE_PROOF: 'true',
    AGRONAUTAS_RUNTIME_CHAT_PROOF: 'true',
    AGRONAUTAS_RUNTIME_HYDROLOGY_WRITE: 'true',
    AGRONAUTAS_OPEN_METEO_COMMERCIAL_APPROVED: 'true',
    RENDER_SERVICE_ID: ' srv-1 ',
    RENDER_API_TOKEN: ' render-secret ',
  })

  assert.equal(config.apiBaseUrl, 'https://api.example.test')
  assert.equal(config.webBaseUrl, 'https://web.example.test')
  assert.equal(config.fieldId, 'field-42')
  assert.equal(config.accessToken, 'reader-access-token')
  assert.equal(config.bffAssertionConfigured, true)
  assert.equal(config.queueProofEnabled, true)
  assert.equal(config.chatProofEnabled, true)
  assert.equal(config.hydrologyWriteEnabled, true)
  assert.equal(config.openMeteoCommercialUseApproved, true)
  assert.equal(config.renderServiceId, 'srv-1')
  assert.equal(config.renderApiToken, 'render-secret')
  assert.equal(config.environment, 'local')
  assert.equal(config.firmsApiKeyConfigured, false)
  assert.equal(config.satelliteCredentialsConfigured, false)
})

test('hydrology writes are unavailable without both existing cron credentials', () => {
  const missingToken = evaluateHydrologyWriteGate({ HYDROLOGY_CRON_OWNER_ID: 'ibera-hydrology-cron' }, false)
  const missingOwner = evaluateHydrologyWriteGate({ HYDROLOGY_INGEST_TOKEN: 'secret' }, false)

  assert.equal(missingToken.status, 'blocked')
  assert.match(missingToken.detail, /HYDROLOGY_INGEST_TOKEN/)
  assert.equal(missingOwner.status, 'blocked')
  assert.match(missingOwner.detail, /HYDROLOGY_CRON_OWNER_ID/)
})

test('hydrology credentials never imply a write or a dry-run result', () => {
  const cell = evaluateHydrologyWriteGate({ HYDROLOGY_INGEST_TOKEN: 'secret', HYDROLOGY_CRON_OWNER_ID: 'owner' }, false)

  assert.equal(cell.status, 'not_run')
  assert.match(cell.detail, /not attempted/i)
  assert.doesNotMatch(cell.detail, /dry.?run/i)
})

test('runtime manifest preserves blocked and unavailable states instead of collapsing them to pass', () => {
  const blocked: RuntimeEvidenceCell = { status: 'blocked', detail: 'worker dependency unavailable' }
  const manifest = buildRuntimeManifest({
    runId: 'runtime-test-1',
    startedAt: '2026-08-23T00:00:00.000Z',
    finishedAt: '2026-08-23T00:01:00.000Z',
    checks: {
      api: blocked,
      web: { status: 'pass', detail: 'HTTP 200' },
      postgres: { status: 'not_run', detail: 'DATABASE_URL absent' },
      redis: { status: 'not_run', detail: 'REDIS_URL absent' },
      worker: blocked,
      hydrology: { status: 'not_run', detail: 'credentials present; write not attempted' },
      render: { status: 'blocked', detail: 'Render access absent' },
    },
  })

  assert.equal(manifest.status, 'blocked')
  assert.deepEqual(manifest.blockedCapabilities, ['api', 'worker', 'render'])
  assert.equal(manifest.productionProven, false)
  assert.equal(manifest.providerLiveEvidence, false)
})

test('runtime verifier exits non-zero when prerequisites leave the matrix incomplete or blocked', () => {
  assert.equal(resolveRuntimeExitCode({ status: 'blocked' }), 1)
  assert.equal(resolveRuntimeExitCode({ status: 'incomplete' }), 1)
  assert.equal(resolveRuntimeExitCode({ status: 'complete' }), 0)
})

test('runtime manifest records worker pytest unavailability without a historical pass', () => {
  const manifest = buildRuntimeManifest({
    runId: 'runtime-worker-tests-unavailable',
    startedAt: '2026-08-23T00:00:00.000Z',
    finishedAt: '2026-08-23T00:01:00.000Z',
    checks: {
      worker_tests: { status: 'unavailable', detail: 'pytest unavailable' },
    },
  })

  assert.equal(manifest.status, 'incomplete')
  assert.deepEqual(manifest.unavailableCapabilities, ['worker_tests'])
  assert.equal(manifest.checks.worker_tests?.status, 'unavailable')
})

test('worker readiness reads the nested real HTTP response body', () => {
  assert.deepEqual(extractWorkerReadiness({ body: { worker: { status: 'unavailable', reason: 'worker_not_configured' } } }), {
    status: 'unavailable',
    reason: 'worker_not_configured',
  })
  assert.equal(extractWorkerReadiness({ body: 'not-json' }), null)
})

test('auth evidence is unavailable when no bearer token and real field are configured', () => {
  const result = classifyAuthEvidence({
    tokenConfigured: false,
    fieldId: null,
    fieldLookupStatus: null,
    unauthenticatedStatus: 404,
    unauthenticatedChat: 404,
    authenticatedRuntime: null,
    authenticatedStatus: null,
    authenticatedChat: null,
    chatProofEnabled: false,
  })

  assert.equal(result.auth, 'unavailable')
  assert.equal(result.claims.unauthenticatedStatus401, false)
  assert.equal(result.claims.authenticatedRuntime200, false)
})

test('auth evidence is blocked when a configured field is not real or status/chat return field 404', () => {
  const invalidField = classifyAuthEvidence({
    tokenConfigured: true,
    fieldId: 'missing-field',
    fieldLookupStatus: 404,
    unauthenticatedStatus: 404,
    unauthenticatedChat: 404,
    authenticatedRuntime: 200,
    authenticatedStatus: null,
    authenticatedChat: null,
    chatProofEnabled: false,
  })
  const invalidProbe = classifyAuthEvidence({
    tokenConfigured: true,
    fieldId: 'field-1',
    fieldLookupStatus: 200,
    unauthenticatedStatus: 404,
    unauthenticatedChat: 404,
    authenticatedRuntime: 200,
    authenticatedStatus: 200,
    authenticatedChat: null,
    chatProofEnabled: false,
  })

  assert.equal(invalidField.auth, 'blocked')
  assert.equal(invalidProbe.auth, 'blocked')
  assert.equal(invalidProbe.claims.unauthenticatedStatus401, false)
})

test('auth evidence is available only after real field and explicit 401/200 observations', () => {
  const result = classifyAuthEvidence({
    tokenConfigured: true,
    fieldId: 'field-1',
    fieldLookupStatus: 200,
    unauthenticatedStatus: 401,
    unauthenticatedChat: 401,
    authenticatedRuntime: 200,
    authenticatedStatus: 200,
    authenticatedChat: 200,
    chatProofEnabled: true,
  })

  assert.equal(result.auth, 'available')
  assert.equal(result.claims.unauthenticatedStatus401, true)
  assert.equal(result.claims.unauthenticatedChat401, true)
  assert.equal(result.claims.authenticatedRuntime200, true)
  assert.equal(result.claims.authenticatedStatus200, true)
  assert.equal(result.claims.authenticatedChat200, true)
})

test('runtime verification records the v2 contract and durable outcome boundary', () => {
  const manifest = buildRuntimeManifest({
    runId: 'runtime-v2-contract',
    startedAt: '2026-08-27T00:00:00.000Z',
    finishedAt: '2026-08-27T00:01:00.000Z',
    checks: { worker_tests: { status: 'pass', detail: 'AJV/Zod/Python contract validation' } },
  }) as { contractVersion?: string; durableOutcomeBeforeAck?: boolean }

  assert.equal(manifest.contractVersion, '2.0.0')
  assert.equal(manifest.durableOutcomeBeforeAck, true)
})

test('runtime completion remains blocked when the API only acknowledges 202 without worker and Postgres completion', () => {
  const result = redBoundary.classifyRuntimeCompletion({
    requestId: 'request-202-only',
    revisionId: 'revision-local',
    proofRunId: 'proof-202-only',
    jobId: 'job-202-only',
    acknowledgementStatus: 202,
    workerStatus: 'queued',
    durableRowId: null,
  })

  assert.equal(result.status, 'blocked')
  assert.match(result.detail, /durable|completion|terminal/i)
  assert.doesNotMatch(JSON.stringify(result), /token|password|secret/i)
})

test('runtime completion is live only after a terminal worker transition and matching durable row', () => {
  const result = redBoundary.classifyRuntimeCompletion({
    requestId: 'request-complete',
    revisionId: 'revision-local',
    proofRunId: 'proof-complete',
    jobId: 'job-complete',
    acknowledgementStatus: 202,
    workerStatus: 'succeeded',
    durableRowId: 'row-complete',
  })

  assert.equal(result.status, 'pass')
  assert.equal(result.evidence?.['requestId'], 'request-complete')
  assert.equal(result.evidence?.['revisionId'], 'revision-local')
  assert.equal(result.evidence?.['proofRunId'], 'proof-complete')
  assert.equal(result.evidence?.['jobId'], 'job-complete')
  assert.equal(result.evidence?.['durableRowId'], 'row-complete')
})

test('runtime boundary evidence keeps provider, auth, tenant, lead, and ingest blockers separate and secret-free', () => {
  const result = redBoundary.classifyBoundaryEvidence({
    provider: BOUNDARY_STATUS.BLOCKED,
    auth: BOUNDARY_STATUS.BLOCKED,
    tenant: BOUNDARY_STATUS.NOT_RUN,
    lead: BOUNDARY_STATUS.NOT_RUN,
    ingest: BOUNDARY_STATUS.NOT_RUN,
  })

  assert.deepEqual(result, {
    provider: BOUNDARY_STATUS.BLOCKED,
    auth: BOUNDARY_STATUS.BLOCKED,
    tenant: BOUNDARY_STATUS.NOT_RUN,
    lead: BOUNDARY_STATUS.NOT_RUN,
    ingest: BOUNDARY_STATUS.NOT_RUN,
    overall: BOUNDARY_STATUS.BLOCKED,
  })
  assert.doesNotMatch(JSON.stringify(result), /token|password|secret|postgresql|redis:|https?:\/\/.*@/i)
})

test('runtime receipt cannot be complete when request, revision, run, job, or proof identifiers are missing', () => {
  const manifest = buildRuntimeManifest({
    runId: 'runtime-missing-correlation',
    startedAt: '2026-08-30T00:00:00.000Z',
    finishedAt: '2026-08-30T00:01:00.000Z',
    checks: { worker_tests: { status: 'pass', detail: 'contract checks completed' } },
  })

  assert.notEqual(manifest.status, 'complete')
  assert.equal(manifest.requestId, null)
  assert.equal(manifest.revisionId, null)
  assert.equal(manifest.proofRunId, null)
  assert.equal(manifest.jobId, null)
})

test('runtime receipt rejects credentialed URLs, tokens, database strings, raw payload/chat, and stack traces', () => {
  const baseInput = {
    runId: 'runtime-sensitive-evidence',
    requestId: 'request-safe',
    revisionId: 'revision-safe',
    proofRunId: 'proof-safe',
    jobId: 'job-safe',
    startedAt: '2026-08-30T00:00:00.000Z',
    finishedAt: '2026-08-30T00:01:00.000Z',
  }
  const cases: ReadonlyArray<readonly [string, Record<string, string>]> = [
    ['token', { authorization: 'Bearer token-value' }],
    ['credentialed URL', { endpoint: 'https://user:password@example.test/api' }],
    ['database connection string', { database: 'postgresql://user:password@db.example.test:5432/agronautas' }],
    ['raw chat', { payload: '{"message":"raw chat"}' }],
    ['raw payload', { payload: '{"source":"PNA","records":[1]}' }],
    ['stack trace', { stack: 'Error: failed\\n    at verify (runtime.ts:1:1)' }],
  ]

  const leaked = cases.filter(([, evidence]) => {
    const manifest = buildRuntimeManifest({
      ...baseInput,
      checks: { api: { status: 'blocked', detail: 'boundary unavailable', evidence } },
    })
    return /Bearer token-value|https:\/\/user:password@|postgresql:\/\/|raw chat|records|at verify \(runtime\.ts/i.test(JSON.stringify(manifest))
  }).map(([name]) => name)

  assert.deepEqual(leaked, [])
})

test('provider evidence fails closed for missing prerequisites and never promotes unavailable data', () => {
  const result = classifyProviderEvidence({
    provider: 'nasa-firms',
    configured: false,
    providerMode: 'unavailable',
    freshness: 'missing',
    schemaStatus: 'unavailable',
    degradationReasons: ['credential_unavailable'],
  })

  assert.equal(result.status, 'unavailable')
  assert.match(result.detail, /prerequisite|credential/i)
  assert.doesNotMatch(JSON.stringify(result), /live|fresh|ready/i)
})

test('provider evidence preserves stale and blocked outcomes as non-ready', () => {
  const stale = classifyProviderEvidence({
    provider: 'open-meteo',
    configured: true,
    providerMode: 'live',
    freshness: 'stale',
    schemaStatus: 'valid',
    degradationReasons: ['last_success_is_stale'],
  })
  const blocked = classifyProviderEvidence({
    provider: 'sentinel-stac',
    configured: true,
    providerMode: 'seam',
    freshness: 'degraded',
    schemaStatus: 'invalid',
    degradationReasons: ['satellite_proof_incomplete'],
  })

  assert.equal(stale.status, 'blocked')
  assert.equal(blocked.status, 'blocked')
  assert.doesNotMatch(JSON.stringify({ stale, blocked }), /status":"pass"|ready/i)
})

test('local and production evidence are explicit and cannot be merged into a readiness claim', () => {
  const separation = classifyEvidenceSeparation({
    environment: 'local',
    productionEvidenceObserved: false,
  })

  assert.deepEqual(separation, {
    environment: 'local',
    localEvidence: 'recorded',
    productionEvidence: 'unverified',
    productionReady: false,
  })
})

test('scope evidence requires a real authorized field and an explicit forbidden response for an unauthorized field', () => {
  const denied = classifyScopeEvidence({
    tokenConfigured: true,
    authorizedFieldId: 'field-authorized',
    authorizedStatus: 200,
    unauthorizedFieldId: 'field-other-workspace',
    unauthorizedStatus: 403,
  })
  const leaked = classifyScopeEvidence({
    tokenConfigured: true,
    authorizedFieldId: 'field-authorized',
    authorizedStatus: 200,
    unauthorizedFieldId: 'field-other-workspace',
    unauthorizedStatus: 200,
  })

  assert.equal(denied.scope, 'available')
  assert.equal(denied.claims.unauthorizedScope403, true)
  assert.equal(leaked.scope, 'blocked')
  assert.equal(leaked.claims.unauthorizedScope403, false)
  assert.doesNotMatch(JSON.stringify(leaked), /ready|productionReady.*true/i)
})

test('scope evidence remains unavailable when the unauthorized field proof is not configured', () => {
  const result = classifyScopeEvidence({
    tokenConfigured: true,
    authorizedFieldId: 'field-authorized',
    authorizedStatus: 200,
    unauthorizedFieldId: null,
    unauthorizedStatus: null,
  })

  assert.equal(result.scope, 'unavailable')
  assert.equal(result.claims.authorizedField200, true)
  assert.equal(result.claims.unauthorizedScope403, false)
})

test('production evidence stays unverified even when the verifier is run with production configuration', () => {
  const separation = classifyEvidenceSeparation({
    environment: 'production',
    productionEvidenceObserved: false,
  })

  assert.deepEqual(separation, {
    environment: 'production',
    localEvidence: 'unverified',
    productionEvidence: 'unverified',
    productionReady: false,
  })
})
