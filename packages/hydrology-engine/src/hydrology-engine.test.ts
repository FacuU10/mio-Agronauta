import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { HYDROLOGY_BRAZIL_EXTENSION, InaAdapter, InaHttpClient, InmetAdapter, InmetHttpClient, PnaAdapter, PnaHttpClient, SmnAdapter, SmnHttpClient, HydrologyRepository } from './index'

test('Brazil remains an explicit data-free extension point until official sources and BR to Corrientes influence are verified', () => {
  assert.deepEqual(HYDROLOGY_BRAZIL_EXTENSION, {
    countryCode: 'BR',
    stationIds: [],
    municipalityIds: [],
    upstreamInfluence: { fromCountryCode: 'BR', toProvinceCode: 'AR-W', relation: 'requires_official_source_and_verified_model' },
  })
})

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

test('official RSS alerts retain approved coverage keys while dynamic alert IDs stay non-mappable', () => {
  const smn = new SmnAdapter().parse('<rss><channel><item><title>Alerta por tormentas en Corrientes</title><link>https://smn.example/CAP_20260714204142_alerta</link><pubDate>2026-07-18T10:00:00Z</pubDate><description>Corrientes</description></item><item><title>Alerta en Misiones</title><link>https://smn.example/CAP_20260714204143_alerta</link><pubDate>2026-07-18T10:00:00Z</pubDate><description>Misiones</description></item></channel></rss>')
  const inmet = new InmetAdapter().parse('<rss><channel><item><title>Aviso meteorológico A830</title><link>https://inmet.example/54990.xml</link><pubDate>2026-07-18T10:00:00Z</pubDate><description>Estação A830</description></item><item><title>Aviso meteorológico nacional</title><link>https://inmet.example/54991.xml</link><pubDate>2026-07-18T10:00:00Z</pubDate><description>Sem estação aprovada</description></item></channel></rss>')

  assert.deepEqual(smn.map((record) => [record.stationId, record.providerAlertId, record.coverageKey]), [['smn-corrientes', '20260714204142', 'smn-corrientes'], ['smn-alerts', '20260714204143', undefined]])
  assert.deepEqual(inmet.map((record) => [record.stationId, record.providerAlertId, record.coverageKey]), [['A830', '54990', 'A830'], ['inmet-alerts', '54991', undefined]])
})

test('HydrologyRepository maps zones using ST_Intersects without deleting historical telemetry', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const result = (rows: unknown[], rowCount: number) => ({ rows, rowCount, command: '', oid: 0, fields: [] })
  const db = { async query(sql: string, params: unknown[] = []) { calls.push({ sql, params }); return sql.includes('SELECT locality_name') ? result([{ locality_name: 'Mercedes' }], 1) : result([], 2) } }
  const repo = new HydrologyRepository(db)

  const mapping = await repo.mapFieldToHydrologyZone('MULTIPOLYGON(((-58 -29,-57 -29,-57 -28,-58 -28,-58 -29)))', 'field-1')
  const pruned = await repo.pruneOldData(30, new Date('2026-06-23T00:00:00.000Z'))

  assert.deepEqual(mapping.referencePorts, ['paso_de_la_patria', 'corrientes'])
  assert.match(calls[0]?.sql ?? '', /ST_Intersects/)
  assert.equal(calls.length, 2)
  assert.deepEqual(pruned, { telemetryDeleted: 0, snapshotsDeleted: 0, ledgerDeleted: 0 })
})

