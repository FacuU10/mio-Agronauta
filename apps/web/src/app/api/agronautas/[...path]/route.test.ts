import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

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
        cookie: sessionCookie(),
        'x-request-id': 'request-id',
        'x-revision-id': 'revision-id',
      },
    })
    const response = await GET(request, { params: Promise.resolve({ path: ['runtime'] }) })

    assert.equal(calls[0]?.headers.get('authorization'), 'Bearer signed-access-token')
    assert.ok(calls[0]?.headers.get('x-agronautas-bff-assertion'))
    assert.equal(calls[0]?.headers.get('cookie'), null)
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

test('Agronautas BFF never falls back to the removed operator token and fails closed without its server credential', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  const previousLegacyToken = process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR']
  const calls: Array<{ headers: Headers }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR'] = 'legacy-operator-token'
  globalThis.fetch = (async (_url, init) => {
    calls.push({ headers: new Headers(init?.headers) })
    return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/runtime', {
      headers: { authorization: 'Bearer browser-token', cookie: 'session=browser-cookie' },
    })
    const response = await GET(request, { params: Promise.resolve({ path: ['runtime'] }) })

    assert.equal(calls[0]?.headers.get('authorization') ?? null, null)
    assert.equal(calls[0]?.headers.get('cookie') ?? null, null)
    assert.equal(response.status, 503)
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
    if (previousLegacyToken === undefined) delete process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR']
    else process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR'] = previousLegacyToken
  }
})

