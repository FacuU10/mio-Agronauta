import test from 'node:test'
import assert from 'node:assert/strict'
import { createMapProviderAdapter, filterLocalities, type LocalityOption } from './map'

const localities: LocalityOption[] = [
  { id: 'mercedes', name: 'Mercedes', provinceCode: 'AR-W', coordinates: { lat: -29.18, lng: -58.07 } },
  { id: 'corrientes', name: 'Corrientes', provinceCode: 'AR-W', coordinates: { lat: -27.47, lng: -58.83 } },
]

test('map adapter keeps provider optional and returns an explicit point-based coverage preview', async () => {
  const adapter = createMapProviderAdapter({
    localities,
    previewCoverage: async (point) => ({
      state: point.lat === -29.18 ? 'inside' : 'outside',
      locality: point.lat === -29.18 ? 'Mercedes' : null,
      provinceCode: point.lat === -29.18 ? 'AR-W' : null,
      source: 'backend coverage contract',
      pointOnly: true,
    }),
  })

  assert.equal(adapter.provider, 'unconfigured')
  assert.deepEqual(await adapter.previewCoverage({ lat: -29.18, lng: -58.07 }), {
    state: 'inside',
    locality: 'Mercedes',
    provinceCode: 'AR-W',
    source: 'backend coverage contract',
    pointOnly: true,
  })
  assert.deepEqual(await adapter.previewCoverage({ lat: -34.6, lng: -58.38 }), {
    state: 'outside',
    locality: null,
    provinceCode: null,
    source: 'backend coverage contract',
    pointOnly: true,
  })
})

test('locality search is deterministic and does not claim unsupported polygon coverage', () => {
  assert.deepEqual(filterLocalities(localities, 'mer'), [localities[0]])
  assert.deepEqual(filterLocalities(localities, ''), localities)
  assert.deepEqual(filterLocalities(localities, 'santa'), [])
})
