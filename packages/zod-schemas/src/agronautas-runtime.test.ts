import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  AVAILABILITY,
  FRESHNESS,
  RUNTIME_OPERATION,
  RUNTIME_STATE,
  isAvailabilityTruthful,
  isForecastLineageSafe,
  isLegalRuntimeTransition,
  isTypedDegradationReason,
  leaseMetadataSchema,
  runtimeJobEnvelopeSchema,
  runtimeResultSchema,
} from './agronautas-runtime.js'

const fixture = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'contracts', 'fixtures', 'agronautas', 'runtime-contract.v2.json'), 'utf8'))

test('const-backed v2 enums expose the canonical state and availability vocabulary', () => {
  assert.deepEqual(Object.values(RUNTIME_STATE), ['queued', 'leased', 'running', 'waiting', 'succeeded', 'failed', 'dlq', 'cancelled'])
  assert.deepEqual(Object.values(AVAILABILITY), ['available', 'degraded', 'unavailable'])
  assert.deepEqual(Object.values(FRESHNESS), ['fresh', 'degraded', 'stale', 'missing'])
  assert.deepEqual(Object.values(RUNTIME_OPERATION), ['risk-recompute', 'scheduled-window'])
})

test('Zod validates shared envelope and result fixtures, including negative cases', () => {
  for (const contractCase of fixture.cases) {
    const schema = contractCase.contract === 'RuntimeJobEnvelope'
      ? runtimeJobEnvelopeSchema
      : contractCase.contract === 'LeaseMetadata'
        ? leaseMetadataSchema
        : runtimeResultSchema
    assert.equal(schema.safeParse(contractCase.payload).success, contractCase.valid, contractCase.name)
  }
})

test('semantic guards reject illegal transitions, forecast-as-observation drift, and untyped reasons', () => {
  for (const transition of fixture.transitions) {
    assert.equal(isLegalRuntimeTransition(transition.from, transition.to), transition.legal, transition.name)
  }

  for (const lineage of fixture.lineageCases) {
    assert.equal(isForecastLineageSafe(lineage), lineage.valid, lineage.name)
  }

  for (const reason of fixture.reasonCases) {
    assert.equal(isTypedDegradationReason(reason.value), reason.valid, reason.name)
  }
})

test('availability guard requires risk values only for available or degraded outcomes', () => {
  for (const outcome of fixture.availabilityCases) {
    assert.equal(isAvailabilityTruthful(outcome.payload), outcome.valid, outcome.name)
  }

  const unavailable = fixture.cases.find((contractCase: { contract: string; name: string }) => contractCase.contract === 'RiskRuntimeResult' && contractCase.name === 'valid-unavailable-result')
  assert.ok(unavailable)
  assert.equal(runtimeResultSchema.safeParse(unavailable.payload).success, true)
})