test('HydrologyRepository returns source freshness from successful ingestion runs and exposes failed latest runs', async () => {
  const db = { async query(sql: string) {
    assert.match(sql, /hydrology_ingestion_runs/)
    return {
      rows: [
        { source: 'INMET', latest_status: 'failed', latest_records_ingested: 0, last_successful_observed_at: '2026-07-01T10:00:00.000Z' },
        { source: 'SMN', latest_status: 'success', latest_records_ingested: 0, last_successful_observed_at: '2026-07-02T10:00:00.000Z' },
      ], rowCount: 2, command: 'SELECT', oid: 0, fields: [],
    }
  } }
  const result = await new HydrologyRepository(db).getSourceFreshness()
  assert.deepEqual(result, [
    { source: 'INMET', latestStatus: 'failed', latestRecordsIngested: 0, lastSuccessfulObservedAt: '2026-07-01T10:00:00.000Z' },
    { source: 'SMN', latestStatus: 'success', latestRecordsIngested: 0, lastSuccessfulObservedAt: '2026-07-02T10:00:00.000Z' },
  ])
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

test('Iberá ingest ledger migration is additive, indexed, and rollback-isolatable', async () => {
  const sql = await readFile(resolve(process.cwd(), '../../apps/api/prisma/migrations/20260811120000_ibera_ingest_ledger/migration.sql'), 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS ibera_ingest_runs/)
  assert.match(sql, /scheduled_slot TEXT UNIQUE/)
  assert.match(sql, /source_results JSONB NOT NULL DEFAULT '\[\]'::jsonb/)
  assert.match(sql, /diagnostics JSONB NOT NULL DEFAULT '\{\}'::jsonb/)
  assert.match(sql, /ALTER TABLE hydrology_ingestion_runs\s+ADD COLUMN IF NOT EXISTS ibera_run_id TEXT/)
  assert.match(sql, /ALTER TABLE hydrology_ingestion_runs\s+ADD COLUMN IF NOT EXISTS diagnostics JSONB/)
  assert.doesNotMatch(sql, /DROP TABLE/i)
  assert.doesNotMatch(sql, /DELETE FROM hydrology_(telemetry|ingestion_runs)/i)
})

test('Iberá ledger schema repair is additive and heals partially applied deployments', async () => {
  const sql = await readFile(resolve(process.cwd(), '../../apps/api/prisma/migrations/20260812100000_ibera_ingest_ledger_schema_repair/migration.sql'), 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS ibera_ingest_runs/)
  assert.match(sql, /ALTER TABLE hydrology_ingestion_runs\s+ADD COLUMN IF NOT EXISTS ibera_run_id TEXT/)
  assert.match(sql, /ALTER TABLE hydrology_ingestion_runs\s+ADD COLUMN IF NOT EXISTS diagnostics JSONB/)
  assert.match(sql, /hydrology_ingestion_runs_ibera_run_fk/)
  assert.match(sql, /hydrology_ingestion_runs_ibera_run_idx/)
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|DELETE FROM hydrology_(telemetry|ingestion_runs)/i)
})

test('Iberá ingest run listing is bounded, newest-first, and read-only', async () => {
  const calls: string[] = []
  const db = { async query(sql: string) {
    calls.push(sql)
    return { rows: [{ id: 'run-2', proof_run_id: 'proof-2', status: 'completed', requested_sources: ['PNA'], source_results: [], diagnostics: {}, reason: null, started_at: '2026-08-13T10:00:00.000Z', finished_at: '2026-08-13T10:01:00.000Z', expires_at: '2026-08-14T10:00:00.000Z', created_at: '2026-08-13T10:00:00.000Z', updated_at: '2026-08-13T10:01:00.000Z' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] }
  } }
  const result = await new HydrologyRepository(db).listIberaIngestRuns({ limit: 1 })
  assert.equal(result.items[0]?.id, 'run-2')
  assert.match(calls[0] ?? '', /FROM ibera_ingest_runs/)
  assert.match(calls[0] ?? '', /ORDER BY started_at DESC, id DESC/)
  assert.doesNotMatch(calls.join('\n'), /(?:^|\s)(INSERT|UPDATE|DELETE)(?:\s|$)/i)
})


test('HydrologyRepository persists and reconstructs an Iberá run with stable source diagnostics', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const row = {
    id: 'run-ledger-1',
    proof_run_id: 'proof-ledger-1',
    status: 'partial',
    requested_sources: ['PNA', 'SMN'],
    source_results: [{ source: 'PNA', status: 'success', recordsIngested: 2 }],
    diagnostics: { SMN: { failureKind: 'network_failure', attempts: 1 } },
    scheduled_slot: null,
    reason: 'manual',
    started_at: '2026-08-11T12:00:00.000Z',
    finished_at: '2026-08-11T12:01:00.000Z',
    expires_at: '2026-08-12T12:01:00.000Z',
  }
  const db = {
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql, params })
      if (/RETURNING id/.test(sql)) return { rows: [row], rowCount: 1, command: 'INSERT', oid: 0, fields: [] }
      if (/FROM ibera_ingest_runs/.test(sql)) return { rows: [row], rowCount: 1, command: 'SELECT', oid: 0, fields: [] }
      return { rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] }
    },
  }
  const repo = new HydrologyRepository(db)

  await repo.createIberaIngestRun({
    id: 'run-ledger-1',
    proofRunId: 'proof-ledger-1',
    status: 'queued',
    requestedSources: ['PNA', 'SMN'],
    sourceResults: [],
    diagnostics: {},
    reason: 'manual',
    startedAt: new Date('2026-08-11T12:00:00.000Z'),
    expiresAt: new Date('2026-08-12T12:01:00.000Z'),
  })
  await repo.updateIberaIngestRun('run-ledger-1', {
    status: 'partial',
    sourceResults: [{ source: 'PNA', status: 'success', recordsIngested: 2 }],
    diagnostics: { SMN: { failureKind: 'network_failure', attempts: 1 } },
    finishedAt: new Date('2026-08-11T12:01:00.000Z'),
  })
  const persisted = await repo.getIberaIngestRun('run-ledger-1')

  assert.equal(persisted?.status, 'partial')
  assert.deepEqual(persisted?.requestedSources, ['PNA', 'SMN'])
  assert.deepEqual(persisted?.sourceResults, [{ source: 'PNA', status: 'success', recordsIngested: 2 }])
  assert.deepEqual(persisted?.diagnostics, { SMN: { failureKind: 'network_failure', attempts: 1 } })
  assert.ok(calls.some(({ sql }) => /ibera_ingest_runs/.test(sql)))
})

