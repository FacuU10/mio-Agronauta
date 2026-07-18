import test from 'node:test'
import assert from 'node:assert/strict'
import { MUNICIPALITY_ALERT_COVERAGE_SEED, seedMunicipalityAlertCoverage } from './seed-municipality-alert-coverage'

test('municipality alert coverage seed is reviewed, versioned, and free of dynamic alert IDs', () => {
  assert.ok(MUNICIPALITY_ALERT_COVERAGE_SEED.length > 0)
  assert.ok(MUNICIPALITY_ALERT_COVERAGE_SEED.every((item) => item.seedVersion === 'municipality-alert-coverage-v1'))
  assert.ok(MUNICIPALITY_ALERT_COVERAGE_SEED.every((item) => item.source === 'SMN' || item.source === 'INMET'))
  assert.ok(MUNICIPALITY_ALERT_COVERAGE_SEED.every((item) => !item.officialCoverageKey.toLowerCase().startsWith('alert-')))
  assert.equal(new Set(MUNICIPALITY_ALERT_COVERAGE_SEED.map((item) => `${item.municipalityId}:${item.source}:${item.officialCoverageKey}`)).size, MUNICIPALITY_ALERT_COVERAGE_SEED.length)
})

test('municipality alert coverage seed is idempotent and rolls back failed writes', async () => {
  const rows = new Set<string>()
  const transactions: string[] = []
  const db = {
    async query(sql: string, params: unknown[] = []) {
      transactions.push(sql)
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rowCount: 0 }
      const key = `${params[0]}:${params[1]}:${params[2]}`
      if (/^UPDATE municipality_alert_coverage/.test(sql)) return { rowCount: rows.has(key) ? 1 : 0 }
      rows.add(key)
      return { rowCount: 1 }
    },
  }

  const first = await seedMunicipalityAlertCoverage(db)
  const second = await seedMunicipalityAlertCoverage(db)

  assert.equal(first.inserted, MUNICIPALITY_ALERT_COVERAGE_SEED.length)
  assert.equal(second.updated, MUNICIPALITY_ALERT_COVERAGE_SEED.length)
  assert.equal(rows.size, MUNICIPALITY_ALERT_COVERAGE_SEED.length)
  assert.equal(transactions.filter((item) => item === 'COMMIT').length, 2)
})

test('municipality alert coverage seed rolls back when a write fails', async () => {
  const transactions: string[] = []
  const db = {
    async query(sql: string) {
      transactions.push(sql)
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rowCount: 0 }
      if (/^UPDATE municipality_alert_coverage/.test(sql)) return { rowCount: 0 }
      throw new Error('coverage write failed')
    },
  }

  await assert.rejects(seedMunicipalityAlertCoverage(db), /coverage write failed/)
  assert.equal(transactions[0], 'BEGIN')
  assert.match(transactions[1] ?? '', /^UPDATE municipality_alert_coverage/)
  assert.match(transactions[2] ?? '', /^INSERT INTO municipality_alert_coverage/)
  assert.equal(transactions.at(-1), 'ROLLBACK')
})
