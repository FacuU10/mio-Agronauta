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
  assert.deepEqual((result as unknown as { lineage?: unknown }).lineage, {
    riskSnapshotId: 'snapshot-1',
    sourceRunIds: ['run-1'],
    acquisitionTimes: [],
    engineId: 'risk-v0',
    engineVersion: 'risk-v0',
    alertSnapshotIds: [
      'field-1:snapshot-1:flood',
      'field-1:snapshot-1:thermal_stress',
      'field-1:snapshot-1:water_stress',
    ],
  })
})

test('GenerateAlertsUseCase refuses degraded snapshots and never persists alerts', async () => {
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snapshot-degraded',
    fieldId: 'field-1',
    runId: 'run-degraded',
    score: 88,
    confidence: 0.61,
    computedAt: new Date('2026-06-03T05:00:00.000Z'),
    validUntil: new Date('2026-06-03T11:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [{ key: 'rainfall_load', label: 'Rainfall load', weight: 1, value: 0.9 }],
    evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-degraded'],
    degradationReasons: ['weather_data_stale'],
  })
  let saveManyCalls = 0
  const useCase = new GenerateAlertsUseCase(
    { async save() {}, async getLatest() { return snapshot }, async listTimeline() { return [snapshot] } },
    { async saveMany() { saveManyCalls += 1 }, async getLatestForField() { return [] }, async listTimeline() { return [] } },
    { now: () => new Date('2026-06-03T06:00:00.000Z') },
  )

  const result = await useCase.execute({ fieldId: 'field-1', triggeredBy: 'api' })

  assert.equal(result.status, 'degraded-snapshot')
  assert.deepEqual(result.alerts, [])
  assert.equal(saveManyCalls, 0)
  assert.deepEqual(result.lineage, {
    riskSnapshotId: 'snapshot-degraded',
    sourceRunIds: ['run-degraded'],
    acquisitionTimes: [],
    engineId: 'risk-v0',
    engineVersion: 'risk-v0',
    alertSnapshotIds: [],
  })
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

test('GenerateAlertsUseCase deterministically crosses the flood threshold with complete alert lineage', async () => {
  const buildSnapshot = (score: number) => new RiskSnapshotFoundation({
    snapshotId: `snapshot-threshold-${score}`,
    fieldId: 'field-threshold',
    runId: 'run-threshold',
    score,
    confidence: 0.8,
    computedAt: new Date('2026-06-03T04:00:00.000Z'),
    validUntil: new Date('2026-06-03T10:00:00.000Z'),
    ruleVersion: 'risk-v0',
    sourceRunIds: ['source-run-threshold'],
    acquisitionTimes: [new Date('2026-06-03T04:05:00.000Z')],
    drivers: [{ key: 'rainfall_load', label: 'Rainfall load', weight: 1, value: 0 }],
    evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-threshold'],
    degradationReasons: [],
  })

  const run = async (score: number) => {
    const saved: Array<Record<string, unknown>> = []
    const snapshot = buildSnapshot(score)
    const useCase = new GenerateAlertsUseCase(
      { async save() {}, async getLatest() { return snapshot }, async listTimeline() { return [snapshot] } },
      { async saveMany(alerts) { saved.push(...alerts as unknown as Array<Record<string, unknown>>) }, async getLatestForField() { return [] }, async listTimeline() { return [] } },
      { now: () => new Date('2026-06-03T06:00:00.000Z') },
    )
    return { result: await useCase.execute({ fieldId: 'field-threshold', triggeredBy: 'api' }), saved }
  }

  const belowThreshold = await run(69.99)
  assert.equal(belowThreshold.result.alerts.length, 0)
  assert.equal(belowThreshold.saved.length, 0)

  const atThreshold = await run(70)
  assert.deepEqual(atThreshold.result.alerts.map((alert) => alert.alertId), ['field-threshold:snapshot-threshold-70:flood'])
  assert.deepEqual(atThreshold.result.lineage, {
    riskSnapshotId: 'snapshot-threshold-70',
    sourceRunIds: ['source-run-threshold'],
    acquisitionTimes: ['2026-06-03T04:05:00.000Z'],
    engineId: 'risk-v0',
    engineVersion: 'risk-v0',
    alertSnapshotIds: ['field-threshold:snapshot-threshold-70:flood'],
  })
  assert.deepEqual(atThreshold.saved, [{
    alertId: 'field-threshold:snapshot-threshold-70:flood',
    fieldId: 'field-threshold',
    basedOnSnapshotId: 'snapshot-threshold-70',
    runId: 'run-threshold',
    type: 'flood',
    priority: 2,
    confidence: 0.8,
    freshness: 'fresh',
    degradationReasons: [],
    staleCause: undefined,
    sourceRunIds: ['source-run-threshold'],
    acquisitionTimes: [new Date('2026-06-03T04:05:00.000Z')],
    engineId: 'risk-v0',
    engineVersion: 'risk-v0',
  }])
})
