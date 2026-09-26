import test from 'node:test'
import assert from 'node:assert/strict'
import { applyChatEvent, applyChatRateLimit, canRetryChat, createChatStreamState, createChatViewModel, createChatViewModelFromStream, parseSseText } from './chat'

test('chat SSE adapter assigns typed transport metadata while preserving event payloads', () => {
  const events = parseSseText('event: metadata\ndata: {"model":"existing-copilot","limit":120}\n\nevent: token\ndata: {"token":"Riesgo "}\n\nevent: done\ndata: {}\n\n', '2026-06-03T00:00:00.000Z')

  assert.deepEqual(events.map((event) => event.type), ['metadata', 'token', 'done'])
  assert.equal(events[1]?.token, 'Riesgo ')
   assert.equal(events[0]?.metadata?.['model'], 'existing-copilot')
  assert.equal(events[0]?.sequence, 1)
  assert.equal(events[2]?.receivedAt, '2026-06-03T00:00:00.000Z')
})

test('chat SSE adapter accepts the existing text token payload shape', () => {
  const events = parseSseText('event: token\ndata: {"text":"Token existente "}\n\nevent: done\ndata: {}\n\n', '2026-06-23T13:40:00.000Z')

  assert.equal(events[0]?.type, 'token')
  assert.equal(events[0]?.token, 'Token existente ')
  assert.equal(events[1]?.type, 'done')
})

test('chat harness keeps partial tokens and facts when an existing stream ends in error', () => {
  let state = applyChatEvent({ status: 'idle', answer: '', metadata: {}, facts: [], citations: [], trace: [], sources: [], limits: [], retryable: false }, {
    type: 'metadata', sequence: 1, receivedAt: '2026-06-03T00:00:00.000Z', metadata: { model: 'existing-copilot', maxTokens: 120 },
  })
  state = applyChatEvent(state, { type: 'token', sequence: 2, receivedAt: '2026-06-03T00:00:01.000Z', token: 'Parcial ' })
  state = applyChatEvent(state, { type: 'error', sequence: 3, receivedAt: '2026-06-03T00:00:02.000Z', error: 'upstream_unavailable' })

  assert.equal(state.status, 'partial')
  assert.equal(state.answer, 'Parcial ')
  assert.equal(state.error, 'upstream_unavailable')
   assert.equal(state.metadata['model'], 'existing-copilot')
  assert.equal(state.retryable, true)
})

test('chat view model renders only facts, citations, trace and degradation supplied by the contract', () => {
  const viewModel = createChatViewModel({
    contractVersion: '1.0.0', fieldId: 'field-1', answer: 'Estado persistido.', executedAction: 'GET_RISK_SUMMARY',
    supportingFacts: [{ label: 'Score', value: '74' }], citations: ['weather:open-meteo:2026'],
    trace: [{ action: 'GET_RISK_SUMMARY', status: 'executed' }], degraded: true, unavailableReason: 'groq_unavailable',
    sourceRunIds: ['run-weather-2026'], actionable: false, providerModes: ['live'], modelMode: 'unavailable',
    citationLineage: [{
      citationId: 'weather:open-meteo:2026', evidenceId: 'weather-2026', runId: 'run-weather-2026',
      provider: 'open-meteo', signalType: 'weather', providerMode: 'live', status: 'fresh',
      sourceKey: 'open-meteo', retrievedAt: '2026-06-03T00:00:00.000Z', degradationReasons: [],
    }],
  })

  assert.deepEqual(viewModel.facts, [{ label: 'Score', value: '74' }])
  assert.deepEqual(viewModel.citations, ['weather:open-meteo:2026'])
  assert.deepEqual(viewModel.trace, [{ action: 'GET_RISK_SUMMARY', status: 'executed' }])
  assert.deepEqual(viewModel.sources, ['weather:open-meteo:2026'])
  assert.equal(viewModel.status, 'degraded')
  assert.equal(viewModel.retryable, true)
})

test('chat normalizer rejects an HTTP-200 empty stream as non-actionable', () => {
  const viewModel = createChatViewModel({
    contractVersion: '1.0.0', fieldId: 'field-1', answer: '', executedAction: 'FINAL_RESPONSE',
    supportingFacts: [], citations: [], trace: [], degraded: false,
    sourceRunIds: [], actionable: false, providerModes: [], modelMode: 'deterministic', citationLineage: [],
  })

  assert.equal(viewModel.actionable, false)
  assert.equal(viewModel.citationUnavailable, true)
  assert.equal(viewModel.status, 'error')
  assert.match(viewModel.error ?? '', /tokens|cita/i)
})

test('chat normalizer refuses unverified Copilot claims even when answer text exists', () => {
  const viewModel = createChatViewModel({
    contractVersion: '1.0.0', fieldId: 'field-1', answer: 'No respaldado', executedAction: 'FINAL_RESPONSE',
    supportingFacts: [], citations: [], trace: [], degraded: false,
    citationMode: 'none', citationUnavailable: true, unverifiedClaims: true,
    sourceRunIds: [], actionable: false, providerModes: [], modelMode: 'deterministic', citationLineage: [],
  })

  assert.equal(viewModel.actionable, false)
  assert.equal(viewModel.citationUnavailable, true)
  assert.equal(viewModel.unverifiedClaims, true)
  assert.equal(viewModel.outcome, 'empty')
  assert.equal(viewModel.status, 'error')
})

