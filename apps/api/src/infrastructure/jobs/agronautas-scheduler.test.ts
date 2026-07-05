import test from 'node:test'
import assert from 'node:assert/strict'
import { AGRONAUTAS_SOURCE_CADENCES, AgronautasSignalScheduler, calculateRetryBackoff, createAgronautasSchedulerRuntime, dueSourceWindows, type SourceWindow } from './agronautas-scheduler'

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
