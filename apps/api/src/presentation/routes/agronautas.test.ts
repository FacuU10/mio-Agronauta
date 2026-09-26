import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import { DEFAULT_GROQ_MODEL } from '@repo/hydrology-engine'
import type { AgronautasActivitySourceRecord, AgronautasManagementRepository, AgronautasWorkspaceContextRecord, AgronautasWorkspaceRepository, DemoContactSubmissionRepository, FieldContextRepository, FieldRepository, ManagementAuditRecord, ManagementItemRecord, SupportedCoverageResult } from '../../domain/repositories/agronautas'
import { DEFAULT_AGRONAUTAS_WORKSPACE_ID } from '../../domain/repositories/agronautas'
import { Field, FieldContext, RiskSnapshotFoundation, type ClimateSummary, type SatelliteSummary } from '../../domain/entities/agronautas'
import type { ProviderEvidencePort } from '../../infrastructure/config/provider-matrix'
import { createAgronautasRouter } from './agronautas'
import { AUTH_FAILURE_CODES, AuthFailure, type AuthPrincipal } from '../../domain/auth/contracts'
import type { AgronautasAuthServicePort } from '../../domain/auth/ports'
import { AgronautasAuthService, InMemoryAgronautasAuthRepository } from '../../application/auth/agronautas-auth-service'

const REAL_AUTH_TEST_SECRETS = {
  accessSecret: 'access-secret-for-route-tests-1234567890',
  refreshSecret: 'refresh-secret-for-route-tests-1234567890',
  bootstrapSecret: 'bootstrap-secret-for-route-tests-1234567890',
  bffBearerToken: 'bff-secret-for-route-tests-1234567890',
}

type HydrologyDenseContextV1 = Awaited<ReturnType<NonNullable<NonNullable<Parameters<typeof createAgronautasRouter>[0]>['hydrologyRepository']>['getDenseContextForField']>>

test('GET /fields/:id/risk/current devuelve 401 contractual sin bearer', async () => {
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  const app = createTestApp({ authService: createExplicitTestAuthService(false) })

  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'
  try {
    const response = await request(app, '/agronautas/fields/field-1/risk/current')
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), {
      contractVersion: '1.0.0',
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid bearer token',
      retryable: false,
    })
  } finally {
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
  }
})

test('management API enforces 401/403 and preserves create, duplicate, revision, reload, and audit outcomes', async () => {
  const managementRepository = createManagementRepository()
  const app = createTestApp({ managementRepository, authService: createExplicitTestAuthService(false) })

  assert.equal((await request(app, '/agronautas/management')).status, 401)
  assert.equal((await request(app, '/agronautas/management/operations', { method: 'POST', headers: { authorization: 'Bearer reader-token', 'content-type': 'application/json' }, body: JSON.stringify({ workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, fieldId: 'field-1', name: 'Nope', idempotencyKey: 'reader-1', sourceLocationIds: [] }) })).status, 403)

  const input = { contractVersion: 'agronautas-management-v2', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, fieldId: 'field-1', name: 'Aplicar tratamiento', idempotencyKey: 'operation-1', sourceLocationIds: ['location-1'] }
  const created = await request(app, '/agronautas/management/operations', { method: 'POST', headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' }, body: JSON.stringify(input) })
  assert.equal(created.status, 201, await created.clone().text())
  const duplicate = await request(app, '/agronautas/management/operations', { method: 'POST', headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' }, body: JSON.stringify(input) })
  assert.equal(duplicate.status, 200)
  const stale = await request(app, '/agronautas/management/operation-1/transition', { method: 'POST', headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: 'agronautas-management-v2', expectedRevision: 99, status: 'active' }) })
  assert.equal(stale.status, 409)
  const reloaded = await request(app, '/agronautas/management', { headers: { authorization: 'Bearer operator-token' } })
  const body = await reloaded.json() as { items: Array<{ revision: number }>; audit: Array<{ outcome: string }> }
  assert.equal(reloaded.status, 200)
  assert.equal(body.items[0]?.revision, 1)
  assert.ok(body.audit.some((entry) => entry.outcome === 'accepted'))
  assert.ok(body.audit.some((entry) => entry.outcome === 'duplicate'))
  assert.ok(body.audit.some((entry) => entry.outcome === 'conflict'))
  assert.ok(body.audit.some((entry) => entry.outcome === 'forbidden'))
})

test('management API turns a possible commit timeout into a retryable recovery state', async () => {
  const repository = createManagementRepository()
  repository.createManagement = async () => { throw new Error('management persistence timeout') }
  const app = createTestApp({ managementRepository: repository })
  const response = await request(app, '/agronautas/management/operations', { method: 'POST', headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: 'agronautas-management-v2', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, fieldId: 'field-1', name: 'Retry me', idempotencyKey: 'timeout-1', sourceLocationIds: [] }) })
  assert.equal(response.status, 503)
  assert.equal((await response.json() as { retryable: boolean }).retryable, true)
})

test('POST /locations/resolve preserves point lineage through the authenticated route', async () => {
  let coverageCalls = 0
  const app = createTestApp({
    locationRepository: {
      async findAuthorizedField(fieldId) { return fieldId === 'field-1' ? testField(fieldId) : null },
      async resolveCoverage() {
        coverageCalls += 1
        return { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W', boundaryVersion: 'boundary-v1' }
      },
    },
  })

  const response = await request(app, '/agronautas/locations/resolve', {
    method: 'POST',
    headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      contractVersion: 'agronautas-product-flows-v2',
      workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID,
      fieldId: 'field-1',
      geometry: { type: 'point', coordinates: { latitude: -29.2, longitude: -58.1 } },
      selection: { source: 'locality-fallback', sourceReference: 'mercedes' },
    }),
  })

  assert.equal(response.status, 200)
  const body = await response.json() as { status: string; location?: { geometry: { type: string }; coverage: { status: string; evidenceRef?: string } } }
  assert.equal(body.status, 'accepted')
  assert.equal(body.location?.geometry.type, 'point')
  assert.deepEqual(body.location?.coverage, { status: 'supported', evidenceRef: 'boundary-v1' })
  assert.equal(coverageCalls, 1)
})

test('POST /locations/resolve preserves polygon lineage without claiming polygon coverage support', async () => {
  const app = createTestApp({
    locationRepository: {
      async findAuthorizedField() { return testField('field-1') },
      async resolveCoverage() { return { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W', boundaryVersion: 'boundary-v1' } },
    },
  })

  const response = await request(app, '/agronautas/locations/resolve', {
    method: 'POST',
    headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      contractVersion: 'agronautas-product-flows-v2',
      workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID,
      fieldId: 'field-1',
      geometry: { type: 'polygon', coordinates: [[[-58.1, -29.2], [-58.09, -29.2], [-58.09, -29.19], [-58.1, -29.2]]] },
      selection: { source: 'reviewed-polygon', sourceReference: 'field:field-1' },
    }),
  })

  assert.equal(response.status, 200)
  const body = await response.json() as { status: string; location?: { geometry: { type: string }; coverage: { status: string; reason?: string } } }
  assert.equal(body.status, 'accepted')
  assert.equal(body.location?.geometry.type, 'polygon')
  assert.deepEqual(body.location?.coverage, { status: 'partial', reason: 'polygon_boundary_coverage_not_proven', evidenceRef: 'boundary-v1' })
})

test('POST /locations/resolve rejects an out-of-scope field before coverage resolution', async () => {
  let coverageCalls = 0
  const app = createTestApp({
    locationRepository: {
      async findAuthorizedField() { return null },
      async resolveCoverage() { coverageCalls += 1; return { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' } },
    },
  })

  const response = await request(app, '/agronautas/locations/resolve', {
    method: 'POST',
    headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      contractVersion: 'agronautas-product-flows-v2',
      workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID,
      fieldId: 'foreign-field',
      geometry: { type: 'point', coordinates: { latitude: -29.2, longitude: -58.1 } },
      selection: { source: 'locality-fallback', sourceReference: 'mercedes' },
    }),
  })

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), { status: 'unauthorized', reason: 'field_out_of_scope' })
  assert.equal(coverageCalls, 0)
})

test('real auth service returns 422 for an unmapped field write without invoking the repository write', async () => {
  const authService = new AgronautasAuthService(new InMemoryAgronautasAuthRepository({
    users: [{ id: 'mapped-user', email: 'mapped@example.test', displayName: 'Mapped', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: ['read', 'write'] }],
  }), { secrets: REAL_AUTH_TEST_SECRETS })
  const login = await authService.login({ email: 'mapped@example.test', password: 'password-123' })
  let writes = 0
  const field = testField('unmapped-field')
  const app = createTestApp({
    authService,
    fieldRepository: {
      async save() { writes += 1 },
      async findById() { return field },
      async findByExternalFieldId() { return null },
      async resolveCoverage() { return { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' } },
      async list() { return { items: [], nextCursor: null } },
    },
  })

  const response = await request(app, '/agronautas/fields/unmapped-field/geometry', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${login.accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))' }),
  })

  assert.equal(response.status, 422)
  assert.equal((await response.json() as { code: string }).code, 'UNMAPPED_RECORD')
  assert.equal(writes, 0)
})

test('real auth service returns 503 when required Redis cannot prove a protected request', async () => {
  const authService = new AgronautasAuthService(new InMemoryAgronautasAuthRepository({
    users: [{ id: 'redis-user', email: 'redis@example.test', displayName: 'Redis', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: ['read'] }],
  }), { secrets: REAL_AUTH_TEST_SECRETS, redis: { isDenied: async () => { throw new Error('redis down') }, deny: async () => undefined } })
  const login = await authService.login({ email: 'redis@example.test', password: 'password-123' })
  const response = await request(createTestApp({ authService }), '/agronautas/runtime', { headers: { authorization: `Bearer ${login.accessToken}` } })

  assert.equal(response.status, 503)
  const body = await response.json() as { code: string; retryable: boolean }
  assert.equal(body.code, 'AUTH_MAINTENANCE')
  assert.equal(body.retryable, true)
})

