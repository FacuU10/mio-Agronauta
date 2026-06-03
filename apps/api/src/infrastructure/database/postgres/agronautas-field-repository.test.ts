import test from 'node:test'
import assert from 'node:assert/strict'
import { CORRIENTES_COVERAGE_QUERY, normalizeCoverage, PostgresFieldRepository } from './agronautas-field-repository'

test('coverage query uses ST_Contains for Corrientes boundary and locality join', () => {
  assert.match(CORRIENTES_COVERAGE_QUERY, /ST_Contains\(zone\.boundary/)
  assert.match(CORRIENTES_COVERAGE_QUERY, /LEFT JOIN agronautas_localities/)
  assert.match(CORRIENTES_COVERAGE_QUERY, /WHERE zone\.scope = 'corrientes_rice'/)
})

test('normalizeCoverage maps supported area payload', () => {
  const normalized = normalizeCoverage({
    inside_supported_area: true,
    locality: 'Mercedes',
    province_code: 'AR-W',
    boundary_version: 'corrientes-v1',
    locality_confidence: '1',
    stale_cause: null,
  })

  assert.deepEqual(normalized, {
    insideSupportedArea: true,
    locality: 'Mercedes',
    provinceCode: 'AR-W',
    boundaryVersion: 'corrientes-v1',
    localityConfidence: 1,
    staleCause: undefined,
  })
})

test('resolveCoverage sends lng lat in PostGIS order', async () => {
  let capturedParams: unknown[] = []
  const repository = new PostgresFieldRepository({
    async query(_sql: string, params?: unknown[]) {
      capturedParams = params ?? []
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldRepository>[0])

  await repository.resolveCoverage({ lat: -29.18, lng: -58.08 })
  assert.deepEqual(capturedParams, [-58.08, -29.18])
})
