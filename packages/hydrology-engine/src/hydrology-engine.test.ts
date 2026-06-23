import test from 'node:test'
import assert from 'node:assert/strict'
import { InaAdapter, InmetAdapter, PnaAdapter, SmnAdapter, HydrologyRepository } from './index'

test('PNA and INA adapters parse heights, tendencies, and cap forecasts at 30 days', () => {
  const now = new Date('2026-06-23T12:00:00.000Z')
  const pna = new PnaAdapter().parse('<tr data-station="ituzaingo" data-observed-at="2026-06-23T10:30:00.000Z"><td>Altura: 3,21</td><td>Tendencia: creciente</td><td data-forecast-days="20">3,80</td><td data-forecast-days="31">4,10</td></tr>', now)
  const ina = new InaAdapter().parse({ predictions: [{ stationId: 'corrientes', observedAt: '2026-06-23T10:30:00.000Z', heightM: 4.1, tendency: 'estable', forecast: [{ horizonDays: 10, heightM: 4.2 }, { horizonDays: 30, heightM: 4.8 }, { horizonDays: 45, heightM: 5.1 }] }] }, now)

  assert.equal(pna.length, 2)
  assert.equal(pna[1]?.confidence, 'speculative')
  assert.equal(ina.length, 3)
  assert.equal(ina[1]?.confidence, 'normal')
  assert.equal(ina[2]?.confidence, 'speculative')
  assert.equal(ina[0]?.lastSuccessfulObservedAt.toISOString(), '2026-06-23T10:30:00.000Z')
})

test('INMET and SMN adapters keep relevant rain telemetry and storm alerts only', () => {
  const inmet = new InmetAdapter().parse({ measurements: [
    { stationId: 'br-pr-1', uf: 'PR', basin: 'Iguaçu', observedAt: '2026-06-23T09:00:00.000Z', rainMm: 55 },
    { stationId: 'br-sp-1', uf: 'SP', observedAt: '2026-06-23T09:00:00.000Z', rainMm: 12 },
  ] })
  const smn = new SmnAdapter().parse({ rainfall: [{ stationId: 'posadas', province: 'Misiones', observedAt: '2026-06-23T09:00:00.000Z', rainMm: 80 }], alerts: [{ regionId: 'corrientes-alerta', province: 'Corrientes', observedAt: '2026-06-23T09:00:00.000Z', severity: 3, title: 'Tormentas fuertes' }] })

  assert.equal(inmet.length, 1)
  assert.equal(smn.length, 2)
  assert.equal(smn[1]?.metric, 'storm_alert')
})

test('HydrologyRepository maps zones using ST_Intersects and prunes 30-day operational data', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const result = (rows: unknown[], rowCount: number) => ({ rows, rowCount, command: '', oid: 0, fields: [] })
  const db = { async query(sql: string, params: unknown[] = []) { calls.push({ sql, params }); return sql.includes('SELECT locality_name') ? result([{ locality_name: 'Mercedes' }], 1) : result([], 2) } }
  const repo = new HydrologyRepository(db)

  const mapping = await repo.mapFieldToHydrologyZone('MULTIPOLYGON(((-58 -29,-57 -29,-57 -28,-58 -28,-58 -29)))', 'field-1')
  const pruned = await repo.pruneOldData(30, new Date('2026-06-23T00:00:00.000Z'))

  assert.deepEqual(mapping.referencePorts, ['paso_de_la_patria', 'corrientes'])
  assert.match(calls[0]?.sql ?? '', /ST_Intersects/)
  assert.equal((calls[1]?.params[0] as Date).toISOString(), '2026-05-24T00:00:00.000Z')
  assert.deepEqual(pruned, { telemetryDeleted: 2, snapshotsDeleted: 2 })
})