test('auth 401 expone el challenge Bearer sin cambiar el cuerpo contractual ni el request ID', { concurrency: false }, async () => {
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'

  try {
     const response = await request(createTestApp({ authService: createExplicitTestAuthService(false) }), '/agronautas/runtime', { headers: { 'x-request-id': 'agronautas-auth-401' } })

    assert.equal(response.status, 401)
    assert.equal(response.headers.get('www-authenticate'), 'Bearer')
    assert.equal(response.headers.get('x-request-id'), 'agronautas-auth-401')
    assert.deepEqual(await response.json(), {
      contractVersion: '1.0.0',
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid bearer token',
      retryable: false,
    })
  } finally {
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
  }
})

test('auth 403 mantiene el cuerpo FORBIDDEN y no anuncia un challenge de autenticación', { concurrency: false }, async () => {
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'

  try {
    const response = await request(createTestApp(), '/agronautas/fields/field-1/recompute', {
      method: 'POST',
      headers: { authorization: 'Bearer reader-token', 'x-request-id': 'agronautas-auth-403' },
    })

    assert.equal(response.status, 403)
    assert.equal(response.headers.get('www-authenticate'), null)
    assert.equal(response.headers.get('x-request-id'), 'agronautas-auth-403')
    assert.deepEqual(await response.json(), {
      contractVersion: '1.0.0',
      code: 'FORBIDDEN',
      message: 'Role reader cannot access this operation',
      retryable: false,
    })
  } finally {
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
  }
})

test('demo query no omite auth y la respuesta demo no declara identidad ni tenancy de producción', { concurrency: false }, async () => {
  const previousMode = process.env['AGRONAUTAS_RUNTIME_MODE']
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'real'
  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'

  try {
    const app = createTestApp({ authService: createExplicitTestAuthService(false) })
    const unauthorized = await request(app, '/agronautas/fields/field-demo-1?mode=demo', { headers: { 'x-request-id': 'agronautas-demo-401' } })
    assert.equal(unauthorized.status, 401)

    const authorized = await request(app, '/agronautas/fields/field-demo-1?mode=demo', { headers: { authorization: 'Bearer reader-token', 'x-request-id': 'agronautas-demo-200' } })
    assert.equal(authorized.status, 200)
    assert.equal(authorized.headers.get('x-request-id'), 'agronautas-demo-200')
    const demoPayload = await authorized.json() as Record<string, unknown>
    assert.equal(demoPayload['fieldId'], 'field-demo-1')
    assert.equal('role' in demoPayload, false)
    assert.equal('tenantId' in demoPayload, false)
  } finally {
    if (previousMode === undefined) delete process.env['AGRONAUTAS_RUNTIME_MODE']
    else process.env['AGRONAUTAS_RUNTIME_MODE'] = previousMode
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
  }
})

test('Agronautas route propagates request IDs across auth, not-found, unavailable, and rate-limit outcomes', async () => {
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  const unavailableApp = createTestApp({ authService: createExplicitTestAuthService(false), workspaceRepository: {
    async ensureDefaultWorkspace() { throw new Error('workspace unavailable') },
    async getWorkspace() { throw new Error('workspace unavailable') },
    async listWorkspaceFields() { throw new Error('fields unavailable') },
    async listFieldActivity() { throw new Error('activity unavailable') },
  } })

  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'
  try {
    const unauthorized = await request(unavailableApp, '/agronautas/runtime', { headers: { 'x-request-id': 'agronautas-401' } })
    assert.equal(unauthorized.status, 401)
    assert.equal(unauthorized.headers.get('x-request-id'), 'agronautas-401')

    const notFound = await request(unavailableApp, '/agronautas/fields/missing-field', { headers: { authorization: 'Bearer reader-token', 'x-request-id': 'agronautas-404' } })
    assert.equal(notFound.status, 404)
    assert.equal(notFound.headers.get('x-request-id'), 'agronautas-404')

    const unavailable = await request(unavailableApp, '/agronautas/workspace', { headers: { authorization: 'Bearer reader-token', 'x-request-id': 'agronautas-503' } })
    assert.equal(unavailable.status, 503)
    assert.equal(unavailable.headers.get('x-request-id'), 'agronautas-503')
    assert.equal((await unavailable.json() as { retryable: boolean }).retryable, true)

    const forbidden = await request(unavailableApp, '/agronautas/fields/field-1/recompute', { method: 'POST', headers: { authorization: 'Bearer reader-token', 'x-request-id': 'agronautas-403' } })
    assert.equal(forbidden.status, 403)
    assert.equal(forbidden.headers.get('x-request-id'), 'agronautas-403')
  } finally {
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
  }
})

test('GET status y POST chat requieren bearer antes de consultar el lote o ejecutar el chat', { concurrency: false }, async () => {
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  let fieldLookups = 0
  const fieldRepository = createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map() })
  const app = createTestApp({ authService: createExplicitTestAuthService(false),
    fieldRepository: {
      ...fieldRepository,
      async findById(fieldId) {
        fieldLookups += 1
        return fieldRepository.findById(fieldId, DEFAULT_AGRONAUTAS_WORKSPACE_ID)
      },
    },
  })

  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'
  try {
    const [status, chat] = await Promise.all([
      request(app, '/agronautas/fields/field-protected/status'),
      request(app, '/agronautas/fields/field-protected/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contractVersion: '1.0.0', message: 'Explicá el riesgo actual' }),
      }),
    ])

    assert.equal(status.status, 401)
    assert.equal(chat.status, 401)
    assert.equal(fieldLookups, 0)
  } finally {
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
  }
})

test('status y chat devuelven 404 y no ejecutan downstream para un lote inexistente', { concurrency: false }, async () => {
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  let snapshotLookups = 0
  let alertLookups = 0
  const app = createTestApp({
    riskSnapshotRepository: {
      async save() {},
      async getLatest() {
        snapshotLookups += 1
        return null
      },
      async listTimeline() { return [] },
    },
    alertSnapshotRepository: {
      async saveMany() {},
      async getLatestForField() {
        alertLookups += 1
        return []
      },
      async listTimeline() { return [] },
    },
  })

  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'
  try {
    const [status, chat] = await Promise.all([
      request(app, '/agronautas/fields/missing-protected/status', { headers: { authorization: 'Bearer reader-token' } }),
      request(app, '/agronautas/fields/missing-protected/chat', {
        method: 'POST',
        headers: { authorization: 'Bearer reader-token', 'content-type': 'application/json' },
        body: JSON.stringify({ contractVersion: '1.0.0', message: 'Explicá el riesgo actual' }),
      }),
    ])

    assert.equal(status.status, 404)
    assert.equal(chat.status, 404)
    assert.equal(snapshotLookups, 0)
    assert.equal(alertLookups, 0)
  } finally {
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
  }
})

test('management routes enforce auth, invalid identifiers, unavailable storage, empty pages, and read-only activity', async () => {
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  const fieldStore = new Map<string, Field>([['field-management-1', testField('field-management-1')]])
  const activityRecord: AgronautasActivitySourceRecord = { sourceType: 'field', sourceId: 'field-management-1', occurredAt: new Date('2026-08-13T10:00:00.000Z'), title: 'Field record created' }
  const workspaceRepository = createWorkspaceRepository({ activity: [activityRecord] })
  const app = createTestApp({ authService: createExplicitTestAuthService(false), fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }), workspaceRepository })

  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'management-reader'
  try {
    assert.equal((await request(app, '/agronautas/workspace')).status, 401)
    assert.equal((await request(app, '/agronautas/workspace', { headers: { authorization: 'Bearer management-reader' } })).status, 200)

    const invalid = await request(app, '/agronautas/workspace/fields', { headers: { authorization: 'Bearer management-reader' } })
    assert.equal(invalid.status, 400)
    const unknownWorkspace = await request(app, '/agronautas/workspace/fields?workspaceId=unknown-workspace', { headers: { authorization: 'Bearer management-reader' } })
    assert.equal(unknownWorkspace.status, 404)

    const empty = await request(app, `/agronautas/workspace/fields?workspaceId=${DEFAULT_AGRONAUTAS_WORKSPACE_ID}`, { headers: { authorization: 'Bearer management-reader' } })
    assert.equal(empty.status, 200)
    assert.deepEqual(await empty.json(), { contractVersion: 'agronautas-workspace-fields-v1', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, items: [], nextCursor: null })

    const activity = await request(app, '/agronautas/fields/field-management-1/activity', { headers: { authorization: 'Bearer management-reader' } })
    assert.equal(activity.status, 200)
    assert.equal((await activity.json() as { items: Array<{ sourceId: string }> }).items[0]?.sourceId, 'field-management-1')
    assert.deepEqual(activityRecord, { sourceType: 'field', sourceId: 'field-management-1', occurredAt: new Date('2026-08-13T10:00:00.000Z'), title: 'Field record created' })

    const missingField = await request(app, '/agronautas/fields/missing-field/activity', { headers: { authorization: 'Bearer management-reader' } })
    assert.equal(missingField.status, 404)
  } finally {
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
  }
})

test('management routes expose typed unavailable responses when workspace/activity storage fails', async () => {
  const unavailableRepository: AgronautasWorkspaceRepository = {
    async ensureDefaultWorkspace() { throw new Error('workspace unavailable') },
    async getWorkspace() { throw new Error('workspace unavailable') },
    async listWorkspaceFields() { throw new Error('fields unavailable') },
    async listFieldActivity() { throw new Error('activity unavailable') },
  }
  const app = createTestApp({ workspaceRepository: unavailableRepository, fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map([['field-1', testField('field-1')]]) }) })
  const workspace = await request(app, '/agronautas/workspace')
  const fields = await request(app, `/agronautas/workspace/fields?workspaceId=${DEFAULT_AGRONAUTAS_WORKSPACE_ID}`)
  const activity = await request(app, '/agronautas/fields/field-1/activity')
  assert.equal(workspace.status, 503)
  assert.equal(fields.status, 503)
  assert.equal(activity.status, 503)
  assert.equal((await workspace.json() as { retryable: boolean }).retryable, true)
})

