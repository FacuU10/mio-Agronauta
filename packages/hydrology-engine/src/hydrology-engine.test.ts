import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { InaAdapter, InaHttpClient, InmetAdapter, InmetHttpClient, PnaAdapter, PnaHttpClient, SmnAdapter, SmnHttpClient, HydrologyRepository } from './index'

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

test('government municipality migration is additive and defines mapping indexes', async () => {
  const sql = await readFile(resolve(process.cwd(), '../../apps/api/prisma/migrations/20260623210000_government_hydrology_municipalities/migration.sql'), 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS agronautas_municipalities/)
  assert.match(sql, /boundary geometry\(MultiPolygon, 4326\) NOT NULL/)
  assert.match(sql, /evacuation_height_m >= alert_height_m/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS municipality_gauge_mappings/)
  assert.match(sql, /secondary_pna_port_ids TEXT\[\] NOT NULL DEFAULT '\{\}'/)
  assert.match(sql, /USING GIST \(boundary\)/)
  assert.match(sql, /ON agronautas_municipalities \(province_code, name\)/)
  assert.match(sql, /USING GIN \(secondary_pna_port_ids\)/)
  assert.match(sql, /USING GIN \(ina_station_ids\)/)
  assert.match(sql, /USING GIN \(smn_region_ids\)/)
  assert.match(sql, /USING GIN \(inmet_station_ids\)/)
  assert.doesNotMatch(sql, /ALTER TABLE\s+(fields|lots|agronautas_boundaries)/i)
  assert.doesNotMatch(sql, /DROP TABLE/i)
})

test('HydrologyRepository resolves municipality telemetry from gauge mappings without lot context', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const rows = [{
    municipality_id: 'mun-corrientes', locality_id: 'corrientes', municipality_name: 'Corrientes', province_code: 'AR-W',
    alert_height_m: '4.500', evacuation_height_m: '5.500', primary_pna_port_id: 'corrientes', secondary_pna_port_ids: ['barranqueras'],
    ina_station_ids: ['ina-corrientes'], smn_region_ids: ['smn-corrientes'], inmet_station_ids: ['a001'], source: 'PNA', station_id: 'corrientes',
    metric: 'height_m', value: '3.42', unit: 'm', observed_at: new Date('2026-06-23T10:00:00.000Z'), ingested_at: new Date('2026-06-23T10:05:00.000Z'),
    last_successful_observed_at: new Date('2026-06-23T10:00:00.000Z'), quality: 'ok', freshness: 'fresh', tendency: 'creciente', forecast_horizon_days: null, confidence: 'normal', source_url: 'https://prefectura.example/alturas',
  }]
  const db = { async query(sql: string, params: unknown[] = []) { calls.push({ sql, params }); return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } } }
  const repo = new HydrologyRepository(db)

  const municipalities = await repo.getMunicipalityTelemetryOverview('AR-W')

  assert.equal(municipalities.length, 1)
  assert.equal(municipalities[0]?.id, 'mun-corrientes')
  assert.deepEqual(municipalities[0]?.gaugeMappings.secondaryPnaPortIds, ['barranqueras'])
  assert.equal(municipalities[0]?.latestTelemetry[0]?.stationId, 'corrientes')
  assert.equal(municipalities[0]?.latestTelemetry[0]?.value, 3.42)
  assert.match(calls[0]?.sql ?? '', /FROM agronautas_municipalities m/)
  assert.match(calls[0]?.sql ?? '', /LEFT JOIN municipality_gauge_mappings mgm/)
  assert.match(calls[0]?.sql ?? '', /LEFT JOIN LATERAL/)
  assert.doesNotMatch(calls[0]?.sql ?? '', /\bfields\b|\blots\b|crop_copilot/i)
})

test('HydrologyRepository can fetch one municipality dashboard and preserve missing telemetry explicitly', async () => {
  const rows = [{
    municipality_id: 'mun-mercedes', locality_id: 'mercedes', municipality_name: 'Mercedes', province_code: 'AR-W',
    alert_height_m: null, evacuation_height_m: null, primary_pna_port_id: 'paso_de_los_libres', secondary_pna_port_ids: [],
    ina_station_ids: [], smn_region_ids: [], inmet_station_ids: [], source: null, station_id: null,
    metric: null, value: null, unit: null, observed_at: null, ingested_at: null, last_successful_observed_at: null,
    quality: null, freshness: null, tendency: null, forecast_horizon_days: null, confidence: null, source_url: null,
  }]
  const db = { async query(sql: string, params: unknown[] = []) { return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } } }
  const repo = new HydrologyRepository(db)

  const dashboard = await repo.getMunicipalityTelemetryDashboard('mun-mercedes')

  assert.equal(dashboard?.municipality.name, 'Mercedes')
  assert.deepEqual(dashboard?.latestTelemetry, [])
  assert.equal(dashboard?.gaugeMappings.primaryPnaPortId, 'paso_de_los_libres')
})

