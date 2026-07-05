import test from 'node:test'
import assert from 'node:assert/strict'
import { Field, RiskSnapshotFoundation, clampConfidence, deriveSnapshotFreshness, estimateFreshnessHours } from './agronautas'

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

test('Field accepts non-rice Corrientes agriculture with crop category metadata', () => {
  const field = new Field({
    id: 'field-maize-1',
    externalFieldId: 'field-maize-1',
    cropCategory: 'cereal',
    crop: 'maize',
    hectares: 20,
    localityName: 'Mercedes',
    provinceCode: 'AR-W',
    centroid: { lat: -29.184, lng: -58.075 },
    boundaryMetadata: {
      sourceName: 'test',
      sourceUrl: 'https://example.com',
      sourceVersion: 'v1',
      normalizationStatus: 'verified',
    },
  })

  assert.equal(field.props.crop, 'maize')
  assert.equal(field.props.cropCategory, 'cereal')
})

test('Field rejects unsupported launch regions and unsupported crops with typed messages', () => {
  const base = {
    id: 'field-1',
    externalFieldId: 'field-1',
    cropCategory: 'cereal',
    crop: 'maize',
    hectares: 20,
    localityName: 'Mercedes',
    provinceCode: 'AR-W',
    centroid: { lat: -29.184, lng: -58.075 },
    boundaryMetadata: {
      sourceName: 'test',
      sourceUrl: 'https://example.com',
      sourceVersion: 'v1',
      normalizationStatus: 'verified',
    },
  } as const

  assert.throws(() => new Field({ ...base, provinceCode: 'AR-S' }), /OUT_OF_SUPPORTED_AREA/)
  assert.throws(() => new Field({ ...base, cropCategory: 'unsupported', crop: 'cotton' }), /UNSUPPORTED_CROP/)
})

test('Risk snapshot foundation derives degraded freshness and medium risk before expiry', () => {
  const snapshot = new RiskSnapshotFoundation({
    snapshotId: 'snap-1',
    fieldId: 'field-1',
    runId: 'run-1',
    score: 55,
    confidence: 0.68,
    computedAt: new Date('2026-06-03T00:00:00.000Z'),
    validUntil: new Date('2099-06-03T08:00:00.000Z'),
    ruleVersion: 'risk-v0',
    degradationReasons: ['satellite_data_stale'],
    evidenceRefs: ['signal_ingestion_runs:provider-a:satellite'],
    drivers: [{ key: 'ndvi', label: 'NDVI', weight: 0.4, value: 0.31 }],
  })

  assert.equal(snapshot.level, 'medium')
  assert.equal(snapshot.freshness, 'degraded')
})

test('deriveSnapshotFreshness centralizes stale, degraded, and fresh precedence', () => {
  assert.equal(deriveSnapshotFreshness({ validUntil: new Date('2026-06-03T01:00:00.000Z'), degradationReasons: [] }, new Date('2026-06-03T01:00:00.000Z')), 'stale')
  assert.equal(deriveSnapshotFreshness({ validUntil: new Date('2026-06-03T02:00:00.000Z'), degradationReasons: ['weather_data_stale'] }, new Date('2026-06-03T01:00:00.000Z')), 'degraded')
  assert.equal(deriveSnapshotFreshness({ validUntil: new Date('2026-06-03T02:00:00.000Z'), degradationReasons: [] }, new Date('2026-06-03T01:00:00.000Z')), 'fresh')
})

test('clampConfidence bounds confidence scores for backend-owned evidence', () => {
  assert.equal(clampConfidence(1.2), 1)
  assert.equal(clampConfidence(0.6789), 0.679)
  assert.equal(clampConfidence(-0.4, 0.2), 0.2)
})

test('estimateFreshnessHours returns bounded positive value', () => {
  const hours = estimateFreshnessHours(new Date('2026-06-03T00:00:00.000Z'), new Date('2026-06-03T03:30:00.000Z'))
  assert.equal(hours, 3.5)
})