test('Agronautas auth reloads enabled state and tokens at request time after router construction', { concurrency: false }, async () => {
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  const previousOperatorToken = process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR']
  const fieldStore = new Map<string, Field>([['field-auth-lifecycle', testField('field-auth-lifecycle')]])
  const app = createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    geometryRepository: {
      async getGeometry() { return null },
      async updateGeometry() {
        return {
          polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))',
          centroid: { lat: -29.1966, lng: -58.0966 }, areaM2: 1_000_000, hectares: 100, perimeterM: 4_000,
          status: 'saved' as const, source: 'operator' as const, updatedAt: new Date('2026-08-12T00:00:00.000Z'),
        }
      },
    },
  })

  delete process.env['AGRONAUTAS_AUTH_ENABLED']
  delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  delete process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR']
  try {
    const initiallyOpen = await request(app, '/agronautas/fields/field-auth-lifecycle/geometry')
    assert.equal(initiallyOpen.status, 404)

    process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
    process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token-v2'
    process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR'] = 'operator-token-v2'

    const readerPatch = await request(app, '/agronautas/fields/field-auth-lifecycle/geometry', {
      method: 'PATCH', headers: { authorization: 'Bearer reader-token-v2', 'content-type': 'application/json' },
      body: JSON.stringify({ polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))' }),
    })
    const operatorPatch = await request(app, '/agronautas/fields/field-auth-lifecycle/geometry', {
      method: 'PATCH', headers: { authorization: 'Bearer operator-token-v2', 'content-type': 'application/json' },
      body: JSON.stringify({ polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))' }),
    })

    assert.equal(readerPatch.status, 403)
    assert.equal(operatorPatch.status, 200)
  } finally {
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
    if (previousOperatorToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR']
    else process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR'] = previousOperatorToken
  }
})

test('POST /fields/:id/recompute devuelve 403 contractual para rol reader', async () => {
  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'

  const response = await request(createTestApp(), '/agronautas/fields/field-1/recompute', {
    method: 'POST',
    headers: { authorization: 'Bearer reader-token' },
  })
  assert.equal(response.status, 403)
  const json = await response.json() as { code: string; retryable: boolean }
  assert.equal(json.code, 'FORBIDDEN')
  assert.equal(json.retryable, false)

  delete process.env['AGRONAUTAS_AUTH_ENABLED']
  delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
})

test('GET /agronautas/v1/runtime preserva compatibilidad versionada', async () => {
  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'
  process.env['AGRONAUTAS_ROUTE_PREFIX'] = '/agronautas'

  const app = express()
  app.use(express.json())
  app.use('/agronautas/v1', createAgronautasRouter({
    isVersionedNamespace: true,
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map() }),
    fieldContextRepository: createFieldContextRepository(new Map()),
    riskSnapshotRepository: { async save() {}, async getLatest() { return null }, async listTimeline() { return [] } },
    signalSummaryRepository: {
      async getLatestClimateSummary(): Promise<ClimateSummary | null> { return null },
      async getLatestSatelliteSummary(): Promise<SatelliteSummary | null> { return null },
      async listClimateTimeline() { return [] },
    },
    recomputeLockRepository: { async acquire() { return { acquired: true, metadata: { runId: 'run-1', jobId: 'job-1', requestId: 'req-1', correlationId: 'req-1', triggeredBy: 'api', contractVersion: '1.0.0' } } }, async release() {} },
    runtimeDispatcher: { async dispatchRiskRecompute() {} },
    jobRunRepository: { async saveQueuedRun() {}, async markRunning() {}, async markHeartbeat() {}, async markCompleted() {}, async markFailed() {} },
    alertSnapshotRepository: { async saveMany() {}, async getLatestForField() { return [] }, async listTimeline() { return [] } },
    authService: createExplicitTestAuthService(),
  }))
  const response = await request(app, '/agronautas/v1/runtime', {
    headers: { authorization: 'Bearer reader-token' },
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    mode: 'real',
    routePrefix: '/agronautas/v1',
    compatibilityPrefix: '/agronautas',
    contractVersion: '1.0.0',
    scheduler: { enabled: false, status: 'disabled' },
    worker: { status: 'unavailable', reason: 'worker_readiness_not_verified' },
  })

  delete process.env['AGRONAUTAS_AUTH_ENABLED']
  delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  delete process.env['AGRONAUTAS_ROUTE_PREFIX']
})

test('GET /fields/:id?mode=demo queda limitado al lote canónico y no evita 404 reales', async () => {
  const previousMode = process.env['AGRONAUTAS_RUNTIME_MODE']
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'real'

  try {
    const app = createTestApp()
    const demo = await request(app, '/agronautas/fields/field-demo-1?mode=demo')
    const wrongField = await request(app, '/agronautas/fields/field-1?mode=demo')
    const realCanonical = await request(app, '/agronautas/fields/field-demo-1')

    assert.equal(demo.status, 200)
    const demoJson = await demo.json() as { fieldId: string; locality: string }
    assert.equal(demoJson.fieldId, 'field-demo-1')
    assert.equal(demoJson.locality, 'Mercedes')
    assert.equal(wrongField.status, 404)
    assert.equal(realCanonical.status, 404)
  } finally {
    if (previousMode === undefined) delete process.env['AGRONAUTAS_RUNTIME_MODE']
    else process.env['AGRONAUTAS_RUNTIME_MODE'] = previousMode
  }
})

test('GET /fields/:id?mode=demo conserva el scope de lectura', async () => {
  const previousMode = process.env['AGRONAUTAS_RUNTIME_MODE']
  const previousAuth = process.env['AGRONAUTAS_AUTH_ENABLED']
  const previousReaderToken = process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'real'
  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'

  try {
    const app = createTestApp({ authService: createExplicitTestAuthService(false) })
    const unauthorized = await request(app, '/agronautas/fields/field-demo-1?mode=demo')
    const authorized = await request(app, '/agronautas/fields/field-demo-1?mode=demo', { headers: { authorization: 'Bearer reader-token' } })

    assert.equal(unauthorized.status, 401)
    assert.equal(authorized.status, 200)
  } finally {
    if (previousMode === undefined) delete process.env['AGRONAUTAS_RUNTIME_MODE']
    else process.env['AGRONAUTAS_RUNTIME_MODE'] = previousMode
    if (previousAuth === undefined) delete process.env['AGRONAUTAS_AUTH_ENABLED']
    else process.env['AGRONAUTAS_AUTH_ENABLED'] = previousAuth
    if (previousReaderToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    else process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = previousReaderToken
  }
})

test('GET /fields/field-demo-1?mode=demo devuelve todos los contratos del detalle', async () => {
  const previousMode = process.env['AGRONAUTAS_RUNTIME_MODE']
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'real'

  try {
    const app = createTestApp()
    const responses = await Promise.all([
      request(app, '/agronautas/fields/field-demo-1?mode=demo'),
      request(app, '/agronautas/fields/field-demo-1/risk/current?mode=demo'),
      request(app, '/agronautas/fields/field-demo-1/alerts/current?mode=demo'),
      request(app, '/agronautas/fields/field-demo-1/status?mode=demo'),
      request(app, '/agronautas/fields/field-demo-1/risk/timeline?mode=demo'),
      request(app, '/agronautas/fields/field-demo-1/weather/timeline?mode=demo'),
      request(app, '/agronautas/fields/field-demo-1/dashboard?mode=demo'),
      request(app, '/agronautas/fields/field-demo-1/alerts/timeline?mode=demo'),
    ])

    assert.deepEqual(responses.map((response) => response.status), [200, 200, 202, 200, 200, 200, 200, 200])
    assert.equal((await responses[6]?.json() as { field: { fieldId: string } }).field.fieldId, 'field-demo-1')
  } finally {
    if (previousMode === undefined) delete process.env['AGRONAUTAS_RUNTIME_MODE']
    else process.env['AGRONAUTAS_RUNTIME_MODE'] = previousMode
  }
})

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
    body: JSON.stringify({ contractVersion: '1.0.0', fieldId: 'ext-1', cropCategory: 'cereal', crop: 'maize', hectares: 25, locality: 'Mercedes', location: { lat: -29.2, lng: -58.1 } }),
  })

  assert.equal(response.status, 201)
  const json = (await response.json()) as { coverage: { locality: string } }
  assert.equal(json.coverage.locality, 'Mercedes')
  assert.equal(fieldStore.size, 1)
  assert.equal([...fieldStore.values()][0]?.props.crop, 'maize')
  assert.equal(contextStore.size, 1)
})

test('POST /fields maps expected persistence failures without hiding unexpected failures', async () => {
  const payload = { contractVersion: '1.0.0', fieldId: 'ext-failure', cropCategory: 'cereal', crop: 'rice', hectares: 10, locality: 'Mercedes', location: { lat: -29.2, lng: -58.1 } }
  const failureCases = [
    { error: 'FIELD_WORKSPACE_CONFLICT', status: 403, code: 'FORBIDDEN' },
    { error: 'WORKSPACE_NOT_FOUND', status: 503, code: 'AUTH_MAINTENANCE' },
    { error: 'FIELD_EXTERNAL_ID_CONFLICT', status: 422, code: 'INVALID_CONTRACT' },
    { error: 'unexpected_database_failure', status: 500, code: 'INVALID_CONTRACT' },
  ] as const

  for (const failureCase of failureCases) {
    const response = await request(createTestApp({
      fieldRepository: {
        ...createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map() }),
        async save() { throw new Error(failureCase.error) },
      },
    }), '/agronautas/fields', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })

    assert.equal(response.status, failureCase.status)
    const body = await response.json() as { code: string; message: string; details?: unknown }
    assert.equal(body.code, failureCase.code)
    assert.doesNotMatch(body.message, /unexpected_database_failure/)
    assert.equal(body.details, undefined)
  }
})

test('POST /fields labels a point inside the boundary with no PostGIS locality as unsupported locality', async () => {
  const response = await request(createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, provinceCode: 'AR-W', staleCause: 'unsupported_locality' }, fieldStore: new Map() }),
  }), '/agronautas/fields', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', fieldId: 'ext-locality', cropCategory: 'cereal', crop: 'maize', hectares: 10, locality: 'Unknown', location: { lat: -29.2, lng: -58.1 } }),
  })

  assert.equal(response.status, 422)
  const json = await response.json() as { code: string; details: { reason: string } }
  assert.equal(json.code, 'OUT_OF_SUPPORTED_AREA')
  assert.equal(json.details.reason, 'unsupported_locality')
})