test('HydrologyRepository saveTelemetryDeduped skips timestamp-only and epsilon-equivalent values while saving ingestion run', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const latestRows = [
    { value: '3.42005' },
    { value: null },
    { value: '12.5' },
  ]
  const db = { async query(sql: string, params: unknown[] = []) {
    calls.push({ sql, params })
    if (/SELECT value\s+FROM hydrology_telemetry/i.test(sql)) return { rows: [latestRows.shift()], rowCount: 1, command: '', oid: 0, fields: [] }
    return { rows: [], rowCount: 1, command: '', oid: 0, fields: [] }
  } }
  const repo = new HydrologyRepository(db)
  const observedAt = new Date('2026-06-23T10:00:00.000Z')

  const summary = await repo.saveTelemetryDeduped([
    { source: 'PNA', stationId: 'corrientes', metric: 'river_height_m', unit: 'm', value: 3.42, observedAt: new Date('2026-06-23T11:00:00.000Z'), lastSuccessfulObservedAt: observedAt, quality: 'ok', freshness: 'fresh' },
    { source: 'SMN', stationId: 'alerta-corrientes', metric: 'storm_alert', unit: 'severity', value: null, observedAt, lastSuccessfulObservedAt: observedAt, quality: 'ok', freshness: 'fresh' },
    { source: 'INMET', stationId: 'br-pr-1', metric: 'rain_mm', unit: 'mm', value: null, observedAt, lastSuccessfulObservedAt: observedAt, quality: 'ok', freshness: 'fresh' },
  ], { source: 'PNA', stationId: 'corrientes', status: 'success', startedAt: observedAt, recordsIngested: 3 })

  assert.deepEqual(summary, { inserted: 1, unchanged: 2 })
  assert.equal(calls.filter((call) => /INSERT INTO hydrology_ingestion_runs/i.test(call.sql)).length, 1)
  assert.equal(calls.filter((call) => /INSERT INTO hydrology_telemetry/i.test(call.sql)).length, 1)
})

test('HydrologyRepository saveTelemetryDeduped inserts changed numeric values and distinct forecast horizons', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const db = { async query(sql: string, params: unknown[] = []) {
    calls.push({ sql, params })
    if (/SELECT value\s+FROM hydrology_telemetry/i.test(sql)) return { rows: [{ value: '3.42' }], rowCount: 1, command: '', oid: 0, fields: [] }
    return { rows: [], rowCount: 1, command: '', oid: 0, fields: [] }
  } }
  const repo = new HydrologyRepository(db)
  const observedAt = new Date('2026-06-23T10:00:00.000Z')

  const summary = await repo.saveTelemetryDeduped([
    { source: 'INA', stationId: 'ituzaingo', metric: 'river_height_m', unit: 'm', value: 3.421, observedAt, lastSuccessfulObservedAt: observedAt, quality: 'ok', freshness: 'fresh', forecastHorizonDays: 7 },
    { source: 'INA', stationId: 'ituzaingo', metric: 'river_height_m', unit: 'm', value: 3.42, observedAt, lastSuccessfulObservedAt: observedAt, quality: 'ok', freshness: 'fresh', forecastHorizonDays: 31 },
  ], { source: 'INA', stationId: 'ituzaingo', status: 'success', startedAt: observedAt, recordsIngested: 2 })

  assert.deepEqual(summary, { inserted: 1, unchanged: 0 })
  assert.equal(calls.filter((call) => /INSERT INTO hydrology_telemetry/i.test(call.sql)).length, 1)
  assert.equal(calls.find((call) => /SELECT value\s+FROM hydrology_telemetry/i.test(call.sql))?.params[4], 7)
})

test('government HTTP clients set user agent and parse successful official payloads', async () => {
  const requests: Array<{ url: string; headers: unknown }> = []
  const fetchOk = async (input: string | URL | Request, init?: Parameters<typeof fetch>[1]) => {
    requests.push({ url: String(input), headers: init?.headers })
    const body = String(input).includes('pna')
      ? '<tr data-station="ituzaingo" data-observed-at="2026-06-23T10:30:00.000Z"><td>Altura: 3,21</td></tr>'
      : String(input).includes('smn')
        ? JSON.stringify({ rainfall: [{ stationId: 'posadas', province: 'Misiones', observedAt: '2026-06-23T09:00:00.000Z', rainMm: 80 }] })
        : String(input).includes('inmet')
          ? JSON.stringify({ measurements: [{ stationId: 'br-pr-1', uf: 'PR', observedAt: '2026-06-23T09:00:00.000Z', rainMm: 55 }] })
          : JSON.stringify({ predictions: [{ stationId: 'corrientes', observedAt: '2026-06-23T10:30:00.000Z', heightM: 4.1 }] })
    return new Response(body, { status: 200 })
  }

  const results = await Promise.all([
    new PnaHttpClient({ url: 'https://official.test/pna', fetch: fetchOk }).fetchTelemetry(),
    new SmnHttpClient({ url: 'https://official.test/smn', fetch: fetchOk }).fetchTelemetry(),
    new InmetHttpClient({ url: 'https://official.test/inmet', fetch: fetchOk }).fetchTelemetry(),
    new InaHttpClient({ url: 'https://official.test/ina', fetch: fetchOk }).fetchTelemetry(),
  ])

  assert.deepEqual(results.map((result) => result.ok), [true, true, true, true])
  assert.deepEqual(results.map((result) => result.ok ? result.records.length : 0), [1, 1, 1, 1])
  assert.ok(requests.every((request) => JSON.stringify(request.headers).includes('Ibera-Alerta')))
})

test('government HTTP clients return parsed failures for network, status, and malformed payload errors', async () => {
  const networkFailure = await new PnaHttpClient({ url: 'https://official.test/pna', fetch: async () => { throw new Error('socket hang up') } }).fetchTelemetry()
  const statusFailure = await new SmnHttpClient({ url: 'https://official.test/smn', fetch: async () => new Response('{}', { status: 503, statusText: 'Service Unavailable' }) }).fetchTelemetry()
  const parseFailure = await new InaHttpClient({ url: 'https://official.test/ina', fetch: async () => new Response('{bad json', { status: 200 }) }).fetchTelemetry()

  assert.deepEqual([networkFailure.ok, statusFailure.ok, parseFailure.ok], [false, false, false])
  assert.match(networkFailure.ok ? '' : networkFailure.error, /PNA.*socket hang up/)
  assert.match(statusFailure.ok ? '' : statusFailure.error, /SMN.*503/)
  assert.match(parseFailure.ok ? '' : parseFailure.error, /INA.*payload/i)
})
