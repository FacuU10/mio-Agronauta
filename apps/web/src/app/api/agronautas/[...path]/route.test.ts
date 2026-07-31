import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET } from './route'

test('Agronautas BFF forwards the explicit demo query to the internal API', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const calls: string[] = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal/'
  globalThis.fetch = (async (url) => {
    calls.push(String(url))
    return new Response('{"fieldId":"field-demo-1"}', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/fields/field-demo-1?mode=demo')
    const response = await GET(request, { params: Promise.resolve({ path: ['fields', 'field-demo-1'] }) })

    assert.equal(response.status, 200)
    assert.equal(calls[0], 'https://api.internal/agronautas/fields/field-demo-1?mode=demo')
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})
