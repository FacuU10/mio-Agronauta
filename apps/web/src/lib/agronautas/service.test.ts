import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgronautasApiService, createAgronautasMockService } from './service'
import { fieldGeometryResponseSchema, fieldGeometryUpdateSchema } from './schemas'

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
    assert.deepEqual(await service.getFieldGeometry('field-demo-1'), fieldGeometryResponseSchema.parse(savedGeometry))
    assert.deepEqual(await service.updateFieldGeometry('field-demo-1', { polygonWkt: savedGeometry.polygonWkt, expectedUpdatedAt: savedGeometry.updatedAt }), savedGeometry)
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
  const initial = await service.getFieldGeometry('field-demo-1')
  assert.equal(initial.status, 'point_only')
  assert.equal(initial.source, 'fallback')

  const updated = await service.updateFieldGeometry('field-demo-1', {
    polygonWkt: 'POLYGON((-58.08 -29.18,-58.07 -29.18,-58.07 -29.19,-58.08 -29.18))',
  })
  assert.equal(updated.status, 'saved')
  assert.equal(updated.source, 'operator')
  assert.equal(updated.hectares, 1)
  assert.equal((await service.getFieldGeometry('field-demo-1')).polygonWkt, updated.polygonWkt)
})
