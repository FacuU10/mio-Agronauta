import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HydrologyIngestionScheduler,
  hydrologyIngestionCadences,
  shouldScheduleHydrologyRetry,
  type HydrologyIngestionSource,
} from './hydrology-ingestion-scheduler'

test('hydrologyIngestionCadences defines approved official source schedules', () => {
  assert.deepEqual(hydrologyIngestionCadences.PNA, { kind: 'interval', everyMs: 60 * 60 * 1000 })
  assert.deepEqual(hydrologyIngestionCadences.INMET, { kind: 'interval', everyMs: 60 * 60 * 1000 })
  assert.deepEqual(hydrologyIngestionCadences.SMN_ALERTS, { kind: 'interval', everyMs: 60 * 60 * 1000 })
  assert.deepEqual(hydrologyIngestionCadences.SMN_RAINFALL, { kind: 'interval', everyMs: 3 * 60 * 60 * 1000 })
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
    { source: 'SMN_ALERTS', ms: 60 * 60 * 1000 },
    { source: 'SMN_RAINFALL', ms: 3 * 60 * 60 * 1000 },
  ])
  assert.deepEqual(timeouts, [{ source: 'INA', ms: 30 * 60 * 1000 }])
})

test('shouldScheduleHydrologyRetry returns one delayed PNA retry only for unchanged first attempts', () => {
  const now = new Date('2026-06-23T12:00:00.000Z')
  assert.deepEqual(shouldScheduleHydrologyRetry({ source: 'PNA', inserted: 0, unchanged: 4, attempt: 0, now }), {
    source: 'PNA',
    runAt: new Date('2026-06-23T12:15:00.000Z'),
    attempt: 1,
    status: 'delayed_retry_scheduled',
    reason: 'unchanged_pna_heights',
  })
  assert.equal(shouldScheduleHydrologyRetry({ source: 'PNA', inserted: 0, unchanged: 4, attempt: 1, now }), null)
  assert.equal(shouldScheduleHydrologyRetry({ source: 'PNA', inserted: 1, unchanged: 4, attempt: 0, now }), null)
})

test('shouldScheduleHydrologyRetry never retries unchanged INMET and delays INA by two hours once', () => {
  const now = new Date('2026-06-23T12:00:00.000Z')
  assert.equal(shouldScheduleHydrologyRetry({ source: 'INMET', inserted: 0, unchanged: 2, attempt: 0, now }), null)
  assert.deepEqual(shouldScheduleHydrologyRetry({ source: 'INA', inserted: 0, unchanged: 3, attempt: 0, now }), {
    source: 'INA',
    runAt: new Date('2026-06-23T14:00:00.000Z'),
    attempt: 1,
    status: 'delayed_retry_scheduled',
    reason: 'unchanged_ina_forecast',
  })
  assert.equal(shouldScheduleHydrologyRetry({ source: 'INA', inserted: 0, unchanged: 3, attempt: 1, now }), null)
})

test('HydrologyIngestionScheduler enqueues retry metadata for unchanged PNA runs', async () => {
  const retries: Array<{ source: HydrologyIngestionSource; runAt: Date; attempt: number; reason: string }> = []
  const scheduler = new HydrologyIngestionScheduler({ run: async () => ({ inserted: 0, unchanged: 2 }) }, {
    now: () => new Date('2026-06-23T12:00:00.000Z'),
    enqueueDelayedRetry: async (retry) => { retries.push(retry) },
  })

  const result = await scheduler.runSource('PNA')
  const second = await scheduler.runSource('PNA', { attempt: 1 })

  assert.deepEqual(result.retry, { source: 'PNA', runAt: new Date('2026-06-23T12:15:00.000Z'), attempt: 1, status: 'delayed_retry_scheduled', reason: 'unchanged_pna_heights' })
  assert.equal(second.retry, null)
  assert.deepEqual(retries, [{ source: 'PNA', runAt: new Date('2026-06-23T12:15:00.000Z'), attempt: 1, reason: 'unchanged_pna_heights' }])
})
