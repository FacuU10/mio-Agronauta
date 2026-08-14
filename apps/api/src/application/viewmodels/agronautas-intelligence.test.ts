import test from 'node:test'
import assert from 'node:assert/strict'
import { Field, FieldContext, RiskSnapshotFoundation, type ClimateSummary } from '../../domain/entities/agronautas'
import { buildAgronautasIntelligenceViewModel } from './agronautas-intelligence'

const field = new Field({
  id: 'field-intelligence-1',
  externalFieldId: 'lot-1',
  crop: 'rice',
  hectares: 12,
  localityName: 'Mercedes',
  provinceCode: 'AR-W',
  centroid: { lat: -29.2, lng: -58.1 },
  boundaryMetadata: { sourceName: 'test', sourceUrl: 'https://example.com', sourceVersion: 'v1', normalizationStatus: 'test' },
})

const context = new FieldContext({
  fieldId: field.props.id,
  growthStage: 'tillering',
  localityCanonical: 'Mercedes',
  localityConfidence: 1,
  contextPayload: { declaredLocality: 'Mercedes' },
})

function climate(overrides: Partial<ClimateSummary> = {}): ClimateSummary {
  return {
    provider: 'open-meteo',
    observedAt: new Date('2026-08-13T10:00:00.000Z'),
    runId: 'run-climate-1',
    sourceRunId: 'source-climate-1',
    acquiredAt: new Date('2026-08-13T10:02:00.000Z'),
    freshnessHours: 2,
    confidence: 0.8,
    freshness: 'fresh',
    provenance: ['signal-ingestion:climate:1'],
    temperatureC: 28,
    rainfallMm7d: 40,
    ...overrides,
  }
}

function risk() {
  return new RiskSnapshotFoundation({
    snapshotId: 'snapshot-risk-1',
    fieldId: field.props.id,
    runId: 'run-risk-1',
    score: 64,
    confidence: 0.7,
    computedAt: new Date('2026-08-13T10:03:00.000Z'),
    validUntil: new Date('2026-08-13T16:03:00.000Z'),
    ruleVersion: 'risk-v0',
    engineId: 'risk-v0',
    engineVersion: 'risk-v0',
    sourceRunIds: ['source-climate-1'],
    drivers: [{ key: 'rainfall_load', label: 'Rainfall load', weight: 1, value: 0.64 }],
    evidenceRefs: ['signal-ingestion:climate:1'],
    degradationReasons: [],
  })
}

test('view model explains existing climate and risk evidence while keeping engine selection undecided', () => {
  const result = buildAgronautasIntelligenceViewModel({
    field,
    context,
    climate: climate(),
    climateTimeline: [climate()],
    risk: risk(),
    riskTimeline: [risk()],
    now: new Date('2026-08-13T10:05:00.000Z'),
  })

  assert.equal(result.climate.state, 'available')
  assert.equal(result.climate.metadata.source, 'open-meteo')
  assert.equal(result.risk.state, 'available')
  assert.equal(result.risk.value.engine.selectionStatus, 'undecided')
  assert.equal(result.explanation.climateTimeline.length, 1)
  assert.deepEqual((result.recommendation as { missingInputs?: string[] }).missingInputs, ['soil', 'crop-history/yield', 'price', 'FX', 'cost'])
})

test('view model preserves degraded latest-good climate lineage and never borrows risk values for economics', () => {
  const result = buildAgronautasIntelligenceViewModel({
    field,
    context,
    climate: climate({ freshness: 'degraded', staleCause: 'latest_good_fallback', degradationReasons: ['weather_data_stale'] }),
    climateTimeline: [],
    risk: null,
    riskTimeline: [],
    now: new Date('2026-08-13T10:05:00.000Z'),
  })

  assert.equal(result.climate.state, 'available')
  assert.equal(result.climate.value.freshness, 'degraded')
  assert.deepEqual(result.climate.metadata.lineage.observationRefs, ['signal-ingestion:climate:1'])
  assert.equal(result.risk.state, 'unavailable')
  assert.equal(result.economics.state, 'insufficient_evidence')
  assert.equal('value' in result.economics, false)
  assert.equal('value' in result.recommendation, false)
})