test('geometry routes preserve submitted crop and enforce read/write auth', { concurrency: false }, async () => {
  const fieldStore = new Map<string, Field>([['field-geometry', testField('field-geometry')]])
  const app = createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    geometryRepository: {
      async getGeometry() {
        return { fieldId: 'field-geometry', polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))', centroid: { lat: -29.1966, lng: -58.0966 }, areaM2: 1_000_000, hectares: 100, perimeterM: 4_000, status: 'saved', source: 'operator', updatedAt: new Date('2026-08-12T00:00:00.000Z') }
      },
      async updateGeometry() {
        return { polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))', centroid: { lat: -29.1966, lng: -58.0966 }, areaM2: 1_000_000, hectares: 100, perimeterM: 4_000, status: 'saved', source: 'operator', updatedAt: new Date('2026-08-12T00:00:00.000Z') }
      },
    },
  })

  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'
  process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR'] = 'operator-token'
  try {
    const read = await request(app, '/agronautas/fields/field-geometry/geometry', { headers: { authorization: 'Bearer reader-token' } })
    const write = await request(app, '/agronautas/fields/field-geometry/geometry', {
      method: 'PATCH', headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' },
      body: JSON.stringify({ polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))' }),
    })
    const forbidden = await request(app, '/agronautas/fields/field-geometry/geometry', {
      method: 'PATCH', headers: { authorization: 'Bearer reader-token', 'content-type': 'application/json' },
      body: JSON.stringify({ polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))' }),
    })

    assert.equal(read.status, 200)
    assert.equal((await read.json() as { hectares: number }).hectares, 100)
    assert.equal(write.status, 200)
    assert.equal(forbidden.status, 403)
  } finally {
    delete process.env['AGRONAUTAS_AUTH_ENABLED']
    delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
    delete process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR']
  }
})

test('PATCH /fields/:id/geometry rejects invalid geometry and unsupported coverage without saving', async () => {
  let updates = 0
  const app = createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: false, staleCause: 'outside_supported_area' }, fieldStore: new Map([['field-invalid', testField('field-invalid')]]) }),
    geometryRepository: { async getGeometry() { return null }, async updateGeometry() { updates += 1; throw new Error('should not persist') } },
  })

  const response = await request(app, '/agronautas/fields/field-invalid/geometry', {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19))' }),
  })

  assert.equal(response.status, 422)
  assert.equal(updates, 0)
})

test('POST /contact/demo persiste solicitudes válidas', async () => {
  const persisted: Array<{ email: string; sourcePath: string; ipHash?: string }> = []
  const app = createTestApp({
    demoContactSubmissionRepository: {
      async save(record) {
        persisted.push(record)
        return { submissionId: 'demo-sub-1' }
      },
    },
  })

  const response = await request(app, '/agronautas/contact/demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-source-path': '/probar-demo' },
    body: JSON.stringify({ contractVersion: '1.0.0', name: 'Ada', email: 'ada@example.com', website: '' }),
  })

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { contractVersion: '1.0.0', submissionId: 'demo-sub-1', status: 'received' })
  assert.equal(persisted.length, 1)
  assert.equal(persisted[0]?.email, 'ada@example.com')
  assert.equal(persisted[0]?.sourcePath, '/probar-demo')
  assert.ok(persisted[0]?.ipHash)
})

test('POST /contact/demo rechaza payload inválido y no persiste', async () => {
  let saveCalls = 0
  const response = await request(createTestApp({
    demoContactSubmissionRepository: { async save() { saveCalls += 1; return { submissionId: 'unused' } } },
  }), '/agronautas/contact/demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', name: '', email: 'bad-email', website: '' }),
  })

  assert.equal(response.status, 400)
  assert.equal(saveCalls, 0)
})

test('POST /contact/demo acepta honeypot sin persistir', async () => {
  let saveCalls = 0
  const response = await request(createTestApp({
    demoContactSubmissionRepository: { async save() { saveCalls += 1; return { submissionId: 'unused' } } },
  }), '/agronautas/contact/demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', name: 'Ada', email: 'ada@example.com', website: 'bot' }),
  })

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { contractVersion: '1.0.0', submissionId: 'ignored-honeypot', status: 'received' })
  assert.equal(saveCalls, 0)
})

test('POST /agronautas/v1/contact/demo mantiene acceso versionado', async () => {
  const app = express()
  app.use(express.json())
  app.use('/agronautas/v1', createAgronautasRouter({
    isVersionedNamespace: true,
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map() }),
    fieldContextRepository: createFieldContextRepository(new Map()),
    riskSnapshotRepository: { async save() {}, async getLatest() { return null }, async listTimeline() { return [] } },
    signalSummaryRepository: { async getLatestClimateSummary(): Promise<ClimateSummary | null> { return null }, async getLatestSatelliteSummary(): Promise<SatelliteSummary | null> { return null }, async listClimateTimeline() { return [] } },
    recomputeLockRepository: { async acquire() { return { acquired: true, metadata: { runId: 'run-1', jobId: 'job-1', requestId: 'req-1', correlationId: 'req-1', triggeredBy: 'api', contractVersion: '1.0.0' } } }, async release() {} },
    runtimeDispatcher: { async dispatchRiskRecompute() {} },
    jobRunRepository: { async saveQueuedRun() {}, async markRunning() {}, async markHeartbeat() {}, async markCompleted() {}, async markFailed() {} },
    alertSnapshotRepository: { async saveMany() {}, async getLatestForField() { return [] }, async listTimeline() { return [] } },
    demoContactSubmissionRepository: { async save() { return { submissionId: 'demo-sub-v1' } } },
    authService: createExplicitTestAuthService(),
  }))

  const response = await request(app, '/agronautas/v1/contact/demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', name: 'Ada', email: 'ada@example.com', website: '' }),
  })

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { contractVersion: '1.0.0', submissionId: 'demo-sub-v1', status: 'received' })
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
      async acquire(fieldId) {
        lockCalls.push(fieldId)
        return lockCalls.length === 1
          ? { acquired: true, metadata: { runId: 'run-1', jobId: 'job-1', requestId: 'req-1', correlationId: 'req-1', triggeredBy: 'alert-refresh', contractVersion: '1.0.0' } }
          : { acquired: false, metadata: { runId: 'run-1', jobId: 'job-1', requestId: 'req-1', correlationId: 'req-1', triggeredBy: 'alert-refresh', contractVersion: '1.0.0' } }
      },
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
      async acquire(fieldId) { lockCalls.push(fieldId); return { acquired: true, metadata: { runId: 'run-ctx', jobId: 'job-ctx', requestId: 'req-ctx', correlationId: 'req-ctx', triggeredBy: 'api', contractVersion: '1.0.0' } } },
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

test('GET /fields/:id/status resume frescura y última actualización sin encolar recompute', async () => {
  const fieldStore = new Map<string, Field>()
  const field = new Field({
    id: 'field-status-1',
    externalFieldId: 'ext-status-1',
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

  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snap-status-1',
    fieldId: field.props.id,
    runId: 'run-status-1',
    score: 76,
    confidence: 0.84,
    computedAt: new Date('2026-06-03T00:00:00.000Z'),
    validUntil: new Date('2026-06-03T01:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
    evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-status-1'],
    degradationReasons: ['satellite_data_stale'],
  })

  const response = await request(createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    riskSnapshotRepository: {
      async save() {},
      async getLatest() { return snapshot },
      async listTimeline() { return [snapshot] },
    },
    alertSnapshotRepository: {
      async saveMany() {},
      async getLatestForField() { return [{ alertId: 'alert-status-1', fieldId: field.props.id, basedOnSnapshotId: snapshot.props.snapshotId, runId: snapshot.props.runId, type: 'flood', priority: 1, confidence: 0.73, freshness: 'degraded', degradationReasons: ['satellite_data_stale'] }] },
      async listTimeline() { return [] },
    },
  }), `/agronautas/fields/${field.props.id}/status`)

  assert.equal(response.status, 200)
  const json = await response.json() as { fieldStatus: string; riskStatus: string; alertsStatus: string; alertCount: number; lastUpdatedAt: string }
  assert.equal(json.fieldStatus, 'stale')
  assert.equal(json.riskStatus, 'stale')
  assert.equal(json.alertsStatus, 'degraded')
  assert.equal(json.alertCount, 1)
  assert.equal(json.lastUpdatedAt, '2026-06-03T00:00:00.000Z')
})

test('GET /fields/:id/dashboard compone payload persistido con riesgo, fuentes, frescura y evidencia degradada', async () => {
  const field = testField('field-dashboard-1')
  const fieldStore = new Map([[field.props.id, field]])
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snap-dashboard-1',
    fieldId: field.props.id,
    runId: 'run-dashboard-1',
    score: 78,
    confidence: 0.67,
    computedAt: new Date('2026-06-03T00:00:00.000Z'),
    validUntil: new Date('2026-06-03T06:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [{ key: 'satellite_stress', label: 'Estrés satelital', weight: 0.3, value: 0.81 }],
    evidenceRefs: ['signal_ingestion_runs:sentinel:satellite:run-dashboard-1'],
    degradationReasons: ['satellite_data_stale'],
  })

  const response = await request(createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    riskSnapshotRepository: { async save() {}, async getLatest() { return snapshot }, async listTimeline() { return [snapshot] } },
    signalSummaryRepository: { async getLatestClimateSummary() { return null }, async getLatestSatelliteSummary() { return null }, async listClimateTimeline() { return [{ provider: 'open-meteo', observedAt: new Date('2026-06-03T00:00:00.000Z'), freshnessHours: 8, confidence: 0.69, staleCause: 'latest_good_fallback', provenance: ['signal_ingestion_runs:open-meteo:climate'], temperatureC: 28, rainfallMm7d: 35, humidityPct: 80 }] } },
    alertSnapshotRepository: { async saveMany() {}, async getLatestForField() { return [{ alertId: 'alert-dashboard-1', fieldId: field.props.id, basedOnSnapshotId: snapshot.props.snapshotId, runId: snapshot.props.runId, type: 'water_stress', priority: 2, confidence: 0.61, freshness: 'degraded', degradationReasons: ['satellite_data_stale'] }] }, async listTimeline() { return [] } },
  }), `/agronautas/fields/${field.props.id}/dashboard`)

  assert.equal(response.status, 200)
  const json = await response.json() as { snapshotId: string; status: string; signals: Array<{ status: string }>; provenance: Array<{ provider: string }>; scheduler: { failures: unknown[]; nextDueBySource: unknown[] }; generatedAt: string; risk: { score: number } }
  assert.equal(json.snapshotId, 'snap-dashboard-1')
  assert.equal(json.status, 'degraded')
  assert.equal(json.signals[0]?.status, 'degraded')
  assert.equal(json.provenance[0]?.provider, 'open-meteo')
  assert.equal(json.scheduler.failures.length, 1)
  assert.deepEqual(json.scheduler.nextDueBySource, [])
  assert.match(json.generatedAt, /T/)
})

