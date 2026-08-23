import test from 'node:test'
import assert from 'node:assert/strict'
import { createGeorefAdapter, createNasaFirmsAdapter, createNasaPowerDailyAdapter, createOpenMeteoAdapter, createSentinelStacAdapter, createSmnAlertsAdapter } from './agronautas-provider-adapters'

test('provider adapters expose real-source seams and normalize raw evidence', async () => {
  const adapter = createOpenMeteoAdapter(async (fieldId) => ({
    fieldId,
    retrievedAt: '2026-07-04T18:00:00.000Z',
    confidence: 0.93,
    normalized: { temperatureC: 30.5, rainfallMm7d: 14 },
  }))

  const evidence = await adapter.fetch('field-1')

  assert.equal(evidence.provider, 'open-meteo')
  assert.equal(evidence.signalType, 'climate')
  assert.deepEqual(evidence.normalized, { temperatureC: 30.5, rainfallMm7d: 14 })
  assert.equal(evidence.observedAt, null)
  assert.equal(evidence.retrievedAt, '2026-07-04T18:00:00.000Z')
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

  assert.equal(live.mode, 'seam')
  assert.equal(live.freshness, 'degraded')
  assert.equal(mock.mode, 'mock')
  assert.equal(mock.status, 'degraded')
  assert.equal(seam.mode, 'seam')

  const unavailable = await createSmnAlertsAdapter({ endpoint: 'https://smn.test/alerts', fetch: async () => new Response('nope', { status: 503 }) }).fetch('field-1')
  assert.equal(unavailable.mode, 'unavailable')
  assert.match(unavailable.failureReason ?? '', /http/i)
})

test('SMN/FIRMS/Sentinel placeholder-real seams preserve provider identity and signal type', async () => {
  const adapters = [
    createSmnAlertsAdapter(async () => ({ observedAt: '2026-07-04T18:30:00.000Z', alertLevel: 'yellow' })),
    createNasaFirmsAdapter(async () => ({ observedAt: '2026-07-04T16:00:00.000Z', hotspots: 1 })),
    createSentinelStacAdapter(async () => ({ observedAt: '2026-07-04T12:00:00.000Z', ndvi: 0.68 })),
  ]

  const evidence = await Promise.all(adapters.map((adapter) => adapter.fetch('field-1')))

  assert.deepEqual(evidence.map((item) => `${item.provider}:${item.signalType}`), ['smn-alerts:weather_alert', 'nasa-firms:fire', 'sentinel-stac:satellite'])
  assert.equal(evidence[1]?.raw?.['hotspots'], 1)
})

test('Open-Meteo adapter can fetch the real HTTP API through an injectable fetch seam', async () => {
  const urls: string[] = []
  const adapter = createOpenMeteoAdapter({
    latitude: -29.18,
    longitude: -58.08,
    fetch: async (url) => {
      urls.push(String(url))
      return new Response(JSON.stringify({ daily: { time: ['2026-07-04', '2026-07-05'], temperature_2m_max: [31, 30], precipitation_sum: [12, 3] } }), { status: 200 })
    },
  })

  const evidence = await adapter.fetch('field-1')

  assert.match(urls[0] ?? '', /api\.open-meteo\.com\/v1\/forecast/)
  assert.deepEqual(evidence.normalized, { temperatureMaxC: 31, rainfallMm7d: 15, forecastHorizonDays: 1, model: 'best_match' })
  assert.equal(evidence.sourceUrl, urls[0])
  assert.equal(evidence.mode, 'seam')
})

test('SMN and FIRMS HTTP adapters require/propagate production credentials and normalize fetched payloads', async () => {
  const smn = createSmnAlertsAdapter({ endpoint: 'https://smn.test/alerts', fetch: async () => new Response(JSON.stringify({ alerts: [{ level: 'yellow' }], observedAt: '2026-07-04T18:00:00.000Z' }), { status: 200 }) })
  const firms = createNasaFirmsAdapter({ endpoint: 'https://firms.test/api', apiKey: 'firms-key', fetch: async (url) => new Response(JSON.stringify({ hotspots: [{ confidence: 80 }], requested: String(url) }), { status: 200 }) })

  assert.equal((await smn.fetch('field-1')).normalized?.['alertCount'], 1)
  const fire = await firms.fetch('field-1')
  assert.equal(fire.normalized?.['hotspotCount'], 1)
  assert.match(String(fire.raw?.['requested']), /MAP_KEY=firms-key/)
  assert.throws(() => createNasaFirmsAdapter({ endpoint: 'https://firms.test/api' }), /FIRMS_API_KEY/)
})

test('Georef 2.1 returns WGS84 degrees and codes without inventing an observation timestamp', async () => {
  const adapter = createGeorefAdapter({
    fetch: async () => new Response(JSON.stringify({ localidades: [{ id: 'localidad-1', nombre: 'Mercedes', provincia: { id: 'AR-W', nombre: 'Corrientes' }, centroide: { lat: -29.18, lon: -58.08 } }] }), { status: 200 }),
    now: () => new Date('2026-08-23T10:00:00.000Z'),
  })

  const evidence = await adapter.fetch('Mercedes')

  assert.equal(evidence.mode, 'seam')
  assert.equal(evidence.observedAt, null)
  assert.equal(evidence.units['latitude'], 'degrees')
  assert.equal(evidence.units['coordinateReferenceSystem'], 'WGS84')
  assert.equal(evidence.normalized?.['provinceCode'], 'AR-W')
})

test('NASA POWER Daily preserves requested time standard and mm/day units', async () => {
  const adapter = createNasaPowerDailyAdapter({
    latitude: -29.18,
    longitude: -58.08,
    startDate: '20260822',
    endDate: '20260822',
    timeStandard: 'local-solar',
    fetch: async () => new Response(JSON.stringify({ properties: { parameter: { T2M: { '20260822': 24.5 }, PRECTOTCORR: { '20260822': 4.2 } } } }), { status: 200 }),
  })

  const evidence = await adapter.fetch('field-1')

  assert.equal(evidence.timeStandard, 'local-solar')
  assert.equal(evidence.observedAt, '2026-08-22T00:00:00.000Z')
  assert.equal(evidence.units['precipitation'], 'mm/day')
  assert.equal(evidence.normalized?.['temperatureC'], 24.5)
})

test('provider adapters return unavailable for timeout/schema drift and Open-Meteo licensing is explicit', async () => {
  const timeout = await createNasaPowerDailyAdapter({ fetch: async () => { throw new DOMException('timed out', 'TimeoutError') }, timeoutMs: 1 }).fetch('field-1')
  const drift = await createGeorefAdapter({ fetch: async () => new Response(JSON.stringify({ unexpected: true }), { status: 200 }) }).fetch('field-1')
  const licensing = await createOpenMeteoAdapter({ commercialUseApproved: false }).fetch('field-1')

  assert.equal(timeout.mode, 'unavailable')
  assert.match(timeout.failureReason ?? '', /timeout/i)
  assert.equal(drift.mode, 'unavailable')
  assert.match(drift.failureReason ?? '', /schema/i)
  assert.equal(licensing.mode, 'unavailable')
  assert.match(licensing.failureReason ?? '', /commercial|license/i)
})
