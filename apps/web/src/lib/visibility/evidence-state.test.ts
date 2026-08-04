import test from 'node:test'
import assert from 'node:assert/strict'
import { EVIDENCE_STATE, normalizeEvidence, normalizeEvidenceList } from './evidence-state'

const evidenceFixtures = {
  observed: { source: 'PNA', observedAt: '2026-07-04T10:00:00.000Z', freshness: 'fresh' as const },
  forecast: { source: 'INA', observedAt: '2026-07-04T10:00:00.000Z', freshness: 'fresh' as const, forecast: true },
  cached: { source: 'PNA', lastSuccessfulObservedAt: '2026-07-04T09:00:00.000Z', freshness: 'cached' as const },
  stale: { source: 'SMN', observedAt: '2026-07-01T10:00:00.000Z', freshness: 'stale' as const },
  degraded: { source: 'INMET', lastSuccessfulObservedAt: '2026-07-01T10:00:00.000Z', freshness: 'degraded' as const },
  missing: { freshness: 'missing' as const, detail: 'No verified telemetry returned.' },
  mock: { source: 'demo-copilot', observedAt: '2026-07-04T10:00:00.000Z', mode: 'mock' as const },
}

test('normalizes each contract evidence state without treating a fixture as live', () => {
  assert.equal(normalizeEvidence(evidenceFixtures.observed).state, EVIDENCE_STATE.OBSERVED)
  assert.equal(normalizeEvidence(evidenceFixtures.forecast).state, EVIDENCE_STATE.FORECAST)
  assert.equal(normalizeEvidence(evidenceFixtures.cached).state, EVIDENCE_STATE.CACHED)
  assert.equal(normalizeEvidence(evidenceFixtures.stale).state, EVIDENCE_STATE.STALE)
  assert.equal(normalizeEvidence(evidenceFixtures.degraded).state, EVIDENCE_STATE.DEGRADED)
  assert.equal(normalizeEvidence(evidenceFixtures.missing).state, EVIDENCE_STATE.MISSING)
  assert.equal(normalizeEvidence(evidenceFixtures.mock).state, EVIDENCE_STATE.MOCK)
})

test('preserves source and timestamps for observed and forecast evidence', () => {
  const observed = normalizeEvidence(evidenceFixtures.observed)
  const forecast = normalizeEvidence(evidenceFixtures.forecast)

  assert.equal(observed.source, 'PNA')
  assert.equal(observed.observedAt, '2026-07-04T10:00:00.000Z')
  assert.equal(forecast.source, 'INA')
  assert.equal(forecast.observedAt, '2026-07-04T10:00:00.000Z')
})

test('rejects an observed or forecast claim without source and timestamp evidence', () => {
  const missingSource = normalizeEvidence({ state: EVIDENCE_STATE.OBSERVED, observedAt: '2026-07-04T10:00:00.000Z' })
  const missingTimestamp = normalizeEvidence({ state: EVIDENCE_STATE.FORECAST, source: 'INA' })

  assert.equal(missingSource.state, EVIDENCE_STATE.MISSING)
  assert.match(missingSource.detail ?? '', /source/i)
  assert.equal(missingTimestamp.state, EVIDENCE_STATE.MISSING)
  assert.match(missingTimestamp.detail ?? '', /timestamp/i)
})

test('mode seam and mock override a live-looking payload and preserve stale latest-good data', () => {
  const mock = normalizeEvidence({ state: EVIDENCE_STATE.OBSERVED, source: 'PNA', observedAt: '2026-07-04T10:00:00.000Z', mode: 'mock' })
  const stale = normalizeEvidence(evidenceFixtures.degraded)
  const list = normalizeEvidenceList([evidenceFixtures.observed, evidenceFixtures.missing])

  assert.equal(mock.state, EVIDENCE_STATE.MOCK)
  assert.equal(mock.mode, 'mock')
  assert.equal(stale.state, EVIDENCE_STATE.DEGRADED)
  assert.equal(stale.lastSuccessfulObservedAt, '2026-07-01T10:00:00.000Z')
  assert.deepEqual(list.map((item) => item.state), [EVIDENCE_STATE.OBSERVED, EVIDENCE_STATE.MISSING])
})

test('invalid timestamps cannot become observed evidence', () => {
  const result = normalizeEvidence({ source: 'PNA', observedAt: 'not-a-timestamp' })

  assert.equal(result.state, EVIDENCE_STATE.MISSING)
  assert.match(result.detail ?? '', /timestamp/i)
})
