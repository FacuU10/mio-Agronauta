import test from 'node:test'
import assert from 'node:assert/strict'
import { AGRONAUTAS_SOURCE_CADENCES, AgronautasSignalScheduler, calculateRetryBackoff, createAgronautasSchedulerRuntime, dueSourceWindows, type SourceWindow } from './agronautas-scheduler'
import { RedisAgronautasRuntimeDispatcher } from '../queue/agronautas-runtime-dispatcher'
import { agronautasScheduledWindowSchema } from '@repo/zod-schemas'

test('calculateRetryBackoff applies extended waits and desists after attempt four until the hourly run', () => {
  const now = new Date('2026-07-04T20:05:00.000Z')
  assert.equal(calculateRetryBackoff(1, now).retryAt.toISOString(), '2026-07-04T20:05:45.000Z')
  assert.equal(calculateRetryBackoff(2, now).retryAt.toISOString(), '2026-07-04T20:10:00.000Z')
  assert.equal(calculateRetryBackoff(3, now).retryAt.toISOString(), '2026-07-04T20:15:00.000Z')
  assert.equal(calculateRetryBackoff(4, now).retryAt.toISOString(), '2026-07-04T20:20:00.000Z')

  const exhausted = calculateRetryBackoff(5, now)
  assert.equal(exhausted.desistUntilNextHourlyRun, true)
  assert.equal(exhausted.retryAt.toISOString(), '2026-07-04T21:00:00.000Z')
})

test('dueSourceWindows uses researched cadence instead of blindly running every source hourly', () => {
  const now = new Date('2026-07-04T19:37:00.000Z')
  const due = dueSourceWindows(
    AGRONAUTAS_SOURCE_CADENCES,
    new Map([
      ['open-meteo:climate', new Date('2026-07-04T18:20:00.000Z')],
      ['sentinel-stac:satellite', new Date('2026-07-04T10:00:00.000Z')],
      ['nasa-firms:fire', new Date('2026-07-04T15:00:00.000Z')],
    ]),
    now,
  )

  assert.deepEqual(due.map((window) => `${window.provider}:${window.signalType}`), ['open-meteo:climate', 'smn-alerts:weather_alert', 'nasa-firms:fire'])
  assert.equal(due[0]?.windowStart.toISOString(), '2026-07-04T19:00:00.000Z')
  assert.equal(due.some((window) => window.provider === 'radar-sinarame'), false)
})

test('AgronautasSignalScheduler skips duplicate scheduled-window locks', async () => {
  const window: SourceWindow = { provider: 'open-meteo', signalType: 'climate', windowStart: new Date('2026-07-04T19:00:00.000Z'), windowEnd: new Date('2026-07-04T20:00:00.000Z'), runId: 'run-1' }
  const scheduler = new AgronautasSignalScheduler(
    { async acquireWindow() { return false } },
    { async enqueue() { throw new Error('must not enqueue duplicate') }, async deadLetter() { throw new Error('must not dlq duplicate') } },
  )

  const result = await scheduler.tick([window])

  assert.equal(result.skipped[0]?.runId, 'run-1')
  assert.equal(result.enqueued.length, 0)
})

test('AgronautasSignalScheduler dead-letters enqueue failures for retry/DLQ visibility', async () => {
  const window: SourceWindow = { provider: 'smn-alerts', signalType: 'weather_alert', windowStart: new Date('2026-07-04T19:00:00.000Z'), windowEnd: new Date('2026-07-04T20:00:00.000Z'), runId: 'run-smn' }
  const dlq: string[] = []
  const scheduler = new AgronautasSignalScheduler(
    { async acquireWindow() { return true } },
    { async enqueue() { throw new Error('smn 503') }, async deadLetter(deadLetterWindow, error) { dlq.push(`${deadLetterWindow.runId}:${error.message}`) } },
  )

  const result = await scheduler.tick([window])

  assert.deepEqual(dlq, ['run-smn:smn 503'])
  assert.equal(result.deadLettered[0]?.provider, 'smn-alerts')
})

test('scheduler runtime is disabled safely when feature flag is absent', () => {
  const runtime = createAgronautasSchedulerRuntime({ enabled: false, scheduler: {} as never, getLastSuccess: async () => new Map() })
  assert.equal(runtime.started, false)
  assert.equal(runtime.intervalMs, 60 * 60 * 1000)
})

