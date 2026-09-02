import type { GroundedChatResponse } from '@/lib/agronautas/schemas'
import type { SseEvent } from './sse'
import { normalizeCopilotResponse, normalizeCopilotStream, type CopilotResponseInput, type CopilotViewModel } from './view-models'

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
  actionable?: boolean
  unverifiedClaims?: boolean
  httpStatus?: number
  retryAfterMs?: number
  retryAt?: string
}

export interface ChatViewModel extends Omit<ChatStreamState, 'actionable' | 'unverifiedClaims'>, Pick<CopilotViewModel, 'outcome' | 'actionable' | 'unverifiedClaims'> {}

export function createChatStreamState(): ChatStreamState {
  return { status: 'idle', answer: '', metadata: {}, facts: [], citations: [], trace: [], sources: [], limits: [], retryable: false }
}

export function createChatViewModel(response: GroundedChatResponse & Partial<CopilotResponseInput>): ChatViewModel {
  const normalized = normalizeCopilotResponse(response)
  return {
    ...createChatStreamState(),
    status: chatStatusForOutcome(normalized.outcome),
    answer: normalized.answer,
    metadata: { contractVersion: response.contractVersion, fieldId: response.fieldId },
    facts: response.supportingFacts,
    citations: normalized.citations,
    trace: response.trace,
    sources: normalized.sources.length ? normalized.sources : normalized.citations,
    unavailableReason: response.unavailableReason,
    error: normalized.outcome === 'ready' ? undefined : response.unavailableReason ?? normalized.reason,
    retryable: normalized.retryable,
    citationMode: normalized.citationMode,
    citationUnavailable: normalized.citationUnavailable,
    actionable: normalized.actionable,
    unverifiedClaims: normalized.unverifiedClaims,
    outcome: normalized.outcome,
    httpStatus: normalized.httpStatus,
    retryAfterMs: normalized.retryAfterMs,
    retryAt: retryAtFor(normalized.retryAfterMs),
  }
}

export function createChatViewModelFromStream(state: ChatStreamState): ChatViewModel {
  const metadataFacts = asFacts(state.metadata['facts'])
  const metadataCitations = asStrings(state.metadata['citations'])
  const metadataSources = asStrings(state.metadata['sources'])
  const metadataLimits = asStrings(state.metadata['limits'])
  const normalized = normalizeCopilotStream({
    status: state.httpStatus ?? (state.status === 'error' ? 503 : 200),
    answer: state.answer,
    citations: state.citations.length ? state.citations : metadataCitations,
    sources: state.sources.length ? state.sources : metadataSources,
    citationMode: state.metadata['citationMode'],
    citationUnavailable: state.metadata['citationUnavailable'],
    unverifiedClaims: state.metadata['unverifiedClaims'],
    degraded: state.status === 'degraded' || state.status === 'partial' || state.status === 'error',
    unavailableReason: state.error ?? state.metadata['unavailableReason'],
    retryAfterMs: state.retryAfterMs ?? state.metadata['retryAfterMs'],
    raw: state,
  })
  return {
    ...state,
    facts: state.facts.length ? state.facts : metadataFacts,
    citations: state.citations.length ? state.citations : metadataCitations,
    sources: state.sources.length ? state.sources : metadataSources,
    limits: state.limits.length ? state.limits : metadataLimits,
    status: state.status === 'done' && normalized.outcome === 'empty' ? 'error' : state.status,
    retryable: normalized.retryable || state.retryable || state.status === 'partial' || state.status === 'error' || state.status === 'degraded',
    citationMode: normalized.citationMode,
    citationUnavailable: normalized.citationUnavailable,
    unavailableReason: typeof state.metadata['unavailableReason'] === 'string' ? state.metadata['unavailableReason'] : undefined,
    error: state.error ?? normalized.reason,
    actionable: normalized.actionable,
    unverifiedClaims: normalized.unverifiedClaims,
    outcome: normalized.outcome,
    retryAfterMs: normalized.retryAfterMs,
    httpStatus: normalized.httpStatus,
    retryAt: state.retryAt ?? retryAtFromMetadata(state.metadata) ?? retryAtFor(normalized.retryAfterMs, state.receivedAt),
  }
}

export function normalizeChatRetryAfterMs(value: unknown, nowMs = Date.now()): number | undefined {
  const seconds = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value.trim())
      : undefined

  if (seconds !== undefined) {
    const milliseconds = Math.ceil(seconds * 1_000)
    return Number.isSafeInteger(milliseconds) && milliseconds >= 0 ? milliseconds : undefined
  }

  if (typeof value !== 'string') return undefined
  const retryAtMs = Date.parse(value)
  if (!Number.isFinite(retryAtMs)) return undefined
  return Math.max(0, retryAtMs - nowMs)
}

export function applyChatRateLimit(state: ChatStreamState, retryAfter: unknown, nowMs = Date.now()): ChatStreamState {
  const retryAfterMs = normalizeChatRetryAfterMs(retryAfter, nowMs)
  return {
    ...state,
    status: 'degraded',
    actionable: false,
    retryable: true,
    httpStatus: 429,
    retryAfterMs,
    retryAt: retryAtFor(retryAfterMs, new Date(nowMs).toISOString()),
    unavailableReason: 'rate_limited',
    error: 'rate_limited',
  }
}

export function canRetryChat(state: ChatStreamState, nowMs = Date.now()): boolean {
  if (!state.retryable || state.status === 'streaming') return false
  if (!state.retryAt) return true
  const retryAtMs = Date.parse(state.retryAt)
  return Number.isFinite(retryAtMs) && nowMs >= retryAtMs
}

function chatStatusForOutcome(outcome: ChatViewModel['outcome']): ChatStreamStatus {
  if (outcome === 'ready') return 'done'
  if (outcome === 'loading') return 'streaming'
  if (outcome === 'retryable') return 'degraded'
  return 'error'
}

function retryAtFor(retryAfterMs: number | undefined, receivedAt?: string): string | undefined {
  if (retryAfterMs === undefined) return undefined
  const originMs = receivedAt ? Date.parse(receivedAt) : Date.now()
  if (!Number.isFinite(originMs)) return undefined
  return new Date(originMs + retryAfterMs).toISOString()
}

function retryAtFromMetadata(metadata: Record<string, unknown>): string | undefined {
  return typeof metadata['retryAt'] === 'string' ? metadata['retryAt'] : undefined
}

export function applyChatEvent(state: ChatStreamState, event: SseEvent): ChatStreamState {
  if (event.type === 'metadata') {
    return { ...state, status: 'streaming', metadata: { ...state.metadata, ...(event.metadata ?? {}) }, receivedAt: event.receivedAt }
  }

  if (event.type === 'token') {
    return { ...state, status: 'streaming', answer: `${state.answer}${event.token ?? ''}`, receivedAt: event.receivedAt }
  }

  if (event.type === 'done') {
    return { ...state, status: state.answer.trim() ? 'done' : 'error', error: state.answer.trim() ? state.error : 'El stream no entregó tokens verificables.', receivedAt: event.receivedAt, retryable: !state.answer.trim() || state.retryable }
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

