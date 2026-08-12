import Groq from 'groq-sdk'
import { hydrologyDenseContextV1Schema, hydrologyIberaCitationSchema, hydrologyIberaCopilotMetadataSchema, type HydrologyDenseContextV1 } from '@repo/zod-schemas'

export interface HydrologyCopilotChatInput {
  message: string
  context: HydrologyDenseContextV1
  signal?: AbortSignal
}

export interface HydrologyCopilotStreamEvent {
  type: 'metadata' | 'token' | 'done'
  data: Record<string, unknown> | string
}

interface GroqClient {
  chat: {
    completions: {
      create(input: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>>
    }
  }
}

export const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant'
const DEFAULT_GROQ_TIMEOUT_MS = 30_000

export class GroqTimeoutError extends Error {
  readonly code = 'GROQ_TIMEOUT'

  constructor() {
    super('groq_timeout')
    this.name = 'GroqTimeoutError'
  }
}

const CITATION_UNAVAILABLE_MESSAGE = 'No hay una referencia oficial verificable para esta respuesta.'

export class GroqUnavailableError extends Error {
  readonly code = 'GROQ_UNAVAILABLE'

  constructor() {
    super('groq_unavailable')
    this.name = 'GroqUnavailableError'
  }
}

export function resolveGroqModel(env: Record<string, string | undefined> = process.env): string {
  return env['GROQ_MODEL']?.trim() || env['AGRONAUTAS_GROQ_MODEL']?.trim() || DEFAULT_GROQ_MODEL
}

function resolveGroqTimeoutMs(env: Record<string, string | undefined> = process.env): number {
  const configured = Number.parseInt(env['GROQ_TIMEOUT_MS']?.trim() ?? '', 10)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_GROQ_TIMEOUT_MS
}

const SYSTEM_PROMPT = `Sos el copiloto hidrológico de Iberá-Alerta.
Respondé siempre 100% en español.
Usá solamente el contexto oficial provisto en el contexto denso hidrológico versión 1.
Las únicas fuentes habilitadas son PNA, INA, INMET y SMN.
Podés responder sobre hidrología, alertas de crecida/inundación, puertos o estaciones locales, tendencias de altura, pronósticos INA y posible impacto en lotes agrícolas.
No inventes métricas, umbrales, coordenadas, caudales, descargas de represas, simulaciones ni valores que no estén en el contexto.
Rechazá con calidez pero con firmeza cualquier pedido de tiempos de retardo/lag, propagación de onda, routing hidráulico, caudales o descargas de represas, flujos turbinados/vertidos, o autoridad de evacuación.
Si aparece uno de esos pedidos, explicá que está fuera del alcance de Fase 1 y limitá la respuesta a observaciones, alertas y pronósticos oficiales disponibles.
Si falta una métrica, estación, tendencia, alerta, pronóstico o marca temporal, decí claramente que el dato no está disponible en las fuentes oficiales provistas.
Para datos vencidos o degradados, mencioná el campo lastSuccessfulObservedAt exacto cuando exista; no uses etiquetas heredadas de datos vencidos.
Marcá los pronósticos de 15 a 30 días como planificación especulativa o de baja confianza; nunca los presentes como certeza operativa.
No cites Sentinel-1, simulaciones hidráulicas, Paraguay DMH, Itaipú ni Yacyretá como datos de Fase 1.`

export class HydrologyCopilotService {
  private readonly client: GroqClient | undefined
  private readonly model: string
  private readonly timeoutMs: number

  constructor(
    client?: GroqClient,
    options: { model?: string; timeoutMs?: number } = {},
  ) {
    const apiKey = process.env['GROQ_API_KEY']?.trim()
    this.client = client ?? (apiKey ? new Groq({ apiKey }) as unknown as GroqClient : undefined)
    this.model = options.model?.trim() || resolveGroqModel()
    this.timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : resolveGroqTimeoutMs()
  }

  async *streamChat(input: HydrologyCopilotChatInput): AsyncIterable<HydrologyCopilotStreamEvent> {
    const context = hydrologyDenseContextV1Schema.parse(input.context)
    yield { type: 'metadata', data: buildMetadata(context, this.model) }
    const client = this.client
    if (!client) throw new GroqUnavailableError()

    const controller = new AbortController()
    const abortForDisconnect = () => controller.abort()
    if (input.signal?.aborted) controller.abort()
    else input.signal?.addEventListener('abort', abortForDisconnect, { once: true })
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort()
        reject(new GroqTimeoutError())
      }, this.timeoutMs)
    })

    try {
      const stream = await Promise.race([
        client.chat.completions.create({
          model: this.model,
          stream: true,
          temperature: 0.1,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Pregunta: ${input.message}\n\nContexto oficial HydrologyDenseContextV1:\n${JSON.stringify(context)}` },
          ],
        }, { signal: controller.signal }),
        timeoutPromise,
      ])

      const iterator = stream[Symbol.asyncIterator]()
      while (true) {
        const next = await Promise.race([iterator.next(), timeoutPromise])
        if (next.done) break
        const token = next.value.choices?.[0]?.delta?.content
        if (token) yield { type: 'token', data: token }
      }

      yield { type: 'done', data: { model: this.model } }
    } catch (error) {
      if (error instanceof GroqTimeoutError || controller.signal.aborted) throw new GroqTimeoutError()
      throw error
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      input.signal?.removeEventListener('abort', abortForDisconnect)
    }
  }
}

function buildMetadata(context: HydrologyDenseContextV1, model: string) {
  const citations = context.telemetry.flatMap((telemetry) => {
    const citation = hydrologyIberaCitationSchema.safeParse({
      id: `${telemetry.source}:${telemetry.stationId}:${telemetry.metric}:${telemetry.observedAt}`,
      source: telemetry.source,
      stationId: telemetry.stationId,
      observedAt: telemetry.observedAt,
      ...(telemetry.sourceUrl ? { sourceUrl: telemetry.sourceUrl } : {}),
      kind: telemetry.forecastHorizonDays != null ? 'forecast' : telemetry.metric === 'storm_alert' ? 'alert' : 'observed',
      freshness: telemetry.freshness,
    })
    return citation.success ? [citation.data] : []
  })
  const citationMetadata = hydrologyIberaCopilotMetadataSchema.parse({
    citationMode: citations.length > 0 ? 'validated-context' : 'none',
    citations,
    unverifiedClaims: citations.length === 0,
  })

  return {
    contractVersion: context.contractVersion,
    model,
    fieldId: context.fieldId,
    zone: context.zone,
    sources: context.sources,
    lastSuccessfulObservedAt: context.snapshot.lastSuccessfulObservedAt,
    telemetryCount: context.telemetry.length,
    ...citationMetadata,
    citationUnavailable: citations.length === 0,
    ...(citations.length === 0 ? { unavailableReason: CITATION_UNAVAILABLE_MESSAGE } : {}),
  }
}

export const hydrologyCopilotSystemPrompt = SYSTEM_PROMPT
