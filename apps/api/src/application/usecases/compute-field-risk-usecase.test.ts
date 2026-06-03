import test from 'node:test'
import assert from 'node:assert/strict'
import { ComputeFieldRiskUseCase } from './compute-field-risk-usecase'
import { FieldContext, RiskSnapshotFoundation, type ClimateSummary, type SatelliteSummary } from '../../domain/entities/agronautas'

function createContext(growthStage = 'flowering') {
  return new FieldContext({
    fieldId: 'field-1',
    growthStage,
    localityCanonical: 'Mercedes',
    localityConfidence: 1,
    nearestStationId: 'station-1',
    contextPayload: {},
  })
}

test('ComputeFieldRiskUseCase persists an auditable degraded snapshot', async () => {
  const savedSnapshots: RiskSnapshotFoundation[] = []
  const useCase = new ComputeFieldRiskUseCase(
    {
      async getLatestClimateSummary(): Promise<ClimateSummary> {
        return {
          provider: 'weather-api',
          observedAt: new Date('2026-06-03T04:00:00.000Z'),
          freshnessHours: 2,
          confidence: 0.92,
          provenance: ['signal_ingestion_runs:weather-api:climate:run-1'],
          temperatureC: 36,
          rainfallMm7d: 110,
          humidityPct: 81,
        }
      },
      async getLatestSatelliteSummary(): Promise<SatelliteSummary> {
        return {
          provider: 'satellite-api',
          observedAt: new Date('2026-05-30T04:00:00.000Z'),
          freshnessHours: 96,
          confidence: 0.8,
          staleCause: 'fallback-from-last-pass',
          provenance: ['signal_ingestion_runs:satellite-api:satellite:run-2'],
          ndvi: 0.31,
          waterStressIndex: 0.77,
        }
      },
    },
    {
      async save() {},
      async getLatest() { return createContext() },
    },
    {
      async save(snapshot) { savedSnapshots.push(snapshot) },
      async getLatest() { return null },
    },
    {
      async acquire() { return true },
      async release() {},
    },
    {
      now: () => new Date('2026-06-03T06:00:00.000Z'),
      idGenerator: (() => {
        const ids = ['run-123', 'snapshot-123']
        return () => ids.shift() ?? 'overflow-id'
      })(),
    },
  )

  const result = await useCase.execute({ fieldId: 'field-1', triggeredBy: 'scheduler' })

  assert.equal(result.status, 'computed')
  assert.equal(savedSnapshots.length, 1)
  assert.equal(result.snapshot.props.ruleVersion, 'risk-v0')
  assert.equal(result.snapshot.freshness, 'degraded')
  assert.ok(result.snapshot.props.degradationReasons.includes('satellite_data_stale'))
  assert.ok(result.snapshot.props.evidenceRefs.includes('field_contexts:field-1'))
  assert.equal(result.snapshot.props.validUntil.toISOString(), '2026-06-03T12:00:00.000Z')
})

test('ComputeFieldRiskUseCase reuses latest snapshot when recompute lock is already held', async () => {
  const existing = new RiskSnapshotFoundation({
    snapshotId: 'snapshot-existing',
    fieldId: 'field-1',
    runId: 'run-existing',
    score: 48,
    confidence: 0.71,
    computedAt: new Date('2026-06-03T03:00:00.000Z'),
    validUntil: new Date('2026-06-03T09:00:00.000Z'),
    ruleVersion: 'risk-v0',
    drivers: [{ key: 'heat_pressure', label: 'Heat pressure', weight: 1, value: 0.48 }],
    evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-existing'],
    degradationReasons: [],
  })

  const useCase = new ComputeFieldRiskUseCase(
    {
      async getLatestClimateSummary() { throw new Error('should not be called') },
      async getLatestSatelliteSummary() { throw new Error('should not be called') },
    },
    {
      async save() { throw new Error('should not be called') },
      async getLatest() { throw new Error('should not be called') },
    },
    {
      async save() { throw new Error('should not save') },
      async getLatest() { return existing },
    },
    {
      async acquire() { return false },
      async release() { throw new Error('should not release') },
    },
  )

  const result = await useCase.execute({ fieldId: 'field-1', triggeredBy: 'api' })
  assert.equal(result.status, 'reused-existing')
  assert.equal(result.lockAcquired, false)
  assert.equal(result.snapshot.props.snapshotId, 'snapshot-existing')
})
