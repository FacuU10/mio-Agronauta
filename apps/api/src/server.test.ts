import test from 'node:test'
import assert from 'node:assert/strict'
import { startAgronautasSchedulerFromEnv } from './server'

test('Agronautas scheduler startup seam is disabled safely without feature flag', () => {
  const runtime = startAgronautasSchedulerFromEnv({})

  assert.equal(runtime.started, false)
  assert.equal(runtime.intervalMs, 60 * 60 * 1000)
})

test('Agronautas scheduler startup seam enables hourly runtime behind config flag', () => {
  const runtime = startAgronautasSchedulerFromEnv({ AGRONAUTAS_SCHEDULER_ENABLED: 'true' })

  assert.equal(runtime.started, true)
  runtime.stop()
})

test('Agronautas scheduler startup reads persisted source cadence and last success state', async () => {
  const ticked: string[][] = []
  const runtime = startAgronautasSchedulerFromEnv(
    { AGRONAUTAS_SCHEDULER_ENABLED: 'true' },
    {
      now: () => new Date('2026-07-04T20:00:00.000Z'),
      setInterval: (() => 1 as never) as typeof setInterval,
      clearInterval: (() => undefined) as typeof clearInterval,
      scheduler: {
        async tick(windows) {
          ticked.push(windows.map((window) => `${window.provider}:${window.signalType}`))
          return { enqueued: windows, skipped: [], deadLettered: [] }
        },
      },
      sourceCadenceRepository: {
        async listEnabled() {
          return [
            { provider: 'open-meteo', signalType: 'climate', updateCadenceMinutes: 60, freshnessSlaMinutes: 120, sourceRef: 'test', researchedAt: new Date('2026-07-04T00:00:00.000Z'), enabled: true },
          ]
        },
      },
      signalIngestionRepository: {
        async getLastSuccessfulObservedAtBySource() {
          return new Map([['open-meteo:climate', new Date('2026-07-04T19:30:00.000Z')]])
        },
      },
    },
  )

  assert.equal(runtime.started, true)
  await runtime.runOnce()
  assert.deepEqual(ticked, [[]])
  runtime.stop()
})
