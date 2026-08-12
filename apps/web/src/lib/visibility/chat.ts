import type { GroundedChatResponse } from '@/lib/agronautas/schemas'
import type { SseEvent } from './sse'

export type ChatStreamStatus = 'idle' | 'streaming' | 'done' | 'partial' | 'error' | 'degraded'

export interface ChatStreamState {
  status: ChatStreamStatus
  answer: string
  metadata: Record<string, unknown>
  facts: Array<{ label: string; value: string }>
  citations: string[]
  trace: Array<{ action: string; status: string }>
  sources: string[]
  limits: string[]
  receivedAt?: string
  error?: string
  retryable: boolean
  citationMode?: 'validated-context' | 'context-only' | 'none'
  citationUnavailable?: boolean
  unavailableReason?: string
}

export interface ChatViewModel extends ChatStreamState {
  unavailableReason?: string
}

export function createChatStreamState(): ChatStreamState {
  return { status: 'idle', answer: '', metadata: {}, facts: [], citations: [], trace: [], sources: [], limits: [], retryable: false }
}

export function createChatViewModel(response: GroundedChatResponse): ChatViewModel {
  return {
    ...createChatStreamState(),
    status: response.degraded ? 'degraded' : 'done',
    answer: response.answer,
    metadata: { contractVersion: response.contractVersion, fieldId: response.fieldId },
    facts: response.supportingFacts,
    citations: response.citations,
    trace: response.trace,
    sources: response.citations,
    unavailableReason: response.unavailableReason,
    retryable: response.degraded,
  }
}

export function createChatViewModelFromStream(state: ChatStreamState): ChatViewModel {
  const metadataFacts = asFacts(state.metadata['facts'])
  const metadataCitations = asStrings(state.metadata['citations'])
  const metadataSources = asStrings(state.metadata['sources'])
  const metadataLimits = asStrings(state.metadata['limits'])
  return {
    ...state,
    facts: state.facts.length ? state.facts : metadataFacts,
    citations: state.citations.length ? state.citations : metadataCitations,
    sources: state.sources.length ? state.sources : metadataSources,
    limits: state.limits.length ? state.limits : metadataLimits,
    retryable: state.retryable || state.status === 'partial' || state.status === 'error' || state.status === 'degraded',
    citationMode: isCitationMode(state.metadata['citationMode']) ? state.metadata['citationMode'] : undefined,
    citationUnavailable: state.metadata['citationUnavailable'] === true,
    unavailableReason: typeof state.metadata['unavailableReason'] === 'string' ? state.metadata['unavailableReason'] : undefined,
  }
}

export function applyChatEvent(state: ChatStreamState, event: SseEvent): ChatStreamState {
  if (event.type === 'metadata') {
    return { ...state, status: 'streaming', metadata: { ...state.metadata, ...(event.metadata ?? {}) }, receivedAt: event.receivedAt }
  }

  if (event.type === 'token') {
    return { ...state, status: 'streaming', answer: `${state.answer}${event.token ?? ''}`, receivedAt: event.receivedAt }
  }

  if (event.type === 'done') {
    return { ...state, status: 'done', receivedAt: event.receivedAt }
  }

  return {
    ...state,
    status: state.answer ? 'partial' : 'error',
    error: event.error ?? 'El chat existente no pudo completar el stream.',
    receivedAt: event.receivedAt,
    retryable: true,
  }
}

export function parseSseText(input: string, receivedAt = new Date().toISOString()): SseEvent[] {
  return input.split(/\n\n+/).flatMap<SseEvent>((frame, index): SseEvent[] => {
    const eventName = frame.split('\n').find((line) => line.startsWith('event:'))?.replace(/^event:\s*/, '').trim()
    const dataLine = frame.split('\n').find((line) => line.startsWith('data:'))
    if (!eventName || !dataLine || !isSseEventType(eventName)) return []

    const rawData = dataLine.replace(/^data:\s*/, '')
    const payload = parsePayload(rawData)
    if (eventName === 'token') {
      const token = typeof payload === 'string'
        ? payload
        : payload && typeof payload === 'object' && typeof (payload as { token?: unknown }).token === 'string'
          ? (payload as { token: string }).token
          : payload && typeof payload === 'object' && typeof (payload as { text?: unknown }).text === 'string'
            ? (payload as { text: string }).text
            : undefined
      return [{ type: 'token', sequence: index + 1, receivedAt, ...(token ? { token } : {}) }]
    }
    if (eventName === 'metadata') return [{ type: 'metadata', sequence: index + 1, receivedAt, metadata: payload && typeof payload === 'object' ? payload as Record<string, unknown> : {} }]
    if (eventName === 'error') {
      const error = payload && typeof payload === 'object' && typeof (payload as { message?: unknown }).message === 'string' ? (payload as { message: string }).message : typeof payload === 'string' ? payload : 'Stream error'
      return [{ type: 'error', sequence: index + 1, receivedAt, error }]
    }
    return [{ type: 'done', sequence: index + 1, receivedAt }]
  })
}

function parsePayload(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function isSseEventType(value: string): value is SseEvent['type'] {
  return value === 'metadata' || value === 'token' || value === 'done' || value === 'error'
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function asFacts(value: unknown): Array<{ label: string; value: string }> {
  return Array.isArray(value)
    ? value.filter((item): item is { label: string; value: string } => Boolean(item && typeof item === 'object' && typeof (item as { label?: unknown }).label === 'string' && typeof (item as { value?: unknown }).value === 'string'))
    : []
}

function isCitationMode(value: unknown): value is NonNullable<ChatStreamState['citationMode']> {
  return value === 'validated-context' || value === 'context-only' || value === 'none'
}
