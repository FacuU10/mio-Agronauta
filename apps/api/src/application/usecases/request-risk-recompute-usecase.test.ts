import test from 'node:test'
import assert from 'node:assert/strict'
import { RequestRiskRecomputeUseCase, WorkerUnavailableError } from './request-risk-recompute-usecase'

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
