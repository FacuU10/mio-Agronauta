import test from 'node:test'
import assert from 'node:assert/strict'
import { RedisSchedulerWindowLock } from './scheduler-lock'
import { SourceWindow } from '../../jobs/agronautas-scheduler'

test('RedisSchedulerWindowLock uses NX with TTL and fallback to PG', async () => {
  const redisCalls: unknown[][] = []
  const pgCalls: { sql: string; params: unknown[] }[] = []

  const mockRedis = {
    async set(...args: unknown[]) {
      redisCalls.push(args)
      return 'OK'
    },
    async del() {
      return 1
    },
    async get() {
      return null
    }
  } as never

  const mockPool = {
    async query(sql: string, params: unknown[]) {
      pgCalls.push({ sql, params: params as unknown[] })
      return { rowCount: 0, rows: [] }
    }
  } as never

  const lock = new RedisSchedulerWindowLock(mockRedis, mockPool)

  const window: SourceWindow = {
    provider: 'open-meteo',
    signalType: 'climate',
    windowStart: new Date('2026-07-04T00:00:00.000Z'),
    windowEnd: new Date('2026-07-04T01:00:00.000Z'),
    runId: 'open-meteo:climate:2026-07-04T00:00:00.000Z'
  }

  const acquired = await lock.acquireWindow(window, 3300)

  assert.equal(acquired, true)
  assert.deepEqual(redisCalls[0], [
    'agronautas:scheduler:lock:open-meteo:climate:2026-07-04T00:00:00.000Z',
    'locked',
    'EX',
    3300,
    'NX'
  ])

  assert.ok(pgCalls[0])
  assert.ok(pgCalls[1])
  assert.equal(pgCalls[0].params[0], 'open-meteo:climate:2026-07-04T00:00:00.000Z')
  assert.equal(pgCalls[1].params[0], 'open-meteo')
  assert.equal(pgCalls[1].params[1], 'climate')
  assert.equal(pgCalls[1].params[2], 'open-meteo:climate:2026-07-04T00:00:00.000Z')
})
