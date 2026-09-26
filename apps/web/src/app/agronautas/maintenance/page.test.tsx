import test from 'node:test'
import assert from 'node:assert/strict'
import { dynamic } from './page'

test('maintenance route stays runtime-bound', () => {
  assert.equal(dynamic, 'force-dynamic')
})
