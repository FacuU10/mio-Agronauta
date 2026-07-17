import test from 'node:test'
import assert from 'node:assert/strict'
import { completionObservationPassesGate, evaluateDatabaseProof, getHydrologyIngestHeaders, sourceResultPassesGate, type ProofDbRow } from './verify-hydrology-local-real'

const correlatedRow: ProofDbRow = {
  id: 'run-row-1',
  proofRunId: 'proof-test-1',
  source: 'PNA',
  recordsIngested: 2,
  status: 'success',
  startedAt: '2026-07-14T12:00:00.000Z',
  finishedAt: '2026-07-14T12:00:01.000Z',
}

test('builds every local ingest request with the trimmed environment token', () => {
  const previousToken = process.env['HYDROLOGY_INGEST_TOKEN']
  const token = `test-${crypto.randomUUID()}`
  process.env['HYDROLOGY_INGEST_TOKEN'] = `  ${token}  `

  try {
    assert.deepEqual(getHydrologyIngestHeaders(), {
      'content-type': 'application/json',
      'x-hydrology-ingest-token': token,
    })
  } finally {
    if (previousToken === undefined) delete process.env['HYDROLOGY_INGEST_TOKEN']
    else process.env['HYDROLOGY_INGEST_TOKEN'] = previousToken
  }
})

test('fails closed before an ingest request when the environment token is missing', () => {
  const previousToken = process.env['HYDROLOGY_INGEST_TOKEN']
  delete process.env['HYDROLOGY_INGEST_TOKEN']

  try {
    assert.throws(() => getHydrologyIngestHeaders(), /HYDROLOGY_INGEST_TOKEN is required/)
  } finally {
    if (previousToken !== undefined) process.env['HYDROLOGY_INGEST_TOKEN'] = previousToken
  }
})

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

test('completion observation proof requires a terminal response with matching correlation and source result', () => {
  const completed = completionObservationPassesGate({
    proofRunId: 'proof-test-1',
    status: 'completed',
    results: [{ source: 'PNA', status: 'success', recordsIngested: 2 }],
  }, 'proof-test-1', 'PNA')
  const queued = completionObservationPassesGate({ proofRunId: 'proof-test-1', status: 'queued', results: [] }, 'proof-test-1', 'PNA')
  const mismatched = completionObservationPassesGate({ proofRunId: 'other-proof', status: 'completed', results: [{ source: 'PNA', status: 'success', recordsIngested: 2 }] }, 'proof-test-1', 'PNA')

  assert.equal(completed, true)
  assert.equal(queued, false)
  assert.equal(mismatched, false)
})
