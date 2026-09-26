import test from 'node:test'
import assert from 'node:assert/strict'
import { corrientesDemoLocalities, CORRIENTES_DEMO_ONLY } from './corrientes-demo-localities'
import { buildAlerts, buildOfflineFixture, buildRiskSnapshot, buildSignalRun, ensureSchema, parseSeedOptions } from './seed-corrientes-rice-demo'

test('parseSeedOptions supports cleanup and offline modes', () => {
  assert.equal(CORRIENTES_DEMO_ONLY, true)
  assert.equal(corrientesDemoLocalities.every((locality) => locality.demoOnly), true)
  assert.deepEqual(parseSeedOptions(['--cleanup', '--offline-fixtures']), {
    cleanup: true,
    offlineFixtures: true,
    mode: 'offline-fixtures',
  })
  assert.equal(parseSeedOptions(['--mode=fetch']).mode, 'fetch')
})

test('offline fixture keeps 7-day history and 3-day forecast', () => {
  const fixture = buildOfflineFixture(corrientesDemoLocalities[0]!)
  assert.equal(fixture.history.length, 7)
  assert.equal(fixture.forecast.length, 3)
  assert.equal(fixture.source, 'offline-fixture')
  assert.ok(fixture.rainfallMm7d > 0)
})

test('risk snapshot and alerts are deterministic for a locality', () => {
  const locality = corrientesDemoLocalities[2]!
  const fixture = {
    ...buildOfflineFixture(locality),
    rainfallMm7d: 131.4,
    humidityPct: 84,
    current: {
      ...buildOfflineFixture(locality).current,
      temperatureC: 34.2,
      humidityPct: 84,
    },
  }
  const run = buildSignalRun(locality, fixture)
  const snapshot = buildRiskSnapshot(locality, fixture, run.runId)
  const alerts = buildAlerts(locality, snapshot)

  assert.equal(run.runId, 'corrientes-demo-climate-paso-de-los-libres')
  assert.equal(snapshot.props.snapshotId, 'corrientes-demo-risk-paso-de-los-libres')
  assert.equal(snapshot.props.staleCause, 'demo_only_fixture')
  assert.equal(snapshot.freshness, 'degraded')
  assert.ok(snapshot.props.score >= 55)
  assert.ok(snapshot.props.evidenceRefs.includes(`field_contexts:${locality.fieldId}`))
  assert.deepEqual(alerts, [])
})

test('fresh non-demo snapshot still produces an alert for the same risk profile', () => {
  const locality = corrientesDemoLocalities[2]!
  const fixture = {
    ...buildOfflineFixture(locality),
    source: 'open-meteo' as const,
    staleCause: undefined,
    rainfallMm7d: 200,
    current: {
      ...buildOfflineFixture(locality).current,
      temperatureC: 36,
    },
  }
  const run = buildSignalRun(locality, fixture)
  const snapshot = buildRiskSnapshot(locality, fixture, run.runId)
  const alerts = buildAlerts(locality, snapshot)

  assert.equal(snapshot.freshness, 'fresh')
  assert.deepEqual(alerts.map((alert) => alert.type), ['flood', 'thermal_stress'])
  assert.ok(alerts.every((alert) => alert.fieldId === locality.fieldId))
})

test('ensureSchema upgrades pre-existing fields tables before seeding', async () => {
  const statements: string[] = []
  const pool = {
    async query(sql: string) {
      statements.push(sql)
      if (/information_schema\.tables/i.test(sql)) {
        return {
          rows: [
            'agronautas_auth_workspaces',
            'agronautas_auth_users',
            'agronautas_auth_sessions',
            'agronautas_auth_refresh_tokens',
            'agronautas_auth_memberships',
            'agronautas_auth_field_mappings',
            'agronautas_auth_bootstrap_state',
          ].map((table_name) => ({ table_name })),
          rowCount: 7,
        }
      }
      if (/information_schema\.columns/i.test(sql)) return { rows: [{ table_name: 'fields', column_name: 'workspace_id' }], rowCount: 1 }
      if (/agronautas_workspaces|agronautas_auth_workspaces/i.test(sql)) return { rows: [{ id: 'agronautas-pilot-workspace' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    },
  }

  await ensureSchema(pool as unknown as Parameters<typeof ensureSchema>[0])

  const joined = statements.join('\n')
  assert.match(joined, /ALTER TABLE fields\s+ADD COLUMN IF NOT EXISTS external_field_id text/i)
  assert.match(joined, /ALTER TABLE fields\s+ADD COLUMN IF NOT EXISTS boundary_source jsonb/i)
  assert.match(joined, /CREATE UNIQUE INDEX IF NOT EXISTS fields_external_field_id_idx/i)
  assert.match(joined, /ALTER TABLE fields\s+ADD COLUMN IF NOT EXISTS boundary geometry\(MultiPolygon,4326\)/i)
  assert.match(joined, /ALTER TABLE fields\s+ADD COLUMN IF NOT EXISTS workspace_id text/i)
  assert.match(joined, /ALTER TABLE signal_ingestion_runs ALTER COLUMN "signalType" DROP NOT NULL/i)
})

test('ensureSchema fails before seeding when canonical auth migration is missing', async () => {
  const statements: string[] = []
  const pool = {
    async query(sql: string) {
      statements.push(sql)
      return { rows: [], rowCount: 0 }
    },
  }

  await assert.rejects(
    () => ensureSchema(pool as unknown as Parameters<typeof ensureSchema>[0]),
    /AUTH_SCHEMA_PREREQUISITE_MISSING.*prisma migrate deploy.*auth bootstrap/i,
  )

  assert.equal(statements.some((statement) => /INSERT\s+INTO\s+fields/i.test(statement)), false)
})
