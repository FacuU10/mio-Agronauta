import test from 'node:test'
import assert from 'node:assert/strict'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  isIdempotentDuplicate,
  isLeaseReclaimable,
  isLegalRuntimeTransition,
  isUnavailableWithoutRisk,
  leaseMetadataSchema,
  runtimeJobEnvelopeSchema,
  runtimeResultSchema,
} from '../../zod-schemas/src/agronautas-runtime.js'

const contractsRoot = join(import.meta.dirname, '..')
const schema = JSON.parse(readFileSync(join(contractsRoot, 'schemas', 'agronautas-runtime.v2.schema.json'), 'utf8'))
const fixture = JSON.parse(readFileSync(join(contractsRoot, 'fixtures', 'agronautas', 'runtime-contract.v2.json'), 'utf8'))

const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)

test('AJV validates the shared positive and negative v2 contract fixture cases', () => {
  for (const contractCase of fixture.cases) {
    const validate = ajv.compile({ $defs: schema.$defs, $ref: `#/$defs/${contractCase.contract}` })
    assert.equal(validate(contractCase.payload), contractCase.valid, contractCase.name)
  }
})

test('the v2 fixture keeps identity, lineage and undecided engine selection explicit', () => {
  const identity = fixture.cases.find((contractCase: { name: string }) => contractCase.name === 'valid-risk-recompute')
  assert.ok(identity)
  assert.equal(identity.payload.contractVersion, '2.0.0')
  assert.equal(identity.payload.jobId, 'job-risk-001')
  assert.equal(identity.payload.runId, 'run-risk-001')
  assert.equal(identity.payload.trace.correlationId, 'corr-risk-001')
  assert.equal(identity.payload.lease.attempt, 1)

  const result = identity.payload.result
  assert.equal(result.engine.selectionStatus, 'undecided')
  assert.equal(result.engine.calibrationStatus, 'not_established')
  assert.equal(result.lineage.forecastAt, '2026-08-27T12:00:00.000Z')
  assert.equal(result.lineage.observedAt, null)
})

test('legal transitions, duplicate identity and atomic lease reclaim guards are explicit', () => {
  for (const transition of fixture.transitions) {
    assert.equal(isLegalRuntimeTransition(transition.from, transition.to), transition.legal, transition.name)
  }

  for (const duplicate of fixture.duplicates) {
    assert.equal(isIdempotentDuplicate(duplicate.existing, duplicate.incoming), duplicate.idempotent, duplicate.name)
  }

  for (const lease of fixture.leaseReclaims) {
    assert.equal(isLeaseReclaimable(lease), lease.reclaimable, lease.name)
  }
})

test('Zod and JSON Schema agree on unavailable-without-risk and bounded result semantics', () => {
  for (const contractCase of fixture.cases.filter((item: { contract: string }) => item.contract === 'RiskRuntimeResult')) {
    const parsed = runtimeResultSchema.safeParse(contractCase.payload)
    assert.equal(parsed.success, contractCase.valid, contractCase.name)
    assert.equal(isUnavailableWithoutRisk(contractCase.payload), contractCase.unavailableWithoutRisk ?? false, contractCase.name)
  }

  const validEnvelope = fixture.cases.find((contractCase: { contract: string; valid: boolean }) => contractCase.contract === 'RuntimeJobEnvelope' && contractCase.valid)
  assert.ok(validEnvelope)
  assert.equal(runtimeJobEnvelopeSchema.safeParse(validEnvelope.payload).success, true)

  for (const leaseCase of fixture.cases.filter((item: { contract: string }) => item.contract === 'LeaseMetadata')) {
    assert.equal(leaseMetadataSchema.safeParse(leaseCase.payload).success, leaseCase.valid, leaseCase.name)
  }

  const reasonValidator = ajv.compile({ $defs: schema.$defs, $ref: '#/$defs/DegradationReason' })
  for (const reason of fixture.reasonCases) {
    assert.equal(reasonValidator(reason.value), reason.valid, reason.name)
  }
})
