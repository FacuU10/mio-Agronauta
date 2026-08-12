import test from 'node:test'
import assert from 'node:assert/strict'
import { Field, FieldContext } from '../../../domain/entities/agronautas'
import { CORRIENTES_COVERAGE_QUERY, normalizeCoverage, PostgresFieldContextRepository, PostgresFieldRepository } from './agronautas-field-repository'

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

test('save writes snake_case and legacy camelCase field columns during schema transition', async () => {
  let capturedSql = ''
  const repository = new PostgresFieldRepository({
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldRepository>[0])

  await repository.save(new Field({
    id: 'field-1',
    externalFieldId: 'external-1',
    crop: 'rice',
    hectares: 10,
    localityName: 'Mercedes',
    provinceCode: 'AR-W',
    centroid: { lat: -29.18, lng: -58.08 },
    boundaryMetadata: {
      sourceName: 'test',
      sourceUrl: 'https://example.com',
      sourceVersion: 'v1',
      normalizationStatus: 'verified',
    },
  }))

  assert.match(capturedSql, /external_field_id/)
  assert.match(capturedSql, /"externalFieldId"/)
  assert.match(capturedSql, /"boundarySource"/)
})

test('normalizeCoverage labels a boundary point without a persisted locality as unsupported locality', () => {
  const normalized = normalizeCoverage({
    inside_supported_area: true,
    locality: null,
    province_code: 'AR-W',
    boundary_version: 'corrientes-v1',
    locality_confidence: 0,
    stale_cause: 'unsupported_locality',
  })

  assert.deepEqual(normalized, {
    insideSupportedArea: true,
    locality: undefined,
    provinceCode: 'AR-W',
    boundaryVersion: 'corrientes-v1',
    localityConfidence: 0,
    staleCause: 'unsupported_locality',
  })
})

test('save updates the submitted crop instead of retaining a legacy forced-rice value', async () => {
  let capturedSql = ''
  const repository = new PostgresFieldRepository({
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldRepository>[0])

  await repository.save(new Field({
    id: 'field-maize',
    externalFieldId: 'external-maize',
    crop: 'maize',
    hectares: 10,
    localityName: 'Mercedes',
    provinceCode: 'AR-W',
    centroid: { lat: -29.18, lng: -58.08 },
    boundaryMetadata: {
      sourceName: 'test',
      sourceUrl: 'https://example.com',
      sourceVersion: 'v1',
      normalizationStatus: 'verified',
    },
  }))

  assert.match(capturedSql, /crop\s*=\s*EXCLUDED\.crop/i)
})

test('field context save writes snake_case and legacy camelCase columns during schema transition', async () => {
  let capturedSql = ''
  const repository = new PostgresFieldContextRepository({
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldContextRepository>[0])

  await repository.save(new FieldContext({
    fieldId: 'field-1',
    growthStage: 'vegetative',
    nearestStationId: 'station-1',
    localityCanonical: 'Mercedes',
    localityConfidence: 1,
    contextPayload: { source: 'test' },
  }))

  assert.match(capturedSql, /field_id/)
  assert.match(capturedSql, /"fieldId"/)
  assert.match(capturedSql, /"contextPayload"/)
})

test('geometry persistence uses PostGIS geography metrics and canonical geometry columns', async () => {
  let capturedSql = ''
  const repository = new PostgresFieldRepository({
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldRepository>[0])

  await repository.save(new Field({
    id: 'field-geometry', externalFieldId: 'external-geometry', crop: 'rice', hectares: 10,
    localityName: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.2, lng: -58.1 },
    polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))',
    geometrySource: 'operator',
    boundaryMetadata: { sourceName: 'test', sourceUrl: 'https://example.com', sourceVersion: 'v1', normalizationStatus: 'verified' },
  }))

  assert.match(capturedSql, /ST_GeomFromText\(\$11,4326\)/)
  assert.match(capturedSql, /::geography/)
  assert.match(capturedSql, /boundary_area_m2/)
  assert.match(capturedSql, /geometry_source/)
})