test('HydrologyRepository claims an unleased or expired Iberá slot with a compare-and-set lease', async () => {
  const row = {
    id: 'scheduled-run', proof_run_id: 'scheduled-proof', status: 'queued', requested_sources: ['PNA'],
    scheduled_slot: 'PNA:2026-06-23T18:00:00.000Z', lease_owner: null, lease_expires_at: null,
    source_results: [], diagnostics: {}, reason: 'scheduler', started_at: new Date('2026-06-23T18:00:00.000Z'),
    finished_at: null, expires_at: new Date('2026-06-24T18:00:00.000Z'), created_at: new Date('2026-06-23T18:00:00.000Z'), updated_at: new Date('2026-06-23T18:00:00.000Z'),
  }
  const calls: Array<{ sql: string; params?: unknown[] }> = []
  const db = {
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params })
      if (/UPDATE ibera_ingest_runs/.test(sql)) return { rows: [{ ...row, status: 'started', lease_owner: 'instance-a', lease_expires_at: new Date('2026-06-23T18:02:00.000Z') }], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] }
    },
  }

  const claimed = await new HydrologyRepository(db).claimIberaIngestLease('scheduled-run', 'instance-a', new Date('2026-06-23T18:01:00.000Z'), 60_000)

  assert.equal(claimed?.leaseOwner, 'instance-a')
  assert.equal(claimed?.status, 'started')
  assert.match(calls[0]?.sql ?? '', /lease_expires_at <= \$3|lease_owner IS NULL/)
  assert.equal(calls[0]?.params?.[3], 60_000)
})

test('HydrologyRepository prunes only expired Iberá ledger rows with a SQL batch bound', async () => {
  const calls: Array<{ sql: string; params?: unknown[] }> = []
  const db = {
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params })
      return { rows: [{ id: 'expired-run' }], rowCount: 1, command: 'DELETE', oid: 0, fields: [] }
    },
  }

  const result = await new HydrologyRepository(db).pruneOldData(30, new Date('2026-06-23T00:00:00.000Z'))

  assert.deepEqual(result, { telemetryDeleted: 0, snapshotsDeleted: 0, ledgerDeleted: 1 })
  assert.match(calls[0]?.sql ?? '', /FOR UPDATE SKIP LOCKED/)
  assert.match(calls[0]?.sql ?? '', /LIMIT \$2/)
  assert.equal(calls[0]?.params?.[1], 100)
  assert.doesNotMatch(calls[0]?.sql ?? '', /DELETE FROM hydrology_telemetry/)
})

test('municipality alert coverage migration is additive and rejects dynamic alert identifiers', async () => {
  const sql = await readFile(resolve(process.cwd(), '../../apps/api/prisma/migrations/20260718120000_municipality_alert_coverage/migration.sql'), 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS municipality_alert_coverage/)
  assert.match(sql, /municipality_id TEXT NOT NULL REFERENCES agronautas_municipalities\(id\)/)
  assert.match(sql, /official_coverage_key TEXT NOT NULL/)
  assert.match(sql, /seed_version TEXT NOT NULL/)
  assert.match(sql, /WHERE active/)
  assert.match(sql, /NOT LIKE 'alert-%'/)
  assert.doesNotMatch(sql, /DROP TABLE/i)
})

test('HydrologyRepository projects current alerts through stable active coverage keys without dynamic alert IDs', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const observedAt = new Date('2026-07-18T10:00:00.000Z')
  const longMessage = 'Alerta útil\u0000: ' + 'detalle oficial '.repeat(40)
  const rows = [{
    municipality_id: 'mun-corrientes', locality_id: 'corrientes-capital', municipality_name: 'Corrientes', province_code: 'AR-W',
    alert_height_m: null, evacuation_height_m: null, primary_pna_port_id: 'corrientes', secondary_pna_port_ids: [],
    ina_station_ids: [], smn_region_ids: ['smn-corrientes'], inmet_station_ids: ['A830'], source: 'PNA', station_id: 'corrientes',
    metric: 'river_height_m', value: '3.42', unit: 'm', observed_at: observedAt, ingested_at: observedAt,
    last_successful_observed_at: observedAt, quality: 'ok', freshness: 'fresh', tendency: null, forecast_horizon_days: null, confidence: 'normal', source_url: 'https://pna.example',
    official_alerts: [{ source: 'SMN', coverageKey: 'smn-corrientes', message: longMessage, observedAt: observedAt.toISOString(), lastSuccessfulObservedAt: observedAt.toISOString(), freshness: 'fresh', sourceUrl: 'https://smn.example' }],
  }]
  const db = { async query(sql: string, params: unknown[] = []) { calls.push({ sql, params }); return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } } }
  const repo = new HydrologyRepository(db)

  const municipalities = await repo.getMunicipalityTelemetryOverview('AR-W')

  assert.ok((municipalities[0]?.officialAlerts?.[0]?.message.length ?? 0) <= 300)
  assert.match(municipalities[0]?.officialAlerts?.[0]?.message ?? '', /^Alerta útil:/)
  assert.doesNotMatch(municipalities[0]?.officialAlerts?.[0]?.message ?? '', /\u0000/)
  assert.equal(municipalities[0]?.latestTelemetry[0]?.source, 'PNA')
  assert.match(calls[0]?.sql ?? '', /municipality_alert_coverage/)
  assert.match(calls[0]?.sql ?? '', /official_coverage_key/)
  assert.match(calls[0]?.sql ?? '', /raw->>'coverageKey'/)
  assert.match(calls[0]?.sql ?? '', /coverage\.active/)
  assert.match(calls[0]?.sql ?? '', /ht\.station_id NOT LIKE 'alert-%'[\s\S]*OR[\s\S]*raw->>'coverageKey'/)
  assert.doesNotMatch(calls[0]?.sql ?? '', /official_coverage_key\s*=\s*'alert-/i)
})

