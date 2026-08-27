import test from 'node:test'
import assert from 'node:assert/strict'
import { RequestRiskRecomputeUseCase, WorkerUnavailableError } from './request-risk-recompute-usecase'
import { RedisAgronautasRuntimeDispatcher } from '../../infrastructure/queue/agronautas-runtime-dispatcher'

test('RequestRiskRecomputeUseCase reuses in-flight run metadata when lock already exists', async () => {
  const useCase = new RequestRiskRecomputeUseCase(
    {
      async acquire() {
        return {
          acquired: false,
          metadata: {
            runId: 'run-active',
            jobId: 'job-active',
            requestId: 'req-active',
            correlationId: 'req-active',
            triggeredBy: 'api',
            contractVersion: '1.0.0',
          },
        }
      },
      async release() {},
    },
    { async dispatchRiskRecompute() { throw new Error('should not dispatch') } },
    {
      async saveQueuedRun() { throw new Error('should not persist') },
      async markRunning() {},
      async markHeartbeat() {},
      async markCompleted() {},
      async markFailed() {},
    },
    { idGenerator: () => 'generated-id' },
  )

  const result = await useCase.execute('field-1', 'api', { requestId: 'req-1' })
  assert.deepEqual(result, {
    status: 'already_in_progress',
    runId: 'run-active',
    jobId: 'job-active',
    requestId: 'req-active',
    contractVersion: '1.0.0',
  })
})

test('RequestRiskRecomputeUseCase marks job failed when dispatch throws', async () => {
  let failed: { jobId: string; errorCode: string } | null = null
  let releasedFieldId: string | null = null
  const useCase = new RequestRiskRecomputeUseCase(
    {
      async acquire(_fieldId, _ttl, metadata) { return { acquired: true, metadata } },
      async release(fieldId) { releasedFieldId = fieldId },
    },
    { async dispatchRiskRecompute() { throw new Error('redis unavailable') } },
    {
      async saveQueuedRun() {},
      async markRunning() {},
      async markHeartbeat() {},
      async markCompleted() {},
      async markFailed(jobId, _failedAt, errorCode) { failed = { jobId, errorCode } },
    },
    {
      idGenerator: (() => {
        const ids = ['run-1', 'job-1']
        return () => ids.shift() ?? 'overflow'
      })(),
    },
  )

  await assert.rejects(() => useCase.execute('field-1', 'api', { requestId: 'req-1' }), (error: unknown) => {
    assert.ok(error instanceof WorkerUnavailableError)
    assert.equal(error.details.runId, 'run-1')
    assert.equal(error.details.jobId, 'agro-job-job-1')
    return true
  })
  assert.deepEqual(failed, { jobId: 'agro-job-job-1', errorCode: 'WORKER_UNAVAILABLE' })
  assert.equal(releasedFieldId, 'field-1')
})

test('RequestRiskRecomputeUseCase dispatches stable IDs with lease and attempt metadata', async () => {
  let queued: Record<string, unknown> | null = null
  let dispatched: Record<string, unknown> | null = null
  const useCase = new RequestRiskRecomputeUseCase(
    {
      async acquire(_fieldId, _ttl, metadata) { return { acquired: true, metadata } },
      async release() {},
    },
    {
      async dispatchRiskRecompute(command) {
        dispatched = command as unknown as Record<string, unknown>
      },
    },
    {
      async saveQueuedRun(record) { queued = record as unknown as Record<string, unknown> },
      async markRunning() {},
      async markHeartbeat() {},
      async markCompleted() {},
      async markFailed() {},
    },
    {
      idGenerator: (() => {
        const ids = ['run-contract', 'job-contract', 'request-contract']
        return () => ids.shift() ?? 'overflow'
      })(),
    },
  )

  const result = await useCase.execute('field-contract', 'api')

  assert.equal(result.runId, 'run-contract')
  assert.equal(result.jobId, 'agro-job-job-contract')
  assert.equal(result.requestId, 'request-contract')
  assert.equal((queued as Record<string, unknown> | null)?.['jobId'], result.jobId)
  assert.equal((queued as Record<string, unknown> | null)?.['runId'], result.runId)
  assert.deepEqual((queued as Record<string, unknown> | null)?.['lease'], { attempt: 1, maxAttempts: 3 })
  assert.equal((dispatched as Record<string, unknown> | null)?.['jobId'], result.jobId)
  assert.equal((dispatched as Record<string, unknown> | null)?.['runId'], result.runId)
  assert.deepEqual((dispatched as Record<string, unknown> | null)?.['lease'], { attempt: 1, maxAttempts: 3 })
})

