import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_GROQ_MODEL, HydrologyCopilotService, GroqTimeoutError, GroqUnavailableError, hydrologyCopilotSystemPrompt, resolveGroqModel } from './hydrology-copilot-service'
import type { HydrologyDenseContextV1 } from '@repo/zod-schemas'

test('HydrologyCopilotService streams metadata and Groq tokens with official context only', async () => {
  const calls: Array<Record<string, unknown>> = []
  const service = new HydrologyCopilotService({
    chat: {
      completions: {
        async create(input) {
          calls.push(input)
          return (async function * () {
            yield { choices: [{ delta: { content: 'Altura ' } }] }
            yield { choices: [{ delta: { content: 'oficial.' } }] }
          })()
        },
      },
    },
  })

  const events = []
  for await (const event of service.streamChat({ message: '¿Hay alerta?', context: denseContext() })) {
    events.push(event)
  }

  assert.equal(calls[0]?.['model'], DEFAULT_GROQ_MODEL)
  assert.equal(calls[0]?.['stream'], true)
  assert.deepEqual(events.map((event) => event.type), ['metadata', 'token', 'token', 'done'])
  assert.deepEqual(events[0]?.data, {
    contractVersion: 'hydrology-dense-context-v1',
    model: DEFAULT_GROQ_MODEL,
    fieldId: 'field-1',
    zone: 'Mercedes',
    sources: ['PNA', 'INA', 'INMET', 'SMN'],
    lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z',
    telemetryCount: 1,
  })
})

test('hydrology copilot prefers explicit GROQ_MODEL and keeps the current default as fallback', () => {
  assert.equal(resolveGroqModel({ GROQ_MODEL: 'custom-model' }), 'custom-model')
  assert.equal(resolveGroqModel({ AGRONAUTAS_GROQ_MODEL: 'legacy-config-model' }), 'legacy-config-model')
  assert.equal(resolveGroqModel({ GROQ_MODEL: '  ' }), DEFAULT_GROQ_MODEL)
})

test('hydrology copilot aborts a stalled Groq request and exposes a safe timeout code', async () => {
  let signal: AbortSignal | undefined
  const service = new HydrologyCopilotService({
    chat: {
      completions: {
        async create(_input, options) {
          signal = options?.signal
          return await new Promise<AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>>(() => {})
        },
      },
    },
  }, { timeoutMs: 5 })

  const iterator = service.streamChat({ message: '¿Hay alerta?', context: denseContext() })[Symbol.asyncIterator]()
  await iterator.next()

  await assert.rejects(iterator.next(), (error: unknown) => error instanceof GroqTimeoutError && error.code === 'GROQ_TIMEOUT')
  assert.equal(signal?.aborted, true)
})

test('hydrology copilot remains local and makes no request when GROQ_API_KEY is absent', async () => {
  const previous = process.env['GROQ_API_KEY']
  delete process.env['GROQ_API_KEY']
  try {
    const iterator = new HydrologyCopilotService().streamChat({ message: '¿Hay alerta?', context: denseContext() })[Symbol.asyncIterator]()
    await iterator.next()
    await assert.rejects(iterator.next(), (error: unknown) => error instanceof GroqUnavailableError && error.code === 'GROQ_UNAVAILABLE')
  } finally {
    if (previous === undefined) delete process.env['GROQ_API_KEY']
    else process.env['GROQ_API_KEY'] = previous
  }
})

test('hydrology copilot aborts the upstream request when the SSE consumer disconnects', async () => {
  let upstreamSignal: AbortSignal | undefined
  const controller = new AbortController()
  const service = new HydrologyCopilotService({
    chat: { completions: { async create(_input, options) {
      upstreamSignal = options?.signal
      return await new Promise<AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>>((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }))
    } } },
  })

  const iterator = service.streamChat({ message: '¿Hay alerta?', context: denseContext(), signal: controller.signal })[Symbol.asyncIterator]()
  await iterator.next()
  const pending = iterator.next()
  await new Promise<void>((resolve) => setImmediate(resolve))
  controller.abort()
  assert.equal(upstreamSignal?.aborted, true)
  await assert.rejects(pending)
})

test('hydrology copilot prompt constrains answers to Spanish official data and missing metrics', () => {
  assert.match(hydrologyCopilotSystemPrompt, /Respondé siempre 100% en español/)
  assert.match(hydrologyCopilotSystemPrompt, /PNA, INA, INMET y SMN/)
  assert.match(hydrologyCopilotSystemPrompt, /No inventes métricas/)
  assert.match(hydrologyCopilotSystemPrompt, /lastSuccessfulObservedAt exacto/)
})

function denseContext(): HydrologyDenseContextV1 {
  return {
    contractVersion: 'hydrology-dense-context-v1',
    fieldId: 'field-1',
    zone: 'Mercedes',
    sources: ['PNA', 'INA', 'INMET', 'SMN'],
    stations: [{ stationId: 'pna-mercedes', source: 'PNA', name: 'Mercedes', zone: 'Mercedes' }],
    snapshot: { riskLevel: 'unknown', freshness: 'degraded', quality: 'ok', recommendation: 'Revisar datos oficiales.', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' },
    telemetry: [{ source: 'PNA', stationId: 'pna-mercedes', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', value: 3.2, unit: 'm', metric: 'river_height_m', quality: 'ok', freshness: 'degraded', tendency: 'creciente' }],
  }
}