test('HydrologyRepository keeps INMET coverage alerts isolated from unrelated municipalities', async () => {
  const observedAt = new Date('2026-07-18T11:00:00.000Z')
  const rows = [
    {
      municipality_id: 'mun-ituzaingo', locality_id: 'ituzaingo-corrientes', municipality_name: 'Ituzaingó', province_code: 'AR-W',
      alert_height_m: null, evacuation_height_m: null, primary_pna_port_id: 'ituzaingo', secondary_pna_port_ids: [], ina_station_ids: [], smn_region_ids: [], inmet_station_ids: ['A830'],
      source: 'INMET', station_id: 'A830', metric: 'storm_alert', value: null, unit: 'alert', observed_at: observedAt, ingested_at: observedAt,
      last_successful_observed_at: observedAt, quality: 'ok', freshness: 'degraded', tendency: null, forecast_horizon_days: null, confidence: null, source_url: 'https://inmet.example',
      official_alerts: [{ source: 'INMET', coverageKey: 'A830', message: 'Alerta meteorológica regional', observedAt: observedAt.toISOString(), lastSuccessfulObservedAt: observedAt.toISOString(), freshness: 'degraded', sourceUrl: 'https://inmet.example' }],
    },
    {
      municipality_id: 'mun-goya', locality_id: 'goya-corrientes', municipality_name: 'Goya', province_code: 'AR-W',
      alert_height_m: null, evacuation_height_m: null, primary_pna_port_id: 'goya', secondary_pna_port_ids: [], ina_station_ids: [], smn_region_ids: [], inmet_station_ids: ['A846'],
      source: null, station_id: null, metric: null, value: null, unit: null, observed_at: null, ingested_at: null,
      last_successful_observed_at: null, quality: null, freshness: null, tendency: null, forecast_horizon_days: null, confidence: null, source_url: null,
      official_alerts: [],
    },
  ]
  const db = { async query() { return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } } }
  const repo = new HydrologyRepository(db)

  const municipalities = await repo.getMunicipalityTelemetryOverview('AR-W')

  assert.equal(municipalities[0]?.name, 'Ituzaingó')
  assert.equal(municipalities[0]?.officialAlerts?.[0]?.source, 'INMET')
  assert.deepEqual(municipalities[1]?.officialAlerts, [])
})

test('HydrologyRepository keeps a mapped INMET alert visible when that municipality has no hydrology telemetry row', async () => {
  const observedAt = new Date('2026-07-18T11:00:00.000Z')
  const rows = [{
    municipality_id: 'mun-ituzaingo', locality_id: 'ituzaingo-corrientes', municipality_name: 'Ituzaingó', province_code: 'AR-W',
    alert_height_m: null, evacuation_height_m: null, primary_pna_port_id: 'ituzaingo', secondary_pna_port_ids: [], ina_station_ids: [], smn_region_ids: [], inmet_station_ids: ['A830'], source: null, station_id: null,
    metric: null, value: null, unit: null, observed_at: null, ingested_at: null, last_successful_observed_at: null, quality: null, freshness: null, tendency: null, forecast_horizon_days: null, confidence: null, source_url: null,
    official_alerts: [{ source: 'INMET', coverageKey: 'A830', message: 'Alerta regional', observedAt: observedAt.toISOString(), lastSuccessfulObservedAt: observedAt.toISOString(), freshness: 'degraded', sourceUrl: 'https://inmet.example' }],
  }]
  const db = { async query() { return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } } }
  const municipality = (await new HydrologyRepository(db).getMunicipalityTelemetryOverview('AR-W'))[0]
  assert.deepEqual(municipality?.latestTelemetry, [])
  assert.equal(municipality?.officialAlerts?.[0]?.coverageKey, 'A830')
})