test('chat normalizer exposes a rate-limit outcome without losing retry timing', () => {
  const viewModel = createChatViewModel({
    contractVersion: '1.0.0', fieldId: 'field-1', answer: 'No disponible', executedAction: 'FINAL_RESPONSE',
    supportingFacts: [], citations: [], trace: [], degraded: false,
    status: 429, unavailableReason: 'rate_limited', retryAfterMs: 3_000,
    sourceRunIds: [], actionable: false, providerModes: [], modelMode: 'unavailable', citationLineage: [],
  })

  assert.equal(viewModel.outcome, 'retryable')
  assert.equal(viewModel.status, 'degraded')
  assert.equal(viewModel.retryable, true)
  assert.equal(viewModel.httpStatus, 429)
  assert.equal(viewModel.retryAfterMs, 3_000)
  assert.equal(viewModel.error, 'rate_limited')
})

test('chat stream normalization preserves the pending draft and rate-limit metadata', () => {
  const state = {
    ...createChatStreamState(),
    status: 'error' as const,
    metadata: { draft: '¿Qué pasó con la estación?', citationMode: 'none' },
    httpStatus: 429,
    retryAfterMs: 4_000,
    error: 'rate_limited',
  }

  const viewModel = createChatViewModelFromStream(state)

   assert.equal(viewModel.metadata['draft'], '¿Qué pasó con la estación?')
  assert.equal(viewModel.outcome, 'retryable')
  assert.equal(viewModel.httpStatus, 429)
  assert.equal(viewModel.retryAfterMs, 4_000)
  assert.equal(viewModel.retryable, true)
})

test('chat stream preserves Copilot citation lineage, run ids and provider modes from metadata', () => {
  const events = parseSseText([
    'event: metadata',
    'data: {"fieldId":"field-1","locationId":"location-1","sourceRunIds":["run-1"],"providerModes":["live"],"citations":["evidence:evidence-1"],"citationLineage":[{"citationId":"evidence:evidence-1","evidenceId":"evidence-1","runId":"run-1","provider":"open-meteo","signalType":"weather","providerMode":"live","status":"fresh","sourceKey":"open-meteo","retrievedAt":"2026-09-15T10:00:00Z"}],"readiness":"ready"}',
    '',
    'event: token',
    'data: {"token":"Respuesta basada en evidencia."}',
    '',
    'event: done',
    'data: {}',
    '',
  ].join('\n'), '2026-09-15T10:01:00Z')

  let state = createChatStreamState()
  for (const event of events) state = applyChatEvent(state, event)
  const view = createChatViewModelFromStream(state)
  assert.equal(view.actionable, true)
  assert.deepEqual(view.metadata['sourceRunIds'], ['run-1'])
  assert.deepEqual(view.metadata['providerModes'], ['live'])
  assert.equal((view.metadata['citationLineage'] as Array<{ evidenceId: string }>)[0]?.evidenceId, 'evidence-1')
})

test('chat rate-limit recovery normalizes Retry-After seconds and blocks early retry', () => {
  const now = Date.parse('2026-08-28T12:00:00.000Z')
  const state = applyChatRateLimit({
    ...createChatStreamState(),
    answer: 'Respuesta previa',
    metadata: { draft: '¿Qué pasó con la estación?', model: 'existing-copilot' },
    citations: ['ina:station:2026-08-28T11:59:00Z'],
  }, '3', now)

  assert.equal(state.status, 'degraded')
  assert.equal(state.actionable, false)
  assert.equal(state.retryable, true)
  assert.equal(state.httpStatus, 429)
  assert.equal(state.retryAfterMs, 3_000)
  assert.equal(state.retryAt, '2026-08-28T12:00:03.000Z')
   assert.equal(state.metadata['draft'], '¿Qué pasó con la estación?')
  assert.deepEqual(state.citations, ['ina:station:2026-08-28T11:59:00Z'])
  assert.equal(canRetryChat(state, now + 2_999), false)
  assert.equal(canRetryChat(state, now + 3_000), true)
})

test('chat rate-limit recovery accepts an HTTP-date and allows retry when its backoff has elapsed', () => {
  const now = Date.parse('2026-08-28T12:00:00.000Z')
  const state = applyChatRateLimit({
    ...createChatStreamState(),
    metadata: { draft: '¿Hay alerta vigente?' },
    retryable: false,
  }, 'Fri, 28 Aug 2026 12:00:02 GMT', now)

  assert.equal(state.status, 'degraded')
  assert.equal(state.actionable, false)
  assert.equal(state.retryAfterMs, 2_000)
  assert.equal(state.retryAt, '2026-08-28T12:00:02.000Z')
   assert.equal(state.metadata['draft'], '¿Hay alerta vigente?')
  assert.equal(canRetryChat(state, now + 1_999), false)
  assert.equal(canRetryChat(state, now + 2_000), true)
})
