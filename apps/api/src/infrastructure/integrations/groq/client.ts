import { groundedChatActionSchema, groundedChatResponseSchema, type GroundedChatAction, type GroundedChatResponse } from '@repo/zod-schemas'

export interface GroqChatProvider {
  readonly enabled: boolean
  selectAction(input: { fieldId: string; message: string; comparisonFieldId?: string }): Promise<GroundedChatAction>
  finalizeResponse(input: { fieldId: string; message: string; action: GroundedChatAction['action']; supportingFacts: Array<{ label: string; value: string }>; citations: string[]; comparisonFieldId?: string }): Promise<Pick<GroundedChatResponse, 'answer' | 'citations'>>
}

interface GroqConfig {
  apiKey?: string
  model: string
  baseUrl: string
  enabled: boolean
}

export function createGroqChatProvider(): GroqChatProvider {
  const config = getGroqConfig()

  if (!config.enabled || !config.apiKey) {
    return {
      enabled: false,
      async selectAction() {
        throw new Error('groq_disabled')
      },
      async finalizeResponse() {
        throw new Error('groq_disabled')
      },
    }
  }

  return {
    enabled: true,
    async selectAction(input) {
      const content = await invokeGroq(config, [
        {
          role: 'system',
          content: 'Return ONLY JSON for one allowed action. Allowed actions: GET_FIELD_OVERVIEW, GET_RISK_SUMMARY, GET_ALERTS, COMPARE_FIELDS, FINAL_RESPONSE. Never invent other actions.',
        },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ])

      return groundedChatActionSchema.parse(parseJson(content))
    },
    async finalizeResponse(input) {
      const content = await invokeGroq(config, [
        {
          role: 'system',
          content: 'Return ONLY JSON with keys answer and citations. Answer must stay grounded in supportingFacts and citations. If data is insufficient, say so honestly.',
        },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ])

      return groundedChatResponseSchema.pick({ answer: true, citations: true }).parse(parseJson(content))
    },
  }
}

function getGroqConfig(): GroqConfig {
  const enabledFlag = process.env['AGRONAUTAS_GROQ_ENABLED']
  const apiKey = process.env['GROQ_API_KEY']?.trim()
  return {
    apiKey,
    model: process.env['GROQ_MODEL']?.trim() || 'llama-3.1-8b-instant',
    baseUrl: process.env['GROQ_BASE_URL']?.trim() || 'https://api.groq.com/openai/v1',
    enabled: enabledFlag === 'true' ? Boolean(apiKey) : enabledFlag === 'false' ? false : Boolean(apiKey),
  }
}

async function invokeGroq(config: GroqConfig, messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`groq_http_${response.status}`)
  }

  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('groq_empty_response')
  return content
}

function parseJson(content: string): unknown {
  return JSON.parse(content)
}