test('GET /fields/:id/dashboard.pdf reutiliza el mismo payload persistido del dashboard', async () => {
  const field = testField('field-pdf-1')
  const fieldStore = new Map([[field.props.id, field]])
  const snapshot = new RiskSnapshotFoundation({ snapshotId: 'snap-pdf-1', fieldId: field.props.id, runId: 'run-pdf-1', score: 64, confidence: 0.72, computedAt: new Date('2026-06-03T00:00:00.000Z'), validUntil: new Date('2026-06-03T06:00:00.000Z'), ruleVersion: 'risk-v0', drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.64 }], evidenceRefs: ['signal_ingestion_runs:open-meteo:climate:run-pdf-1'], degradationReasons: [] })

  const app = createTestApp({ fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }), riskSnapshotRepository: { async save() {}, async getLatest() { return snapshot }, async listTimeline() { return [snapshot] } } })
  const dashboard = await request(app, `/agronautas/fields/${field.props.id}/dashboard`).then((res) => res.json()) as { snapshotId: string; risk: { score: number; confidence: number }; freshness: string; lastDataFetchedAt: string; presentation: { disclaimer: string; confidenceLabel: string; sourcesUnavailable: boolean }; provenance: Array<{ evidenceId: string }> }
  const pdf = await request(app, `/agronautas/fields/${field.props.id}/dashboard.pdf`)

  assert.equal(pdf.status, 200)
  assert.match(pdf.headers.get('content-type') ?? '', /application\/pdf/)
  const text = await pdf.text()
  assert.match(text, /%PDF-1\.4/)
  assert.match(text, /xref/)
  assert.match(text, /trailer/)
  assert.match(text, new RegExp(dashboard.snapshotId))
  assert.match(text, new RegExp(String(dashboard.risk.score)))
  assert.match(text, new RegExp(String(dashboard.risk.confidence)))
  assert.match(text, new RegExp(dashboard.lastDataFetchedAt))
  assert.match(text, /Disclaimers: Los indicadores son soporte operativo y no reemplazan criterio agronómico local/)
  assert.match(text, new RegExp(`Frescura=${dashboard.freshness}`))
  assert.match(text, new RegExp(`Confianza=${dashboard.presentation.confidenceLabel}`))
  assert.match(text, new RegExp(`Fuentes degradadas o no disponibles=${String(dashboard.presentation.sourcesUnavailable)}`))
  assert.match(text, new RegExp(dashboard.provenance[0]?.evidenceId ?? 'evidence='))
})

test('GET /fields/:id/dashboard expone contrato visual con última obtención, degradación, disclaimer y confianza', async () => {
  const field = testField('field-dashboard-contract-1')
  const fieldStore = new Map([[field.props.id, field]])
  const snapshot = new RiskSnapshotFoundation({ snapshotId: 'snap-dashboard-contract-1', fieldId: field.props.id, runId: 'run-dashboard-contract-1', score: 69, confidence: 0.58, computedAt: new Date('2026-06-03T00:00:00.000Z'), validUntil: new Date('2026-06-03T06:00:00.000Z'), ruleVersion: 'risk-v0', drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.64 }], evidenceRefs: ['signal_ingestion_runs:open-meteo:climate:run-dashboard-contract-1'], degradationReasons: ['weather_data_stale'] })

  const response = await request(createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    riskSnapshotRepository: { async save() {}, async getLatest() { return snapshot }, async listTimeline() { return [snapshot] } },
    signalSummaryRepository: { async getLatestClimateSummary() { return null }, async getLatestSatelliteSummary() { return null }, async listClimateTimeline() { return [{ provider: 'open-meteo', observedAt: new Date('2026-06-02T22:00:00.000Z'), freshnessHours: 10, confidence: 0.58, staleCause: 'source_timeout', provenance: ['https://api.open-meteo.com/'], temperatureC: 24, rainfallMm7d: 28, humidityPct: 72 }] } },
  }), `/agronautas/fields/${field.props.id}/dashboard`)

  assert.equal(response.status, 200)
  const json = await response.json() as { lastDataFetchedAt: string; freshness: string; risk: { confidence: number }; presentation: { disclaimer: string; confidenceLabel: string; sourcesUnavailable: boolean; staleFlags: string[] } }
  assert.equal(json.lastDataFetchedAt, '2026-06-02T22:00:00.000Z')
  assert.equal(json.freshness, 'degraded')
  assert.equal(json.risk.confidence, 0.58)
  assert.equal(json.presentation.confidenceLabel, 'media')
  assert.equal(json.presentation.sourcesUnavailable, true)
  assert.deepEqual(json.presentation.staleFlags, ['weather_data_stale', 'weather_data_stale'])
  assert.match(json.presentation.disclaimer, /no reemplazan criterio agronómico local/i)
})

test('GET /agronautas/runtime expone modo y prefijo activos', async () => {
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'demo'
  process.env['AGRONAUTAS_ROUTE_PREFIX'] = '/agronautas'
  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'

  const response = await request(createTestApp(), '/agronautas/runtime', {
    headers: { authorization: 'Bearer reader-token' },
  })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-agronautas-mode'), 'demo')
  assert.equal(response.headers.get('x-agronautas-route-compatibility'), '/agronautas/v1')
  assert.deepEqual(await response.json(), {
    mode: 'demo',
    routePrefix: '/agronautas',
    compatibilityPrefix: '/agronautas/v1',
    contractVersion: '1.0.0',
    scheduler: { enabled: false, status: 'disabled' },
    worker: { status: 'unavailable', reason: 'worker_readiness_not_verified' },
  })

  delete process.env['AGRONAUTAS_RUNTIME_MODE']
  delete process.env['AGRONAUTAS_ROUTE_PREFIX']
  delete process.env['AGRONAUTAS_AUTH_ENABLED']
  delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
})

test('GET /fields/:id/alerts/current no persiste alertas nuevas cuando el snapshot sigue stale', async () => {
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snap-stale-1',
    fieldId: 'field-stale-1',
    runId: 'run-stale-1',
    score: 84,
    confidence: 0.83,
    computedAt: new Date('2026-06-03T00:00:00.000Z'),
    validUntil: new Date('2026-06-03T01:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 1, value: 0.9 }],
    evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-stale-1'],
    degradationReasons: [],
  })
  let saveManyCalls = 0

  const app = createTestApp({
    riskSnapshotRepository: {
      async save() {},
      async getLatest() { return snapshot },
      async listTimeline() { return [snapshot] },
    },
    alertSnapshotRepository: {
      async saveMany() { saveManyCalls += 1 },
      async getLatestForField() {
        return [{ alertId: 'field-stale-1:snap-prev:flood', fieldId: 'field-stale-1', basedOnSnapshotId: 'snap-prev', runId: 'run-prev', type: 'flood', priority: 1, confidence: 0.74, freshness: 'fresh', degradationReasons: [] }]
      },
      async listTimeline() { return [] },
    },
    recomputeLockRepository: {
      async acquire() { return { acquired: false, metadata: { runId: 'run-stale-1', jobId: 'job-stale-1', requestId: 'req-stale-1', correlationId: 'req-stale-1', triggeredBy: 'alert-refresh', contractVersion: '1.0.0' } } },
      async release() {},
    },
  })

  const response = await request(app, '/agronautas/fields/field-stale-1/alerts/current')
  assert.equal(response.status, 202)
  assert.equal(saveManyCalls, 0)
})

test('modo demo responde contratos backend-driven sin depender de repositorios', async () => {
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'demo'

  const app = createTestApp()
  const createResponse = await request(app, '/agronautas/fields', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', fieldId: 'demo-field', cropCategory: 'cereal', crop: 'rice', provinceCode: 'AR-W', countryCode: 'AR', hectares: 25, locality: 'Mercedes', location: { lat: -29.2, lng: -58.1 } }),
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

test('modo demo preserva campos FieldIntake v2 en el overview creado', async () => {
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'demo'
  try {

  const app = createTestApp()
  const createResponse = await request(app, '/agronautas/fields', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', fieldId: 'demo-maize-field', cropCategory: 'cereal', crop: 'maize', provinceCode: 'AR-W', countryCode: 'AR', hectares: 25, locality: 'Mercedes', location: { lat: -29.2, lng: -58.1 } }),
  })
  assert.equal(createResponse.status, 201)
  const created = await createResponse.json() as { coverage: { provinceCode: string } }
  assert.equal(created.coverage.provinceCode, 'AR-W')

  } finally {
  delete process.env['AGRONAUTAS_RUNTIME_MODE']
  }
})

test('POST /fields/:id/chat responde con resumen grounded y action trace', async () => {
  const fieldStore = new Map<string, Field>()
  const field = new Field({
    id: 'field-chat-1',
    externalFieldId: 'ext-chat-1',
    crop: 'rice',
    hectares: 30,
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
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snap-chat-1',
    fieldId: field.props.id,
    runId: 'run-chat-1',
    score: 68,
    confidence: 0.81,
    computedAt: new Date('2026-06-03T00:00:00.000Z'),
    validUntil: new Date('2026-06-03T06:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.7 }],
    evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-chat-1'],
    degradationReasons: [],
  })

  const response = await request(createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    riskSnapshotRepository: {
      async save() {},
      async getLatest() { return snapshot },
      async listTimeline() { return [snapshot] },
    },
    alertSnapshotRepository: {
      async saveMany() {},
      async getLatestForField() { return [{ alertId: 'alert-chat-1', fieldId: field.props.id, basedOnSnapshotId: snapshot.props.snapshotId, runId: snapshot.props.runId, type: 'flood', priority: 1, confidence: 0.73, freshness: 'fresh', degradationReasons: [] }] },
      async listTimeline() { return [] },
    },
  }), `/agronautas/fields/${field.props.id}/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', message: 'Explicá el riesgo actual' }),
  })

  assert.equal(response.status, 200)
  const json = await response.json() as { executedAction: string; supportingFacts: Array<{ label: string }>; trace: Array<{ action: string }> }
  assert.equal(json.executedAction, 'GET_RISK_SUMMARY')
  assert.ok(json.supportingFacts.some((fact) => fact.label === 'Score'))
  assert.equal(json.trace[0]?.action, 'GET_RISK_SUMMARY')
})

test('POST /fields/:id/chat rechaza preguntas fuera del alcance aprobado', async () => {
  const response = await request(createTestApp({ fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map([['field-1', testField('field-1')]]) }) }), '/agronautas/fields/field-1/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', message: 'Dame un clima futuro exacto para 30 días' }),
  })

  assert.equal(response.status, 422)
  const json = await response.json() as { unavailableReason: string }
  assert.equal(json.unavailableReason, 'unsupported_question')
})

test('POST /fields/:id/chat cae a modo degradado cuando Groq no está disponible', async () => {
  const fieldStore = new Map<string, Field>()
  const field = new Field({
    id: 'field-chat-2',
    externalFieldId: 'ext-chat-2',
    crop: 'rice',
    hectares: 11,
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

  const response = await request(createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    groqProvider: {
      enabled: false,
      async selectAction() { throw new Error('groq_disabled_fixture') },
      async finalizeResponse() { throw new Error('groq_disabled_fixture') },
    },
  }), `/agronautas/fields/${field.props.id}/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', message: 'Dame un resumen general' }),
  })

  assert.equal(response.status, 200)
  const json = await response.json() as { degraded: boolean; unavailableReason: string }
  assert.equal(json.degraded, true)
  assert.equal(json.unavailableReason, 'groq_unavailable')
})

