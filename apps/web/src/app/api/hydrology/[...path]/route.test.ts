import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from './route'
import { upstreamTimeoutMs } from './timeout'

test('hydrology BFF uses a finite cold-start-aware timeout with an explicit cap', async () => {
  const previous = process.env['AGRONAUTAS_BFF_TIMEOUT_MS']
  try {
    delete process.env['AGRONAUTAS_BFF_TIMEOUT_MS']
    assert.equal(upstreamTimeoutMs(), 120_000)
    process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] = '999999'
    assert.equal(upstreamTimeoutMs(), 150_000)
    process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] = '90000'
    assert.equal(upstreamTimeoutMs(), 90_000)
  } finally {
    if (previous === undefined) delete process.env['AGRONAUTAS_BFF_TIMEOUT_MS']
    else process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] = previous
  }
})

test('hydrology BFF forwards the token to verify only and preserves no-store response semantics', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const token = crypto.randomUUID()
  const calls: Array<{ url: string; init?: RequestInit }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ contractVersion: '1.0.0', authorized: true }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const request = new NextRequest('http://web.local/api/hydrology/ingest/verify', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hydrology-ingest-token': token }, body: '{}' })
    const response = await POST(request, { params: Promise.resolve({ path: ['ingest', 'verify'] }) })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(calls[0]?.url, 'https://api.internal/api/hydrology/ingest/verify')
    assert.equal(calls[0]?.init?.method, 'POST')
    assert.equal(calls[0]?.init?.body, '{}')
    assert.equal((calls[0]?.init?.headers as Headers).get('x-hydrology-ingest-token'), token)
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})

test('hydrology BFF never forwards the token for a protected-looking non-POST request', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const token = crypto.randomUUID()
  const calls: Array<{ init?: RequestInit }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  globalThis.fetch = (async (_url, init) => {
    calls.push({ init })
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const request = new NextRequest('http://web.local/api/hydrology/ingest/verify', { method: 'PUT', headers: { 'x-hydrology-ingest-token': token }, body: '{}' })
    const response = await PUT(request, { params: Promise.resolve({ path: ['ingest', 'verify'] }) })
    assert.equal(response.status, 200)
    assert.equal((calls[0]?.init?.headers as Headers).get('x-hydrology-ingest-token'), null)
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})

test('hydrology BFF proxies GET preserving status and content-type', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const ingestToken = crypto.randomUUID()
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ contractVersion: 'hydrology-government-municipalities-v1', municipalities: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const request = new NextRequest('http://web.local/api/hydrology/municipalities?province=AR-W', { headers: { accept: 'application/json', 'x-request-id': 'req-1', 'x-hydrology-ingest-token': ingestToken } })
    const response = await GET(request, { params: Promise.resolve({ path: ['municipalities'] }) })

    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type') ?? '', /application\/json/)
    assert.equal(calls[0]?.url, 'https://api.internal/api/hydrology/municipalities?province=AR-W')
    assert.equal(calls[0]?.init?.method, 'GET')
    assert.equal((calls[0]?.init?.headers as Headers).get('x-request-id'), 'req-1')
    assert.equal((calls[0]?.init?.headers as Headers).get('x-hydrology-ingest-token'), null)
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
  const previousInfo = console.info
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const logs: string[] = []
  const ingestToken = crypto.randomUUID()
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal/'
  console.info = (...args: unknown[]) => { logs.push(args.map(String).join(' ')) }
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ contractVersion: 'hydrology-government-ingest-v1', status: 'partial', requestedSources: ['PNA', 'SMN'], results: [] }), { status: 202, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }) as typeof fetch
  try {
    const body = JSON.stringify({ contractVersion: '1.0.0', source: 'PNA' })
    const request = new NextRequest('http://web.local/api/hydrology/ingest', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hydrology-ingest-token': ingestToken }, body })
    const response = await POST(request, { params: Promise.resolve({ path: ['ingest'] }) })

    assert.equal(response.status, 202)
    assert.match(response.headers.get('content-type') ?? '', /application\/json/)
    assert.equal(calls[0]?.url, 'https://api.internal/api/hydrology/ingest')
    assert.equal(calls[0]?.init?.method, 'POST')
    assert.equal(calls[0]?.init?.body, body)
    assert.equal((calls[0]?.init?.headers as Headers).get('content-type'), 'application/json')
    assert.equal((calls[0]?.init?.headers as Headers).get('x-hydrology-ingest-token'), ingestToken)
    assert.equal(logs.some((entry) => entry.includes(ingestToken)), false)
    assert.equal(logs.some((entry) => entry.includes('x-hydrology-ingest-token')), false)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  } finally {
    globalThis.fetch = previousFetch
    console.info = previousInfo
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})

