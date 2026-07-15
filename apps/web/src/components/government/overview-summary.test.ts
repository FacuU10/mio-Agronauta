import assert from 'node:assert/strict'
import test from 'node:test'
import { municipalityTelemetrySummary } from './overview-summary'

test('municipalityTelemetrySummary exposes current PNA and INA levels with official INA provenance', () => {
  const summary = municipalityTelemetrySummary([
    { source: 'PNA', metric: 'river_height_m', value: 3.2, unit: 'm', observedAt: '2026-07-14T19:00:00.000Z', lastSuccessfulObservedAt: '2026-07-14T19:00:00.000Z' },
    { source: 'INA', metric: 'river_height_m', value: 4.31, unit: 'm', observedAt: '2026-07-14T19:05:00.000Z', lastSuccessfulObservedAt: '2026-07-14T19:05:00.000Z', sourceUrl: 'https://alerta.ina.gob.ar/a5/getObservaciones/6764' },
  ])

  assert.deepEqual(summary, {
    pnaHeightM: 3.2,
    inaHeightM: 4.31,
    inaObservedAt: '2026-07-14T19:05:00.000Z',
    inaSourceUrl: 'https://alerta.ina.gob.ar/a5/getObservaciones/6764',
    lastSuccessfulObservedAt: '2026-07-14T19:05:00.000Z',
  })
})

test('municipalityTelemetrySummary keeps INA unavailable without substituting weather telemetry', () => {
  const summary = municipalityTelemetrySummary([
    { source: 'INMET', metric: 'rain_mm', value: 48, unit: 'mm', observedAt: '2026-07-14T19:00:00.000Z', lastSuccessfulObservedAt: '2026-07-14T19:00:00.000Z', sourceUrl: 'https://example.test/inmet' },
  ])

  assert.deepEqual(summary, {
    pnaHeightM: null,
    inaHeightM: null,
    inaObservedAt: null,
    inaSourceUrl: null,
    lastSuccessfulObservedAt: '2026-07-14T19:00:00.000Z',
  })
})
