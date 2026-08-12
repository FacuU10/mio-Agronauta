import test from 'node:test'
import assert from 'node:assert/strict'
import { Field } from '../../domain/entities/agronautas'
import type { FieldGeometryRepository, FieldRepository } from '../../domain/repositories/agronautas'
import { UpdateFieldGeometryUseCase } from './update-field-geometry-usecase'

const polygonWkt = 'POLYGON ((-58.1 -29.2, -58.09 -29.2, -58.09 -29.19, -58.1 -29.2))'

function field(): Field {
  return new Field({ id: 'field-1', externalFieldId: 'external-1', crop: 'maize', cropCategory: 'cereal', hectares: 10, localityName: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.2, lng: -58.1 }, boundaryMetadata: { sourceName: 'test', sourceUrl: 'https://example.com', sourceVersion: 'v1', normalizationStatus: 'verified' } })
}

test('UpdateFieldGeometryUseCase derives canonical geometry input and preserves server metrics', async () => {
  let savedInput: unknown
  const fields: FieldRepository = { async save() {}, async findById() { return field() }, async findByExternalFieldId() { return null }, async resolveCoverage() { return { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W' } } }
  const geometry: FieldGeometryRepository = { async getGeometry() { return null }, async updateGeometry(_fieldId, input) { savedInput = input; return { polygonWkt, centroid: { lat: -29.195, lng: -58.096 }, areaM2: 1_000_000, hectares: 100, perimeterM: 4_000, status: 'saved', source: input.source, updatedAt: new Date('2026-08-12T00:00:00.000Z') } } }

  const result = await new UpdateFieldGeometryUseCase(fields, geometry).execute('field-1', { geoJson: { type: 'Polygon', coordinates: [[[-58.10, -29.20], [-58.09, -29.20], [-58.09, -29.19], [-58.10, -29.20]]] } })

  assert.equal(result.hectares, 100)
  assert.deepEqual(savedInput, { polygonWkt, source: 'operator', expectedUpdatedAt: undefined })
})

test('UpdateFieldGeometryUseCase rejects unsupported coverage before repository mutation', async () => {
  let updates = 0
  const fields: FieldRepository = { async save() {}, async findById() { return field() }, async findByExternalFieldId() { return null }, async resolveCoverage() { return { insideSupportedArea: false, staleCause: 'outside_supported_area' } } }
  const geometry: FieldGeometryRepository = { async getGeometry() { return null }, async updateGeometry() { updates += 1; throw new Error('must not save') } }

  await assert.rejects(() => new UpdateFieldGeometryUseCase(fields, geometry).execute('field-1', { polygonWkt }), /outside_supported_area/)
  assert.equal(updates, 0)
})
