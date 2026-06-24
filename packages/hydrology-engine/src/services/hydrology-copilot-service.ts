import Groq from 'groq-sdk'
import { hydrologyDenseContextV1Schema, type HydrologyDenseContextV1 } from '@repo/zod-schemas'

export interface HydrologyCopilotChatInput {
  message: string
  context: HydrologyDenseContextV1
}

export interface HydrologyCopilotStreamEvent {
  type: 'metadata' | 'token' | 'done'
  data: Record<string, unknown> | string
}

interface GroqClient {
  chat: {
    completions: {
      create(input: Record<string, unknown>): Promise<AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>>
    }
  }
}

const MODEL = 'llama-3-70b-8192'

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
  private readonly client: GroqClient

  constructor(client: GroqClient = new Groq({ apiKey: process.env['GROQ_API_KEY'] ?? 'missing-groq-api-key' }) as unknown as GroqClient) {
    this.client = client
  }

  async *streamChat(input: HydrologyCopilotChatInput): AsyncIterable<HydrologyCopilotStreamEvent> {
    const context = hydrologyDenseContextV1Schema.parse(input.context)
    yield { type: 'metadata', data: buildMetadata(context) }

    const stream = await this.client.chat.completions.create({
      model: MODEL,
      stream: true,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Pregunta: ${input.message}\n\nContexto oficial HydrologyDenseContextV1:\n${JSON.stringify(context)}` },
      ],
    })

    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content
      if (token) yield { type: 'token', data: token }
    }

    yield { type: 'done', data: { model: MODEL } }
  }
}

function buildMetadata(context: HydrologyDenseContextV1) {
  return {
    contractVersion: context.contractVersion,
    model: MODEL,
    fieldId: context.fieldId,
    zone: context.zone,
    sources: context.sources,
    lastSuccessfulObservedAt: context.snapshot.lastSuccessfulObservedAt,
    telemetryCount: context.telemetry.length,
  }
}

export const hydrologyCopilotSystemPrompt = SYSTEM_PROMPT
