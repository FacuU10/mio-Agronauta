import test from 'node:test'
import assert from 'node:assert/strict'
import { apiClient, resolveApiBaseUrl } from './api-client'

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
