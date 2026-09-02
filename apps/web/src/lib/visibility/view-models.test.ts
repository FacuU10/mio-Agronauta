import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeCopilotResponse,
  normalizeCopilotStream,
  normalizeEvidenceStatus,
  normalizeRequestError,
  normalizeRequestResponse,
} from './view-models'

test('request outcomes classify auth, capability, rate-limit and server boundaries without losing status', () => {
  const cases = [
    { status: 401, outcome: 'unauthorized', retryable: false },
    { status: 403, outcome: 'forbidden', retryable: false },
    { status: 404, outcome: 'unavailable', retryable: false },
    { status: 429, outcome: 'retryable', retryable: true, retryAfterMs: 4_000 },
    { status: 503, outcome: 'unavailable', retryable: true },
  ] as const

  for (const expected of cases) {
    const result = normalizeRequestResponse({
      status: expected.status,
      retryAfterMs: expected.status === 429 ? 4_000 : undefined,
      raw: { status: expected.status, detail: 'upstream response' },
    })

    assert.equal(result.outcome, expected.outcome)
    assert.equal(result.retryable, expected.retryable)
    assert.equal(result.httpStatus, expected.status)
    assert.equal(result.reason, expected.status === 401 ? 'unauthorized' : expected.status === 403 ? 'forbidden' : expected.status === 404 ? 'capability_unavailable' : expected.status === 429 ? 'rate_limited' : 'server_unavailable')
    assert.deepEqual(result.raw, { status: expected.status, detail: 'upstream response' })
    if ('retryAfterMs' in expected) assert.equal(result.retryAfterMs, expected.retryAfterMs)
  }
})

test('request normalizer keeps an in-flight capability explicitly loading', () => {
  const result = normalizeRequestResponse({ loading: true, raw: { phase: 'connecting' } })

  assert.equal(result.outcome, 'loading')
  assert.equal(result.retryable, false)
  assert.equal(result.raw && typeof result.raw === 'object' ? (result.raw as { phase?: string }).phase : undefined, 'connecting')
})

test('request errors classify aborted delivery as retryable and preserve the original error', () => {
  const error = Object.assign(new Error('The user aborted a request'), { name: 'AbortError', code: 'ERR_ABORTED' })
  const result = normalizeRequestError(error)

  assert.equal(result.outcome, 'retryable')
  assert.equal(result.retryable, true)
  assert.equal(result.reason, 'request_aborted')
  assert.equal(result.raw, error)
})

test('evidence status makes stale and missing data explicit while retaining source and timestamp', () => {
  const stale = normalizeEvidenceStatus({
    mode: 'live',
    freshness: 'stale',
    source: 'INA',
    observedAt: '2026-06-23T13:30:00.000Z',
    reason: 'latest telemetry is outside the freshness window',
  })
  const missing = normalizeEvidenceStatus({ mode: 'unavailable', source: 'INA' })

  assert.deepEqual(stale, {
    mode: 'live',
    freshness: 'stale',
    source: 'INA',
    observedAt: '2026-06-23T13:30:00.000Z',
    reason: 'latest telemetry is outside the freshness window',
    actionable: false,
  })
  assert.equal(missing.mode, 'unavailable')
  assert.equal(missing.freshness, 'missing')
  assert.equal(missing.actionable, false)
})

test('evidence mode is never promoted to a live safe action by freshness alone', () => {
  const inputs = [
    { mode: 'live' as const, expected: true },
    { mode: 'seam' as const, expected: false },
    { mode: 'mock' as const, expected: false },
    { mode: 'unavailable' as const, expected: false },
  ]

  for (const { mode, expected } of inputs) {
    const result = normalizeEvidenceStatus({
      mode,
      freshness: 'fresh',
      source: 'INA',
      observedAt: '2026-06-23T13:30:00.000Z',
      lastSuccessfulObservedAt: '2026-06-23T13:29:00.000Z',
      reason: '  source status  ',
      raw: { mode },
    })

    assert.equal(result.mode, mode)
    assert.equal(result.freshness, mode === 'unavailable' ? 'missing' : 'fresh')
    assert.equal(result.actionable, expected)
    assert.equal(result.reason, 'source status')
    assert.equal(result.lastSuccessfulObservedAt, '2026-06-23T13:29:00.000Z')
    assert.deepEqual(result.raw, { mode })
  }
})

test('Copilot HTTP 200 with verified tokens and citations is actionable and grounded', () => {
  const result = normalizeCopilotResponse({
    status: 200,
    answer: 'La lectura subió.',
    tokens: ['La ', 'lectura subió.'],
    citations: ['PNA:station-1:2026-06-23T13:30:00Z'],
    citationMode: 'validated-context',
    citationUnavailable: false,
    unverifiedClaims: false,
    raw: { answer: 'La lectura subió.', provider: 'existing-copilot' },
  })

  assert.equal(result.outcome, 'ready')
  assert.equal(result.actionable, true)
  assert.equal(result.citationUnavailable, false)
  assert.deepEqual(result.tokens, ['La ', 'lectura subió.'])
  assert.deepEqual(result.citations, ['PNA:station-1:2026-06-23T13:30:00Z'])
  assert.deepEqual(result.raw, { answer: 'La lectura subió.', provider: 'existing-copilot' })
})

test('Copilot requires non-empty tokens and validated citations before it can be actionable', () => {
  const answerWithoutTokens = normalizeCopilotResponse({
    status: 200,
    answer: 'Texto no transportado como tokens.',
    citations: ['PNA:station-1'],
    citationMode: 'validated-context',
  })
  const contextOnly = normalizeCopilotResponse({
    status: 200,
    tokens: ['Texto con contexto.'],
    citations: ['search:1'],
    citationMode: 'context-only',
  })

  assert.equal(answerWithoutTokens.outcome, 'empty')
  assert.equal(answerWithoutTokens.actionable, false)
  assert.match(answerWithoutTokens.reason ?? '', /token/i)
  assert.equal(contextOnly.outcome, 'empty')
  assert.equal(contextOnly.citationUnavailable, true)
  assert.equal(contextOnly.actionable, false)
})

test('Copilot stream remains loading until transport completion and reports rate limits as retryable', () => {
  const loading = normalizeCopilotStream({
    status: 200,
    tokens: [{ text: 'Parcial' }],
    citations: ['PNA:station-1'],
    citationMode: 'validated-context',
    done: false,
  })
  const limited = normalizeCopilotResponse({ status: 429, retryAfterMs: 2_500, error: 'rate limited', raw: { status: 429 } })

  assert.equal(loading.outcome, 'loading')
  assert.equal(loading.actionable, false)
  assert.equal(loading.answer, 'Parcial')
  assert.equal(limited.outcome, 'retryable')
  assert.equal(limited.retryable, true)
  assert.equal(limited.retryAfterMs, 2_500)
  assert.deepEqual(limited.raw, { status: 429 })
})

test('Copilot HTTP 200 with an empty stream or unverified claims is never actionable', () => {
  const empty = normalizeCopilotStream({ status: 200, answer: '', citations: [], done: true })
  const unverified = normalizeCopilotResponse({
    status: 200,
    answer: 'No respaldado',
    citations: [],
    citationMode: 'none',
    citationUnavailable: true,
    unverifiedClaims: true,
  })

  assert.equal(empty.outcome, 'empty')
  assert.equal(empty.actionable, false)
  assert.match(empty.reason ?? '', /tokens|citation/i)
  assert.equal(unverified.outcome, 'empty')
  assert.equal(unverified.actionable, false)
  assert.equal(unverified.citationUnavailable, true)
  assert.equal(unverified.unverifiedClaims, true)
})
