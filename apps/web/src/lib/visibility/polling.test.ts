import test from 'node:test'
import assert from 'node:assert/strict'
import { pollStatusPath, sanitizeIngestResponse } from './polling'

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
  assert.equal(result?.results[0]?.errorMessage, undefined)
  assert.equal(result?.results[0]?.diagnostic?.providerHost, 'pna.gov.ar')
  assert.equal(result?.results[0]?.diagnostic?.upstreamStatus, 503)
})
