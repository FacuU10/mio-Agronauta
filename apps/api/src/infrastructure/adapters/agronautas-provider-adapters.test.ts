import test from 'node:test'
import assert from 'node:assert/strict'
import { createNasaFirmsAdapter, createOpenMeteoAdapter, createSentinelStacAdapter, createSmnAlertsAdapter } from './agronautas-provider-adapters'

test('provider adapters expose real-source seams and normalize raw evidence', async () => {
  const adapter = createOpenMeteoAdapter(async (fieldId) => ({
    fieldId,
    observedAt: '2026-07-04T18:00:00.000Z',
    confidence: 0.93,
    normalized: { temperatureC: 30.5, rainfallMm7d: 14 },
  }))

  const evidence = await adapter.fetch('field-1')

  assert.equal(evidence.provider, 'open-meteo')
  assert.equal(evidence.signalType, 'climate')
  assert.deepEqual(evidence.normalized, { temperatureC: 30.5, rainfallMm7d: 14 })
  assert.equal(evidence.observedAt.toISOString(), '2026-07-04T18:00:00.000Z')
  assert.equal(evidence.mode, 'seam')
  assert.equal(evidence.status, 'degraded')
  assert.match(evidence.failureReason ?? '', /injectable seam/i)
})

test('provider taxonomy reports live, mock, seam, and unavailable truthfully', async () => {
  const live = await createOpenMeteoAdapter({
    fetch: async () => new Response(JSON.stringify({ daily: { time: ['2026-07-04'], temperature_2m_max: [31], precipitation_sum: [12] } }), { status: 200 }),
  }).fetch('field-1')
  const mock = await createOpenMeteoAdapter({ mode: 'mock', fetch: async () => new Response(JSON.stringify({ daily: { time: ['2026-07-04'], temperature_2m_max: [30], precipitation_sum: [1] } }), { status: 200 }) }).fetch('field-1')
  const seam = await createSentinelStacAdapter(async () => ({ observedAt: '2026-07-04T12:00:00.000Z', ndvi: 0.68 })).fetch('field-1')

  assert.equal(live.mode, 'live')
  assert.equal(live.status, 'fresh')
  assert.equal(mock.mode, 'mock')
  assert.equal(mock.status, 'degraded')
  assert.equal(seam.mode, 'seam')

  await assert.rejects(
    () => createSmnAlertsAdapter({ endpoint: 'https://smn.test/alerts', fetch: async () => new Response('nope', { status: 503 }) }).fetch('field-1'),
    (error: unknown) => error instanceof Error && /unavailable/.test(error.message),
  )
})

test('SMN/FIRMS/Sentinel placeholder-real seams preserve provider identity and signal type', async () => {
  const adapters = [
    createSmnAlertsAdapter(async () => ({ observedAt: '2026-07-04T18:30:00.000Z', alertLevel: 'yellow' })),
    createNasaFirmsAdapter(async () => ({ observedAt: '2026-07-04T16:00:00.000Z', hotspots: 1 })),
    createSentinelStacAdapter(async () => ({ observedAt: '2026-07-04T12:00:00.000Z', ndvi: 0.68 })),
  ]

  const evidence = await Promise.all(adapters.map((adapter) => adapter.fetch('field-1')))

  assert.deepEqual(evidence.map((item) => `${item.provider}:${item.signalType}`), ['smn-alerts:weather_alert', 'nasa-firms:fire', 'sentinel-stac:satellite'])
  assert.equal(evidence[1]?.raw['hotspots'], 1)
})

test('Open-Meteo adapter can fetch the real HTTP API through an injectable fetch seam', async () => {
  const urls: string[] = []
  const adapter = createOpenMeteoAdapter({
    latitude: -29.18,
    longitude: -58.08,
    fetch: async (url) => {
      urls.push(String(url))
      return new Response(JSON.stringify({ daily: { time: ['2026-07-04'], temperature_2m_max: [31], precipitation_sum: [12, 3] } }), { status: 200 })
    },
  })

  const evidence = await adapter.fetch('field-1')

  assert.match(urls[0] ?? '', /api\.open-meteo\.com\/v1\/forecast/)
  assert.deepEqual(evidence.normalized, { temperatureMaxC: 31, rainfallMm7d: 15 })
  assert.equal(evidence.sourceUrl, urls[0])
})

test('SMN and FIRMS HTTP adapters require/propagate production credentials and normalize fetched payloads', async () => {
  const smn = createSmnAlertsAdapter({ endpoint: 'https://smn.test/alerts', fetch: async () => new Response(JSON.stringify({ alerts: [{ level: 'yellow' }], observedAt: '2026-07-04T18:00:00.000Z' }), { status: 200 }) })
  const firms = createNasaFirmsAdapter({ endpoint: 'https://firms.test/api', apiKey: 'firms-key', fetch: async (url) => new Response(JSON.stringify({ hotspots: [{ confidence: 80 }], requested: String(url) }), { status: 200 }) })

  assert.equal((await smn.fetch('field-1')).normalized['alertCount'], 1)
  const fire = await firms.fetch('field-1')
  assert.equal(fire.normalized['hotspotCount'], 1)
  assert.match(String(fire.raw['requested']), /MAP_KEY=firms-key/)
  assert.throws(() => createNasaFirmsAdapter({ endpoint: 'https://firms.test/api' }), /FIRMS_API_KEY/)
})
