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

test('hydrology BFF rejects missing production upstream before fetch', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousNodeEnv = process.env['NODE_ENV']
  let fetchCalled = false
  process.env['NODE_ENV'] = 'production'
  delete process.env['AGRONAUTAS_API_INTERNAL_URL']
  globalThis.fetch = (async () => { fetchCalled = true; throw new Error('should not fetch') }) as typeof fetch
  try {
    const request = new NextRequest('http://web.local/api/hydrology/municipalities', { headers: { 'x-request-id': 'missing-prod-upstream' } })
    const response = await GET(request, { params: Promise.resolve({ path: ['municipalities'] }) })

    assert.equal(response.status, 503)
    assert.equal(fetchCalled, false)
    assert.equal(response.headers.get('x-request-id'), 'missing-prod-upstream')
    const json = await response.json()
    assert.equal(json.code, 'HYDROLOGY_BFF_UPSTREAM_UNAVAILABLE')
    assert.equal(json.details.phase, 'upstream_configuration')
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousNodeEnv === undefined) delete process.env['NODE_ENV']
    else process.env['NODE_ENV'] = previousNodeEnv
  }
})

test('hydrology BFF rejects localhost production upstream', async () => {
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousNodeEnv = process.env['NODE_ENV']
  process.env['NODE_ENV'] = 'production'
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'http://localhost:3001'
  try {
    const request = new NextRequest('http://web.local/api/hydrology/municipalities')
    const response = await GET(request, { params: Promise.resolve({ path: ['municipalities'] }) })

    assert.equal(response.status, 503)
    const json = await response.json()
    assert.equal(json.details.phase, 'upstream_configuration')
  } finally {
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousNodeEnv === undefined) delete process.env['NODE_ENV']
    else process.env['NODE_ENV'] = previousNodeEnv
  }
})

test('hydrology BFF returns structured 502 when upstream fetch throws', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  globalThis.fetch = (async () => { throw new Error('connect ECONNREFUSED') }) as typeof fetch
  try {
    const request = new NextRequest('http://web.local/api/hydrology/municipalities', { headers: { 'x-request-id': 'upstream-fetch-fail' } })
    const response = await GET(request, { params: Promise.resolve({ path: ['municipalities'] }) })

    assert.equal(response.status, 502)
    assert.equal(response.headers.get('x-request-id'), 'upstream-fetch-fail')
    const json = await response.json()
    assert.equal(json.code, 'HYDROLOGY_BFF_UPSTREAM_UNAVAILABLE')
    assert.equal(json.details.phase, 'upstream_fetch')
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})
