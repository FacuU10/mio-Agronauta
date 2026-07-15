import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateDatabaseProof, sourceResultPassesGate, type ProofDbRow } from './verify-hydrology-local-real'

const correlatedRow: ProofDbRow = {
  id: 'run-row-1',
  proofRunId: 'proof-test-1',
  source: 'PNA',
  recordsIngested: 2,
  status: 'success',
  startedAt: '2026-07-14T12:00:00.000Z',
  finishedAt: '2026-07-14T12:00:01.000Z',
}

test('database proof passes only for a successful source row correlated to the proofRunId', () => {
  const evidence = evaluateDatabaseProof('proof-test-1', 'PNA', { status: 'success', recordsIngested: 2 }, [correlatedRow], false)

  assert.equal(evidence.status, 'pass')
  assert.match(JSON.stringify(evidence.evidence), /run-row-1/)
  assert.deepEqual(evidence.evidence, { rowCount: 1, recordsIngested: 2, rowIds: ['run-row-1'] })
})

test('database proof blocks mismatched and degraded rows instead of treating persistence as provider success', () => {
  const mismatched = evaluateDatabaseProof('other-proof', 'PNA', { status: 'success', recordsIngested: 2 }, [correlatedRow], false)
  const degraded = evaluateDatabaseProof('proof-test-1', 'PNA', { status: 'failed', recordsIngested: 0 }, [{ ...correlatedRow, status: 'failed', recordsIngested: 0 }], true)

  assert.equal(mismatched.status, 'blocked')
  assert.match(mismatched.detail, /no correlated production DB row/i)
  assert.equal(degraded.status, 'pass')
  assert.match(degraded.detail, /status=failed/i)
  assert.equal(sourceResultPassesGate({ status: 'failed', recordsIngested: 0 }, true), false)
  assert.equal(sourceResultPassesGate({ status: 'success', recordsIngested: 2 }, false), true)
})
