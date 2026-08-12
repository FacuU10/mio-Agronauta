import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeFieldGeometryInput, polygonMetrics } from './field-geometry'

const validWkt = 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19, -58.10 -29.20))'

test('normalizes WKT and derives a closed polygon centroid and metrics', () => {
  const normalized = normalizeFieldGeometryInput({ polygonWkt: validWkt })
  const metrics = polygonMetrics(normalized.coordinates)

  assert.match(normalized.polygonWkt, /^POLYGON \(\(/)
  assert.deepEqual(normalized.coordinates[0], normalized.coordinates.at(-1))
  assert.ok(metrics.areaM2 > 0)
  assert.ok(metrics.perimeterM > 0)
  assert.ok(metrics.centroid.lat < -29.19 && metrics.centroid.lat > -29.20)
  assert.ok(metrics.centroid.lng < -58.09 && metrics.centroid.lng > -58.10)
})

test('converts GeoJSON Polygon to canonical WKT and rejects out-of-bounds geometry', () => {
  const normalized = normalizeFieldGeometryInput({
    geoJson: {
      type: 'Polygon',
      coordinates: [[[-58.10, -29.20], [-58.09, -29.20], [-58.09, -29.19], [-58.10, -29.20]]],
    },
  })

  assert.match(normalized.polygonWkt, /^POLYGON \(\(/)
  assert.throws(
    () => normalizeFieldGeometryInput({ polygonWkt: 'POLYGON ((181 -29, 182 -29, 182 -28, 181 -29))' }),
    /coordinates out of range/,
  )
})

test('rejects incomplete and self-intersecting polygons before persistence', () => {
  assert.throws(
    () => normalizeFieldGeometryInput({ polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.20, -58.09 -29.19))' }),
    /closed polygon requires at least four points/,
  )
  assert.throws(
    () => normalizeFieldGeometryInput({ polygonWkt: 'POLYGON ((-58.10 -29.20, -58.09 -29.19, -58.09 -29.20, -58.10 -29.19, -58.10 -29.20))' }),
    /self-intersecting/,
  )
})