test('hydrology BFF rejects canonical ingest without a token before fetch', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  let fetchCalled = false
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  globalThis.fetch = (async () => { fetchCalled = true; throw new Error('should not fetch') }) as typeof fetch
  try {
    const request = new NextRequest('http://web.local/api/hydrology/ingest', { method: 'POST', headers: { 'x-request-id': 'missing-ingest-token' } })
    const response = await POST(request, { params: Promise.resolve({ path: ['ingest'] }) })

    assert.equal(response.status, 401)
    assert.equal(fetchCalled, false)
    assert.equal(response.headers.get('x-request-id'), 'missing-ingest-token')
    const json = await response.json()
    assert.equal(json.code, 'HYDROLOGY_BFF_INGEST_TOKEN_REQUIRED')
    assert.equal(json.details.phase, 'request_validation')
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})

test('hydrology BFF does not forward the ingest token to a noncanonical path', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const ingestToken = crypto.randomUUID()
  const calls: Array<{ url: string; init?: RequestInit }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const request = new NextRequest('http://web.local/api/hydrology/municipalities', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hydrology-ingest-token': ingestToken }, body: '{}' })
    const response = await POST(request, { params: Promise.resolve({ path: ['municipalities'] }) })

    assert.equal(response.status, 200)
    assert.equal(calls.length, 1)
    assert.equal((calls[0]?.init?.headers as Headers).get('x-hydrology-ingest-token'), null)
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})

test('hydrology BFF rejects missing production upstream before fetch', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const env = process.env as Record<string, string | undefined>
  const previousNodeEnv = env['NODE_ENV']
  let fetchCalled = false
  env['NODE_ENV'] = 'production'
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
    if (previousNodeEnv === undefined) delete env['NODE_ENV']
    else env['NODE_ENV'] = previousNodeEnv
  }
})

test('hydrology BFF rejects localhost production upstream', async () => {
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const env = process.env as Record<string, string | undefined>
  const previousNodeEnv = env['NODE_ENV']
  env['NODE_ENV'] = 'production'
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
    if (previousNodeEnv === undefined) delete env['NODE_ENV']
    else env['NODE_ENV'] = previousNodeEnv
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

test('hydrology BFF sanitizes timeout details for clients while retaining safe server observability', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousTimeout = process.env['AGRONAUTAS_BFF_TIMEOUT_MS']
  const previousError = console.error
  const logs: string[] = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] = '1'
  console.error = (...args: unknown[]) => {
    logs.push(args.map((entry) => typeof entry === 'string' ? entry : JSON.stringify(entry)).join(' '))
  }
  globalThis.fetch = (async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('request timed out', 'AbortError')), { once: true })
  })) as typeof fetch
  try {
    const request = new NextRequest('http://web.local/api/hydrology/municipalities', { headers: { 'x-request-id': 'upstream-timeout-sanitized' } })
    const response = await GET(request, { params: Promise.resolve({ path: ['municipalities'] }) })

    assert.equal(response.status, 503)
    const json = await response.json() as { details: Record<string, unknown> }
    assert.equal(json.details.phase, 'upstream_timeout')
    assert.equal(json.details.timeoutMs, undefined)
    assert.equal(json.details.upstreamOrigin, undefined)
    assert.equal(json.details.upstreamPath, undefined)
    assert.doesNotMatch(JSON.stringify(json), /api\.internal|municipalities/i)
    assert.match(logs.join('\n'), /https:\/\/api\.internal/)
    assert.match(logs.join('\n'), /\/api\/hydrology\/municipalities/)
  } finally {
    globalThis.fetch = previousFetch
    console.error = previousError
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousTimeout === undefined) delete process.env['AGRONAUTAS_BFF_TIMEOUT_MS']
    else process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] = previousTimeout
  }
})
