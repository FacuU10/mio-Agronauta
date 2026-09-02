import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET } from './route'

test('Agronautas BFF forwards only server bearer credentials and preserves request/revision IDs', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  const calls: Array<{ headers: Headers }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = ' server-token '
  globalThis.fetch = (async (_url, init) => {
    calls.push({ headers: new Headers(init?.headers) })
    return new Response('{"ok":true}', {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'upstream-request-id',
        'x-revision-id': 'upstream-revision-id',
      },
    })
  }) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/runtime', {
      headers: {
        authorization: 'Bearer browser-token',
        'x-request-id': 'request-id',
        'x-revision-id': 'revision-id',
      },
    })
    const response = await GET(request, { params: Promise.resolve({ path: ['runtime'] }) })

    assert.equal(calls[0]?.headers.get('authorization'), 'Bearer server-token')
    assert.equal(calls[0]?.headers.get('x-request-id'), 'request-id')
    assert.equal(calls[0]?.headers.get('x-revision-id'), 'revision-id')
    assert.equal(calls[0]?.headers.get('authorization')?.includes('browser-token'), false)
    assert.equal(response.headers.get('x-request-id'), 'upstream-request-id')
    assert.equal(response.headers.get('x-revision-id'), 'upstream-revision-id')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), { ok: true })
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

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

test('Agronautas BFF preserves upstream error bodies, status semantics, retry timing, and request IDs', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  globalThis.fetch = (async () => new Response(JSON.stringify({
    contractVersion: '1.0.0',
    code: 'RATE_LIMITED',
    message: 'Try again later',
    retryable: true,
    details: { retryAfterMs: 7000 },
  }), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '7' } })) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/fields/field-1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-request-id': 'agronautas-bff-429' },
      body: '{}',
    })
    const response = await (await import('./route')).POST(request, { params: Promise.resolve({ path: ['fields', 'field-1', 'chat'] }) })

    assert.equal(response.status, 429)
    assert.equal(response.headers.get('x-request-id'), 'agronautas-bff-429')
    assert.equal(response.headers.get('retry-after'), '7')
    assert.equal(response.headers.get('content-type'), 'application/json')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), {
      contractVersion: '1.0.0',
      code: 'RATE_LIMITED',
      message: 'Try again later',
      retryable: true,
      details: { retryAfterMs: 7000 },
    })
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})

test('Agronautas BFF returns a retryable structured unavailable outcome when upstream fetch fails', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  globalThis.fetch = (async () => { throw new Error('connect ECONNREFUSED') }) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/runtime', { headers: { 'x-request-id': 'agronautas-bff-fetch-fail' } })
    const response = await GET(request, { params: Promise.resolve({ path: ['runtime'] }) })

    assert.equal(response.status, 502)
    assert.equal(response.headers.get('x-request-id'), 'agronautas-bff-fetch-fail')
    const json = await response.json() as { code: string; retryable: boolean; details: { requestId: string; phase: string } }
    assert.equal(json.code, 'AGRONAUTAS_BFF_UPSTREAM_UNAVAILABLE')
    assert.equal(json.retryable, true)
    assert.deepEqual(json.details, { requestId: 'agronautas-bff-fetch-fail', phase: 'upstream_fetch' })
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
  }
})

test('Agronautas BFF returns a truthful retryable timeout outcome without upstream details', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousTimeout = process.env['AGRONAUTAS_BFF_TIMEOUT_MS']
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] = '1'
  globalThis.fetch = (async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('request timed out', 'AbortError')), { once: true })
  })) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/runtime', { headers: { 'x-request-id': 'agronautas-bff-timeout' } })
    const response = await GET(request, { params: Promise.resolve({ path: ['runtime'] }) })

    assert.equal(response.status, 503)
    assert.equal(response.headers.get('x-request-id'), 'agronautas-bff-timeout')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    const json = await response.json() as { code: string; message: string; retryable: boolean; details: Record<string, unknown> }
    assert.equal(json.code, 'AGRONAUTAS_BFF_UPSTREAM_UNAVAILABLE')
    assert.equal(json.message, 'Agronautas upstream request timed out.')
    assert.equal(json.retryable, true)
    assert.deepEqual(json.details, { requestId: 'agronautas-bff-timeout', phase: 'upstream_timeout' })
    assert.doesNotMatch(JSON.stringify(json), /api\.internal|runtime/i)
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousTimeout === undefined) delete process.env['AGRONAUTAS_BFF_TIMEOUT_MS']
    else process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] = previousTimeout
  }
})
