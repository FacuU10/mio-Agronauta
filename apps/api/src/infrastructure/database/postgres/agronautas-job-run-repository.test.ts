import test from 'node:test'
import assert from 'node:assert/strict'
import { PostgresAgronautasJobRunRepository } from './agronautas-job-run-repository'

interface LeaseClaim {
  claimed: boolean
  leaseExpiresAt: Date | null
}

interface GuardedJobRunRepository {
  claim(jobId: string, workerId: string, now: Date, leaseSeconds: number): Promise<LeaseClaim>
  heartbeat(jobId: string, runId: string, workerId: string, heartbeatAt: Date): Promise<void>
  scheduleRetry(jobId: string, runId: string, nextRetryAt: Date, errorCode: string): Promise<void>
  deadLetter(jobId: string, runId: string, failedAt: Date, errorCode: string, errorMessage: string): Promise<void>
}

function guarded(repository: PostgresAgronautasJobRunRepository): GuardedJobRunRepository {
  return repository as unknown as GuardedJobRunRepository
}

test('claim guards the queued transition and reclaims an expired lease atomically', async () => {
  const repository = new PostgresAgronautasJobRunRepository({
    async query() {
      return { rows: [{ claimed: true, lease_expires_at: new Date('2026-08-04T00:05:00.000Z') }] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  const result = await guarded(repository).claim('job-1', 'worker-1', new Date('2026-08-04T00:00:00.000Z'), 300)

  assert.deepEqual(result, { claimed: true, leaseExpiresAt: new Date('2026-08-04T00:05:00.000Z') })
})

test('claim only takes waiting jobs whose durable retry window is due', async () => {
  let capturedSql = ''
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  await guarded(repository).claim('job-1', 'worker-1', new Date('2026-08-04T00:00:00.000Z'), 300)

  assert.match(capturedSql, /retry_at\s+IS\s+NULL|retry_at\s*<=/i)
  assert.match(capturedSql, /lease_expires_at\s*<\s*\$3/i)
})

test('heartbeat requires the current lease owner', async () => {
  let capturedSql = ''
  let capturedParams: unknown[] = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string, params?: unknown[]) {
      capturedSql = sql
      capturedParams = params ?? []
      return { rows: [{ updated: true }] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  await guarded(repository).heartbeat('job-1', 'run-1', 'worker-1', new Date('2026-08-04T00:01:00.000Z'))
  assert.match(capturedSql, /WHERE\s+"jobId"\s*=.*"runId"\s*=.*lease_owner/i)
  assert.deepEqual(capturedParams.slice(0, 3), ['job-1', 'run-1', 'worker-1'])
})

test('queued persistence uses the Prisma-managed legacy identifier columns', async () => {
  let capturedSql = ''
  let capturedParams: unknown[] = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string, params?: unknown[]) {
      capturedSql = sql
      capturedParams = params ?? []
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  await repository.saveQueuedRun({
    jobId: 'job-1',
    runId: 'run-1',
    fieldId: 'field-1',
    status: 'queued',
    triggeredBy: 'api',
    contractVersion: '1.0.0',
    requestId: 'request-1',
    correlationId: 'correlation-1',
    runtimeMode: 'real',
    lease: { attempt: 1, maxAttempts: 3 },
    queuedAt: new Date('2026-08-04T00:00:00.000Z'),
    resultPayload: {},
  })

  assert.match(capturedSql, /INSERT INTO agronautas_job_runs \(\s*"id",\s*"jobId",\s*"runId",\s*"fieldId"/i)
  assert.match(capturedSql, /"triggeredBy".*"contractVersion".*"requestId".*"correlationId".*"runtimeMode"/is)
  assert.match(capturedSql, /ON CONFLICT \("jobId"\)/i)
  assert.doesNotMatch(capturedSql, /\bjob_id\b|\brun_id\b|\bfield_id\b/i)
  assert.equal(typeof capturedParams[0], 'string')
  assert.ok(String(capturedParams[0]).length > 0)
})

test('retry persists the next attempt without losing the run identity', async () => {
  let capturedSql = ''
  let capturedParams: unknown[] = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string, params?: unknown[]) {
      capturedSql = sql
      capturedParams = params ?? []
      return { rows: [{ updated: true }] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  await guarded(repository).scheduleRetry('job-1', 'run-1', new Date('2026-08-04T00:02:00.000Z'), 'provider_timeout')
  assert.match(capturedSql, /status\s*=.*waiting|retry_at/i)
  assert.match(capturedSql, /WHERE\s+"jobId"\s*=.*"runId"\s*=/i)
  assert.deepEqual(capturedParams.slice(0, 2), ['job-1', 'run-1'])
  assert.match(capturedSql, /lease_owner\s+IS\s+NOT\s+NULL|lease_owner\s*=\s*\$[0-9]+/i)
  assert.match(capturedSql, /attempt\s*<\s*max_attempts/i)
})

test('v2 transition coordinator owns the durable outcome before any ACK boundary', () => {
  const repository = new PostgresAgronautasJobRunRepository({
    async query() {
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  assert.equal(typeof (repository as unknown as { transition?: unknown }).transition, 'function')
  assert.equal(typeof (repository as unknown as { persistOutcome?: unknown }).persistOutcome, 'function')
})

test('persistOutcome atomically stores the result and checks transition ownership', async () => {
  let capturedSql = ''
  let capturedParams: unknown[] = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string, params?: unknown[]) {
      capturedSql = sql
      capturedParams = params ?? []
      return { rows: [{ jobId: 'job-1', status: 'succeeded' }] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  const persisted = await (repository as unknown as {
    persistOutcome(input: {
      jobId: string
      runId: string
      workerId: string
      from: 'running'
      to: 'succeeded'
      occurredAt: Date
      resultPayload: Record<string, unknown>
    }): Promise<boolean>
  }).persistOutcome({
    jobId: 'job-1',
    runId: 'run-1',
    workerId: 'worker-1',
    from: 'running',
    to: 'succeeded',
    occurredAt: new Date('2026-08-04T00:03:00.000Z'),
    resultPayload: { status: 'succeeded' },
  })

  assert.equal(persisted, true)
  assert.match(capturedSql, /SET[\s\S]*status\s*=\s*\$[0-9]+[\s\S]*resultPayload/i)
  assert.match(capturedSql, /WHERE[\s\S]*"jobId"[\s\S]*"runId"[\s\S]*lease_owner[\s\S]*status\s*=\s*\$[0-9]+/i)
  assert.ok(capturedParams.includes('worker-1'))
})

test('exhausted retry transitions to a durable dead-letter record', async () => {
  let capturedSql = ''
  let capturedParams: unknown[] = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string, params?: unknown[]) {
      capturedSql = sql
      capturedParams = params ?? []
      return { rows: [{ updated: true }] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  await guarded(repository).deadLetter('job-1', 'run-1', new Date('2026-08-04T00:03:00.000Z'), 'provider_unavailable', 'provider is down')
  assert.match(capturedSql, /dlq|dead.?letter/i)
  assert.match(capturedSql, /WHERE\s+"jobId"\s*=.*"runId"\s*=/i)
  assert.deepEqual(capturedParams.slice(0, 2), ['job-1', 'run-1'])
})