test('inactive alert coverage leaves station telemetry intact and returns no official alerts', async () => {
  const rows = [{
    municipality_id: 'mun-corrientes', locality_id: 'corrientes-capital', municipality_name: 'Corrientes', province_code: 'AR-W',
    alert_height_m: null, evacuation_height_m: null, primary_pna_port_id: 'corrientes', secondary_pna_port_ids: [],
    ina_station_ids: [], smn_region_ids: ['smn-corrientes'], inmet_station_ids: [], source: 'PNA', station_id: 'corrientes',
    metric: 'river_height_m', value: '3.42', unit: 'm', observed_at: new Date('2026-07-18T10:00:00.000Z'), ingested_at: new Date('2026-07-18T10:00:00.000Z'),
    last_successful_observed_at: new Date('2026-07-18T10:00:00.000Z'), quality: 'ok', freshness: 'fresh', tendency: null, forecast_horizon_days: null, confidence: 'normal', source_url: 'https://pna.example',
    official_alerts: [],
  }]
  let sql = ''
  const db = { async query(query: string) { sql = query; return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } } }
  const repo = new HydrologyRepository(db)

  const municipality = await repo.getMunicipalityTelemetryDashboard('mun-corrientes')

  assert.deepEqual(municipality?.officialAlerts, [])
  assert.equal(municipality?.latestTelemetry[0]?.stationId, 'corrientes')
  assert.match(sql, /coverage\.active/)
  assert.match(sql, /metric\s*=\s*'storm_alert'/)
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

test('HydrologyRepository normalizes production-shaped municipality rows with null mappings and invalid telemetry safely', async () => {
  const rows = [
    {
      municipality_id: 'mun-goya', locality_id: 'goya', municipality_name: 'Goya', province_code: 'AR-W',
      alert_height_m: '5.200', evacuation_height_m: '5.700', primary_pna_port_id: null, secondary_pna_port_ids: null,
      ina_station_ids: '{}', smn_region_ids: ['smn-corrientes'], inmet_station_ids: null, source: null, station_id: null,
      metric: null, value: null, unit: null, observed_at: null, ingested_at: null, last_successful_observed_at: null,
      quality: null, freshness: null, tendency: null, forecast_horizon_days: null, confidence: null, source_url: null,
    },
    {
      municipality_id: 'mun-esquina', locality_id: 'esquina', municipality_name: 'Esquina', province_code: 'AR-W',
      alert_height_m: null, evacuation_height_m: null, primary_pna_port_id: 'esquina', secondary_pna_port_ids: '{corrientes,barranqueras}',
      ina_station_ids: null, smn_region_ids: null, inmet_station_ids: null, source: 'PNA', station_id: 'esquina',
      metric: 'river_height_m', value: 'not-a-number', unit: 'm', observed_at: 'bad-date', ingested_at: null, last_successful_observed_at: null,
      quality: 'ok', freshness: 'fresh', tendency: null, forecast_horizon_days: null, confidence: 'normal', source_url: null,
    },
  ]
  const db = { async query(sql: string, _params: unknown[] = []) { return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } } }
  const repo = new HydrologyRepository(db)

  const municipalities = await repo.getMunicipalityTelemetryOverview('AR-W')

  assert.equal(municipalities.length, 2)
  assert.deepEqual(municipalities[0]?.gaugeMappings.inaStationIds, [])
  assert.deepEqual(municipalities[0]?.latestTelemetry, [])
  assert.deepEqual(municipalities[1]?.gaugeMappings.secondaryPnaPortIds, ['corrientes', 'barranqueras'])
  assert.deepEqual(municipalities[1]?.latestTelemetry, [])
})

test('HydrologyRepository excludes offline fixture telemetry while preserving mapped official INA levels', async () => {
  const observedAt = new Date('2026-07-14T19:00:00.000Z')
  const rows = [
    {
      municipality_id: 'mun-corrientes', locality_id: 'corrientes', municipality_name: 'Corrientes', province_code: 'AR-W',
      alert_height_m: '6.5', evacuation_height_m: '7.0', primary_pna_port_id: 'corrientes', secondary_pna_port_ids: [],
      ina_station_ids: ['6764'], smn_region_ids: [], inmet_station_ids: [], source: 'INA', station_id: 'ina-corrientes',
      metric: 'river_height_m', value: '4.2', unit: 'm', observed_at: observedAt, ingested_at: observedAt,
      last_successful_observed_at: observedAt, quality: 'estimated', freshness: 'fresh', tendency: null, forecast_horizon_days: null, confidence: 'normal', source_url: 'offline-fixture://ina/corrientes',
    },
    {
      municipality_id: 'mun-corrientes', locality_id: 'corrientes', municipality_name: 'Corrientes', province_code: 'AR-W',
      alert_height_m: '6.5', evacuation_height_m: '7.0', primary_pna_port_id: 'corrientes', secondary_pna_port_ids: [],
      ina_station_ids: ['6764'], smn_region_ids: [], inmet_station_ids: [], source: 'INA', station_id: '6764',
      metric: 'river_height_m', value: '4.31', unit: 'm', observed_at: observedAt, ingested_at: observedAt,
      last_successful_observed_at: observedAt, quality: 'estimated', freshness: 'fresh', tendency: null, forecast_horizon_days: null, confidence: 'normal', source_url: 'https://alerta.ina.gob.ar/a5/getObservaciones/6764',
    },
  ]
  const calls: string[] = []
  const db = { async query(sql: string, _params: unknown[] = []) { calls.push(sql); return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } } }
  const repo = new HydrologyRepository(db)

  const municipalities = await repo.getMunicipalityTelemetryOverview('AR-W')

  assert.deepEqual(municipalities[0]?.gaugeMappings.inaStationIds, ['6764'])
  assert.deepEqual(municipalities[0]?.latestTelemetry.map((item) => [item.source, item.stationId, item.value, item.sourceUrl]), [
    ['INA', '6764', 4.31, 'https://alerta.ina.gob.ar/a5/getObservaciones/6764'],
  ])
  assert.match(calls[0] ?? '', /source_url NOT LIKE 'offline-fixture:\/\/%'/)
})

