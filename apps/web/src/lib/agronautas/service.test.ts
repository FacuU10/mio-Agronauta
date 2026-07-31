import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgronautasApiService } from './service'

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
