import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { InaAdapter } from '../adapters/ina-adapter.js'
import { InaHttpClient, InmetHttpClient, PnaHttpClient, SmnHttpClient } from './http-clients.js'

const readFixture = (name: string) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

async function withEnv<T>(values: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key])
    const value = values[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return await run()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('PnaHttpClient defaults to the fast official contenidosweb endpoint and bounded 120s provider timeout', async () => {
  const requests: string[] = []
  const client = new PnaHttpClient({ fetch: async (input) => {
    requests.push(String(input))
    return new Response('<table><tr><td>CORRIENTES</td><td>3,42</td><td>08:00</td><td>12/07/2026</td><td>CRECIENTE</td></tr></table>', { status: 200, headers: { 'content-type': 'text/html' } })
  } })

  const result = await client.fetchTelemetry()

  assert.equal(client.timeoutMs, 120_000)
  assert.equal(client.totalTimeoutMs, 145_000)
  assert.deepEqual(requests, ['https://contenidosweb.prefecturanaval.gob.ar/alturas/'])
  assert.equal(result.ok, true)
  assert.equal(result.ok ? result.records[0]?.stationId : '', 'corrientes')
})

test('PnaHttpClient retries a first network failure and returns the second successful response', async () => {
  let calls = 0
  const client = new PnaHttpClient({ timeoutMs: 50, totalTimeoutMs: 100, retryBackoffMs: 0, fetch: async () => {
    calls += 1
    if (calls === 1) throw new Error('socket reset')
    return new Response('<table><tr><td>CORRIENTES</td><td>3,42</td></tr></table>', { status: 200, headers: { 'content-type': 'text/html' } })
  } })

  const result = await client.fetchTelemetry()

  assert.equal(result.ok, true)
  assert.equal(calls, 2)
  assert.equal(result.httpSummary?.attempts, 2)
  assert.equal(result.httpSummary?.status, 200)
  assert.equal(result.ok ? result.records[0]?.stationId : '', 'corrientes')
  assert.deepEqual(result.attemptLog?.map((attempt) => [attempt.attempt, attempt.outcome, attempt.failureKind]), [
    [1, 'failure', 'network_failure'],
    [2, 'success', undefined],
  ])
})

test('PnaHttpClient retries upstream 429 and 5xx responses but preserves the final HTTP status', async () => {
  let calls = 0
  const result = await new PnaHttpClient({ timeoutMs: 50, totalTimeoutMs: 100, retryBackoffMs: 0, fetch: async () => {
    calls += 1
    return new Response('temporary upstream failure', { status: calls === 1 ? 503 : 429, statusText: calls === 1 ? 'Service Unavailable' : 'Too Many Requests' })
  } }).fetchTelemetry()

  assert.equal(result.ok, false)
  assert.equal(calls, 2)
  assert.equal(result.ok ? 0 : result.diagnostic.upstreamStatus, 429)
  assert.equal(result.ok ? 0 : result.diagnostic.attempts, 2)
  assert.equal(result.httpSummary?.status, 429)
})

test('PnaHttpClient stops after two retryable network failures and preserves the final cause and total duration', async () => {
  let calls = 0
  const result = await new PnaHttpClient({ timeoutMs: 50, totalTimeoutMs: 100, retryBackoffMs: 0, fetch: async () => {
    calls += 1
    throw new Error('connection refused')
  } }).fetchTelemetry()

  assert.equal(result.ok, false)
  assert.equal(calls, 2)
  assert.equal(result.ok ? '' : result.diagnostic.failureKind, 'network_failure')
  assert.equal(result.ok ? 0 : result.diagnostic.attempts, 2)
  assert.equal(result.httpSummary?.attempts, 2)
  assert.equal(typeof (result.ok ? undefined : result.diagnostic.durationMs), 'number')
  assert.deepEqual(result.attemptLog?.map((attempt) => [attempt.attempt, attempt.outcome, attempt.failureKind]), [
    [1, 'failure', 'network_failure'],
    [2, 'failure', 'network_failure'],
  ])
})

test('PnaHttpClient does not retry parse failures or non-retryable 4xx responses', async () => {
  let parseCalls = 0
  const parseFailure = await new PnaHttpClient({ timeoutMs: 50, totalTimeoutMs: 100, retryBackoffMs: 0, fetch: async () => {
    parseCalls += 1
    return new Response('<html>invalid</html>', { status: 200, headers: { 'content-type': 'text/html' } })
  } }).fetchTelemetry()
  let clientCalls = 0
  const clientFailure = await new PnaHttpClient({ timeoutMs: 50, totalTimeoutMs: 100, retryBackoffMs: 0, fetch: async () => {
    clientCalls += 1
    return new Response('forbidden', { status: 403, statusText: 'Forbidden' })
  } }).fetchTelemetry()

  assert.equal(parseFailure.ok, false)
  assert.equal(parseCalls, 1)
  assert.equal(parseFailure.ok ? '' : parseFailure.diagnostic.failureKind, 'parse_failure')
  assert.equal(clientFailure.ok, false)
  assert.equal(clientCalls, 1)
  assert.equal(clientFailure.ok ? '' : clientFailure.diagnostic.upstreamStatus, 403)
  assert.equal(clientFailure.ok ? 0 : clientFailure.diagnostic.attempts, 1)
})

test('PnaHttpClient enforces a finite total timeout budget across retry attempts', async () => {
  let calls = 0
  const result = await new PnaHttpClient({ timeoutMs: 10, totalTimeoutMs: 100, retryBackoffMs: 1, fetch: async (_input, init) => {
    calls += 1
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
    })
  } }).fetchTelemetry()

  assert.equal(result.ok, false)
  assert.equal(calls, 2)
  assert.equal(result.ok ? '' : result.diagnostic.failureKind, 'timeout')
  assert.equal(result.ok ? 0 : result.diagnostic.attempts, 2)
  assert.ok((result.ok ? 0 : result.diagnostic.durationMs ?? 0) <= 200)
  assert.ok((result.httpSummary?.elapsedMs ?? 0) <= 200)
})