test('HydrologyRepository can fetch one municipality dashboard and preserve missing telemetry explicitly', async () => {
  const rows = [{
    municipality_id: 'mun-mercedes', locality_id: 'mercedes', municipality_name: 'Mercedes', province_code: 'AR-W',
    alert_height_m: null, evacuation_height_m: null, primary_pna_port_id: 'paso_de_los_libres', secondary_pna_port_ids: [],
    ina_station_ids: [], smn_region_ids: [], inmet_station_ids: [], source: null, station_id: null,
    metric: null, value: null, unit: null, observed_at: null, ingested_at: null, last_successful_observed_at: null,
    quality: null, freshness: null, tendency: null, forecast_horizon_days: null, confidence: null, source_url: null,
  }]
  const db = { async query(sql: string, _params: unknown[] = []) { return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } } }
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

test('HydrologyRepository creates missing provider stations before persisting telemetry', async () => {
  const calls: string[] = []
  const db = {
    async query(sql: string) {
      calls.push(sql)
      return { rows: [], rowCount: 1, command: 'SELECT', oid: 0, fields: [] }
    },
  }

  await new HydrologyRepository(db).saveTelemetryDeduped([
    { source: 'PNA', stationId: 'pna-new-station', metric: 'river_height_m', unit: 'm', value: 2.1, observedAt: new Date('2026-08-12T04:00:00.000Z'), lastSuccessfulObservedAt: new Date('2026-08-12T04:00:00.000Z'), quality: 'ok', freshness: 'fresh' },
  ], { source: 'PNA', stationId: 'pna-new-station', status: 'success', startedAt: new Date('2026-08-12T04:00:00.000Z'), recordsIngested: 1 })

  assert.equal(calls.filter((sql) => /INSERT INTO hydrology_stations/i.test(sql)).length, 1)
  assert.equal(calls.filter((sql) => /INSERT INTO hydrology_telemetry/i.test(sql)).length, 1)
})

test('HydrologyRepository preserves alert semantics by storing storm alerts with a null value', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const db = { async query(sql: string, params: unknown[] = []) {
    calls.push({ sql, params })
    return { rows: [], rowCount: 1, command: '', oid: 0, fields: [] }
  } }
  const repo = new HydrologyRepository(db)
  const observedAt = new Date('2026-06-23T10:00:00.000Z')

  await repo.saveTelemetry([{ source: 'SMN', stationId: 'smn-corrientes', metric: 'storm_alert', unit: 'alerta', value: 7, observedAt, lastSuccessfulObservedAt: observedAt, quality: 'ok', freshness: 'fresh' }])

  const telemetryInsert = calls.find((call) => /INSERT INTO hydrology_telemetry/i.test(call.sql))
  assert.equal(telemetryInsert?.params[2], 'storm_alert')
  assert.equal(telemetryInsert?.params[6], null)
})

test('HydrologyRepository rolls back telemetry writes while preserving a failed ingestion run', async () => {
  const calls: string[] = []
  const db = {
    async query(sql: string, _params: unknown[] = []) {
      calls.push(sql)
      if (/INSERT INTO hydrology_telemetry/i.test(sql)) throw new Error('telemetry write failed')
      if (/SELECT value\s+FROM hydrology_telemetry/i.test(sql)) return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] }
      return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] }
    },
  }
  const repo = new HydrologyRepository(db)
  const observedAt = new Date('2026-06-23T10:00:00.000Z')

  await assert.rejects(repo.saveTelemetryDeduped([{ source: 'PNA', stationId: 'corrientes', metric: 'river_height_m', unit: 'm', value: 3.42, observedAt, lastSuccessfulObservedAt: observedAt, quality: 'ok', freshness: 'fresh' }], { source: 'PNA', status: 'success', startedAt: observedAt, recordsIngested: 1 }))

  assert.match(calls[0] ?? '', /^BEGIN$/)
  assert.ok(calls.some((sql) => /^ROLLBACK$/.test(sql)))
  assert.equal(calls.filter((sql) => /INSERT INTO hydrology_ingestion_runs/i.test(sql)).length, 1)
})

