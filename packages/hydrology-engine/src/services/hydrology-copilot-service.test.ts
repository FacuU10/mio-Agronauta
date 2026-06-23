import test from 'node:test'
import assert from 'node:assert/strict'
import { HydrologyCopilotService, hydrologyCopilotSystemPrompt } from './hydrology-copilot-service'
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

  assert.equal(calls[0]?.['model'], 'llama-3-70b-8192')
  assert.equal(calls[0]?.['stream'], true)
  assert.deepEqual(events.map((event) => event.type), ['metadata', 'token', 'token', 'done'])
  assert.deepEqual(events[0]?.data, {
    contractVersion: 'hydrology-dense-context-v1',
    model: 'llama-3-70b-8192',
    fieldId: 'field-1',
    zone: 'Mercedes',
    sources: ['PNA', 'INA', 'INMET', 'SMN'],
    lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z',
    telemetryCount: 1,
  })
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
