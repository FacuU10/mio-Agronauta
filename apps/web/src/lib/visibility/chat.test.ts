import test from 'node:test'
import assert from 'node:assert/strict'
import { applyChatEvent, createChatViewModel, parseSseText } from './chat'

test('chat SSE adapter assigns typed transport metadata while preserving event payloads', () => {
  const events = parseSseText('event: metadata\ndata: {"model":"existing-copilot","limit":120}\n\nevent: token\ndata: {"token":"Riesgo "}\n\nevent: done\ndata: {}\n\n', '2026-06-03T00:00:00.000Z')

  assert.deepEqual(events.map((event) => event.type), ['metadata', 'token', 'done'])
  assert.equal(events[1]?.token, 'Riesgo ')
  assert.equal(events[0]?.metadata?.model, 'existing-copilot')
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
  let state = applyChatEvent({ status: 'idle', answer: '', metadata: {}, facts: [], citations: [], trace: [], sources: [], limits: [] }, {
    type: 'metadata', sequence: 1, receivedAt: '2026-06-03T00:00:00.000Z', metadata: { model: 'existing-copilot', maxTokens: 120 },
  })
  state = applyChatEvent(state, { type: 'token', sequence: 2, receivedAt: '2026-06-03T00:00:01.000Z', token: 'Parcial ' })
  state = applyChatEvent(state, { type: 'error', sequence: 3, receivedAt: '2026-06-03T00:00:02.000Z', error: 'upstream_unavailable' })

  assert.equal(state.status, 'partial')
  assert.equal(state.answer, 'Parcial ')
  assert.equal(state.error, 'upstream_unavailable')
  assert.equal(state.metadata.model, 'existing-copilot')
  assert.equal(state.retryable, true)
})

test('chat view model renders only facts, citations, trace and degradation supplied by the contract', () => {
  const viewModel = createChatViewModel({
    contractVersion: '1.0.0', fieldId: 'field-1', answer: 'Estado persistido.', executedAction: 'GET_RISK_SUMMARY',
    supportingFacts: [{ label: 'Score', value: '74' }], citations: ['weather:open-meteo:2026'],
    trace: [{ action: 'GET_RISK_SUMMARY', status: 'executed' }], degraded: true, unavailableReason: 'groq_unavailable',
  })

  assert.deepEqual(viewModel.facts, [{ label: 'Score', value: '74' }])
  assert.deepEqual(viewModel.citations, ['weather:open-meteo:2026'])
  assert.deepEqual(viewModel.trace, [{ action: 'GET_RISK_SUMMARY', status: 'executed' }])
  assert.equal(viewModel.status, 'degraded')
  assert.equal(viewModel.retryable, true)
})
