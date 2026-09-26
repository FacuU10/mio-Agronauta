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
  }), 'workspace-test')

  assert.match(capturedSql, /external_field_id/)
  assert.match(capturedSql, /"externalFieldId"/)
  assert.match(capturedSql, /"boundarySource"/)
})

test('field save explicitly types the nullable polygon parameter for PostgreSQL', async () => {
  let capturedSql = ''
  const repository = new PostgresFieldRepository({
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldRepository>[0])

  await repository.save(new Field({
    id: 'field-parameter-type',
    externalFieldId: 'external-parameter-type',
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
  }), 'workspace-test')

  assert.match(capturedSql, /\$11::text/)
  assert.match(capturedSql, /\$12::numeric/)
  assert.match(capturedSql, /\$13::numeric/)
})

test('field save classifies a duplicate external field identifier as a domain conflict', async () => {
  const repository = new PostgresFieldRepository({
    async query(sql: string) {
      if (sql.startsWith('INSERT INTO fields')) {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          code: '23505',
          constraint: 'fields_external_field_id_key',
        })
      }
      return { rows: [], rowCount: 0 }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldRepository>[0])

  await assert.rejects(
    repository.save(new Field({
      id: 'field-duplicate-external-id',
      externalFieldId: 'external-duplicate',
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
    }), 'workspace-test'),
    (error: unknown) => error instanceof Error && error.message === 'FIELD_EXTERNAL_ID_CONFLICT',
  )
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
  }), 'workspace-test')

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
  }), 'workspace-test')

  assert.match(capturedSql, /ST_GeomFromText\(\$11::text,4326\)/)
  assert.match(capturedSql, /::geography/)
  assert.match(capturedSql, /boundary_area_m2/)
  assert.match(capturedSql, /geometry_source/)
})

