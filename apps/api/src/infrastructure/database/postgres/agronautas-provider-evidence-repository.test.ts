import test from 'node:test'
import assert from 'node:assert/strict'
import { PostgresAgronautasProviderEvidenceRepository } from './agronautas-provider-evidence-repository'

test('provider evidence persistence is scoped, immutable, and idempotent by provider window key', async () => {
  const calls: string[] = []
  const repository = new PostgresAgronautasProviderEvidenceRepository({
    async query(sql: string) {
      calls.push(sql)
      return { rows: [], rowCount: 1 }
    },
    async connect() {
      const client = {
        async query(sql: string) { calls.push(sql); return { rows: [], rowCount: 1 } },
        release() {},
      }
      return client
    },
  } as never)

  const inserted = await repository.saveRun({
    runKey: 'open-meteo:climate:location-1:2026-09-20',
    runId: 'run-1',
    requestId: 'request-1',
    scope: { locationId: 'location-1', workspaceId: 'workspace-1', fieldId: 'field-1' },
    provider: 'open-meteo',
    signalType: 'climate',
    windowStart: new Date('2026-09-20T00:00:00.000Z'),
    windowEnd: new Date('2026-09-21T00:00:00.000Z'),
    evidence: {
      contractVersion: 'agronautas-evidence-v2', evidenceId: 'evidence-1', locationId: 'location-1', workspaceId: 'workspace-1', fieldId: 'field-1', provider: 'open-meteo', signalType: 'climate', providerMode: 'seam', status: 'degraded', sourceUrl: 'https://api.open-meteo.com/v1/forecast', observedAt: null, acquiredAt: null, forecastAt: '2026-09-20T00:00:00.000Z', retrievedAt: '2026-09-20T00:01:00.000Z', units: { temperature: '°C' }, schemaVersion: 'open-meteo-v1', httpStatus: 200, schemaStatus: 'valid', runId: 'run-1', requestId: 'request-1', rawHash: null, freshnessPolicy: 'forecast-window', degradationReasons: ['provider_seam'], retryable: true, value: { temperatureMaxC: 31 },
    },
  })

  assert.equal(inserted, true)
  assert.ok(calls.some((sql) => /ON CONFLICT \(run_key\) DO NOTHING/.test(sql)))
  assert.ok(calls.some((sql) => /ON CONFLICT \(evidence_id\) DO NOTHING/.test(sql)))
  assert.ok(!calls.some((sql) => /UPDATE\s+agronautas_provider_(runs|evidence)/i.test(sql)))
})