test('Agronautas BFF forwards the explicit demo query to the internal API', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  const calls: string[] = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal/'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-token'
  globalThis.fetch = (async (url) => {
    calls.push(String(url))
    return new Response('{"fieldId":"field-demo-1"}', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/fields/field-demo-1?mode=demo', { headers: { cookie: sessionCookie() } })
    const response = await GET(request, { params: Promise.resolve({ path: ['fields', 'field-demo-1'] }) })

    assert.equal(response.status, 200)
    assert.equal(calls[0], 'https://api.internal/agronautas/fields/field-demo-1?mode=demo')
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

test('Agronautas BFF preserves upstream error bodies, status semantics, retry timing, and request IDs', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-token'
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
       headers: { 'content-type': 'application/json', cookie: sessionCookie(), 'x-request-id': 'agronautas-bff-429' },
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
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

test('Agronautas BFF returns a retryable structured unavailable outcome when upstream fetch fails', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-token'
  globalThis.fetch = (async () => { throw new Error('connect ECONNREFUSED') }) as typeof fetch

  try {
     const request = new NextRequest('https://web.local/api/agronautas/runtime', { headers: { cookie: sessionCookie(), 'x-request-id': 'agronautas-bff-fetch-fail' } })
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
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

test('Agronautas BFF returns a truthful retryable timeout outcome without upstream details', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousTimeout = process.env['AGRONAUTAS_BFF_TIMEOUT_MS']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] = '1'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-token'
  globalThis.fetch = (async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('request timed out', 'AbortError')), { once: true })
  })) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/runtime', { headers: { cookie: sessionCookie(), 'x-request-id': 'agronautas-bff-timeout' } })
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
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

function sessionCookie(): string {
  return `agronautas_session=${Buffer.from(JSON.stringify({
    accessToken: 'signed-access-token', refreshToken: 'signed-refresh-token',
    accessExpiresAt: '2026-09-15T15:00:00.000Z', refreshExpiresAt: '2026-10-15T15:00:00.000Z',
    principal: {
      actorId: 'user-1', sessionId: 'session-1', membershipId: 'membership-1', workspaceId: 'workspace-1',
      workspaceKey: 'agronautas-pilot', role: 'operator', scopes: ['read', 'write'], expiresAt: '2026-09-15T15:00:00.000Z',
    },
  })).toString('base64url')}`
}

test('Agronautas BFF turns login into an HttpOnly server session and never returns bearer tokens to the browser', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  const calls: Array<{ headers: Headers; body?: string }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-secret-for-bff-tests-1234567890'
  globalThis.fetch = (async (_url, init) => {
    calls.push({ headers: new Headers(init?.headers), body: init?.body as string | undefined })
    return new Response(JSON.stringify({
      accessToken: 'signed-access-token',
      refreshToken: 'signed-refresh-token',
      accessExpiresAt: '2026-09-15T15:00:00.000Z',
      refreshExpiresAt: '2026-10-15T15:00:00.000Z',
      principal: {
        actorId: 'user-1', sessionId: 'session-1', membershipId: 'membership-1',
        workspaceId: 'workspace-1', workspaceKey: 'agronautas-pilot', role: 'operator',
        scopes: ['read', 'write'], expiresAt: '2026-09-15T15:00:00.000Z',
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/auth/login', {
      method: 'POST',
      headers: { authorization: 'Bearer browser-token', cookie: 'session=browser-cookie', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'member@example.test', password: 'password-123' }),
    })
    const response = await (await import('./route')).POST(request, { params: Promise.resolve({ path: ['auth', 'login'] }) })
    const json = await response.json() as Record<string, unknown>

    assert.equal(response.status, 200)
    assert.equal(calls[0]?.headers.get('authorization'), 'Bearer server-secret-for-bff-tests-1234567890')
    assert.ok(calls[0]?.headers.get('x-agronautas-bff-assertion'))
    assert.equal(calls[0]?.headers.get('cookie'), null)
    assert.equal(calls[0]?.headers.get('authorization')?.includes('browser-token'), false)
    assert.equal('accessToken' in json, false)
    assert.equal('refreshToken' in json, false)
    assert.equal((json['principal'] as { actorId: string }).actorId, 'user-1')
    assert.match(response.headers.get('set-cookie') ?? '', /agronautas_session=/)
    assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly/i)
    assert.match(response.headers.get('set-cookie') ?? '', /SameSite=Lax/i)
    const sessionCookie = response.cookies.get('agronautas_session')
    assert.equal(sessionCookie?.httpOnly, true)
    assert.equal(sessionCookie?.path, '/')
    assert.equal(sessionCookie?.sameSite, 'lax')
    assert.equal(sessionCookie?.secure, true)
    assert.ok((sessionCookie?.maxAge ?? 0) > 0)
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

test('Agronautas BFF uses only the HttpOnly session for protected requests and sends a signed principal assertion', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  const calls: Array<{ headers: Headers }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-secret-for-bff-tests-1234567890'
  globalThis.fetch = (async (_url, init) => {
    calls.push({ headers: new Headers(init?.headers) })
    return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const session = Buffer.from(JSON.stringify({
      accessToken: 'signed-access-token', refreshToken: 'signed-refresh-token',
      accessExpiresAt: '2026-09-15T15:00:00.000Z', refreshExpiresAt: '2026-10-15T15:00:00.000Z',
      principal: {
        actorId: 'user-1', sessionId: 'session-1', membershipId: 'membership-1', workspaceId: 'workspace-1',
        workspaceKey: 'agronautas-pilot', role: 'operator', scopes: ['read', 'write'], expiresAt: '2026-09-15T15:00:00.000Z',
      },
    })).toString('base64url')
    const request = new NextRequest('https://web.local/api/agronautas/runtime', {
      headers: {
        authorization: 'Bearer browser-token',
        cookie: `agronautas_session=${session}`,
      },
    })
    const response = await GET(request, { params: Promise.resolve({ path: ['runtime'] }) })

    assert.equal(response.status, 200)
    assert.equal(calls[0]?.headers.get('authorization'), 'Bearer signed-access-token')
    assert.ok(calls[0]?.headers.get('x-agronautas-bff-assertion'))
    assert.equal(calls[0]?.headers.get('cookie'), null)
    assert.equal(calls[0]?.headers.get('authorization')?.includes('browser-token'), false)
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

test('Agronautas BFF emits a browser-replayable local session cookie and preserves protected authorization', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  const calls: Array<{ headers: Headers }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-secret-for-bff-tests-1234567890'
  globalThis.fetch = (async (_url, init) => {
    const headers = new Headers(init?.headers)
    calls.push({ headers })
    if (calls.length === 1) {
      return new Response(JSON.stringify({
        accessToken: 'signed-access-token',
        refreshToken: 'signed-refresh-token',
        accessExpiresAt: '2030-09-15T15:00:00.000Z',
        refreshExpiresAt: '2030-10-15T15:00:00.000Z',
        principal: {
          actorId: 'member-1', sessionId: 'session-1', membershipId: 'membership-1',
          workspaceId: 'workspace-1', workspaceKey: 'agronautas-pilot', role: 'reader',
          scopes: ['read'], expiresAt: '2030-09-15T15:00:00.000Z',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      contractVersion: '1.0.0',
      code: 'FORBIDDEN',
      message: 'Workspace membership or workspace does not permit this request',
      retryable: false,
    }), { status: 403, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const loginResponse = await (await import('./route')).POST(new NextRequest('http://127.0.0.1/api/agronautas/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'member@example.test', password: 'password-123' }),
    }), { params: Promise.resolve({ path: ['auth', 'login'] }) })
    const setCookie = loginResponse.headers.get('set-cookie') ?? ''

    assert.doesNotMatch(setCookie, /;\s*Secure/i)
    const browserCookie = setCookie.split(';', 1)[0] ?? ''
    const forbiddenResponse = await GET(new NextRequest('http://127.0.0.1/api/agronautas/workspace/fields?workspaceId=workspace-2', {
      headers: { cookie: browserCookie },
    }), { params: Promise.resolve({ path: ['workspace', 'fields'] }) })

    assert.equal(forbiddenResponse.status, 403)
    assert.equal(calls[1]?.headers.get('authorization'), 'Bearer signed-access-token')
    assert.ok(calls[1]?.headers.get('x-agronautas-bff-assertion'))
    assert.equal(calls[1]?.headers.get('cookie'), null)
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

test('Agronautas BFF returns unauthorized without a session instead of claiming server maintenance', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  const calls: string[] = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-secret-for-bff-tests-1234567890'
  globalThis.fetch = (async (url) => {
    calls.push(String(url))
    return new Response('{}', { status: 200 })
  }) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/auth/status')
    const response = await GET(request, { params: Promise.resolve({ path: ['auth', 'status'] }) })
    const body = await response.json() as { code: string; retryable: boolean; message: string }
    assert.equal(response.status, 401)
    assert.equal(body.code, 'UNAUTHORIZED')
    assert.equal(body.retryable, false)
    assert.match(body.message, /sesión|session/i)
    assert.deepEqual(calls, [])
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

test('Agronautas BFF exposes public readiness for the maintenance page without a browser session', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  const calls: Array<{ headers: Headers }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-secret-for-readiness-tests-1234567890'
  globalThis.fetch = (async (_url, init) => {
    calls.push({ headers: new Headers(init?.headers) })
    return new Response(JSON.stringify({
      ready: false,
      maintenance: { enabled: true, reason: 'maintenance_mode' },
    }), { status: 503, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/ready', {
      headers: { authorization: 'Bearer browser-token', cookie: 'agronautas_session=browser-cookie' },
    })
    const response = await GET(request, { params: Promise.resolve({ path: ['ready'] }) })

    assert.equal(response.status, 503)
    assert.equal(calls[0]?.headers.get('authorization'), 'Bearer server-secret-for-readiness-tests-1234567890')
    assert.equal(calls[0]?.headers.get('cookie'), null)
    assert.equal(calls[0]?.headers.get('x-agronautas-bff-assertion')?.includes('browser-token'), false)
    assert.deepEqual(await response.json(), { ready: false, maintenance: { enabled: true, reason: 'maintenance_mode' } })
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})

test('Agronautas BFF sends JSON content type for the synthesized refresh payload', async () => {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']
  const previousToken = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
  const calls: Array<{ headers: Headers; body?: string }> = []
  process.env['AGRONAUTAS_API_INTERNAL_URL'] = 'https://api.internal'
  process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = 'server-token'
  globalThis.fetch = (async (_url, init) => {
    calls.push({
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? init.body : undefined,
    })
    return new Response(JSON.stringify({ code: 'INVALID_CONTRACT' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const request = new NextRequest('https://web.local/api/agronautas/auth/refresh', {
      method: 'POST',
      headers: { cookie: sessionCookie() },
    })
    const response = await POST(request, { params: Promise.resolve({ path: ['auth', 'refresh'] }) })

    assert.equal(response.status, 400)
    assert.equal(calls[0]?.headers.get('content-type'), 'application/json')
    assert.deepEqual(JSON.parse(calls[0]?.body ?? '{}'), { refreshToken: 'signed-refresh-token' })
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env['AGRONAUTAS_API_INTERNAL_URL']
    else process.env['AGRONAUTAS_API_INTERNAL_URL'] = previousUrl
    if (previousToken === undefined) delete process.env['AGRONAUTAS_BFF_BEARER_TOKEN']
    else process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] = previousToken
  }
})
