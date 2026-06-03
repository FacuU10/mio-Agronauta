import test from 'node:test'
import assert from 'node:assert/strict'
import { PostgresAlertSnapshotRepository } from './agronautas-alert-snapshot-repository'

test('PostgresAlertSnapshotRepository upserts by deterministic snapshot lineage key', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const repository = new PostgresAlertSnapshotRepository({
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params: params ?? [] })
      return { rows: [] }
    },
  })

  await repository.saveMany([{
    alertId: 'field-1:snap-1:flood',
    fieldId: 'field-1',
    basedOnSnapshotId: 'snap-1',
    runId: 'run-1',
    type: 'flood',
    priority: 1,
    confidence: 0.9,
    freshness: 'fresh',
    degradationReasons: [],
  }])

  assert.equal(calls.length, 1)
  assert.match(calls[0]!.sql, /ON CONFLICT \(field_id, risk_snapshot_id, alert_type\) DO UPDATE SET/i)
  assert.match(calls[0]!.sql, /id = EXCLUDED.id/i)
})
