import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgronautasApiService, createAgronautasMockService, normalizeAgronautasServiceError } from './service'
import { fieldGeometryResponseSchema, fieldGeometryUpdateSchema, runtimeInfoSchema } from './schemas'

test('canonical Agronautas demo service adds mode=demo to field detail requests', async () => {
  const previousFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (input) => {
    calls.push(String(input))
    return new Response(JSON.stringify({
      fieldId: 'field-demo-1',
      externalFieldId: 'field-demo-1',
      crop: 'rice',
      hectares: 42.5,
      locality: 'Mercedes',
      provinceCode: 'AR-W',
      centroid: { lat: -29.1846, lng: -58.0759 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    await createAgronautasApiService({ mode: 'demo' }).getField('field-demo-1')
    assert.equal(calls[0], '/api/agronautas/v1/fields/field-demo-1?mode=demo')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('geometry service reads and updates the authenticated field contract without leaking configuration', async () => {
  const previousFetch = globalThis.fetch
  const calls: Array<{ url: string; method: string; body?: string }> = []
  const savedGeometry = {
    fieldId: 'field-demo-1',
    polygonWkt: 'POLYGON((-58.08 -29.18,-58.07 -29.18,-58.07 -29.19,-58.08 -29.18))',
    centroid: { lat: -29.1833, lng: -58.0767 },
    areaM2: 10000,
    hectares: 1,
    perimeterM: 400,
    status: 'saved' as const,
    source: 'operator' as const,
    updatedAt: '2026-08-12T12:00:00.000Z',
  }
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : undefined })
    return new Response(JSON.stringify(savedGeometry), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const service = createAgronautasApiService({ mode: 'demo' })
    const getFieldGeometry = service.getFieldGeometry
    const updateFieldGeometry = service.updateFieldGeometry
    assert.ok(getFieldGeometry)
    assert.ok(updateFieldGeometry)
    assert.deepEqual(await getFieldGeometry('field-demo-1'), fieldGeometryResponseSchema.parse(savedGeometry))
    assert.deepEqual(await updateFieldGeometry('field-demo-1', { polygonWkt: savedGeometry.polygonWkt, expectedUpdatedAt: savedGeometry.updatedAt }), savedGeometry)
    assert.equal(calls[0]?.url, '/api/agronautas/v1/fields/field-demo-1/geometry?mode=demo')
    assert.equal(calls[1]?.method, 'PATCH')
    assert.deepEqual(JSON.parse(calls[1]?.body ?? '{}'), fieldGeometryUpdateSchema.parse({ polygonWkt: savedGeometry.polygonWkt, expectedUpdatedAt: savedGeometry.updatedAt }))
    assert.ok(calls.every((call) => !call.url.includes('GOOGLE') && !call.body?.includes('API_KEY')))
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('mock geometry service preserves a point-only fallback and updates deterministic polygon metrics', async () => {
  const service = createAgronautasMockService()
  const getFieldGeometry = service.getFieldGeometry
  const updateFieldGeometry = service.updateFieldGeometry
  assert.ok(getFieldGeometry)
  assert.ok(updateFieldGeometry)
  const initial = await getFieldGeometry('field-demo-1')
  assert.equal(initial.status, 'point_only')
  assert.equal(initial.source, 'fallback')

  const updated = await updateFieldGeometry('field-demo-1', {
    polygonWkt: 'POLYGON((-58.08 -29.18,-58.07 -29.18,-58.07 -29.19,-58.08 -29.18))',
  })
  assert.equal(updated.status, 'saved')
  assert.equal(updated.source, 'operator')
  assert.equal(updated.hectares, 1)
  assert.equal((await getFieldGeometry('field-demo-1')).polygonWkt, updated.polygonWkt)
})

test('management service reads workspace context, cursor fields, and source-backed activity', async () => {
  const previousFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (input) => {
    calls.push(String(input))
    const url = String(input)
    const payload = url.includes('/workspace/fields')
      ? { contractVersion: 'agronautas-workspace-fields-v1', workspaceId: 'agronautas-default-workspace', items: [], nextCursor: null }
      : url.includes('/activity')
        ? { contractVersion: 'agronautas-activity-v1', fieldId: 'field-1', items: [{ activityId: 'risk_snapshot:snap-1', sourceType: 'risk_snapshot', sourceId: 'snap-1', occurredAt: '2026-08-13T10:00:00.000Z', title: 'Risk snapshot persisted' }] }
        : { contractVersion: 'agronautas-management-v1', workspaceId: 'agronautas-default-workspace', name: 'Agronautas', status: 'active', fieldCount: 0, createdAt: '2026-08-13T10:00:00.000Z', updatedAt: '2026-08-13T10:00:00.000Z' }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const service = createAgronautasApiService()
    assert.equal((await service.getWorkspace()).workspaceId, 'agronautas-default-workspace')
    assert.equal((await service.listWorkspaceFields('agronautas-default-workspace')).items.length, 0)
    assert.equal((await service.getFieldActivity('field-1')).items[0]?.sourceType, 'risk_snapshot')
    assert.deepEqual(calls, ['/api/agronautas/v1/workspace', '/api/agronautas/v1/workspace/fields?workspaceId=agronautas-default-workspace', '/api/agronautas/v1/fields/field-1/activity'])
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('web runtime validator accepts unavailable scheduler status only with its truthful reason', async () => {
  const previousFetch = globalThis.fetch
  const payload = {
    mode: 'real',
    routePrefix: '/agronautas/v1',
    compatibilityPrefix: '/agronautas',
    contractVersion: '1.0.0',
    scheduler: {
      enabled: false,
      status: 'unavailable',
      reason: 'scheduler_dispatch_capability_not_configured',
    },
    worker: { status: 'unavailable', reason: 'worker_readiness_not_verified' },
  }
  globalThis.fetch = (async () => new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch

  try {
    const runtime = await createAgronautasApiService().getRuntime()
    assert.equal(runtime.scheduler.status, 'unavailable')
    assert.equal(runtime.scheduler.reason, 'scheduler_dispatch_capability_not_configured')
    assert.equal(runtime.scheduler.enabled, false)
    assert.equal(runtimeInfoSchema.safeParse({
      ...runtime,
      scheduler: { enabled: false, status: 'unavailable' },
    }).success, false)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Agronautas service adapter preserves explicit auth, capability and unavailable outcomes', () => {
  for (const [status, outcome] of [[401, 'unauthorized'], [403, 'forbidden'], [404, 'unavailable'], [503, 'unavailable']] as const) {
    const result = normalizeAgronautasServiceError(new Error(`HTTP ${status}`), status)
    assert.equal(result.outcome, outcome)
    assert.equal(result.httpStatus, status)
  }
})

test('Agronautas service keeps an aborted transport retryable for existing consumers', async () => {
  const previousFetch = globalThis.fetch
  const abortError = Object.assign(new Error('request was aborted'), { name: 'AbortError', code: 'ERR_ABORTED' })
  globalThis.fetch = (async () => { throw abortError }) as typeof fetch

  try {
    await assert.rejects(
      () => createAgronautasApiService().getField('field-1'),
      (error: unknown) => {
        const result = normalizeAgronautasServiceError(error)
        assert.equal(result.outcome, 'retryable')
        assert.equal(result.retryable, true)
        assert.equal(result.reason, 'request_aborted')
        assert.equal(result.code, 'ERR_ABORTED')
        return true
      },
    )
  } finally {
    globalThis.fetch = previousFetch
  }
})
