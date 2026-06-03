import test from 'node:test'
import assert from 'node:assert/strict'
import { RiskSnapshotFoundation } from '../../../domain/entities/agronautas'
import { PostgresRiskSnapshotRepository } from './agronautas-risk-snapshot-repository'

test('PostgresRiskSnapshotRepository persists auditable fields in save payload', async () => {
  const calls: { sql: string; params: unknown[] }[] = []
  const repository = new PostgresRiskSnapshotRepository({
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params: params ?? [] })
      return { rows: [] }
    },
  } as never)

  await repository.save(
    new RiskSnapshotFoundation({
      snapshotId: 'snapshot-1',
      fieldId: 'field-1',
      runId: 'run-1',
      score: 62.5,
      confidence: 0.74,
      computedAt: new Date('2026-06-03T06:00:00.000Z'),
      validUntil: new Date('2026-06-03T12:00:00.000Z'),
      ruleVersion: 'risk-v0',
      staleCause: 'satellite_data_stale',
      degradationReasons: ['satellite_data_stale'],
      drivers: [{ key: 'satellite_stress', label: 'Satellite stress', weight: 0.25, value: 0.8 }],
      evidenceRefs: ['signal_ingestion_runs:sentinel:satellite:run-1'],
    }),
  )

  assert.match(calls[0]?.sql ?? '', /computed_at, valid_until, rule_version, stale_cause/)
  assert.equal(calls[0]?.params[7] instanceof Date, true)
  assert.equal(calls[0]?.params[8] instanceof Date, true)
  assert.equal(calls[0]?.params[9], 'risk-v0')
  assert.equal(calls[0]?.params[10], 'satellite_data_stale')
  assert.equal(typeof calls[0]?.params[14], 'string')
})
