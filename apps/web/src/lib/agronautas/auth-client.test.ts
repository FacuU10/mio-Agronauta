import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError } from '@/lib/api-client'
import { createAgronautasAuthClient, normalizeAgronautasAuthClientError } from './auth-client'

const publicSession = {
  principal: {
    actorId: 'operator-1',
    sessionId: 'session-1',
    membershipId: 'membership-1',
    workspaceId: 'workspace-1',
    workspaceKey: 'agronautas-pilot',
    role: 'operator',
    scopes: ['read', 'write'],
    expiresAt: '2026-09-15T15:00:00.000Z',
  },
  accessExpiresAt: '2026-09-15T15:00:00.000Z',
  refreshExpiresAt: '2026-10-15T15:00:00.000Z',
}

test('Agronautas auth client uses same-origin BFF calls and never accepts browser bearer material', async () => {
  const previousFetch = globalThis.fetch
  const calls: Array<{ url: string; init: RequestInit }> = []
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} })
    return new Response(JSON.stringify(publicSession), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const session = await createAgronautasAuthClient().login({ email: 'operator@example.test', password: 'operator-password' })
    assert.equal(session.principal.workspaceId, 'workspace-1')
    assert.equal(calls[0]?.url, '/api/agronautas/auth/login')
    assert.equal(calls[0]?.init.credentials, 'same-origin')
    assert.equal(new Headers(calls[0]?.init.headers).get('authorization'), null)
    assert.equal(new Headers(calls[0]?.init.headers).get('cookie'), null)
    assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { email: 'operator@example.test', password: 'operator-password' })
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Agronautas auth client refresh is server-managed and preserves replay/maintenance semantics', async () => {
  const previousFetch = globalThis.fetch
  const responses = [
    new Response(JSON.stringify(publicSession), { status: 200, headers: { 'content-type': 'application/json' } }),
    new Response(JSON.stringify({ contractVersion: '1.0.0', code: 'REFRESH_REPLAY', message: 'Refresh family revoked', retryable: false }), { status: 409, headers: { 'content-type': 'application/json' } }),
  ]
  const calls: Array<{ url: string; init: RequestInit }> = []
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} })
    return responses.shift() ?? new Response(null, { status: 503 })
  }) as typeof fetch

  try {
    const client = createAgronautasAuthClient()
    const refreshed = await client.refresh()
    assert.equal(refreshed.principal.actorId, 'operator-1')
    await assert.rejects(() => client.refresh(), (error: unknown) => error instanceof ApiError && error.status === 409 && error.code === 'REFRESH_REPLAY')
    assert.equal(calls[0]?.url, '/api/agronautas/auth/refresh')
    assert.equal(calls[0]?.init.credentials, 'same-origin')
    assert.equal(calls[0]?.init.body, undefined)
    assert.equal(new Headers(calls[0]?.init.headers).get('authorization'), null)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Agronautas auth client maps security boundaries to truthful visible states', () => {
  assert.equal(normalizeAgronautasAuthClientError(new ApiError(401, 'Missing session')).state, 'unauthorized')
  assert.equal(normalizeAgronautasAuthClientError(new ApiError(403, 'Forbidden')).state, 'forbidden')
  assert.equal(normalizeAgronautasAuthClientError(new ApiError(409, 'Replay', undefined, undefined, 'REFRESH_REPLAY')).state, 'recovery')
  assert.equal(normalizeAgronautasAuthClientError(new ApiError(503, 'Maintenance', undefined, undefined, 'AUTH_MAINTENANCE')).state, 'maintenance')
})
