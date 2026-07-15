import test from 'node:test'
import assert from 'node:assert/strict'
import { InaHttpClient, InmetHttpClient, PnaHttpClient, SmnHttpClient } from './http-clients.js'

test('PnaHttpClient defaults to the fast official contenidosweb endpoint and safe 25s timeout', async () => {
  const requests: string[] = []
  const client = new PnaHttpClient({ fetch: async (input) => {
    requests.push(String(input))
    return new Response('<table><tr><td>CORRIENTES</td><td>3,42</td><td>08:00</td><td>12/07/2026</td><td>CRECIENTE</td></tr></table>', { status: 200, headers: { 'content-type': 'text/html' } })
  } })

  const result = await client.fetchTelemetry()

  assert.equal(client.timeoutMs, 25_000)
  assert.deepEqual(requests, ['https://contenidosweb.prefecturanaval.gob.ar/alturas/'])
  assert.equal(result.ok, true)
  assert.equal(result.ok ? result.records[0]?.stationId : '', 'corrientes')
})

test('PnaHttpClient rejects oversized official HTML without unbounded text buffering', async () => {
  const maxResponseChars = 32
  const result = await new PnaHttpClient({ maxResponseChars, fetch: async () => {
    return new Response(`<html>${'x'.repeat(maxResponseChars + 1)}</html>`, { status: 200, headers: { 'content-type': 'text/html' } })
  } }).fetchTelemetry()

  assert.equal(result.ok, false)
  assert.equal(result.ok ? '' : result.diagnostic.failureKind, 'response_too_large')
  assert.equal(result.ok ? 0 : result.diagnostic.attempts, 1)
  assert.equal(result.ok ? '' : result.diagnostic.reason, 'PNA response exceeded safe size limit')
})

test('InmetHttpClient uses the current official RSS feed in one bounded request', async () => {
  let calls = 0
  const requests: string[] = []
  const result = await new InmetHttpClient({ fetch: async (input) => {
    calls += 1
    requests.push(String(input))
    return new Response('<rss><channel><item><title>Aviso de Tempestade</title><link>https://avisos.inmet.gov.br/54990</link><pubDate>Wed, 15 Jul 2026 06:00:01 GMT</pubDate><description>Chuva intensa</description></item></channel></rss>', { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  } }).fetchTelemetry()

  assert.equal(calls, 1)
  assert.deepEqual(requests, ['https://apiprevmet3.inmet.gov.br/avisos/rss'])
  assert.equal(result.ok, true)
  assert.deepEqual(result.ok ? result.records.map((record) => [record.stationId, record.metric, record.value]) : [], [['alert-54990', 'storm_alert', null]])
  assert.equal(result.ok ? result.httpSummary?.attempts : 0, 1)
})

test('INA fetches each configured official CSV series once and persists observed values with source URLs', async () => {
  const requests: string[] = []
  const bodies = [
    'series_id,timestart,valor\n6764,2026-07-14T12:00:00Z,3.13',
    'series_id,timestart,valor\n33988,2026-07-14T12:00:00Z,2.73',
    'series_id,timestart,valor\n38469,2026-07-14T12:00:00Z,2.34',
  ]
  const ina = await new InaHttpClient({ fetch: async (input) => {
    requests.push(String(input))
    return new Response(bodies[requests.length - 1], { status: 200, headers: { 'content-type': 'text/plain' } })
  } }).fetchTelemetry()

  assert.equal(requests.length, 3)
  assert.match(requests[0] ?? '', /series_id=6764/)
  assert.match(requests[1] ?? '', /series\/33988/)
  assert.match(requests[2] ?? '', /series\/38469/)
  assert.equal(ina.ok, true)
  assert.deepEqual(ina.ok ? ina.records.map((record) => [record.stationId, record.value]) : [], [['6764', 3.13], ['33988', 2.73], ['38469', 2.34]])
  assert.ok(ina.ok && ina.records.every((record) => record.sourceUrl?.startsWith('https://alerta.ina.gob.ar/') === true))
})

test('SMN reports an honest degraded diagnostic for unsupported official HTML instead of fake success', async () => {
  const smn = await new SmnHttpClient({ url: 'https://www.smn.gob.ar/alertas', fetch: async () => new Response('<html>challenge</html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }) }).fetchTelemetry()

  assert.equal(smn.ok, false)
  assert.equal(smn.ok ? '' : smn.diagnostic.failureKind, 'parse_failure')
  assert.equal(smn.ok ? 0 : smn.diagnostic.attempts, 1)
})

test('SMN parses the current official CAP RSS feed as bounded alert telemetry', async () => {
  const smn = await new SmnHttpClient({ fetch: async () => new Response('<rss><channel><item><title>Lluvias</title><link>https://ssl.smn.gob.ar/feeds/CAP/xml_generados/CAP_20260714204142_Lluvia_Patagonia_alertas_alertas_1.xml</link><pubDate>Wed, 15 Jul 2026 06:00:01 GMT</pubDate><description>Alerta oficial</description></item></channel></rss>', { status: 200, headers: { 'content-type': 'application/rss+xml' } }) }).fetchTelemetry()

  assert.equal(smn.ok, true)
  assert.deepEqual(smn.ok ? smn.records.map((record) => [record.stationId, record.metric, record.value]) : [], [['alert-20260714204142', 'storm_alert', null]])
  assert.ok(smn.ok && smn.records[0]?.sourceUrl?.startsWith('https://ssl.smn.gob.ar/feeds/'))
})

test('government clients expose bounded safe HTTP summaries without query secrets', async () => {
  const body = '<table><tr><td>CORRIENTES</td><td>3,42</td><td>08:00</td><td>12/07/2026</td><td>CRECIENTE</td></tr></table>'
  const result = await new PnaHttpClient({
    url: 'https://official.test/alturas?token=should-not-leak',
    fetch: async () => new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }),
  }).fetchTelemetry()

  assert.equal(result.ok, true)
  assert.deepEqual(result.httpSummary && {
    host: result.httpSummary.host,
    path: result.httpSummary.path,
    status: result.httpSummary.status,
    attempts: result.httpSummary.attempts,
    timeoutMs: result.httpSummary.timeoutMs,
  }, {
    host: 'official.test',
    path: '/alturas',
    status: 200,
    attempts: 1,
    timeoutMs: 25_000,
  })
  assert.equal(result.httpSummary?.responseChars, body.length)
  assert.doesNotMatch(JSON.stringify(result), /should-not-leak|token=/i)
})
