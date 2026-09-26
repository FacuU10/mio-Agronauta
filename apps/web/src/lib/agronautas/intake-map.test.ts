import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFallbackLocationSelection, createAgronautasMapAdapter, createGoogleMapsLoader, createPolygonDraft, formatGeometryMetrics, resolveGoogleMapsConfig } from './intake-map'

test('Google mapping config is explicit and never enabled without a public browser key', () => {
  assert.deepEqual(resolveGoogleMapsConfig({}), { status: 'disabled', reason: 'missing_public_key' })
  assert.deepEqual(resolveGoogleMapsConfig({ enabled: false, apiKey: 'public-test-key' }), { status: 'disabled', reason: 'disabled_by_configuration' })
  assert.deepEqual(resolveGoogleMapsConfig({ enabled: true, apiKey: 'public-test-key' }), { status: 'ready', apiKeyConfigured: true })
})

test('Google loader uses an injected script loader and exposes failure/retry states without exposing the key', async () => {
  const missing = createGoogleMapsLoader({ config: resolveGoogleMapsConfig({}), loadScript: async () => undefined })
  assert.deepEqual(await missing.load(), { status: 'disabled', reason: 'missing_public_key' })

  let attempts = 0
  const loader = createGoogleMapsLoader({
    config: resolveGoogleMapsConfig({ enabled: true, apiKey: 'public-test-key' }),
    apiKey: 'public-test-key',
    loadScript: async () => { attempts += 1; if (attempts === 1) throw new Error('network down') },
  })
  assert.deepEqual(await loader.load(), { status: 'failed', reason: 'provider_load_failed' })
  assert.deepEqual(await loader.retry(), { status: 'ready', apiKeyConfigured: true })
  assert.equal(attempts, 2)
})

test('mapping search and polygon metrics are deterministic with coordinate fallback', async () => {
  const adapter = createAgronautasMapAdapter()
  assert.deepEqual(adapter.searchLocalities('mer').map((item) => item.id), ['mercedes'])
  assert.deepEqual(adapter.parseCoordinates('-29.1846, -58.0759'), { lat: -29.1846, lng: -58.0759 })
  assert.equal(adapter.parseCoordinates('not coordinates'), null)

  const draft = createPolygonDraft([
    { lat: -29.18, lng: -58.08 },
    { lat: -29.18, lng: -58.07 },
    { lat: -29.19, lng: -58.07 },
  ])
  assert.equal(draft.isComplete, true)
  assert.equal(draft.polygonWkt, 'POLYGON((-58.08 -29.18,-58.07 -29.18,-58.07 -29.19,-58.08 -29.18))')
  assert.deepEqual(formatGeometryMetrics({ hectares: 1, areaM2: 10000, perimeterM: 400 }), { area: '1.00 ha', footprint: '10,000 m²', perimeter: '400 m' })
})

test('fallback location selection is point-only and contains no fabricated provider or coverage claim', () => {
  const selection = buildFallbackLocationSelection({ lat: -29.1846, lng: -58.0759 }, 'mercedes')

  assert.deepEqual(selection, {
    geometry: { type: 'point', coordinates: { latitude: -29.1846, longitude: -58.0759 } },
    selection: {
      source: 'locality-fallback',
      sourceReference: 'mercedes',
    },
  })
  assert.equal('provider' in selection, false)
  assert.equal('coverage' in selection, false)
})
