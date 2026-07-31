import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSseEvent, type SseEvent } from './sse'

test('SSE parser preserves sequence, timestamp and event payload', () => {
  const parsed: SseEvent = parseSseEvent({ type: 'token', sequence: 2, receivedAt: '2026-06-03T00:00:00.000Z', token: 'riesgo' })
  assert.deepEqual(parsed, { type: 'token', sequence: 2, receivedAt: '2026-06-03T00:00:00.000Z', token: 'riesgo' })
})

test('SSE parser rejects unsupported event types and invalid sequence values', () => {
  assert.throws(() => parseSseEvent({ type: 'heartbeat', sequence: 1, receivedAt: '2026-06-03T00:00:00.000Z' }), /Unsupported SSE event/)
  assert.throws(() => parseSseEvent({ type: 'done', sequence: 0, receivedAt: '2026-06-03T00:00:00.000Z' }), /sequence/)
})
