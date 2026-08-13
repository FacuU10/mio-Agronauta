import test from 'node:test'
import assert from 'node:assert/strict'
import { toActivityResponse } from './agronautas-management'

test('activity view model is deterministic, source-labelled, and newest first', () => {
  const response = toActivityResponse('field-1', [
    { sourceType: 'field', sourceId: 'field-1', occurredAt: new Date('2026-08-13T09:00:00.000Z'), title: 'Field record created' },
    { sourceType: 'risk_snapshot', sourceId: 'snap-1', occurredAt: new Date('2026-08-13T10:00:00.000Z'), title: 'Risk snapshot persisted' },
  ])

  assert.deepEqual(response.items.map((item) => item.activityId), ['risk_snapshot:snap-1', 'field:field-1'])
  assert.equal(response.items[0]?.sourceType, 'risk_snapshot')
})
