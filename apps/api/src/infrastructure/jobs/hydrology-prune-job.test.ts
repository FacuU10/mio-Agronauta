import test from 'node:test'
import assert from 'node:assert/strict'
import { HydrologyPruneJob } from './hydrology-prune-job'

test('HydrologyPruneJob runs repository prune with 30-day retention', async () => {
  const calls: Array<{ days: number; now: Date }> = []
  const job = new HydrologyPruneJob({ async pruneOldData(days: number, now: Date) { calls.push({ days, now }); return { telemetryDeleted: 1, snapshotsDeleted: 2 } } } as never, { now: () => new Date('2026-06-23T03:00:00.000Z') })

  const result = await job.run()

  assert.deepEqual(result, { telemetryDeleted: 1, snapshotsDeleted: 2 })
  assert.equal(calls[0]?.days, 30)
  assert.equal(calls[0]?.now.toISOString(), '2026-06-23T03:00:00.000Z')
})

test('HydrologyPruneJob schedules next run at 03:00 UTC', () => {
  const job = new HydrologyPruneJob({} as never, { now: () => new Date('2026-06-23T02:30:00.000Z') })
  assert.equal(job.msUntilNextUtcHour(3), 30 * 60 * 1000)
})
