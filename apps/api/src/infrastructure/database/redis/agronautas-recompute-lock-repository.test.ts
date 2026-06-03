import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRecomputeLockKey, RedisRecomputeLockRepository } from './agronautas-recompute-lock-repository'

test('buildRecomputeLockKey namespaces field locks', () => {
  assert.equal(buildRecomputeLockKey('field-42'), 'agronautas:risk-recompute:field-42')
})

test('acquire uses NX with TTL to avoid duplicate recompute', async () => {
  const calls: unknown[][] = []
  const repository = new RedisRecomputeLockRepository({
    async set(...args: unknown[]) {
      calls.push(args)
      return 'OK'
    },
    async del() {
      return 1
    },
  } as never)

  const acquired = await repository.acquire('field-42', 120, { runId: 'run-7', provider: 'weather-api' })

  assert.equal(acquired, true)
  assert.deepEqual(calls[0], [
    'agronautas:risk-recompute:field-42',
    JSON.stringify({ fieldId: 'field-42', runId: 'run-7', provider: 'weather-api' }),
    'EX',
    120,
    'NX',
  ])
})
