import test from 'node:test'
import assert from 'node:assert/strict'
import { RiskSnapshotFoundation } from '../../domain/entities/agronautas'
import { GenerateAlertsUseCase } from './generate-alerts-usecase'

test('GenerateAlertsUseCase derives prioritized alerts only from fresh snapshots', async () => {
  const saved: unknown[] = []
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snapshot-1',
    fieldId: 'field-1',
    runId: 'run-1',
    score: 84,
    confidence: 0.9,
    computedAt: new Date('2026-06-03T04:00:00.000Z'),
    validUntil: new Date('2026-06-03T10:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [
      { key: 'heat_pressure', label: 'Heat pressure', weight: 0.35, value: 0.92 },
      { key: 'rainfall_load', label: 'Rainfall load', weight: 0.3, value: 0.75 },
      { key: 'satellite_stress', label: 'Satellite stress', weight: 0.25, value: 0.81 },
    ],
    evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-1'],
    degradationReasons: [],
  })

  const useCase = new GenerateAlertsUseCase(
    {
      async save() {},
      async getLatest() { return snapshot },
      async listTimeline() { return [snapshot] },
    },
    {
      async saveMany(alerts) { saved.push(...alerts) },
      async getLatestForField() { return [] },
      async listTimeline() { return [] },
    },
    { now: () => new Date('2026-06-03T06:00:00.000Z') },
  )

  const result = await useCase.execute({ fieldId: 'field-1', triggeredBy: 'api' })

  assert.equal(result.status, 'generated')
  assert.equal(result.alerts.length, 3)
  assert.deepEqual(result.alerts.map((alert) => alert.alertId).sort(), [
    'field-1:snapshot-1:flood',
    'field-1:snapshot-1:thermal_stress',
    'field-1:snapshot-1:water_stress',
  ])
  assert.equal(result.alerts[0]?.priority, 1)
  assert.equal(saved.length, 3)
})

test('GenerateAlertsUseCase refuses stale snapshots', async () => {
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snapshot-stale',
    fieldId: 'field-1',
    runId: 'run-2',
    score: 65,
    confidence: 0.77,
    computedAt: new Date('2026-06-03T00:00:00.000Z'),
    validUntil: new Date('2026-06-03T01:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [{ key: 'satellite_stress', label: 'Satellite stress', weight: 1, value: 0.9 }],
    evidenceRefs: ['signal_ingestion_runs:satellite-api:satellite:run-2'],
    degradationReasons: [],
  })

  const useCase = new GenerateAlertsUseCase(
    {
      async save() {},
      async getLatest() { return snapshot },
      async listTimeline() { return [snapshot] },
    },
    {
      async saveMany() { throw new Error('should not save alerts from stale snapshot') },
      async getLatestForField() { return [] },
      async listTimeline() { return [] },
    },
    { now: () => new Date('2026-06-03T06:00:00.000Z') },
  )

  const result = await useCase.execute({ fieldId: 'field-1', triggeredBy: 'api' })
  assert.equal(result.status, 'stale-snapshot')
  assert.equal(result.alerts.length, 0)
})
