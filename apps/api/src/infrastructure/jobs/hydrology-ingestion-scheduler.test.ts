import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HydrologyIngestionScheduler,
  type HydrologyIngestionRunner,
  hydrologyIngestionCadences,
  type HydrologyIngestionSource,
} from './hydrology-ingestion-scheduler'
import { startHydrologySchedulerFromEnv } from '../../server'
import { createHydrologyIngestionCoordinator } from '../../presentation/routes/hydrology-government'

test('hydrologyIngestionCadences defines approved official source schedules', () => {
  assert.deepEqual(hydrologyIngestionCadences.PNA, { kind: 'interval', everyMs: 60 * 60 * 1000 })
  assert.deepEqual(hydrologyIngestionCadences.INMET, { kind: 'interval', everyMs: 60 * 60 * 1000 })
  assert.deepEqual(hydrologyIngestionCadences.SMN, { kind: 'interval', everyMs: 60 * 60 * 1000 })
  assert.deepEqual(hydrologyIngestionCadences.INA, { kind: 'daily-utc', hour: 18, minute: 30 })
})

test('HydrologyIngestionScheduler schedules interval sources and INA at 18:30 UTC', () => {
  const intervals: Array<{ ms: number; source: HydrologyIngestionSource }> = []
  const timeouts: Array<{ ms: number; source: HydrologyIngestionSource }> = []
  const scheduler = new HydrologyIngestionScheduler({ run: async () => ({ inserted: 1, unchanged: 0 }) }, {
    now: () => new Date('2026-06-23T18:00:00.000Z'),
    setInterval: (callback, ms) => { intervals.push({ ms, source: callback.source }); return 1 as never },
    setTimeout: (callback, ms) => { timeouts.push({ ms, source: callback.source }); return 2 as never },
  })

  scheduler.start()

  assert.deepEqual(intervals, [
    { source: 'PNA', ms: 60 * 60 * 1000 },
    { source: 'INMET', ms: 60 * 60 * 1000 },
    { source: 'SMN', ms: 60 * 60 * 1000 },
  ])
  assert.deepEqual(timeouts, [{ source: 'INA', ms: 30 * 60 * 1000 }])
})

test('startHydrologySchedulerFromEnv is disabled by default and does not create timers', () => {
  let factoryCalls = 0
  const scheduler = startHydrologySchedulerFromEnv({ HYDROLOGY_SCHEDULER_ENABLED: 'false' }, {
    schedulerFactory: () => {
      factoryCalls += 1
      return { start() { throw new Error('must not start') } }
    },
  })

  assert.equal(scheduler, null)
  assert.equal(factoryCalls, 0)
})

test('startHydrologySchedulerFromEnv starts once when enabled without running ingestion immediately', () => {
  const runnerCalls: string[] = []
  let startCalls = 0
  const scheduler = startHydrologySchedulerFromEnv({ HYDROLOGY_SCHEDULER_ENABLED: 'true' }, {
    ingestionRunner: async ({ source }) => {
      runnerCalls.push(source ?? 'PNA')
      return { runId: `manual-${source ?? 'ALL'}`, status: 'completed', sources: source ? [source] : ['PNA', 'INA', 'INMET', 'SMN'] }
    },
    schedulerFactory: (runner) => ({
      start() {
        startCalls += 1
        void runner
      },
    }),
  })

  assert.ok(scheduler)
  assert.equal(startCalls, 1)
  assert.deepEqual(runnerCalls, [])
})

test('startHydrologySchedulerFromEnv maps scheduler sources to one manual government ingest call', async () => {
  const manualSources: Array<string | undefined> = []
  const proofRunIds: Array<string | undefined> = []
  let capturedRunner: { run(source: HydrologyIngestionSource, metadata: { attempt: number; scheduledFor: Date; proofRunId?: string }): Promise<{ inserted: number; unchanged: number }> } | undefined
  startHydrologySchedulerFromEnv({ HYDROLOGY_SCHEDULER_ENABLED: 'true' }, {
    ingestionRunner: async ({ source, proofRunId }) => {
      manualSources.push(source)
      proofRunIds.push(proofRunId)
      return { runId: `manual-${source ?? 'ALL'}`, status: 'completed', sources: source ? [source] : ['PNA', 'INA', 'INMET', 'SMN'] }
    },
    schedulerFactory: (runner) => {
      capturedRunner = runner
      return { start() {} }
    },
  })

  assert.deepEqual(await capturedRunner?.run('SMN', { attempt: 0, scheduledFor: new Date('2026-06-23T12:00:00.000Z'), proofRunId: 'scheduler-proof-test' }), { inserted: 0, unchanged: 0 })
  assert.deepEqual(await capturedRunner?.run('INA', { attempt: 0, scheduledFor: new Date('2026-06-23T12:00:00.000Z') }), { inserted: 0, unchanged: 0 })
  assert.deepEqual(manualSources, ['SMN', 'INA'])
  assert.deepEqual(proofRunIds, ['scheduler-proof-test', undefined])
})