test('field list query is bounded and deterministic by updated timestamp and id', async () => {
  let capturedSql = ''
  let capturedParams: unknown[] = []
  const repository = new PostgresFieldRepository({
    async query(sql: string, params?: unknown[]) {
      capturedSql = sql
      capturedParams = params ?? []
      return { rows: [{ id: 'field-2', external_field_id: 'external-2', crop: 'rice', hectares: '12.5', locality_name: 'Mercedes', province_code: 'AR-W', centroid_lat: '-29.1', centroid_lng: '-58.1', boundary_source: {}, boundary_version: 'v1', polygon_wkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))', geometry_source: 'operator', geometry_updated_at: null, created_at: '2026-08-13T10:00:00.000Z', updated_at: '2026-08-13T10:00:00.000Z' }], rowCount: 1 }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldRepository>[0])

  const result = await repository.list?.({ limit: 1, workspaceId: 'workspace-selected' })
  assert.equal(result?.items.length, 1)
  assert.match(capturedSql, /ORDER BY updated_at DESC, id DESC/)
  assert.match(capturedSql, /LIMIT \$1/)
  assert.equal(capturedParams[0], 2)
  assert.equal(capturedParams[1], 'workspace-selected')
  assert.match(capturedSql, /mapping\.workspace_id\s*=\s*\$2/i)
  assert.equal(result?.items[0]?.field.props.id, 'field-2')
  assert.match(capturedSql, /ST_AsText\(boundary\)\s+AS\s+polygon_wkt/i)
  assert.equal(result?.items[0]?.field.props.polygonWkt, 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))')
  assert.equal(result?.items[0]?.field.props.geometrySource, 'operator')
})

test('field writes require the selected workspace and never embed the default workspace authority', async () => {
  let capturedSql = ''
  let capturedParams: unknown[] = []
  const repository = new PostgresFieldRepository({
    async query(sql: string, params?: unknown[]) {
      capturedSql = sql
      capturedParams = params ?? []
      return { rows: [], rowCount: 1 }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldRepository>[0])

  await (repository as unknown as { save(field: Field, workspaceId: string): Promise<void> }).save(new Field({
    id: 'field-workspace-write', externalFieldId: 'external-workspace-write', crop: 'rice', hectares: 10,
    localityName: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.18, lng: -58.08 },
    boundaryMetadata: { sourceName: 'test', sourceUrl: 'https://example.com', sourceVersion: 'v1', normalizationStatus: 'verified' },
  }), 'workspace-selected')

  assert.equal(capturedParams.at(-1), 'workspace-selected')
  assert.doesNotMatch(capturedSql, /agronautas-default-workspace/)
  assert.match(capturedSql, /workspace_id/i)
  assert.doesNotMatch(capturedSql, /fields\.workspace_id\s*=\s*EXCLUDED\.workspace_id/i)
})

test('field reads require an explicit workspace predicate', async () => {
  let capturedSql = ''
  let capturedParams: unknown[] = []
  const row = { id: 'field-read', external_field_id: 'external-read', crop: 'rice', hectares: '10', locality_name: 'Mercedes', province_code: 'AR-W', centroid_lat: '-29.1', centroid_lng: '-58.1', boundary_source: {}, polygon_wkt: null, geometry_source: 'fallback' }
  const repository = new PostgresFieldRepository({
    async query(sql: string, params?: unknown[]) {
      capturedSql = sql
      capturedParams = params ?? []
      return { rows: [row], rowCount: 1 }
    },
  } as unknown as ConstructorParameters<typeof PostgresFieldRepository>[0])

  const field = await (repository as unknown as { findById(fieldId: string, workspaceId: string): Promise<Field | null> }).findById('field-read', 'workspace-selected')

  assert.equal(field?.props.id, 'field-read')
  assert.deepEqual(capturedParams, ['field-read', 'workspace-selected'])
  assert.match(capturedSql, /mapping\.workspace_id\s*=\s*\$2/i)
})

test('field save never overwrites an existing auth mapping during workspace persistence', async () => {
  const statements: string[] = []
  const client = {
    async query(sql: string) {
      statements.push(sql)
      if (sql.startsWith('INSERT INTO fields')) return { rows: [], rowCount: 1 }
      if (sql.startsWith('INSERT INTO agronautas_auth_field_mappings')) return { rows: [{ field_id: 'field-write' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    },
    release() {},
  }
  const repository = new PostgresFieldRepository({ async connect() { return client }, async query() { return { rows: [], rowCount: 0 } } } as never)

  await repository.save(new Field({
    id: 'field-write', externalFieldId: 'external-write', crop: 'rice', hectares: 10,
    localityName: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.18, lng: -58.08 },
    boundaryMetadata: { sourceName: 'test', sourceUrl: 'https://example.com', sourceVersion: 'v1', normalizationStatus: 'verified' },
  }), 'workspace-selected')

  assert.equal(statements.some((statement) => statement.includes('DO UPDATE SET workspace_id = EXCLUDED.workspace_id')), false)
  assert.ok(statements.includes('COMMIT'))
})

test('field save treats an existing same-workspace mapping as idempotent', async () => {
  const statements: string[] = []
  const client = {
    async query(sql: string) {
      statements.push(sql)
      if (sql.startsWith('INSERT INTO fields')) return { rows: [], rowCount: 1 }
      if (sql.startsWith('INSERT INTO agronautas_auth_field_mappings')) return { rows: [], rowCount: 0 }
      if (sql.startsWith('SELECT field_id FROM agronautas_auth_field_mappings')) return { rows: [{ field_id: 'field-write' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    },
    release() {},
  }
  const repository = new PostgresFieldRepository({ async connect() { return client }, async query() { return { rows: [], rowCount: 0 } } } as never)

  await repository.save(new Field({
    id: 'field-write', externalFieldId: 'external-write', crop: 'rice', hectares: 10,
    localityName: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.18, lng: -58.08 },
    boundaryMetadata: { sourceName: 'test', sourceUrl: 'https://example.com', sourceVersion: 'v1', normalizationStatus: 'verified' },
  }), 'workspace-selected')

  assert.ok(statements.some((statement) => statement.startsWith('SELECT field_id FROM agronautas_auth_field_mappings')))
  assert.ok(statements.includes('COMMIT'))
})
