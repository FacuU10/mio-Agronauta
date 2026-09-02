import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, apiClient, apiClientOutcome, resolveApiBaseUrl } from './api-client'

test('browser Agronautas transport uses the same-origin BFF despite NEXT_PUBLIC_API_URL', async () => {
  const previousApiUrl = process.env['NEXT_PUBLIC_API_URL']
  const previousFetch = globalThis.fetch
  const globalRecord = globalThis as unknown as { window?: unknown }
  const previousWindow = globalRecord.window
  let requestedUrl = ''

  process.env['NEXT_PUBLIC_API_URL'] = 'https://agronauta.onrender.com'
  globalRecord.window = {}
  globalThis.fetch = (async (input) => {
    requestedUrl = String(input)
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    assert.equal(resolveApiBaseUrl(), '/api/agronautas/v1')
    await apiClient('/fields/field-demo-1')
    assert.equal(requestedUrl, '/api/agronautas/v1/fields/field-demo-1')
  } finally {
    globalThis.fetch = previousFetch
    if (previousWindow === undefined) delete globalRecord.window
    else globalRecord.window = previousWindow
    if (previousApiUrl === undefined) delete process.env['NEXT_PUBLIC_API_URL']
    else process.env['NEXT_PUBLIC_API_URL'] = previousApiUrl
  }
})

test('server Agronautas transport preserves NEXT_PUBLIC_API_URL', () => {
  const previousApiUrl = process.env['NEXT_PUBLIC_API_URL']
  const globalRecord = globalThis as unknown as { window?: unknown }
  const previousWindow = globalRecord.window
  process.env['NEXT_PUBLIC_API_URL'] = 'https://api.internal///'
  delete globalRecord.window

  try {
    assert.equal(resolveApiBaseUrl(), 'https://api.internal')
  } finally {
    if (previousWindow === undefined) delete globalRecord.window
    else globalRecord.window = previousWindow
    if (previousApiUrl === undefined) delete process.env['NEXT_PUBLIC_API_URL']
    else process.env['NEXT_PUBLIC_API_URL'] = previousApiUrl
  }
})

test('api client exposes typed retryable outcomes for HTTP failures without changing thrown-error compatibility', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({ code: 'RATE_LIMITED', retryAfterMs: 4_000 }), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '4' } })) as typeof fetch

  try {
    const result = await apiClientOutcome('/chat')
    assert.equal(result.outcome, 'retryable')
    assert.equal(result.httpStatus, 429)
    assert.equal(result.retryAfterMs, 4_000)
    await assert.rejects(() => apiClient('/chat'), (error: unknown) => error instanceof ApiError && error.status === 429)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('api client preserves raw status and maps HTTP boundaries to safe outcomes', async () => {
  const previousFetch = globalThis.fetch
  const cases = [
    { status: 401, outcome: 'unauthorized', retryable: false },
    { status: 403, outcome: 'forbidden', retryable: false },
    { status: 404, outcome: 'unavailable', retryable: false },
    { status: 429, outcome: 'retryable', retryable: true },
    { status: 503, outcome: 'unavailable', retryable: true },
  ] as const

  try {
    for (const expected of cases) {
      const payload = { code: `HTTP_${expected.status}`, detail: 'upstream response' }
      globalThis.fetch = (async () => new Response(JSON.stringify(payload), {
        status: expected.status,
        headers: { 'content-type': 'application/json', 'retry-after': expected.status === 429 ? '3' : '' },
      })) as typeof fetch

      const result = await apiClientOutcome('/status')
      assert.equal(result.outcome, expected.outcome)
      assert.equal(result.retryable, expected.retryable)
      assert.equal(result.httpStatus, expected.status)
      assert.equal((result.raw as ApiError).status, expected.status)
      assert.deepEqual((result.raw as ApiError).data, payload)
      if (expected.status === 429) assert.equal(result.retryAfterMs, 3_000)
    }
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('api client classifies aborts as retryable instead of hiding them as generic network errors', async () => {
  const previousFetch = globalThis.fetch
  const abortError = Object.assign(new Error('request was aborted'), { name: 'AbortError', code: 'ERR_ABORTED' })
  globalThis.fetch = (async () => { throw abortError }) as typeof fetch

  try {
    const result = await apiClientOutcome('/status')
    assert.equal(result.outcome, 'retryable')
    assert.equal(result.retryable, true)
    assert.equal(result.code, 'ERR_ABORTED')
    assert.equal(result.reason, 'request_aborted')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('api client classifies an ordinary fetch failure as retryable unavailable transport', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => { throw new TypeError('fetch failed') }) as typeof fetch

  try {
    const result = await apiClientOutcome('/status')
    assert.equal(result.outcome, 'unavailable')
    assert.equal(result.retryable, true)
    assert.equal(result.reason, 'network_unavailable')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('api client keeps HTTP status when an error response contains JSON null', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response('null', { status: 503, headers: { 'content-type': 'application/json' } })) as typeof fetch

  try {
    const result = await apiClientOutcome('/status')
    assert.equal(result.outcome, 'unavailable')
    assert.equal(result.retryable, true)
    assert.equal(result.httpStatus, 503)
    assert.equal(result.reason, 'server_unavailable')
  } finally {
    globalThis.fetch = previousFetch
  }
})
