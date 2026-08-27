import assert from 'node:assert/strict'
import test from 'node:test'

import { sanitizeTelemetryAttributes } from './agronautas-telemetry'

test('telemetry keeps bounded runtime attributes and excludes secrets/raw payloads', () => {
  const attributes = sanitizeTelemetryAttributes({
    jobId: 'job-1',
    runId: 'run-1',
    from: 'running',
    to: 'waiting',
    attempt: 2,
    workerId: 'worker-1',
    leaseExpiresAt: '2026-08-27T00:05:00.000Z',
    resultStatus: 'retryable_failure',
    providerMode: 'live',
    latencyMs: 125,
    reason: 'x'.repeat(400),
    password: 'must-not-log',
    rawPayload: { score: 42 },
  })

  assert.deepEqual(attributes, {
    jobId: 'job-1',
    runId: 'run-1',
    from: 'running',
    to: 'waiting',
    attempt: 2,
    workerId: 'worker-1',
    leaseExpiresAt: '2026-08-27T00:05:00.000Z',
    resultStatus: 'retryable_failure',
    providerMode: 'live',
    latencyMs: 125,
    reason: 'x'.repeat(256),
  })
})

test('telemetry drops non-finite metrics and preserves explicit unavailable reasons', () => {
  const attributes = sanitizeTelemetryAttributes({
    jobId: 'job-2',
    latencyMs: Number.NaN,
    attempt: Number.POSITIVE_INFINITY,
    reason: 'worker_not_configured',
    status: 'unavailable',
  })

  assert.deepEqual(attributes, {
    jobId: 'job-2',
    reason: 'worker_not_configured',
    status: 'unavailable',
  })
})

test('transition telemetry retains the bounded metadata needed to explain a durable transition', () => {
  const attributes = sanitizeTelemetryAttributes({
    contractVersion: '2.0.0',
    jobId: 'job-3',
    runId: 'run-3',
    from: 'running',
    to: 'succeeded',
    attempt: 1,
    workerId: 'worker-3',
    leaseExpiresAt: null,
    resultStatus: 'available',
    providerMode: 'live',
    latencyMs: 42,
  })

  assert.deepEqual(attributes, {
    contractVersion: '2.0.0',
    jobId: 'job-3',
    runId: 'run-3',
    from: 'running',
    to: 'succeeded',
    attempt: 1,
    workerId: 'worker-3',
    resultStatus: 'available',
    providerMode: 'live',
    latencyMs: 42,
  })
})