test('official clients read per-source timeouts and cap unsafe values', async () => {
  await withEnv({
    HYDROLOGY_PNA_TIMEOUT_MS: '90000',
    HYDROLOGY_INA_TIMEOUT_MS: '121000',
    HYDROLOGY_INMET_TIMEOUT_MS: 'bad',
    HYDROLOGY_SMN_TIMEOUT_MS: '45000',
  }, async () => {
    const fetchEmpty = async () => new Response('', { status: 204 })
    assert.equal(new PnaHttpClient({ fetch: fetchEmpty }).timeoutMs, 90_000)
    assert.equal(new InaHttpClient({ fetch: fetchEmpty }).timeoutMs, 120_000)
    assert.equal(new InmetHttpClient({ fetch: fetchEmpty }).timeoutMs, 60_000)
    assert.equal(new SmnHttpClient({ fetch: fetchEmpty }).timeoutMs, 45_000)
  })
})

test('PnaHttpClient rejects oversized official HTML without unbounded text buffering', async () => {
  const maxResponseChars = 32
  let calls = 0
  const result = await new PnaHttpClient({ maxResponseChars, fetch: async () => {
    calls += 1
    return new Response(`<html>${'x'.repeat(maxResponseChars + 1)}</html>`, { status: 200, headers: { 'content-type': 'text/html' } })
  } }).fetchTelemetry()

  assert.equal(result.ok, false)
  assert.equal(result.ok ? '' : result.diagnostic.failureKind, 'response_too_large')
  assert.equal(result.ok ? 0 : result.diagnostic.attempts, 1)
  assert.equal(calls, 1)
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
  assert.deepEqual(result.ok ? result.records.map((record) => [record.stationId, record.providerAlertId, record.coverageKey, record.metric, record.value]) : [], [['inmet-alerts', '54990', undefined, 'storm_alert', null]])
  assert.equal(result.ok ? result.httpSummary?.attempts : 0, 1)
})

test('InmetHttpClient classifies the official no-alert text as a successful empty result', async () => {
  const result = await new InmetHttpClient({ fetch: async () => new Response('Não há avisos meteorológicos ativos.\n', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }) }).fetchTelemetry()

  assert.equal(result.ok, true)
  assert.deepEqual(result.ok ? result.records : [], [])
})

test('InmetHttpClient matches the no-alert text across case and Unicode normalization', async () => {
  const result = await new InmetHttpClient({ fetch: async () => new Response('NÃO HÁ AVISOS METEOROLÓGICOS ATIVOS.\n', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }) }).fetchTelemetry()

  assert.equal(result.ok, true)
  assert.deepEqual(result.ok ? result.records : [], [])
})

