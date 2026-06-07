import test from 'node:test'
import assert from 'node:assert/strict'
import { computePostgresPoolMax, resolveApiWorkerCount } from './pool'

test('computePostgresPoolMax divides an explicit pool override per worker with a floor of 5', () => {
  assert.equal(computePostgresPoolMax(3, '12'), 5)
  assert.equal(computePostgresPoolMax(2, '50'), 25)
})

test('computePostgresPoolMax divides the default pool budget per worker', () => {
  assert.equal(computePostgresPoolMax(4), 5)
  assert.equal(computePostgresPoolMax(2), 10)
})

test('computePostgresPoolMax gives a single worker the default budget', () => {
  assert.equal(computePostgresPoolMax(1), 20)
})

test('computePostgresPoolMax falls back to the default budget for invalid inputs', () => {
  assert.equal(computePostgresPoolMax(4, 'not-a-number'), 5)
  assert.equal(computePostgresPoolMax(0, '12'), 12)
})

test('resolveApiWorkerCount mirrors API cluster worker defaults', () => {
  assert.equal(resolveApiWorkerCount({ NODE_ENV: 'test' }, 8), 1)
  assert.equal(resolveApiWorkerCount({ NODE_ENV: 'production' }, 8), 8)
  assert.equal(resolveApiWorkerCount({ NODE_ENV: 'production' }, 0), 1)
})