test('scheduler runtime wires hourly tick and due-source planning when enabled', async () => {
  const ticked: string[][] = []
  const runtime = createAgronautasSchedulerRuntime({
    enabled: true,
    now: () => new Date('2026-07-04T20:05:00.000Z'),
    scheduler: { async tick(windows) { ticked.push(windows.map((window) => `${window.provider}:${window.signalType}`)); return { enqueued: windows, skipped: [], deadLettered: [] } } },
    getLastSuccess: async () => new Map([['sentinel-stac:satellite', new Date('2026-07-04T10:00:00.000Z')]]),
    setInterval: ((callback: () => void, ms: number) => { assert.equal(ms, 60 * 60 * 1000); callback(); return 1 as never }) as typeof setInterval,
    clearInterval: (() => undefined) as typeof clearInterval,
  })

  await runtime.runOnce()
  assert.equal(runtime.started, true)
  assert.deepEqual(ticked[0], ['open-meteo:climate', 'smn-alerts:weather_alert', 'nasa-firms:fire'])
  runtime.stop()
  assert.equal(runtime.started, false)
})

test('scheduler runtime reads persisted cadences and last success on every run', async () => {
  const calls: string[] = []
  const runtime = createAgronautasSchedulerRuntime({
    enabled: false,
    now: () => new Date('2026-07-04T20:05:00.000Z'),
    scheduler: { async tick(windows) { calls.push(`tick:${windows.map((window) => window.runId).join('|')}`); return { enqueued: windows, skipped: [], deadLettered: [] } } },
    getCadences: async () => { calls.push('cadences'); return [{ provider: 'persisted-weather', signalType: 'climate', updateCadenceMinutes: 60, freshnessSlaMinutes: 120, sourceRef: 'db', researchedAt: new Date('2026-07-04T00:00:00.000Z'), enabled: true }] },
    getLastSuccess: async () => { calls.push('last-success'); return new Map([['persisted-weather:climate', new Date('2026-07-04T18:00:00.000Z')]]) },
  })

  await runtime.runOnce()

  assert.deepEqual(calls, ['cadences', 'last-success', 'tick:persisted-weather:climate:2026-07-04T20:00:00.000Z'])
})

test('scheduled-window dispatcher publishes one typed Bull envelope and suppresses duplicate run IDs', async () => {
  const lists: Record<string, string[]> = {}
  const keys = new Set<string>()
  const redis = {
    async set(key: string) {
      if (keys.has(key)) return null
      keys.add(key)
      return 'OK'
    },
    async del(key: string) {
      keys.delete(key)
      return 1
    },
    async lpush(key: string, value: string) {
      lists[key] ??= []
      lists[key].unshift(value)
      return lists[key].length
    },
    async rpush(key: string, value: string) {
      lists[key] ??= []
      lists[key].push(value)
      return lists[key].length
    },
  }
  const dispatcher = new RedisAgronautasRuntimeDispatcher(redis)
  const window: SourceWindow = { provider: 'open-meteo', signalType: 'climate', windowStart: new Date('2026-07-04T19:00:00.000Z'), windowEnd: new Date('2026-07-04T20:00:00.000Z'), runId: 'open-meteo:climate:2026-07-04T19:00:00.000Z' }

  await dispatcher.enqueue(window)
  await dispatcher.enqueue(window)

  const payload = JSON.parse(lists['bull:agronautas-runtime:wait']?.[0] ?? '{}') as unknown
  const parsed = agronautasScheduledWindowSchema.parse(payload)
  assert.equal(lists['bull:agronautas-runtime:wait']?.length, 1)
  assert.equal(parsed.payload.sourceWindow.runId, window.runId)
  assert.equal(parsed.status, 'pending')
})

test('scheduled-window schema rejects malformed windows and contract drift before queue publication', () => {
  const malformed = {
    contractVersion: '0.9.0',
    jobId: 'job-1',
    workflowId: 'agronautas-scheduled-window',
    runId: 'run-1',
    kind: 'agronautas-scheduled-window',
    status: 'pending',
    priority: 50,
    createdAt: '2026-07-04T19:00:00.000Z',
    lease: { attempt: 1, maxAttempts: 3 },
    trace: { traceId: 'trace-1234567890123456', correlationId: 'corr-12345678', causationId: 'run-1' },
    payload: { sourceWindow: { provider: '', signalType: 'climate', windowStart: 'not-a-date', windowEnd: '2026-07-04T20:00:00.000Z', runId: 'run-2' } },
    labels: { domain: 'agronautas', operation: 'scheduled-window' },
  }

  assert.equal(agronautasScheduledWindowSchema.safeParse(malformed).success, false)
})