test('InmetHttpClient accepts optional terminal punctuation and whitespace only for the official no-alert text', async () => {
  const noPunctuation = await new InmetHttpClient({ fetch: async () => new Response('\n Não há avisos meteorológicos ativos \t', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }) }).fetchTelemetry()
  const unrelatedText = await new InmetHttpClient({ fetch: async () => new Response('Não há avisos meteorológicos ativos hoje.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }) }).fetchTelemetry()

  assert.equal(noPunctuation.ok, true)
  assert.deepEqual(noPunctuation.ok ? noPunctuation.records : [], [])
  assert.equal(unrelatedText.ok, false)
  assert.equal(unrelatedText.ok ? '' : unrelatedText.diagnostic.failureKind, 'parse_failure')
})

test('InmetHttpClient retains parse failure for unexpected HTTP-200 payloads', async () => {
  const result = await new InmetHttpClient({ fetch: async () => new Response('<html>maintenance</html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }) }).fetchTelemetry()

  assert.equal(result.ok, false)
  assert.equal(result.ok ? '' : result.diagnostic.failureKind, 'parse_failure')
})

test('INA fetches each configured official CSV series once and persists observed values with source URLs', async () => {
  const requests: string[] = []
  const bodies = await Promise.all([
    readFixture('ina-6764-headered.csv'),
    readFixture('ina-33988-headerless.csv'),
    readFixture('ina-38469-headerless.csv'),
  ])
  const ina = await new InaHttpClient({ fetch: async (input) => {
    requests.push(String(input))
    return new Response(bodies[requests.length - 1], { status: 200, headers: { 'content-type': 'text/plain' } })
  } }).fetchTelemetry()

  assert.equal(requests.length, 3)
  assert.deepEqual(requests.map((request) => {
    const url = new URL(request)
    return { path: url.pathname, seriesId: url.searchParams.get('series_id'), format: url.searchParams.get('format') }
  }), [
    { path: '/a5/getObservaciones', seriesId: '6764', format: 'csv' },
    { path: '/a5/getObservaciones', seriesId: '33988', format: 'csv' },
    { path: '/a5/getObservaciones', seriesId: '38469', format: 'csv' },
  ])
  assert.equal(requests.some((request) => /format=mnemos/i.test(request)), false)
  assert.equal(ina.ok, true)
  assert.deepEqual(ina.ok ? ina.records.map((record) => [record.stationId, record.value]) : [], [['6764', 3.13], ['33988', 2.73], ['38469', 2.34]])
  assert.deepEqual(ina.ok ? ina.records.map((record) => record.sourceUrl) : [], requests)
  assert.equal(new Set(ina.ok ? ina.records.map((record) => record.stationId) : []).size, 3)
  assert.ok(ina.ok && ina.records.every((record) => record.sourceUrl?.startsWith('https://alerta.ina.gob.ar/') === true))
})

test('INA adapter maps headered and headerless fixtures and rejects malformed fallback rows', async () => {
  const adapter = new InaAdapter('https://alerta.ina.gob.ar/a5/getObservaciones?format=csv')
  const [headered, headerless, bellaVista] = await Promise.all([
    readFixture('ina-6764-headered.csv'),
    readFixture('ina-33988-headerless.csv'),
    readFixture('ina-38469-headerless.csv'),
  ])

  assert.deepEqual([...adapter.parse(headered), ...adapter.parse(headerless), ...adapter.parse(bellaVista)].map((record) => [record.stationId, record.value]), [
    ['6764', 3.13],
    ['33988', 2.73],
    ['38469', 2.34],
  ])
  assert.deepEqual(adapter.parse('1004,puntual,33988,2026-07-17T10:00:00Z,2026-07-17T10:00:00Z,Paso de los Libres,Altura del río,m,2026-07-17T10:05:00Z'), [])
  assert.deepEqual(adapter.parse('1004,puntual,33988,not-a-date,2026-07-17T10:00:00Z,Paso de los Libres,Altura del río,m,2026-07-17T10:05:00Z,2.71'), [])
})

test('INA adapter extracts nested official HTML cell text while retaining row validation', () => {
  const adapter = new InaAdapter('https://alerta.ina.gob.ar/a5/getObservaciones?format=html')
  const nestedMarkup = '<table><tr><td><strong>Paso de los Libres</strong></td><td><span>Altura:</span> <b>2,71</b></td><td><time>2026-07-17T10:00:00Z</time></td><td><em>Tendencia:</em> Creciente</td></tr></table>'
  const invalidMarkup = '<table><tr><td><strong>Paso de los Libres</strong></td><td><span>Altura:</span> sin dato</td><td><time>not-a-date</time></td></tr></table>'

  assert.deepEqual(adapter.parse(nestedMarkup).map((record) => [record.stationId, record.value, record.tendency]), [['paso-de-los-libres', 2.71, 'Creciente']])
  assert.deepEqual(adapter.parse(invalidMarkup), [])
})

test('INA fetches its fixed official series concurrently within one bounded attempt', async () => {
  let active = 0
  let maxActive = 0
  const ina = await new InaHttpClient({ fetch: async () => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active -= 1
    return new Response('series_id,timestart,valor\n6764,2026-07-14T12:00:00Z,3.13', { status: 200, headers: { 'content-type': 'text/plain' } })
  } }).fetchTelemetry()

  assert.equal(maxActive, 3)
  assert.equal(ina.ok, true)
  assert.equal(ina.ok ? ina.records.length : 0, 3)
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
  assert.deepEqual(smn.ok ? smn.records.map((record) => [record.stationId, record.providerAlertId, record.coverageKey, record.metric, record.value]) : [], [['smn-alerts', '20260714204142', undefined, 'storm_alert', null]])
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
    timeoutMs: 120_000,
  })
  assert.equal(result.httpSummary?.responseChars, body.length)
  assert.doesNotMatch(JSON.stringify(result), /should-not-leak|token=/i)
})
