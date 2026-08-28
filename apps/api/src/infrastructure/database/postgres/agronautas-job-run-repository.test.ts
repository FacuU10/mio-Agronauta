import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptLegacyJobRunRow, PostgresAgronautasJobRunRepository } from './agronautas-job-run-repository'

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
  const transitions: Array<Record<string, unknown>> = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query() {
      return { rows: [{ claimed: true, previous_status: 'queued', lease_expires_at: new Date('2026-08-04T00:05:00.000Z') }] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0], {
    onQueueTransition(input: Record<string, unknown>) { transitions.push(input) },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[1])

  const result = await guarded(repository).claim('job-1', 'worker-1', new Date('2026-08-04T00:00:00.000Z'), 300)

  assert.deepEqual(result, { claimed: true, leaseExpiresAt: new Date('2026-08-04T00:05:00.000Z') })
  assert.equal(transitions[0]?.['from'], 'queued')
})

test('claim telemetry reports a due waiting job as waiting before leasing it', async () => {
  const transitions: Array<Record<string, unknown>> = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query() {
      return { rows: [{ previous_status: 'waiting', lease_expires_at: new Date('2026-08-04T00:05:00.000Z') }] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0], {
    onQueueTransition(input: Record<string, unknown>) { transitions.push(input) },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[1])

  await guarded(repository).claim('job-waiting', 'worker-1', new Date('2026-08-04T00:00:00.000Z'), 300)

  assert.equal(transitions[0]?.['from'], 'waiting')
  assert.equal(transitions[0]?.['to'], 'leased')
})

test('claim telemetry reports the expired lease state when reclaiming a running job', async () => {
  const transitions: Array<Record<string, unknown>> = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query() {
      return { rows: [{ previous_status: 'running', lease_expires_at: new Date('2026-08-04T00:05:00.000Z') }] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0], {
    onQueueTransition(input: Record<string, unknown>) { transitions.push(input) },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[1])

  await guarded(repository).claim('job-expired', 'worker-1', new Date('2026-08-04T00:10:00.000Z'), 300)

  assert.equal(transitions[0]?.['from'], 'running')
  assert.equal(transitions[0]?.['reason'], 'lease_expired_reclaim')
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

test('claim never treats a waiting job without retryAt as due', async () => {
  let capturedSql = ''
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  await guarded(repository).claim('job-1', 'worker-1', new Date('2026-08-04T00:00:00.000Z'), 300)

  assert.doesNotMatch(capturedSql, /status\s*=\s*'waiting'[^)]*retry_at\s+IS\s+NULL/i)
  assert.match(capturedSql, /status\s*=\s*'waiting'\s+AND\s+retry_at\s+IS\s+NOT\s+NULL\s+AND\s+retry_at\s*<=\s*\$3/i)
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

test('legacy terminal methods require the lease owner and write contract succeeded instead of completed', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string, params?: unknown[]) {
      queries.push({ sql, params: params ?? [] })
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  await repository.markCompleted('job-1', new Date('2026-08-04T00:03:00.000Z'), { status: 'succeeded' }, 'worker-1')
  await repository.markHeartbeat('job-1', new Date('2026-08-04T00:03:00.000Z'), 'worker-1')

  assert.match(queries[0]?.sql ?? '', /status\s*=\s*'succeeded'/i)
  assert.doesNotMatch(queries[0]?.sql ?? '', /status\s*=\s*'completed'/i)
  assert.match(queries[0]?.sql ?? '', /lease_owner\s*=\s*\$[0-9]+/i)
  assert.equal(queries[0]?.params.at(-1), 'worker-1')
  assert.match(queries[1]?.sql ?? '', /lease_owner\s*=\s*\$[0-9]+/i)
})

test('all legacy mutating methods reject the null-owner bypass', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string, params?: unknown[]) {
      queries.push({ sql, params: params ?? [] })
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  await repository.markRunning('job-1', new Date('2026-08-04T00:01:00.000Z'), 'worker-1')
  await repository.markHeartbeat('job-1', new Date('2026-08-04T00:02:00.000Z'), 'worker-1')
  await repository.markFailed('job-1', new Date('2026-08-04T00:03:00.000Z'), 'provider_timeout', 'timed out', 'worker-1')

  assert.equal(queries.length, 3)
  for (const query of queries) {
    assert.match(query.sql, /lease_owner\s*=\s*\$[0-9]+/i)
    assert.doesNotMatch(query.sql, /lease_owner\s+IS\s+NULL|\$[0-9]+::text\s+IS\s+NULL/i)
    assert.equal(query.params.at(-1), 'worker-1')
  }
  assert.match(queries[0]?.sql ?? '', /status\s*=\s*'leased'/i)
})

test('legacy failure transition cannot rewrite a completed terminal row', async () => {
  let capturedSql = ''
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])

  await repository.markFailed('job-1', new Date('2026-08-04T00:03:00.000Z'), 'provider_timeout', 'timed out', 'worker-1')

  assert.match(capturedSql, /lease_owner\s*=\s*\$[0-9]+/i)
  assert.match(capturedSql, /status\s*=\s*'running'/i)
})

test('worker-owned mutators only advance from their legal running state', async () => {
  const queries: string[] = []
  const repository = new PostgresAgronautasJobRunRepository({
    async query(sql: string) {
      queries.push(sql)
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0])
  const timestamp = new Date('2026-08-04T00:03:00.000Z')

  await repository.markRunning('job-1', timestamp, 'worker-1')
  await repository.markCompleted('job-1', timestamp, { status: 'succeeded' }, 'worker-1')
  await repository.markFailed('job-1', timestamp, 'provider_timeout', 'timed out', 'worker-1')
  await guarded(repository).scheduleRetry('job-1', 'run-1', timestamp, 'provider_timeout')
  await guarded(repository).deadLetter('job-1', 'run-1', timestamp, 'provider_timeout', 'timed out')

  assert.match(queries[0] ?? '', /status\s*=\s*'leased'/i)
  for (const query of queries.slice(1)) {
    assert.match(query, /status\s*=\s*'running'/i)
    assert.doesNotMatch(query, /status\s+IN\s*\('leased',\s*'running'\)/i)
    assert.match(query, /lease_owner\s*=\s*\$[0-9]+/i)
  }
})

test('durable transition emits complete bounded telemetry from persisted metadata', async () => {
  const transitions: Array<Record<string, unknown>> = []
  const repository = new PostgresAgronautasJobRunRepository(
    {
      async query() {
        return {
          rows: [{
             jobId: 'job-telemetry',
             runId: 'run-telemetry',
             fieldId: 'field-telemetry',
             requestId: 'request-telemetry',
             correlationId: 'correlation-telemetry',
             contractVersion: '2.0.0',
             attempt: 2,
             max_attempts: 3,
            lease_expires_at: new Date('2026-08-04T00:08:00.000Z'),
            providerMode: 'live',
          }],
        }
      },
    } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[0],
    {
      onQueueTransition(input: Record<string, unknown>) {
        transitions.push(input)
      },
    } as unknown as ConstructorParameters<typeof PostgresAgronautasJobRunRepository>[1],
  )

  const persisted = await repository.transition({
    jobId: 'job-telemetry',
    runId: 'run-telemetry',
    workerId: 'worker-telemetry',
    from: 'running',
    to: 'succeeded',
    occurredAt: new Date('2026-08-04T00:03:00.000Z'),
    resultPayload: { status: 'succeeded', result: { status: 'available' } },
  })

  assert.equal(persisted, true)
  assert.deepEqual(transitions[0], {
    contractVersion: '2.0.0',
    fieldId: 'field-telemetry',
    jobId: 'job-telemetry',
    runId: 'run-telemetry',
    requestId: 'request-telemetry',
    correlationId: 'correlation-telemetry',
    from: 'running',
    to: 'succeeded',
    attempt: 2,
    maxAttempts: 3,
    workerId: 'worker-telemetry',
    leaseExpiresAt: '2026-08-04T00:08:00.000Z',
    resultStatus: 'available',
    providerMode: 'live',
    latencyMs: 0,
  })
})

test('legacy completed rows remain readable as succeeded without changing the stored status', () => {
  const adapted = adaptLegacyJobRunRow({
    jobId: 'job-legacy',
    runId: 'run-legacy',
    status: 'completed',
    resultPayload: { status: 'succeeded' },
  })

  assert.deepEqual(adapted, {
    jobId: 'job-legacy',
    runId: 'run-legacy',
    status: 'succeeded',
    legacyStatus: 'completed',
    resultPayload: { status: 'succeeded' },
  })
})