test('HydrologyRepository persists and reads proof-correlated ingestion rows by source', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const observedAt = new Date('2026-06-23T10:00:00.000Z')
  const db = {
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql, params })
      if (/SELECT id::text, source, records_ingested, status, started_at, finished_at/i.test(sql)) {
        return {
          rows: [{ id: 'run-row-1', source: 'PNA', records_ingested: 2, status: 'success', started_at: observedAt, finished_at: observedAt }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        }
      }
      return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] }
    },
  }
  const repo = new HydrologyRepository(db)

  await repo.saveIngestionRun({ source: 'PNA', proofRunId: 'proof-correlated-1', status: 'success', startedAt: observedAt, recordsIngested: 2 })
  const rows = await repo.getIngestionProofRows('proof-correlated-1', 'PNA')

  assert.equal(calls[0]?.params[1], 'proof-correlated-1')
  assert.match(calls[0]?.sql ?? '', /proof_run_id/)
  assert.equal(calls[1]?.params[0], 'proof-correlated-1')
  assert.equal(calls[1]?.params[1], 'PNA')
  assert.deepEqual(rows, [{ id: 'run-row-1', source: 'PNA', recordsIngested: 2, status: 'success', startedAt: observedAt.toISOString(), finishedAt: observedAt.toISOString() }])
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
    const contentType = String(input).includes('pna') ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8'
    return new Response(body, { status: 200, headers: { 'content-type': contentType } })
  }

  const results = await Promise.all([
    new PnaHttpClient({ url: 'https://official.test/pna', fetch: fetchOk }).fetchTelemetry(),
    new SmnHttpClient({ url: 'https://official.test/smn', fetch: fetchOk }).fetchTelemetry(),
    new InmetHttpClient({ url: 'https://official.test/inmet', fetch: fetchOk }).fetchTelemetry(),
    new InaHttpClient({ url: 'https://official.test/ina', fetch: fetchOk }).fetchTelemetry(),
  ])

  assert.deepEqual(results.map((result) => result.ok), [true, true, true, true])
  assert.deepEqual(results.map((result) => result.ok ? result.records.length : 0), [1, 1, 1, 1])
  assert.ok(requests.every((request) => JSON.stringify(request.headers).includes('Chrome')))
  assert.ok(requests.every((request) => JSON.stringify(request.headers).includes('application/json')))
})

test('government HTTP clients use HYDROLOGY_*_URL environment overrides', async () => withEnv({
  HYDROLOGY_PNA_URL: 'https://override.test/pna',
  HYDROLOGY_INA_URL: 'https://override.test/ina',
  HYDROLOGY_INMET_URL: 'https://override.test/inmet',
  HYDROLOGY_SMN_URL: 'https://override.test/smn',
}, async () => {
  const requestedUrls: string[] = []
  const fetchOk = async (input: string | URL | Request) => {
    requestedUrls.push(String(input))
    const body = String(input).includes('/pna')
      ? '<tr data-station="ituzaingo" data-observed-at="2026-06-23T10:30:00.000Z"><td>Altura: 3,21</td></tr>'
      : String(input).includes('/smn')
        ? JSON.stringify({ rainfall: [{ stationId: 'posadas', province: 'Misiones', observedAt: '2026-06-23T09:00:00.000Z', rainMm: 80 }] })
        : String(input).includes('/inmet')
          ? JSON.stringify({ measurements: [{ stationId: 'br-pr-1', uf: 'PR', observedAt: '2026-06-23T09:00:00.000Z', rainMm: 55 }] })
          : JSON.stringify({ predictions: [{ stationId: 'corrientes', observedAt: '2026-06-23T10:30:00.000Z', heightM: 4.1 }] })
    return new Response(body, { status: 200, headers: { 'content-type': String(input).includes('/pna') ? 'text/html' : 'application/json' } })
  }

  const results = await Promise.all([
    new PnaHttpClient({ fetch: fetchOk }).fetchTelemetry(),
    new InaHttpClient({ fetch: fetchOk }).fetchTelemetry(),
    new InmetHttpClient({ fetch: fetchOk }).fetchTelemetry(),
    new SmnHttpClient({ fetch: fetchOk }).fetchTelemetry(),
  ])

  assert.deepEqual(results.map((result) => result.ok), [true, true, true, true])
  assert.deepEqual(requestedUrls, ['https://override.test/pna', 'https://override.test/ina', 'https://override.test/inmet', 'https://override.test/smn'])
}))

