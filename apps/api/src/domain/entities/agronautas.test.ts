import test from 'node:test'
import assert from 'node:assert/strict'
import { Field, RiskSnapshotFoundation, estimateFreshnessHours } from './agronautas'

test('Field rejects coordinates outside world bounds', () => {
  assert.throws(
    () =>
      new Field({
        id: 'field-1',
        externalFieldId: 'field-1',
        crop: 'rice',
        hectares: 20,
        localityName: 'Mercedes',
        provinceCode: 'AR-W',
        centroid: { lat: -120, lng: -58 },
        boundaryMetadata: {
          sourceName: 'test',
          sourceUrl: 'https://example.com',
          sourceVersion: 'v1',
          normalizationStatus: 'verified',
        },
      }),
    /coordinates out of range/,
  )
})

test('Risk snapshot foundation derives degraded freshness and medium risk', () => {
  const computedAt = new Date()
  const validUntil = new Date(computedAt.getTime() + 8 * 3_600_000)
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snap-1',
    fieldId: 'field-1',
    runId: 'run-1',
    score: 55,
    confidence: 0.68,
    computedAt,
    validUntil,
    ruleVersion: 'risk-v0',
    degradationReasons: ['satellite_data_stale'],
    evidenceRefs: ['signal_ingestion_runs:provider-a:satellite'],
    drivers: [{ key: 'ndvi', label: 'NDVI', weight: 0.4, value: 0.31 }],
  })

  assert.equal(snapshot.level, 'medium')
  assert.equal(snapshot.freshness, 'degraded')
})

test('estimateFreshnessHours returns bounded positive value', () => {
  const hours = estimateFreshnessHours(new Date('2026-06-03T00:00:00.000Z'), new Date('2026-06-03T03:30:00.000Z'))
  assert.equal(hours, 3.5)
})
