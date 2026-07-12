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

test('InmetHttpClient treats 204 No Content as an empty successful response with one attempt', async () => {
  let calls = 0
  const result = await new InmetHttpClient({ url: 'https://apitempo.inmet.gov.br/estacao/diaria/2026-07-12', fetch: async () => {
    calls += 1
    return new Response(null, { status: 204 })
  } }).fetchTelemetry()

  assert.equal(calls, 1)
  assert.equal(result.ok, true)
  assert.deepEqual(result.ok ? result.records : [], [])
})

test('INA and SMN clients report honest degraded diagnostics for unsupported official HTML instead of fake success', async () => {
  const fetchHtml = async () => new Response('<html>official page without parseable JSON</html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })

  const ina = await new InaHttpClient({ url: 'https://www.ina.gob.ar/alerta/index.php', fetch: fetchHtml }).fetchTelemetry()
  const smn = await new SmnHttpClient({ url: 'https://www.smn.gob.ar/alertas', fetch: fetchHtml }).fetchTelemetry()

  assert.deepEqual([ina.ok, smn.ok], [false, false])
  assert.equal(ina.ok ? '' : ina.diagnostic.failureKind, 'unexpected_content_type')
  assert.equal(smn.ok ? '' : smn.diagnostic.failureKind, 'unexpected_content_type')
  assert.equal(ina.ok ? 0 : ina.diagnostic.attempts, 1)
  assert.equal(smn.ok ? 0 : smn.diagnostic.attempts, 1)
})