test('POST /fields/:id/chat aplica rate limit por IP sin afectar otros endpoints', async () => {
  process.env['RATE_LIMIT_STORE'] = 'memory'
  const app = createTestApp({ fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map([['field-1', testField('field-1')]]) }) })

  let limitedResponse: Response | undefined
  for (let attempt = 0; attempt < 11; attempt += 1) {
    const response = await request(app, '/agronautas/fields/field-1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
      body: JSON.stringify({ contractVersion: '1.0.0', message: 'Explicá el riesgo actual' }),
    })

    if (attempt < 10) {
      assert.equal(response.status, 200)
    } else {
      limitedResponse = response
    }
  }

  assert.ok(limitedResponse)
  assert.equal(limitedResponse.status, 429)
  assert.match(await limitedResponse.text(), /chat|demasiadas|too many/i)

  const unaffected = await request(app, '/agronautas/runtime', {
    headers: { 'x-forwarded-for': '203.0.113.10' },
  })

  assert.equal(unaffected.status, 200)
  delete process.env['RATE_LIMIT_STORE']
})

test('POST /fields/:id/chat rechaza mensajes oversized con error contractual', async () => {
  const response = await request(createTestApp({ fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map([['field-1', testField('field-1')]]) }) }), '/agronautas/fields/field-1/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', message: 'x'.repeat(501) }),
  })

  assert.equal(response.status, 400)
  const json = await response.json() as { code: string }
  assert.equal(json.code, 'INVALID_CONTRACT')
})

test('GET /fields/:id/hydrology/dashboard protege lote y expone timestamp exacto sin etiquetas heredadas', async () => {
  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'
  const fieldStore = new Map<string, Field>()
  const field = testField('field-hydro-1')
  fieldStore.set(field.props.id, field)

  const response = await request(createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    hydrologyRepository: { async getDenseContextForField() { return hydrologyContext(field.props.id) } },
  }), `/agronautas/fields/${field.props.id}/hydrology/dashboard`, {
    headers: { authorization: 'Bearer reader-token' },
  })

  assert.equal(response.status, 200)
  const text = await response.text()
  assert.match(text, /2026-06-23T10:30:00.000Z/)
  assert.doesNotMatch(text, /stale-data|datos desactualizados/i)
  const json = JSON.parse(text) as { status: { lastSuccessfulObservedAt: string }; forecasts: Array<{ confidence: string; forecastHorizonDays: number }> }
  assert.equal(json.status.lastSuccessfulObservedAt, '2026-06-23T10:30:00.000Z')
  assert.deepEqual(json.forecasts.map((row) => [row.forecastHorizonDays, row.confidence]), [[20, 'speculative']])

  delete process.env['AGRONAUTAS_AUTH_ENABLED']
  delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
})

test('POST /fields/:id/copilot/chat streamea SSE de metadatos y tokens hidrológicos', async () => {
  const fieldStore = new Map<string, Field>()
  const field = testField('field-hydro-chat-1')
  fieldStore.set(field.props.id, field)

  const response = await request(createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    hydrologyRepository: { async getDenseContextForField() { return hydrologyContext(field.props.id) } },
    hydrologyCopilotService: { async *streamChat() { yield { type: 'metadata', data: { model: DEFAULT_GROQ_MODEL } }; yield { type: 'token', data: 'Respuesta oficial.' }; yield { type: 'done', data: { model: DEFAULT_GROQ_MODEL } } } },
  }), `/agronautas/fields/${field.props.id}/copilot/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', message: '¿Cómo impacta en el lote?' }),
  })

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/)
  const body = await response.text()
  assert.match(body, /event: metadata/)
  assert.match(body, /data: "Respuesta oficial\."/)
  assert.match(body, /event: done/)
})

test('POST /fields/:id/copilot/chat redacts provider failures from the SSE response', async () => {
  const fieldStore = new Map<string, Field>()
  const field = testField('field-hydro-chat-error')
  fieldStore.set(field.props.id, field)

  const response = await request(createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    hydrologyRepository: { async getDenseContextForField() { return hydrologyContext(field.props.id) } },
    hydrologyCopilotService: { async *streamChat() { throw new Error('groq token secret=do-not-return') } },
  }), `/agronautas/fields/${field.props.id}/copilot/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', message: '¿Cómo impacta en el lote?' }),
  })

  assert.equal(response.status, 200)
  const body = await response.text()
  assert.match(body, /El copiloto hidrológico no está disponible/)
  assert.match(body, /upstream_unavailable/)
  assert.doesNotMatch(body, /groq token secret|do-not-return/)
})

