import assert from 'node:assert/strict'
import test from 'node:test'
import { createAgronautasRuntimeJob, createAgronautasScheduledWindowRuntimeJob } from './index.js'

test('createAgronautasRuntimeJob owns v2 identity, trace, lease, and queue defaults', () => {
  const job = createAgronautasRuntimeJob({
    fieldId: 'field-v2',
    operation: 'risk-recompute',
    runtimeMode: 'real',
    requestedAt: new Date('2026-08-27T00:00:00.000Z'),
    idGenerator: (() => {
      const ids = ['run-v2', 'job-v2', 'trace-v2']
      return () => ids.shift() ?? 'overflow'
    })(),
  })

  assert.deepEqual(job, {
    contractVersion: '2.0.0',
    jobId: 'agro-job-job-v2',
    runId: 'run-v2',
    operation: 'risk-recompute',
    fieldId: 'field-v2',
    requestedAt: '2026-08-27T00:00:00.000Z',
    trace: { traceId: 'trace-v2', correlationId: 'trace-v2', causationId: 'run-v2' },
    runtime: { mode: 'real' },
    state: 'queued',
    lease: { attempt: 1, maxAttempts: 3, leaseExpiresAt: null },
  })
})

test('createAgronautasRuntimeJob preserves supplied request identity while defaulting the remaining v2 values', () => {
  const job = createAgronautasRuntimeJob({
    fieldId: 'field-supplied',
    operation: 'risk-recompute',
    runtimeMode: 'demo',
    runId: 'run-supplied',
    jobId: 'job-supplied',
    requestId: 'request-supplied',
    correlationId: 'correlation-supplied',
    lease: { attempt: 2, maxAttempts: 3 },
    idGenerator: () => 'unused',
  })

  assert.equal(job.runId, 'run-supplied')
  assert.equal(job.jobId, 'job-supplied')
  assert.deepEqual(job.trace, {
    traceId: 'request-supplied',
    correlationId: 'correlation-supplied',
    causationId: 'run-supplied',
  })
  assert.deepEqual(job.lease, { attempt: 2, maxAttempts: 3, leaseExpiresAt: null })
})

test('createAgronautasScheduledWindowRuntimeJob emits the shared v2 envelope with source-window lineage', () => {
  const job = createAgronautasScheduledWindowRuntimeJob({
    provider: 'open-meteo',
    signalType: 'climate',
    windowStart: new Date('2026-08-27T00:00:00.000Z'),
    windowEnd: new Date('2026-08-27T01:00:00.000Z'),
    runId: 'window-run-1',
    requestId: 'window-request-1',
    idGenerator: () => 'unused',
  })

  assert.equal(job.contractVersion, '2.0.0')
  assert.equal(job.operation, 'scheduled-window')
  assert.equal(job.fieldId, null)
  assert.deepEqual(job.sourceWindow, {
    provider: 'open-meteo',
    signalType: 'climate',
    windowStart: '2026-08-27T00:00:00.000Z',
    windowEnd: '2026-08-27T01:00:00.000Z',
    runId: 'window-run-1',
  })
})