test('hydrology scheduler shares the in-process admission coordinator with manual ingest', async () => {
  const releases: Array<() => void> = []
  let calls = 0
  const coordinator = createHydrologyIngestionCoordinator(async (input) => {
    calls += 1
    await new Promise<void>((resolve) => { releases.push(resolve) })
    return { runId: input.runId!, proofRunId: input.proofRunId, status: 'completed', sources: input.source ? [input.source] : ['PNA'] }
  })
  let capturedRunner: HydrologyIngestionRunner | undefined
  startHydrologySchedulerFromEnv({ HYDROLOGY_SCHEDULER_ENABLED: 'true' }, {
    ingestionCoordinator: coordinator,
    schedulerFactory: (runner) => { capturedRunner = runner; return { start() {} } },
  })

  const manual = coordinator.start({ source: 'PNA', proofRunId: 'shared-proof' }, 'client')
  const scheduled = capturedRunner?.run('INMET', { attempt: 0, scheduledFor: new Date('2026-06-23T12:00:00.000Z') })
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.equal(calls, 2)
  releases.forEach((release) => release())
  await Promise.all([manual.ok ? manual.promise : Promise.resolve(), scheduled])
})

test('HydrologyIngestionScheduler prunes completed daily timeout handles', async () => {
  const callbacks: Array<() => void> = []
  const clearedTimeouts: NodeJS.Timeout[] = []
  let timeoutId = 0
  const originalClearTimeout = globalThis.clearTimeout
  globalThis.clearTimeout = ((timeout: NodeJS.Timeout) => { clearedTimeouts.push(timeout) }) as typeof globalThis.clearTimeout
  const scheduler = new HydrologyIngestionScheduler({ run: async () => ({ inserted: 1, unchanged: 0 }) }, {
    now: () => new Date('2026-06-23T18:00:00.000Z'),
    setInterval: (callback) => callback as never,
    setTimeout: (callback) => { callbacks.push(callback); timeoutId += 1; return timeoutId as never },
  })

  try {
    scheduler.start()
    assert.equal((scheduler as unknown as { timeouts: Set<NodeJS.Timeout> }).timeouts.size, 1)

    callbacks[0]?.()
    await new Promise((resolve) => setImmediate(resolve))

    assert.deepEqual(clearedTimeouts, [1 as never])
    assert.equal((scheduler as unknown as { timeouts: Set<NodeJS.Timeout> }).timeouts.has(1 as never), false)
    assert.equal((scheduler as unknown as { timeouts: Set<NodeJS.Timeout> }).timeouts.has(2 as never), true)
  } finally {
    globalThis.clearTimeout = originalClearTimeout
  }
})

test('HydrologyIngestionScheduler does not resurrect daily tasks after stop and catches background failures', async () => {
  const callbacks: Array<() => void> = []
  const errors: Array<{ message: string; source: HydrologyIngestionSource }> = []
  let timeoutId = 0
  const scheduler = new HydrologyIngestionScheduler({ run: async () => { throw new Error('upstream down') } }, {
    now: () => new Date('2026-06-23T18:00:00.000Z'),
    setInterval: (callback) => callback as never,
    setTimeout: (callback) => { callbacks.push(callback); timeoutId += 1; return timeoutId as never },
    onBackgroundError: (error, metadata) => errors.push({ message: error instanceof Error ? error.message : String(error), source: metadata.source }),
  })

  scheduler.start()
  scheduler.stop()
  callbacks[0]?.()
  await new Promise((resolve) => setImmediate(resolve))

  assert.deepEqual(errors, [{ message: 'upstream down', source: 'INA' }])
  assert.equal(callbacks.length, 1)
  assert.equal((scheduler as unknown as { active: boolean }).active, false)
  assert.equal((scheduler as unknown as { timeouts: Set<NodeJS.Timeout> }).timeouts.size, 0)
})

test('HydrologyIngestionScheduler never schedules a provider retry after a completed attempt', async () => {
  const scheduler = new HydrologyIngestionScheduler({ run: async () => ({ inserted: 0, unchanged: 2 }) }, {
    now: () => new Date('2026-06-23T12:00:00.000Z'),
  })

  const result = await scheduler.runSource('PNA')

  assert.equal(result.retry, null)
})

test('HydrologyIngestionScheduler exposes an overlap-skipped result without starting a second provider call', async () => {
  let releaseFirstRun: (() => void) | undefined
  let runs = 0
  const observed: Array<{ source: HydrologyIngestionSource; skipped: boolean; inserted: number }> = []
  const scheduler = new HydrologyIngestionScheduler({
    run: async () => {
      runs += 1
      await new Promise<void>((resolve) => { releaseFirstRun = resolve })
      return { inserted: 2, unchanged: 0 }
    },
  }, {
    onRunResult: ({ source, result }) => observed.push({ source, skipped: result.skipped, inserted: result.inserted }),
  })

  const first = scheduler.runSource('PNA')
  await new Promise((resolve) => setImmediate(resolve))
  const overlapping = await scheduler.runSource('PNA')

  assert.deepEqual(overlapping, { inserted: 0, unchanged: 0, retry: null, skipped: true })
  assert.equal(runs, 1)
  releaseFirstRun?.()
  assert.deepEqual(await first, { inserted: 2, unchanged: 0, retry: null, skipped: false })
  assert.deepEqual(observed, [
    { source: 'PNA', skipped: true, inserted: 0 },
    { source: 'PNA', skipped: false, inserted: 2 },
  ])
})