test('RedisAgronautasRuntimeDispatcher publishes the Agronautas Bull queue envelope', async () => {
  let queueName = ''
  let payload: Record<string, unknown> | null = null
  const dispatcher = new RedisAgronautasRuntimeDispatcher({
    async lpush(key, value) {
      queueName = key
      payload = JSON.parse(value) as Record<string, unknown>
      return 1
    },
  })

  await dispatcher.dispatchRiskRecompute({
    contractVersion: '1.0.0',
    jobId: 'agro-job-queue',
    runId: 'run-queue',
    fieldId: 'field-queue',
    triggeredBy: 'api',
    requestId: 'request-queue',
    correlationId: 'correlation-queue',
    requestedAt: new Date('2026-08-04T00:00:00.000Z'),
    runtimeMode: 'real',
  })

  assert.equal(queueName, 'bull:agronautas-runtime:wait')
  assert.equal((payload as Record<string, unknown> | null)?.['jobId'], 'agro-job-queue')
  assert.equal((payload as Record<string, unknown> | null)?.['runId'], 'run-queue')
  assert.deepEqual((payload as Record<string, unknown> | null)?.['lease'], { attempt: 1, maxAttempts: 3 })
})

test('RequestRiskRecomputeUseCase admits v2 through the capability flag without changing the BFF result shape', async () => {
  const previousFlag = process.env['AGRONAUTAS_RUNTIME_V2_ENABLED']
  process.env['AGRONAUTAS_RUNTIME_V2_ENABLED'] = 'true'

  try {
    let queued: Record<string, unknown> | null = null
    let dispatched: Record<string, unknown> | null = null
    const useCase = new RequestRiskRecomputeUseCase(
      {
        async acquire(_fieldId, _ttl, metadata) { return { acquired: true, metadata } },
        async release() {},
      },
      {
        async dispatchRiskRecompute(command) { dispatched = command as unknown as Record<string, unknown> },
      },
      {
        async saveQueuedRun(record) { queued = record as unknown as Record<string, unknown> },
        async markRunning() {},
        async markHeartbeat() {},
        async markCompleted() {},
        async markFailed() {},
      },
      {
        idGenerator: (() => {
          const ids = ['run-v2', 'job-v2', 'trace-v2']
          return () => ids.shift() ?? 'overflow'
        })(),
      },
    )

    const result = await useCase.execute('field-v2', 'api', { requestId: 'request-v2' })
    const dispatchedRecord = dispatched as unknown as Record<string, unknown>
    const queuedRecord = queued as unknown as Record<string, unknown>
    const runtimeJob = dispatchedRecord['runtimeJob'] as Record<string, unknown>

    assert.deepEqual(result, {
      status: 'enqueued',
      runId: 'run-v2',
      jobId: 'agro-job-job-v2',
      requestId: 'request-v2',
      contractVersion: '2.0.0',
    })
    assert.equal(queuedRecord['contractVersion'], '2.0.0')
    assert.deepEqual(queuedRecord['lease'], { attempt: 1, maxAttempts: 3 })
    assert.equal(runtimeJob['contractVersion'], '2.0.0')
    assert.equal(runtimeJob['jobId'], result.jobId)
    assert.equal(runtimeJob['runId'], result.runId)
    assert.deepEqual(runtimeJob['trace'], { traceId: 'request-v2', correlationId: 'request-v2', causationId: 'run-v2' })
    assert.deepEqual(runtimeJob['lease'], { attempt: 1, maxAttempts: 3, leaseExpiresAt: null })
  } finally {
    if (previousFlag === undefined) delete process.env['AGRONAUTAS_RUNTIME_V2_ENABLED']
    else process.env['AGRONAUTAS_RUNTIME_V2_ENABLED'] = previousFlag
  }
})

test('RedisAgronautasRuntimeDispatcher emits the v2 envelope only when enabled', async () => {
  const previousFlag = process.env['AGRONAUTAS_RUNTIME_V2_ENABLED']
  process.env['AGRONAUTAS_RUNTIME_V2_ENABLED'] = 'true'

  try {
    let queueName = ''
    let payload: Record<string, unknown> | null = null
    const dispatcher = new RedisAgronautasRuntimeDispatcher({
      async lpush(key, value) {
        queueName = key
        payload = JSON.parse(value) as Record<string, unknown>
        return 1
      },
    })

    await dispatcher.dispatchRiskRecompute({
      contractVersion: '2.0.0',
      jobId: 'job-v2-dispatch',
      runId: 'run-v2-dispatch',
      fieldId: 'field-v2-dispatch',
      triggeredBy: 'api',
      requestId: 'request-v2-dispatch',
      correlationId: 'correlation-v2-dispatch',
      requestedAt: new Date('2026-08-27T00:00:00.000Z'),
      runtimeMode: 'real',
    })

    const payloadRecord = payload as unknown as Record<string, unknown>
    assert.equal(queueName, 'bull:agronautas-runtime:wait')
    assert.equal(payloadRecord['contractVersion'], '2.0.0')
    assert.equal(payloadRecord['operation'], 'risk-recompute')
    assert.equal(payloadRecord['state'], 'queued')
    assert.deepEqual(payloadRecord['lease'], { attempt: 1, maxAttempts: 3, leaseExpiresAt: null })
  } finally {
    if (previousFlag === undefined) delete process.env['AGRONAUTAS_RUNTIME_V2_ENABLED']
    else process.env['AGRONAUTAS_RUNTIME_V2_ENABLED'] = previousFlag
  }
})
