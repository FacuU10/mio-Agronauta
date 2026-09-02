import test from 'node:test'
import assert from 'node:assert/strict'
import { pollStatusPath, PollingError, sanitizeIngestResponse } from './polling'

test('pollStatusPath waits through queued and started until a terminal state', async () => {
  const statuses = ['queued', 'started', 'completed']
  const response = await pollStatusPath('/api/hydrology/ingest/run-1', {
    maxAttempts: 4,
    delayMs: 0,
    fetcher: async () => new Response(JSON.stringify({ status: statuses.shift(), runId: 'run-1' }), { status: 200 }),
  })
  assert.equal(response.status, 'completed')
})

test('sanitizeIngestResponse removes secret diagnostics and keeps bounded operational metadata', () => {
  const result = sanitizeIngestResponse({
    status: 'failed',
    runId: 'run-safe',
    results: [{ source: 'PNA', status: 'failed', recordsIngested: 0, errorMessage: 'password=secret', diagnostic: { failureKind: 'http_status', attempts: 2, providerHost: 'pna.gov.ar', providerPath: '/api/river', upstreamStatus: 503 } }],
  })
   assert.doesNotMatch(JSON.stringify(result), /password=secret/)
  assert.equal(result?.results[0]?.diagnostic?.providerHost, 'pna.gov.ar')
  assert.equal(result?.results[0]?.diagnostic?.upstreamStatus, 503)
})

test('sanitizeIngestResponse preserves bounded coverage gaps', () => {
  const result = sanitizeIngestResponse({ status: 'partial', coverageGaps: ['INA: sin estación asociada'], results: [] })
  assert.deepEqual(result?.coverageGaps, ['INA: sin estación asociada'])
})

test('polling failures retain the HTTP status and retry timing for a rate-limited status endpoint', async () => {
  await assert.rejects(
    () => pollStatusPath('/api/hydrology/ingest/run-1', { fetcher: async () => new Response('{}', { status: 429, headers: { 'retry-after': '3' } }) }),
    (error: unknown) => error instanceof PollingError && error.outcome.outcome === 'retryable' && error.outcome.httpStatus === 429 && error.outcome.retryAfterMs === 3_000,
  )
})

test('polling normalizes an aborted status request as retryable while preserving the original failure', async () => {
  const abort = Object.assign(new Error('The user aborted the request'), { name: 'AbortError', code: 'ERR_ABORTED' })

  await assert.rejects(
    () => pollStatusPath('/api/hydrology/ingest/run-1', { fetcher: async () => { throw abort } }),
    (error: unknown) => error instanceof PollingError && error.outcome.outcome === 'retryable' && error.outcome.reason === 'request_aborted' && error.outcome.raw === abort,
  )
})
