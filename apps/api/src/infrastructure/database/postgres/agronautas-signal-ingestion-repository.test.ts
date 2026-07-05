import test from 'node:test'
import assert from 'node:assert/strict'
import { PostgresSignalIngestionRepository } from './agronautas-signal-ingestion-repository'
import { PostgresSourceCadenceRepository } from './agronautas-source-cadence-repository'

test('PostgresSignalIngestionRepository upserts raw evidence by run id', async () => {
  const calls: { sql: string; params: unknown[] }[] = []
  const repository = new PostgresSignalIngestionRepository({
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params: params ?? [] })
      return { rows: [] }
    },
  } as never)

  await repository.saveRun({
    fieldId: 'field-1',
    runId: 'open-meteo:field-1:2026-07-04T19',
    provider: 'open-meteo',
    signalType: 'climate',
    status: 'succeeded',
    startedAt: new Date('2026-07-04T19:00:00.000Z'),
    finishedAt: new Date('2026-07-04T19:00:10.000Z'),
    observedAt: new Date('2026-07-04T18:00:00.000Z'),
    evidencePayload: { raw: { temperature_2m: 31.2 }, normalized: { rainfallMm7d: 12.4 }, confidence: 0.91 },
  })

  assert.match(calls[0]?.sql ?? '', /ON CONFLICT \(run_id\) DO UPDATE/)
  assert.equal(calls[0]?.params[3], 'open-meteo:field-1:2026-07-04T19')
  assert.match(String(calls[0]?.params[9]), /temperature_2m/)
})

test('PostgresSignalIngestionRepository reads latest successful evidence for latest-good fallback', async () => {
  const repository = new PostgresSignalIngestionRepository({
    async query(sql: string, params?: unknown[]) {
      assert.match(sql, /status = 'succeeded'/)
      assert.deepEqual(params, ['field-1', 'fire'])
      return {
        rows: [{
          field_id: 'field-1', provider: 'nasa-firms', signal_type: 'fire', run_id: 'run-good', status: 'succeeded',
          stale_cause: null, started_at: '2026-07-04T15:00:00.000Z', finished_at: '2026-07-04T15:01:00.000Z',
          observed_at: '2026-07-04T14:00:00.000Z', evidence_payload: { hotspots: 2, confidence: 0.86 }, degradation_reason: null,
        }],
      }
    },
  } as never)

  const latest = await repository.findLatestGood('field-1', 'fire')

  assert.equal(latest?.provider, 'nasa-firms')
  assert.equal(latest?.evidencePayload['hotspots'], 2)
  assert.equal(latest?.observedAt?.toISOString(), '2026-07-04T14:00:00.000Z')
})

test('PostgresSourceCadenceRepository persists researched per-source cadence idempotently', async () => {
  const calls: { sql: string; params: unknown[] }[] = []
  const repository = new PostgresSourceCadenceRepository({
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params: params ?? [] })
      return { rows: [] }
    },
  } as never)

  await repository.upsert({
    provider: 'smn-alerts', signalType: 'weather_alert', updateCadenceMinutes: 30,
    freshnessSlaMinutes: 120, rateLimit: 'circuit-breaker-on-503', sourceRef: 'SMN alerts guidance',
    researchedAt: new Date('2026-07-04T00:00:00.000Z'), enabled: true,
  })

  assert.match(calls[0]?.sql ?? '', /ON CONFLICT \(provider, signal_type\) DO UPDATE/)
  assert.deepEqual(calls[0]?.params.slice(0, 4), ['smn-alerts', 'weather_alert', 30, 120])
})

test('PostgresSignalIngestionRepository maps persisted last successful runs by provider and signal type', async () => {
  const repository = new PostgresSignalIngestionRepository({
    async query(sql: string) {
      assert.match(sql, /GROUP BY provider, signal_type/)
      return {
        rows: [
          { provider: 'open-meteo', signal_type: 'climate', last_success_at: '2026-07-04T18:30:00.000Z' },
          { provider: 'sentinel-stac', signal_type: 'satellite', last_success_at: '2026-07-03T10:00:00.000Z' },
        ],
      }
    },
  } as never)

  const lastSuccess = await repository.getLastSuccessfulObservedAtBySource()

  assert.equal(lastSuccess.get('open-meteo:climate')?.toISOString(), '2026-07-04T18:30:00.000Z')
  assert.equal(lastSuccess.get('sentinel-stac:satellite')?.toISOString(), '2026-07-03T10:00:00.000Z')
})