test('seeded Corrientes demo rows can power overview, weather, alerts, status and chat', async () => {
  const referenceNow = new Date()
  const snapshotComputedAt = new Date(referenceNow.getTime() - 2 * 60 * 60 * 1000)
  const snapshotValidUntil = new Date(referenceNow.getTime() + 4 * 60 * 60 * 1000)
  const fieldStore = new Map<string, Field>()
  const contextStore = new Map<string, FieldContext>()
  const field = new Field({
    id: 'corrientes-demo-mercedes',
    externalFieldId: 'corrientes-demo-mercedes',
    crop: 'rice',
    hectares: 42.5,
    localityName: 'Mercedes',
    provinceCode: 'AR-W',
    centroid: { lat: -29.1846, lng: -58.0759 },
    boundaryMetadata: {
      sourceName: 'seed',
      sourceUrl: 'https://api.open-meteo.com/',
      sourceVersion: 'corrientes-demo-v1',
      normalizationStatus: 'verified-demo-centroid',
    },
  })
  fieldStore.set(field.props.id, field)
  contextStore.set(field.props.id, new FieldContext({ fieldId: field.props.id, growthStage: 'tillering', localityCanonical: 'Mercedes', localityConfidence: 1, contextPayload: { demoBoundary: 'demo-only' } }))

  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'corrientes-demo-risk-mercedes',
    fieldId: field.props.id,
    runId: 'corrientes-demo-climate-mercedes',
    score: 71,
    confidence: 0.8,
    computedAt: snapshotComputedAt,
    validUntil: snapshotValidUntil,
    ruleVersion: 'corrientes-demo-risk-v1',
    drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.45, value: 0.78 }],
    evidenceRefs: ['signal_ingestion_runs:open-meteo:climate:corrientes-demo-climate-mercedes', 'field_contexts:corrientes-demo-mercedes'],
    degradationReasons: [],
  })

  const app = createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore }),
    fieldContextRepository: createFieldContextRepository(contextStore),
    riskSnapshotRepository: {
      async save() {},
      async getLatest() { return snapshot },
      async listTimeline() { return [snapshot] },
    },
    signalSummaryRepository: {
      async getLatestClimateSummary() { return null },
      async getLatestSatelliteSummary() { return null },
      async listClimateTimeline() {
        return [{ provider: 'open-meteo', observedAt: snapshotComputedAt, freshnessHours: 2, confidence: 0.82, provenance: ['signal_ingestion_runs:open-meteo:climate'], temperatureC: 26.4, rainfallMm7d: 63.5, humidityPct: 81 }]
      },
    },
    alertSnapshotRepository: {
      async saveMany() {},
      async getLatestForField() { return [{ alertId: 'corrientes-demo-flood-mercedes', fieldId: field.props.id, basedOnSnapshotId: snapshot.props.snapshotId, runId: snapshot.props.runId, type: 'flood', priority: 1, confidence: 0.76, freshness: 'fresh', degradationReasons: [] }] },
      async listTimeline() { return [{ alertId: 'corrientes-demo-flood-mercedes', fieldId: field.props.id, basedOnSnapshotId: snapshot.props.snapshotId, runId: snapshot.props.runId, type: 'flood', priority: 1, confidence: 0.76, freshness: 'fresh', degradationReasons: [] }] },
    },
  })

  const [overview, weather, status, chat] = await Promise.all([
    request(app, `/agronautas/fields/${field.props.id}`),
    request(app, `/agronautas/fields/${field.props.id}/weather/timeline`),
    request(app, `/agronautas/fields/${field.props.id}/status`),
    request(app, `/agronautas/fields/${field.props.id}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: '1.0.0', message: 'Explicá el riesgo actual' }) }),
  ])

  assert.equal(overview.status, 200)
  assert.equal((await overview.json() as { locality: string }).locality, 'Mercedes')
  assert.equal(weather.status, 200)
  assert.equal((await weather.json() as { items: Array<{ provider: string }> }).items[0]?.provider, 'open-meteo')
  assert.equal(status.status, 200)
  assert.equal((await status.json() as { riskStatus: string }).riskStatus, 'fresh')
  assert.equal(chat.status, 200)
  assert.equal((await chat.json() as { supportingFacts: Array<{ label: string }> }).supportingFacts[0]?.label, 'Score')
})

test('POST /fields persists the authenticated workspace instead of inferring the default workspace', async () => {
  let savedWorkspaceId: string | undefined
  const baseRepository = createFieldRepository({
    coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W', boundaryVersion: 'v1', localityConfidence: 1 },
    fieldStore: new Map(),
  })
  const fieldRepository: FieldRepository = {
    ...baseRepository,
    async save(field, workspaceId?: string) {
      savedWorkspaceId = workspaceId
      await baseRepository.save(field, DEFAULT_AGRONAUTAS_WORKSPACE_ID)
    },
  }

  const response = await request(createTestApp({ fieldRepository }), '/agronautas/fields', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractVersion: '1.0.0', fieldId: 'ext-workspace', cropCategory: 'cereal', crop: 'maize', hectares: 25, locality: 'Mercedes', location: { lat: -29.2, lng: -58.1 } }),
  })

  assert.equal(response.status, 201)
  assert.equal(savedWorkspaceId, DEFAULT_AGRONAUTAS_WORKSPACE_ID)
})

test('GET /agronautas/runtime no declara habilitado un scheduler sin dispatcher probado', async () => {
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'real'
  process.env['AGRONAUTAS_SCHEDULER_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_ENABLED'] = 'true'
  process.env['AGRONAUTAS_AUTH_TOKEN_READER'] = 'reader-token'

  try {
    const response = await request(createTestApp(), '/agronautas/runtime', {
      headers: { authorization: 'Bearer reader-token' },
    })

    assert.equal(response.status, 200)
    assert.deepEqual((await response.json() as { scheduler: unknown }).scheduler, {
      enabled: false,
      status: 'unavailable',
      reason: 'scheduler_dispatch_capability_not_configured',
    })
  } finally {
    delete process.env['AGRONAUTAS_RUNTIME_MODE']
    delete process.env['AGRONAUTAS_SCHEDULER_ENABLED']
    delete process.env['AGRONAUTAS_AUTH_ENABLED']
    delete process.env['AGRONAUTAS_AUTH_TOKEN_READER']
  }
})

test('GET /fields/:id/intelligence explains persisted evidence and blocks economic recommendations', async () => {
  const field = testField('field-intelligence-route-1')
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snapshot-intelligence-route-1', fieldId: field.props.id, runId: 'run-risk-1', score: 55, confidence: 0.8,
    computedAt: new Date('2026-08-13T10:00:00.000Z'), validUntil: new Date('2026-08-13T16:00:00.000Z'), ruleVersion: 'risk-v0',
    engineId: 'risk-v0', engineVersion: 'risk-v0', sourceRunIds: ['source-risk-1'], drivers: [{ key: 'rain', label: 'Rain', weight: 1, value: 0.55 }], evidenceRefs: ['risk-ref-1'], degradationReasons: [],
  })
  const climate: ClimateSummary = {
    provider: 'open-meteo', observedAt: new Date('2026-08-13T09:00:00.000Z'), runId: 'run-climate-1', sourceRunId: 'source-climate-1',
    acquiredAt: new Date('2026-08-13T09:02:00.000Z'), freshnessHours: 1, confidence: 0.9, freshness: 'fresh', provenance: ['climate-ref-1'], temperatureC: 27, rainfallMm7d: 35,
  }
  const app = createTestApp({
    fieldRepository: createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map([[field.props.id, field]]) }),
    fieldContextRepository: createFieldContextRepository(new Map([[field.props.id, new FieldContext({ fieldId: field.props.id, localityCanonical: 'Mercedes', localityConfidence: 1, contextPayload: {} })]])),
    signalSummaryRepository: { async getLatestClimateSummary() { return climate }, async getLatestSatelliteSummary() { return null }, async listClimateTimeline() { return [climate] } },
    riskSnapshotRepository: { async save() {}, async getLatest() { return snapshot }, async listTimeline() { return [snapshot] } },
  })

  const response = await request(app, `/agronautas/fields/${field.props.id}/intelligence`)
  assert.equal(response.status, 200)
  const body = await response.json() as { risk: { value: { engine: { selectionStatus: string } } }; soil: { state: string; value?: unknown }; recommendation: { state: string; missingInputs?: string[] } }
  assert.equal(body.risk.value.engine.selectionStatus, 'undecided')
  assert.equal(body.soil.state, 'unavailable')
  assert.equal('value' in body.soil, false)
  assert.deepEqual(body.recommendation.missingInputs, ['soil', 'crop-history/yield', 'price', 'FX', 'cost'])
})

test('every field-id route rejects a cross-workspace field before downstream repositories run', async () => {
  let repositoryCalls = 0
  const principal: AuthPrincipal = {
    actorId: 'workspace-a-user', sessionId: 'session-a', membershipId: 'membership-a', workspaceId: 'workspace-a',
    workspaceKey: 'workspace-a', role: 'operator', scopes: ['read', 'write', 'recompute'], expiresAt: new Date(Date.now() + 60_000).toISOString(),
  }
  const crossWorkspaceAuth: AgronautasAuthServicePort = {
    async authenticateAccessToken() { return principal },
    async authenticateBffAssertion() { return principal },
    async authorize(_principal, _workspaceId, _scope, fieldId) {
      if (fieldId === 'foreign-field') throw new AuthFailure(AUTH_FAILURE_CODES.FORBIDDEN, 'Field is outside the authorized workspace')
    },
    async login() { throw new Error('not used') },
    async refresh() { throw new Error('not used') },
    async logout() { throw new Error('not used') },
    async status() { throw new Error('not used') },
  }
  const fieldRepository = createFieldRepository({ coverage: { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' }, fieldStore: new Map() })
  const guardedFieldRepository = {
    ...fieldRepository,
    async findById() { repositoryCalls += 1; return null },
    async findByExternalFieldId() { repositoryCalls += 1; return null },
    async list() { repositoryCalls += 1; return { items: [], nextCursor: null } },
  }
  const app = createTestApp({
    authService: crossWorkspaceAuth,
    fieldRepository: guardedFieldRepository,
    fieldContextRepository: { async save() { repositoryCalls += 1 }, async getLatest() { repositoryCalls += 1; return null } },
    riskSnapshotRepository: { async save() {}, async getLatest() { repositoryCalls += 1; return null }, async listTimeline() { repositoryCalls += 1; return [] } },
    signalSummaryRepository: { async getLatestClimateSummary() { repositoryCalls += 1; return null }, async getLatestSatelliteSummary() { repositoryCalls += 1; return null }, async listClimateTimeline() { repositoryCalls += 1; return [] } },
    alertSnapshotRepository: { async saveMany() {}, async getLatestForField() { repositoryCalls += 1; return [] }, async listTimeline() { repositoryCalls += 1; return [] } },
    geometryRepository: { async getGeometry() { repositoryCalls += 1; return null }, async updateGeometry() { repositoryCalls += 1; throw new Error('not used') } },
    recomputeLockRepository: { async acquire() { repositoryCalls += 1; throw new Error('not used') }, async release() {} },
    runtimeDispatcher: { async dispatchRiskRecompute() { repositoryCalls += 1 } },
    hydrologyRepository: { async getDenseContextForField() { repositoryCalls += 1; throw new Error('not used') } },
  })
  const routes: Array<{ path: string; method?: 'GET' | 'POST' | 'PATCH'; body?: string }> = [
    { path: '/agronautas/fields/foreign-field', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/activity', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/geometry', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/geometry', method: 'PATCH', body: '{}' },
    { path: '/agronautas/fields/foreign-field/risk/current', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/risk/timeline', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/weather/timeline', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/alerts/current', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/alerts/timeline', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/recompute', method: 'POST', body: '{}' },
    { path: '/agronautas/fields/foreign-field/dashboard', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/dashboard.pdf', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/intelligence', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/copilot/context', method: 'GET' },
    { path: '/agronautas/fields/foreign-field/chat', method: 'POST', body: '{}' },
    { path: '/agronautas/fields/foreign-field/copilot/chat', method: 'POST', body: '{}' },
  ]

  const responses = await Promise.all(routes.map((route) => request(app, route.path, {
    method: route.method,
    headers: { authorization: 'Bearer trusted-access-token', ...(route.body ? { 'content-type': 'application/json' } : {}) },
    body: route.body,
  })))

  assert.deepEqual(responses.map((response) => response.status), routes.map(() => 403))
  assert.equal(repositoryCalls, 0)
})

function createTestApp(overrides: Partial<Parameters<typeof createAgronautasRouter>[0]> = {}) {
  const app = express()
  process.env['RATE_LIMIT_STORE'] = 'memory'
  app.set('trust proxy', 1)
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
    recomputeLockRepository: overrides.recomputeLockRepository ?? { async acquire() { return { acquired: true, metadata: { runId: 'run-1', jobId: 'job-1', requestId: 'req-1', correlationId: 'req-1', triggeredBy: 'api', contractVersion: '1.0.0' } } }, async release() {} },
    runtimeDispatcher: overrides.runtimeDispatcher ?? { async dispatchRiskRecompute() {} },
    jobRunRepository: overrides.jobRunRepository ?? { async saveQueuedRun() {}, async markRunning() {}, async markHeartbeat() {}, async markCompleted() {}, async markFailed() {} },
    alertSnapshotRepository: overrides.alertSnapshotRepository ?? { async saveMany() {}, async getLatestForField() { return [] }, async listTimeline() { return [] } },
    demoContactSubmissionRepository: overrides.demoContactSubmissionRepository ?? createDemoContactSubmissionRepository(),
    geometryRepository: overrides.geometryRepository ?? { async getGeometry() { return null }, async updateGeometry() { throw new Error('geometry repository not configured') } },
    hydrologyRepository: overrides.hydrologyRepository ?? { async getDenseContextForField(fieldId: string) { return hydrologyContext(fieldId) } },
    hydrologyCopilotService: overrides.hydrologyCopilotService ?? { async *streamChat() { yield { type: 'metadata' as const, data: { model: DEFAULT_GROQ_MODEL } }; yield { type: 'token' as const, data: 'Sin datos oficiales disponibles.' }; yield { type: 'done' as const, data: { model: DEFAULT_GROQ_MODEL } } } },
    groqProvider: overrides.groqProvider ?? { enabled: false, async selectAction() { throw new Error('groq_disabled_fixture') }, async finalizeResponse() { throw new Error('groq_disabled_fixture') } },
     providerEvidencePort: overrides.providerEvidencePort ?? createTestProviderEvidencePort(),
     workspaceRepository: overrides.workspaceRepository ?? createWorkspaceRepository(),
     managementRepository: overrides.managementRepository,
     authService: overrides.authService ?? createExplicitTestAuthService(),
      locationRepository: overrides.locationRepository ?? { async findAuthorizedField() { return null }, async resolveCoverage() { return { insideSupportedArea: false, provinceCode: undefined } } },
   }))
  return app
}

function createExplicitTestAuthService(allowAnonymous = true): AgronautasAuthServicePort {
  const scopesByRole = {
    reader: ['read'],
    operator: ['read', 'write', 'recompute'],
    admin: ['read', 'write', 'recompute', 'admin'],
  } as const
  return {
    testOnlyAnonymousWhenDisabled: allowAnonymous,
     async authenticateAccessToken(token: string): Promise<AuthPrincipal> {
      const role = token.includes('operator') ? 'operator' : token.includes('admin') ? 'admin' : token.includes('reader') || token.includes('management') ? 'reader' : null
      if (!allowAnonymous && !role) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Missing or invalid bearer token')
      if (!role) return { actorId: 'test-actor', sessionId: 'test-session', membershipId: 'test-membership', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, workspaceKey: 'agronautas-default', role: 'admin', scopes: [...scopesByRole.admin], expiresAt: new Date(Date.now() + 60_000).toISOString() }
       return { actorId: `test-${role}`, sessionId: 'test-session', membershipId: `test-membership-${role}`, workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, workspaceKey: 'agronautas-default', role, scopes: [...scopesByRole[role]], expiresAt: new Date(Date.now() + 60_000).toISOString() }
     },
     async authenticateBffAssertion(token: string): Promise<AuthPrincipal> { return this.authenticateAccessToken(token) },
     async authorize(principal, workspaceId, scope) {
      if (!principal.scopes.includes(scope)) throw new AuthFailure(AUTH_FAILURE_CODES.FORBIDDEN, `Role ${principal.role} cannot access this operation`)
    },
    async login() { throw new AuthFailure(AUTH_FAILURE_CODES.AUTH_MAINTENANCE) },
    async refresh() { throw new AuthFailure(AUTH_FAILURE_CODES.AUTH_MAINTENANCE) },
    async logout() { throw new AuthFailure(AUTH_FAILURE_CODES.AUTH_MAINTENANCE) },
    async status() { throw new AuthFailure(AUTH_FAILURE_CODES.AUTH_MAINTENANCE) },
  } as AgronautasAuthServicePort
}

function createTestProviderEvidencePort(): ProviderEvidencePort {
  return {
    async getEvidence() {
      return {
        contractVersion: 'agronautas-evidence-v1',
        evidenceId: 'test-provider-evidence',
        provider: 'open-meteo',
        signalType: 'climate',
        sourceUrl: 'https://example.com/provider',
        providerMode: 'mock',
        observedAt: null,
        forecastAt: null,
        retrievedAt: '2026-08-27T00:00:00.000Z',
        timeStandard: 'retrieval-only',
        forecastHorizonDays: null,
        model: null,
        units: {},
        freshness: 'missing',
        rawHash: null,
        runId: 'test-provider-run',
        requestId: 'test-provider-request',
        httpStatus: null,
        schemaStatus: 'unavailable',
        http: { status: null, ok: false },
        schema: { status: 'unavailable' },
        lineage: { sourceUrl: 'https://example.com/provider', rawHash: null, parentRunId: null },
        degradationReasons: ['weather_data_unavailable'],
        lastSuccessfulObservedAt: null,
        latencyMs: 0,
        proofRef: 'test-provider-proof',
        mode: 'mock',
        boundaryStatus: 'not_run',
      }
    },
  }
}

function testField(id: string): Field {
  return new Field({ id, externalFieldId: id, crop: 'rice', hectares: 12, localityName: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.2, lng: -58.1 }, boundaryMetadata: { sourceName: 'test', sourceUrl: 'https://example.com', sourceVersion: 'v1', normalizationStatus: 'test' } })
}

function hydrologyContext(fieldId: string): HydrologyDenseContextV1 {
  return {
    contractVersion: 'hydrology-dense-context-v1',
    fieldId,
    zone: 'Mercedes',
    sources: ['PNA', 'INA', 'INMET', 'SMN'],
    stations: [{ stationId: 'pna-mercedes', source: 'PNA', name: 'Mercedes', zone: 'Mercedes' }],
    snapshot: { riskLevel: 'unknown', freshness: 'degraded', quality: 'ok', recommendation: 'Revisar datos oficiales.', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' },
    telemetry: [
      { source: 'PNA', stationId: 'pna-mercedes', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', value: 3.2, unit: 'm', metric: 'river_height_m', quality: 'ok', freshness: 'degraded', tendency: 'creciente' },
      { source: 'INA', stationId: 'ina-mercedes', observedAt: '2026-06-24T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', value: 3.7, unit: 'm', metric: 'river_height_m', quality: 'estimated', freshness: 'fresh', forecastHorizonDays: 20, confidence: 'speculative' },
    ],
  }
}

function createDemoContactSubmissionRepository(): DemoContactSubmissionRepository {
  return { async save() { return { submissionId: 'demo-submission-default' } } }
}

function createFieldRepository(input: { coverage: SupportedCoverageResult; fieldStore: Map<string, Field> }): FieldRepository {
  return {
    async save(field) { input.fieldStore.set(field.props.id, field) },
    async findById(fieldId) { return input.fieldStore.get(fieldId) ?? null },
    async findByExternalFieldId(fieldId) { return [...input.fieldStore.values()].find((field) => field.props.externalFieldId === fieldId) ?? null },
    async resolveCoverage() { return input.coverage },
    async list() { return { items: [...input.fieldStore.values()].map((field, index) => ({ field, createdAt: new Date(`2026-08-13T10:0${index}:00.000Z`), updatedAt: new Date(`2026-08-13T10:0${index}:00.000Z`), geometryUpdatedAt: null })), nextCursor: null } },
  }
}

function createWorkspaceRepository(input: { activity?: AgronautasActivitySourceRecord[] } = {}): AgronautasWorkspaceRepository {
  const workspace: AgronautasWorkspaceContextRecord = {
    workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID,
    name: 'Agronautas',
    status: 'active',
    fieldCount: 0,
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
    updatedAt: new Date('2026-08-13T10:00:00.000Z'),
  }
  return {
    async ensureDefaultWorkspace() { return workspace },
    async getWorkspace(workspaceId) { return workspaceId === workspace.workspaceId ? workspace : null },
    async listWorkspaceFields(input) { return { items: [], nextCursor: null } },
    async listFieldActivity() { return input.activity ?? [] },
  }
}

function createManagementRepository(): AgronautasManagementRepository {
  const createdAt = new Date('2026-09-21T10:00:00.000Z')
  let resource: ManagementItemRecord | undefined
  const audit: ManagementAuditRecord[] = []
  const workspace = createWorkspaceRepository()
  return {
    ...workspace,
    async listManagement() { return { items: resource ? [resource] : [], audit: [...audit].reverse() } },
    async getManagementItem() { return resource ?? null },
    async recordManagementAudit(input) {
      const entry = { auditId: `audit-${audit.length + 1}`, actorId: input.actorId, action: input.action, targetId: input.targetId, outcome: input.outcome, revisionBefore: input.revisionBefore, revisionAfter: input.revisionAfter, occurredAt: new Date(), requestId: input.requestId }
      audit.push(entry)
      return entry
    },
    async createManagement(input) {
      if (resource) {
        const duplicate = input.name === resource.name && input.kind === resource.kind && input.fieldId === resource.fieldId
        const entry = { auditId: `audit-${audit.length + 1}`, actorId: input.actorId, action: 'retry' as const, targetId: resource.id, outcome: duplicate ? 'duplicate' as const : 'conflict' as const, revisionBefore: resource.revision, revisionAfter: resource.revision, occurredAt: new Date(), requestId: input.requestId }
        audit.push(entry)
        return { status: duplicate ? 'duplicate' as const : 'conflict' as const, resource, audit: entry }
      }
      resource = { id: 'operation-1', kind: input.kind, workspaceId: input.workspaceId, fieldId: input.fieldId ?? null, parentId: input.parentId ?? null, name: input.name, status: input.status, revision: 1, responsibleActorId: input.responsibleActorId ?? null, createdByActorId: input.actorId, idempotencyKey: input.idempotencyKey, sourceLocationIds: input.sourceLocationIds, createdAt, updatedAt: createdAt }
      const entry = { auditId: 'audit-1', actorId: input.actorId, action: 'create' as const, targetId: resource.id, outcome: 'accepted' as const, revisionBefore: null, revisionAfter: 1, occurredAt: createdAt, requestId: input.requestId }
      audit.push(entry)
      return { status: 'created' as const, resource, audit: entry }
    },
    async transitionManagement(input) {
      if (!resource) return { status: 'not_found' as const, audit: { auditId: 'audit-missing', actorId: input.actorId, action: 'transition' as const, targetId: input.itemId, outcome: 'unavailable' as const, revisionBefore: null, revisionAfter: null, occurredAt: new Date(), requestId: input.requestId } }
      const entry = { auditId: `audit-${audit.length + 1}`, actorId: input.actorId, action: 'transition' as const, targetId: resource.id, outcome: input.expectedRevision === resource.revision ? 'accepted' as const : 'conflict' as const, revisionBefore: resource.revision, revisionAfter: resource.revision, occurredAt: new Date(), requestId: input.requestId }
      audit.push(entry)
      if (input.expectedRevision !== resource.revision) return { status: 'stale' as const, resource, audit: entry }
      resource = { ...resource, status: input.status, revision: resource.revision + 1, updatedAt: new Date() }
      entry.revisionAfter = resource.revision
      return { status: 'transitioned' as const, resource, audit: entry }
    },
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