test('government HTTP clients return parsed failures for network, status, and malformed payload errors', async () => {
  const networkFailure = await new PnaHttpClient({ url: 'https://official.test/pna', fetch: async () => { throw new Error('socket hang up') } }).fetchTelemetry()
  const statusFailure = await new SmnHttpClient({ url: 'https://official.test/smn', fetch: async () => new Response('{}', { status: 503, statusText: 'Service Unavailable' }) }).fetchTelemetry()
  const parseFailure = await new InaHttpClient({ url: 'https://official.test/ina', fetch: async () => new Response('{bad json', { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }) }).fetchTelemetry()
  const htmlFailure = await new InmetHttpClient({ url: 'https://official.test/inmet', fetch: async () => new Response('<html>maintenance</html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }) }).fetchTelemetry()

  assert.deepEqual([networkFailure.ok, statusFailure.ok, parseFailure.ok, htmlFailure.ok], [false, false, false, false])
  assert.equal(networkFailure.ok ? '' : networkFailure.diagnostic.failureKind, 'network_failure')
  assert.equal(networkFailure.ok ? '' : networkFailure.diagnostic.providerHost, 'official.test')
  assert.match(statusFailure.ok ? '' : statusFailure.error, /SMN.*503/)
  assert.equal(statusFailure.ok ? 0 : statusFailure.diagnostic.upstreamStatus, 503)
  assert.match(parseFailure.ok ? '' : parseFailure.error, /INA.*payload/i)
  assert.equal(parseFailure.ok ? '' : parseFailure.diagnostic.failureKind, 'parse_failure')
  assert.match(htmlFailure.ok ? '' : htmlFailure.error, /INMET.*payload parse/i)
  assert.equal(htmlFailure.ok ? '' : htmlFailure.diagnostic.failureKind, 'parse_failure')
})

test('government HTTP clients abort official requests after configured timeout', async () => {
  let abortSignal: AbortSignal | undefined
  const timeoutFailure = await new SmnHttpClient({
    url: 'https://official.test/smn',
    timeoutMs: 1,
    fetch: async (_input, init) => new Promise<Response>((_resolve, reject) => {
      abortSignal = init?.signal ?? undefined
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }),
  }).fetchTelemetry()

  assert.equal(timeoutFailure.ok, false)
  assert.equal(abortSignal?.aborted, true)
  assert.match(timeoutFailure.ok ? '' : timeoutFailure.error, /SMN.*timeout after 1ms/)
  assert.equal(timeoutFailure.ok ? '' : timeoutFailure.diagnostic.failureKind, 'timeout')
  assert.equal(timeoutFailure.ok ? '' : timeoutFailure.diagnostic.reason, 'SMN request timed out')
  assert.equal(timeoutFailure.ok ? 0 : timeoutFailure.diagnostic.attempts, 1)
  assert.equal(timeoutFailure.ok ? 0 : timeoutFailure.diagnostic.timeoutMs, 1)
  assert.equal(timeoutFailure.ok ? '' : timeoutFailure.diagnostic.providerHost, 'official.test')
  assert.equal(timeoutFailure.ok ? '' : timeoutFailure.diagnostic.providerPath, '/smn')
  assert.equal(typeof (timeoutFailure.ok ? undefined : timeoutFailure.diagnostic.elapsedMs), 'number')
})

test('PNA HTTP client uses env timeout and user-agent options with two bounded retry attempts', async () => {
  const previousTimeout = process.env['HYDROLOGY_PNA_TIMEOUT_MS']
  const previousUserAgent = process.env['HYDROLOGY_PNA_USER_AGENT']
  const previousUrl = process.env['HYDROLOGY_PNA_URL']
  const requests: Array<{ url: string; headers: unknown }> = []
  process.env['HYDROLOGY_PNA_TIMEOUT_MS'] = '7'
  process.env['HYDROLOGY_PNA_USER_AGENT'] = 'AgronautasBot/1.0'
  process.env['HYDROLOGY_PNA_URL'] = 'https://pna.example/alturas?token=secret'
  try {
    const result = await new PnaHttpClient({
      fetch: async (input, init) => {
        requests.push({ url: String(input), headers: init?.headers })
        return new Response('no data', { status: 502, statusText: 'Bad Gateway' })
      },
    }).fetchTelemetry()

    assert.equal(result.ok, false)
    assert.equal(requests.length, 2)
    assert.match(JSON.stringify(requests[0]?.headers), /AgronautasBot\/1\.0/)
    assert.equal(result.ok ? 0 : result.diagnostic.timeoutMs, 7)
    assert.equal(typeof (result.ok ? undefined : result.diagnostic.elapsedMs), 'number')
    assert.equal(result.ok ? 0 : result.diagnostic.attempts, 2)
    assert.equal(result.ok ? '' : result.diagnostic.providerHost, 'pna.example')
    assert.equal(result.ok ? '' : result.diagnostic.providerPath, '/alturas')
  } finally {
    if (previousTimeout === undefined) delete process.env['HYDROLOGY_PNA_TIMEOUT_MS']
    else process.env['HYDROLOGY_PNA_TIMEOUT_MS'] = previousTimeout
    if (previousUserAgent === undefined) delete process.env['HYDROLOGY_PNA_USER_AGENT']
    else process.env['HYDROLOGY_PNA_USER_AGENT'] = previousUserAgent
    if (previousUrl === undefined) delete process.env['HYDROLOGY_PNA_URL']
    else process.env['HYDROLOGY_PNA_URL'] = previousUrl
  }
})

async function withEnv<T>(values: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key])
    const value = values[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return await run()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}
