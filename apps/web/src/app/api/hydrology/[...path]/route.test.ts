import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

test('hydrology BFF proxies GET preserving status and content-type', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const calls: Array<{ url: string; init?: RequestInit }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ contractVersion: 'hydrology-government-municipalities-v1', municipalities: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const request = new NextRequest('http://web.local/api/hydrology/municipalities?province=AR-W', { headers: { accept: 'application/json', 'x-request-id': 'req-1' } })
    const response = await GET(request, { params: Promise.resolve({ path: ['municipalities'] }) })

    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type') ?? '', /application\/json/)
    assert.equal(calls[0]?.url, 'https://api.internal/api/hydrology/municipalities?province=AR-W')
    assert.equal(calls[0]?.init?.method, 'GET')
    assert.equal((calls[0]?.init?.headers as Headers).get('x-request-id'), 'req-1')
    assert.deepEqual(await response.json(), { contractVersion: 'hydrology-government-municipalities-v1', municipalities: [] })
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})

test('hydrology BFF proxies POST ingest preserving body, status and content-type', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const calls: Array<{ url: string; init?: RequestInit }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal/'
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ contractVersion: 'hydrology-government-ingest-v1', status: 'partial', requestedSources: ['PNA', 'SMN'], results: [] }), { status: 202, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }) as typeof fetch
  try {
    const body = JSON.stringify({ contractVersion: '1.0.0', source: 'PNA' })
    const request = new NextRequest('http://web.local/api/hydrology/ingest', { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    const response = await POST(request, { params: Promise.resolve({ path: ['ingest'] }) })

    assert.equal(response.status, 202)
    assert.match(response.headers.get('content-type') ?? '', /application\/json/)
    assert.equal(calls[0]?.url, 'https://api.internal/api/hydrology/ingest')
    assert.equal(calls[0]?.init?.method, 'POST')
    assert.equal(calls[0]?.init?.body, body)
    assert.equal((calls[0]?.init?.headers as Headers).get('content-type'), 'application/json')
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})
