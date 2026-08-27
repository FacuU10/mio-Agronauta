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
  adaptLegacyRiskSnapshot,
  adaptLegacyWorkflowJob,
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

test('legacy workflow jobs are read without rewriting their historical shape', () => {
  const legacyJob = {
    contractVersion: '1.0.0',
    jobId: 'legacy-job-1',
    workflowId: 'agronautas-risk-recompute',
    runId: 'legacy-run-1',
    kind: 'agronautas-risk-recompute',
    status: 'succeeded',
    priority: 50,
    createdAt: '2026-06-05T00:00:00.000Z',
    trace: { traceId: 'trace-legacy-123456', correlationId: 'correlation-legacy' },
    payload: { fieldId: 'field-1', triggeredBy: 'api', requestedAt: '2026-06-05T00:00:00.000Z', runtime: { mode: 'real' } },
    lease: { attempt: 1, maxAttempts: 3 },
  }

  const adapted = adaptLegacyWorkflowJob(legacyJob)
  assert.deepEqual(adapted.job, legacyJob)
  assert.equal(adapted.source, 'workflow-job.v1')
  assert.equal(adapted.selectionStatus, 'undecided')
})

test('legacy snapshots preserve values and expose undecided engine metadata', () => {
  const legacySnapshot = {
    contractVersion: '1.0.0',
    snapshotId: 'snapshot-1',
    fieldId: 'field-1',
    score: 42,
    level: 'medium',
    confidence: 0.7,
    computedAt: '2026-06-05T00:00:00.000Z',
    validUntil: '2026-06-06T00:00:00.000Z',
    ruleVersion: 'risk-v0',
    engineId: 'risk-v0',
    engineVersion: 'risk-v0',
    degradationReasons: [],
    evidenceRefs: ['legacy:run-1'],
    drivers: [{ key: 'rain', label: 'Rain', weight: 1, value: 42 }],
  }

  const adapted = adaptLegacyRiskSnapshot(legacySnapshot)
  assert.deepEqual(adapted.snapshot, legacySnapshot)
  assert.equal(adapted.source, 'risk-snapshot.v1')
  assert.deepEqual(adapted.engine, {
    id: 'risk-v0',
    version: 'risk-v0',
    selectionStatus: 'undecided',
    calibrationStatus: 'not_established',
  })
})
