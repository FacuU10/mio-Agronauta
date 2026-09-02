import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { fireEvent, render, cleanup, waitFor } from '@testing-library/react'
import { IngestPanel } from './ingest-panel'

const defaultFetch = globalThis.fetch

beforeEach(() => setupDom())
afterEach(() => {
  cleanup()
  globalThis.fetch = defaultFetch
})

test('hides ingest controls until the memory-only verification succeeds', async () => {
  const previousFetch = globalThis.fetch
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const token = crypto.randomUUID()
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init })
    return jsonResponse({ contractVersion: '1.0.0', authorized: true })
  }) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    const input = view.getByLabelText('Token de ingesta') as HTMLInputElement
    const button = view.getByRole('button', { name: 'Verificar acceso' })
    assert.equal(input.type, 'password')
    assert.equal(input.getAttribute('name'), 'ingestToken')
    assert.equal(input.getAttribute('autocomplete'), 'off')
    assert.equal(button.hasAttribute('disabled'), true)
    fireEvent.input(input, { target: { value: token } })
    await waitFor(() => assert.equal(button.hasAttribute('disabled'), false))
    fireEvent.click(button)

    await waitFor(() => assert.equal(calls.length, 1))
    assert.equal(calls[0]?.url, '/api/hydrology/ingest/verify')
    assert.equal(calls[0]?.init?.method, 'POST')
    const headers = new Headers(calls[0]?.init?.headers)
    assert.equal(headers.get('x-hydrology-ingest-token'), token)
    assert.equal(headers.get('content-type'), 'application/json')
    assert.equal(view.getByRole('status').textContent, 'Acceso verificado')
    assert.equal(view.queryByRole('button', { name: 'Iniciar ingesta' }) !== null, true)
    assert.doesNotMatch(view.container.textContent ?? '', new RegExp(token))
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('clears the token after a completed request and renders only the safe result contract', async () => {
  const previousFetch = globalThis.fetch
  const token = crypto.randomUUID()
  let requestCount = 0
  globalThis.fetch = (async () => {
    requestCount += 1
    return requestCount === 1
      ? jsonResponse({ contractVersion: '1.0.0', authorized: true })
      : jsonResponse({
    status: 'completed',
    runId: 'run-complete',
    proofRunId: 'proof-complete',
    requestedSources: ['PNA'],
    results: [{ source: 'PNA', status: 'success', recordsIngested: 4, errorMessage: 'internal stack must stay hidden', diagnostic: 'private network detail' }],
      })
  }) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    const input = view.getByLabelText('Token de ingesta') as HTMLInputElement
    fireEvent.input(input, { target: { value: token } })
    const verifyButton = view.getByRole('button', { name: 'Verificar acceso' })
    await waitFor(() => assert.equal(verifyButton.hasAttribute('disabled'), false))
    fireEvent.click(verifyButton)
    await waitFor(() => assert.ok(view.getByRole('button', { name: 'Iniciar ingesta' })))
    const ingestButton = view.getByRole('button', { name: 'Iniciar ingesta' })
    fireEvent.click(ingestButton)

    await waitFor(() => assert.equal((view.getByLabelText('Token de ingesta') as HTMLInputElement).value, ''))
    assert.equal(view.getByRole('status').textContent, 'Ingesta completada')
    assert.match(view.container.textContent ?? '', /PNA/)
    assert.match(view.container.textContent ?? '', /4 registros/)
    assert.match(view.container.textContent ?? '', /run-complete/)
    assert.match(view.container.textContent ?? '', /proof-complete/)
    assert.doesNotMatch(view.container.textContent ?? '', /internal stack|private network detail/)
    assert.doesNotMatch(view.container.textContent ?? '', new RegExp(token))
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('identifies partial source outcomes without rendering upstream diagnostics', async () => {
  const previousFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = (async () => requestCount++ === 0
    ? jsonResponse({ contractVersion: '1.0.0', authorized: true })
    : jsonResponse({
      status: 'partial',
      requestedSources: ['PNA', 'SMN'],
      results: [
        { source: 'PNA', status: 'success', recordsIngested: 2 },
        { source: 'SMN', status: 'failed', recordsIngested: 0, errorMessage: 'provider secret and stack' },
      ],
    })) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    await authorize(view)
    fireEvent.click(view.getByRole('button', { name: 'Iniciar ingesta' }))

    await waitFor(() => assert.equal(view.getByRole('status').textContent, 'Ingesta parcial'))
    assert.match(view.container.textContent ?? '', /PNA.*2 registros/s)
    assert.match(view.container.textContent ?? '', /SMN.*Falló/s)
    assert.doesNotMatch(view.container.textContent ?? '', /provider secret and stack/)
    const diagnostics = view.getByRole('region', { name: 'Diagnósticos de ingesta' })
    assert.match(diagnostics.textContent ?? '', /degraded/i)
    assert.match(diagnostics.textContent ?? '', /partial/i)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('renders a failed structured outcome with safe source details only', async () => {
  const previousFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = (async () => requestCount++ === 0
    ? jsonResponse({ contractVersion: '1.0.0', authorized: true })
    : jsonResponse({
      status: 'failed',
      runId: 'run-failed',
      requestedSources: ['INA'],
      results: [{ source: 'INA', status: 'failed', recordsIngested: 0, diagnostic: 'database host and stack' }],
    })) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    await authorize(view)
    fireEvent.click(view.getByRole('button', { name: 'Iniciar ingesta' }))

    await waitFor(() => assert.equal(view.getByRole('status').textContent, 'Ingesta fallida'))
    assert.match(view.container.textContent ?? '', /INA.*Falló.*0 registros/s)
    assert.match(view.container.textContent ?? '', /run-failed/)
    assert.doesNotMatch(view.container.textContent ?? '', /database host and stack/)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('clears the token and reports a fixed safe error for upstream rejection', async () => {
  const previousFetch = globalThis.fetch
  const token = crypto.randomUUID()
  let requestCount = 0
  globalThis.fetch = (async () => requestCount++ === 0
    ? jsonResponse({ contractVersion: '1.0.0', authorized: true })
    : jsonResponse({ code: 'AUTH_FAILURE', message: token, details: { stack: 'private' } }, 401)) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    const input = view.getByLabelText('Token de ingesta') as HTMLInputElement
    fireEvent.input(input, { target: { value: token } })
    await waitFor(() => assert.equal(view.getByRole('button', { name: 'Verificar acceso' }).hasAttribute('disabled'), false))
    fireEvent.click(view.getByRole('button', { name: 'Verificar acceso' }))
    await waitFor(() => assert.ok(view.getByRole('button', { name: 'Iniciar ingesta' })))
    fireEvent.click(view.getByRole('button', { name: 'Iniciar ingesta' }))

    await waitFor(() => assert.equal((view.getByLabelText('Token de ingesta') as HTMLInputElement).value, ''))
    assert.equal(view.getByRole('alert').textContent, 'No se pudo autorizar la ingesta con el token indicado.')
    assert.doesNotMatch(view.container.textContent ?? '', new RegExp(token))
    assert.doesNotMatch(view.container.textContent ?? '', /private/)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('does not retain token state after unmount and remount', () => {
  const token = crypto.randomUUID()
  const view = render(<IngestPanel />)
  fireEvent.input(view.getByLabelText('Token de ingesta'), { target: { value: token } })
  view.unmount()

  const remounted = render(<IngestPanel />)
  assert.equal((remounted.getByLabelText('Token de ingesta') as HTMLInputElement).value, '')
})

test('failed verification keeps ingest controls hidden and leaves browser storage empty', async () => {
  const token = crypto.randomUUID()
  globalThis.fetch = (async () => jsonResponse({ code: 'HYDROLOGY_INGEST_UNAUTHORIZED' }, 401)) as typeof fetch
  const view = render(<IngestPanel />)
  const input = view.getByLabelText('Token de ingesta') as HTMLInputElement
  fireEvent.input(input, { target: { value: token } })
  fireEvent.click(view.getByRole('button', { name: 'Verificar acceso' }))

  await waitFor(() => assert.ok(view.getByRole('alert')))
  assert.equal(view.queryByRole('button', { name: 'Iniciar ingesta' }), null)
  assert.equal(window.localStorage.length, 0)
  assert.equal(window.sessionStorage.length, 0)
  assert.equal(document.cookie, '')
  assert.doesNotMatch(view.container.textContent ?? '', new RegExp(token))
})

test('announces unauthorized verification with a reachable retry and restores focus to the token field', async () => {
  const previousFetch = globalThis.fetch
  const token = crypto.randomUUID()
  globalThis.fetch = (async () => jsonResponse({ code: 'HYDROLOGY_INGEST_UNAUTHORIZED', message: token }, 401)) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    const input = view.getByLabelText('Token de ingesta') as HTMLInputElement
    fireEvent.input(input, { target: { value: token } })
    fireEvent.click(view.getByRole('button', { name: 'Verificar acceso' }))

    await waitFor(() => assert.equal(view.getByRole('alert').textContent, 'No se pudo autorizar la ingesta con el token indicado.'))
    const retryButton = view.getByRole('button', { name: 'Reintentar verificación' })
    assert.equal(retryButton.getAttribute('aria-describedby'), 'hydrology-ingest-error')
    assert.equal(input.getAttribute('aria-invalid'), 'true')
    assert.equal(input.getAttribute('aria-describedby'), 'hydrology-ingest-token-help hydrology-ingest-error')
    assert.equal(document.activeElement, retryButton)
    assert.doesNotMatch(view.container.innerHTML, new RegExp(token))

    fireEvent.click(retryButton)
    await waitFor(() => assert.equal(document.activeElement, input))
    assert.equal(input.value, '')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('keeps partial source availability explicit and exposes only sanitized provenance links', async () => {
  const previousFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = (async () => requestCount++ === 0
    ? jsonResponse({ contractVersion: '1.0.0', authorized: true })
    : jsonResponse({
      status: 'partial',
      requestedSources: ['PNA', 'INA', 'INMET', 'SMN'],
      results: [
        { source: 'PNA', status: 'success', recordsIngested: 1, provenanceUrl: 'https://pna.gov.ar/observations' },
        { source: 'INA', status: 'empty', recordsIngested: 0 },
        { source: 'INMET', status: 'skipped', recordsIngested: 0 },
        { source: 'SMN', status: 'failed', recordsIngested: 0 },
      ],
    })) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    await authorize(view)
    fireEvent.click(view.getByRole('button', { name: 'Iniciar ingesta' }))

    await waitFor(() => assert.equal(view.getByRole('status').textContent, 'Ingesta parcial'))
    assert.match(view.container.textContent ?? '', /INA.*Sin registros/s)
    assert.match(view.container.textContent ?? '', /INMET.*Omitida/s)
    assert.ok(view.getByRole('link', { name: 'Ver fuente PNA' }))
    assert.equal(view.getByRole('link', { name: 'Ver fuente PNA' }).getAttribute('href'), 'https://pna.gov.ar/observations')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('returns keyboard focus to the token field when retrying a terminal ingest result', async () => {
  const previousFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = (async () => requestCount++ === 0
    ? jsonResponse({ contractVersion: '1.0.0', authorized: true })
    : jsonResponse({ status: 'failed', runId: 'run-failed', requestedSources: ['PNA'], results: [{ source: 'PNA', status: 'failed', recordsIngested: 0 }] })) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    await authorize(view)
    fireEvent.click(view.getByRole('button', { name: 'Iniciar ingesta' }))
    await waitFor(() => assert.ok(view.getByRole('button', { name: 'Reintentar ingesta' })))

    fireEvent.click(view.getByRole('button', { name: 'Reintentar ingesta' }))
    await waitFor(() => assert.equal(document.activeElement, view.getByLabelText('Token de ingesta')))
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('IngestPanel exposes one landmark and a keyboard skip target', () => {
  const view = render(<IngestPanel />)

  assert.equal(view.container.querySelectorAll('main').length, 1)
  assert.equal(view.container.querySelectorAll('main main').length, 0)
  const skipLink = view.getByRole('link', { name: 'Saltar a controles de ingesta' })
  assert.equal(skipLink.getAttribute('href'), '#ingest-controls')
  const skipTarget = view.container.querySelector('#ingest-controls')
  assert.ok(skipTarget)
  assert.equal(skipTarget?.getAttribute('tabindex'), '-1')
  assert.equal(view.getAllByRole('heading', { level: 1 }).length, 1)
  assert.ok(view.getByRole('heading', { level: 1, name: 'Ingesta hidrológica' }))
  assert.ok(view.getByRole('form', { name: 'Verificar acceso a ingesta' }))
})

test('keeps an ingest authorization failure safe after access was granted and exposes verification recovery', async () => {
  const previousFetch = globalThis.fetch
  const token = crypto.randomUUID()
  let requestCount = 0
  globalThis.fetch = (async () => requestCount++ === 0
    ? jsonResponse({ contractVersion: '1.0.0', authorized: true })
    : jsonResponse({ code: 'HYDROLOGY_INGEST_UNAUTHORIZED', message: token }, 401)) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    await authorize(view, token)
    fireEvent.click(view.getByRole('button', { name: 'Iniciar ingesta' }))

    await waitFor(() => assert.equal(view.getByRole('alert').textContent, 'No se pudo autorizar la ingesta con el token indicado.'))
    assert.ok(view.getByRole('button', { name: 'Reintentar verificación' }))
    assert.doesNotMatch(view.container.innerHTML, new RegExp(token))
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('announces an admitted started run as progress and offers a safe ingest retry', async () => {
  const previousFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = (async () => requestCount++ === 0
    ? jsonResponse({ contractVersion: '1.0.0', authorized: true })
    : jsonResponse({ status: 'started', runId: 'run-started', requestedSources: ['INA'], results: [] })) as typeof fetch

  try {
    const view = render(<IngestPanel />)
    await authorize(view)
    fireEvent.click(view.getByRole('button', { name: 'Iniciar ingesta' }))

    await waitFor(() => assert.equal(view.getByRole('status').textContent, 'Ingesta iniciada'))
    assert.match(view.container.textContent ?? '', /run-started/)
    assert.match(view.container.textContent ?? '', /INA/)
    assert.ok(view.getByRole('button', { name: 'Reintentar ingesta' }))
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('accepts 202 admission, polls statusPath without treating queued as completed, and renders source ranges/http summary', async () => {
  const previousFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = (async (url, init) => {
    requestCount += 1
    if (requestCount === 1) return jsonResponse({ contractVersion: '1.0.0', authorized: true })
    if (requestCount === 2) return jsonResponse({ contractVersion: 'hydrology-government-ingest-v1', status: 'queued', runId: 'run-queued', statusPath: '/api/hydrology/ingest/run-queued', requestedSources: ['PNA'], results: [] }, 202)
    assert.equal(String(url), '/api/hydrology/ingest/run-queued?waitMs=0')
    assert.equal(init?.method, 'GET')
    return jsonResponse({ contractVersion: 'hydrology-government-ingest-v1', status: 'partial', runId: 'run-queued', requestedSources: ['PNA', 'SMN'], results: [{ source: 'PNA', status: 'success', recordsIngested: 4, observedFrom: '2026-06-23T00:00:00.000Z', observedTo: '2026-06-23T01:00:00.000Z', httpSummary: { host: 'pna.gov.ar', path: '/api/river', status: 200, elapsedMs: 42, attempts: 1, timeoutMs: 1000 } }, { source: 'SMN', status: 'failed', recordsIngested: 0, diagnostic: { failureKind: 'timeout', attempts: 2, providerHost: 'smn.gob.ar', providerPath: '/api/alerts', timeoutMs: 1000 } }] })
  }) as typeof fetch
  try {
    const view = render(<IngestPanel pollOptions={{ delayMs: 0, maxAttempts: 2 }} />)
    await authorize(view)
    fireEvent.click(view.getByRole('button', { name: 'Iniciar ingesta' }))
    await waitFor(() => assert.equal(view.getByRole('status').textContent, 'Ingesta parcial'))
    assert.match(view.container.textContent ?? '', /run-queued/)
    assert.match(view.container.textContent ?? '', /00:00.*01:00/s)
    assert.match(view.container.textContent ?? '', /200.*pna\.gov\.ar/s)
    assert.match(view.container.textContent ?? '', /timeout.*smn\.gob\.ar/s)
    assert.equal(view.queryByText('Ingesta completada'), null)
  } finally {
    globalThis.fetch = previousFetch
  }
})

async function authorize(view: ReturnType<typeof render>, token = crypto.randomUUID()) {
  const input = view.getByLabelText('Token de ingesta') as HTMLInputElement
  fireEvent.input(input, { target: { value: token } })
  await waitFor(() => assert.equal(view.getByRole('button', { name: 'Verificar acceso' }).hasAttribute('disabled'), false))
  fireEvent.click(view.getByRole('button', { name: 'Verificar acceso' }))
  await waitFor(() => assert.ok(view.getByRole('button', { name: 'Iniciar ingesta' })))
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
}

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.self = dom.window as unknown as typeof globalThis.self
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLInputElement = dom.window.HTMLInputElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.Event = dom.window.Event
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
}
