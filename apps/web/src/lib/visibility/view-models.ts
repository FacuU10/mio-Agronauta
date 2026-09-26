const OUTCOME_VALUES = {
  READY: 'ready',
  LOADING: 'loading',
  EMPTY: 'empty',
  UNAVAILABLE: 'unavailable',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  RETRYABLE: 'retryable',
} as const

export const OUTCOME = OUTCOME_VALUES
export type Outcome = (typeof OUTCOME)[keyof typeof OUTCOME]

const EVIDENCE_MODE_VALUES = {
  LIVE: 'live',
  SEAM: 'seam',
  MOCK: 'mock',
  UNAVAILABLE: 'unavailable',
} as const

export const EVIDENCE_MODE = EVIDENCE_MODE_VALUES
export type EvidenceMode = (typeof EVIDENCE_MODE)[keyof typeof EVIDENCE_MODE]

const FRESHNESS_VALUES = {
  FRESH: 'fresh',
  STALE: 'stale',
  DEGRADED: 'degraded',
  MISSING: 'missing',
} as const

export const FRESHNESS = FRESHNESS_VALUES
export type Freshness = (typeof FRESHNESS)[keyof typeof FRESHNESS]

const CITATION_MODE_VALUES = {
  VALIDATED_CONTEXT: 'validated-context',
  CONTEXT_ONLY: 'context-only',
  NONE: 'none',
} as const

export const CITATION_MODE = CITATION_MODE_VALUES
export type CitationMode = (typeof CITATION_MODE)[keyof typeof CITATION_MODE]

export interface RequestResponseInput<T> {
  status?: number
  loading?: boolean
  data?: T
  code?: string
  reason?: string
  retryAfterMs?: number
  raw?: unknown
}

export interface RequestOutcome<T> {
  outcome: Outcome
  data?: T
  httpStatus?: number
  code?: string
  reason?: string
  retryable: boolean
  retryAfterMs?: number
  raw?: unknown
}

export interface EvidenceStatusInput {
  mode?: EvidenceMode
  freshness?: Freshness
  source?: string | null
  observedAt?: string | null
  lastSuccessfulObservedAt?: string | null
  reason?: string
  raw?: unknown
}

export interface EvidenceStatusViewModel {
  mode: EvidenceMode
  freshness: Freshness
  source?: string
  observedAt?: string
  lastSuccessfulObservedAt?: string
  reason?: string
  actionable: boolean
  raw?: unknown
}

export interface CopilotResponseInput {
  status?: number
  transport?: unknown
  answer?: unknown
  tokens?: unknown
  citations?: unknown
  sources?: unknown
  citationMode?: unknown
  citationUnavailable?: unknown
  citationLineage?: unknown
  readiness?: unknown
  actionable?: unknown
  sourceRunIds?: unknown
  providerModes?: unknown
  unverifiedClaims?: unknown
  degraded?: unknown
  unavailableReason?: unknown
  error?: unknown
  retryAfterMs?: unknown
  code?: unknown
  raw?: unknown
}

const COPILOT_TRANSPORT_VALUES = {
  SUCCESS: 'success',
  STREAMING: 'streaming',
  ERROR: 'error',
  UNAVAILABLE: 'unavailable',
} as const

export const COPILOT_TRANSPORT = COPILOT_TRANSPORT_VALUES
export type CopilotTransport = (typeof COPILOT_TRANSPORT)[keyof typeof COPILOT_TRANSPORT]

export interface CopilotViewModel {
  outcome: Outcome
  transport: CopilotTransport
  answer: string
  tokens: string[]
  citations: string[]
  sources: string[]
  citationMode: CitationMode
  citationUnavailable: boolean
  unverifiedClaims: boolean
  actionable: boolean
  retryable: boolean
  retryAfterMs?: number
  httpStatus?: number
  reason?: string
  raw?: unknown
}

export interface CopilotStreamInput extends CopilotResponseInput {
  done?: boolean
}

export function normalizeRequestResponse<T>(input: RequestResponseInput<T>): RequestOutcome<T> {
  const status = input.status
  const retryAfterMs = positiveInteger(input.retryAfterMs)
  const base = {
    ...(status !== undefined ? { httpStatus: status } : {}),
    ...(input.code ? { code: input.code } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(retryAfterMs ? { retryAfterMs } : {}),
    ...(input.raw !== undefined ? { raw: input.raw } : {}),
  }

  if (input.loading) return { ...base, outcome: OUTCOME.LOADING, retryable: false }
  if (status === undefined) return { ...base, outcome: OUTCOME.UNAVAILABLE, retryable: true, reason: input.reason?.trim() || 'missing_status' }
  if (status >= 100 && status < 200) return { ...base, outcome: OUTCOME.LOADING, retryable: false, reason: input.reason?.trim() || 'request_in_progress' }
  if (status === 401) return { ...base, outcome: OUTCOME.UNAUTHORIZED, retryable: false, reason: input.reason?.trim() || 'unauthorized' }
  if (status === 403) return { ...base, outcome: OUTCOME.FORBIDDEN, retryable: false, reason: input.reason?.trim() || 'forbidden' }
  if (status === 404) return { ...base, outcome: OUTCOME.UNAVAILABLE, retryable: false, reason: input.reason?.trim() || 'capability_unavailable' }
  if (status === 429) return { ...base, outcome: OUTCOME.RETRYABLE, retryable: true, reason: input.reason?.trim() || 'rate_limited' }
  if (status >= 500 && status <= 599) return { ...base, outcome: OUTCOME.UNAVAILABLE, retryable: true, reason: input.reason?.trim() || 'server_unavailable' }
  if (status >= 400) return { ...base, outcome: OUTCOME.UNAVAILABLE, retryable: false, reason: input.reason?.trim() || 'request_failed' }
  if (input.data === undefined || input.data === null) return { ...base, outcome: OUTCOME.EMPTY, retryable: false }
  if (status < 200 || status >= 300) return { ...base, outcome: OUTCOME.UNAVAILABLE, retryable: false, reason: input.reason?.trim() || 'request_failed' }
  return { ...base, outcome: OUTCOME.READY, data: input.data, retryable: false }
}

export function normalizeRequestError(error: unknown, status?: number): RequestOutcome<never> {
  const record = asRecord(error)
  const resolvedStatus = status ?? numberValue(record?.['status'])
  const retryAfterMs = positiveInteger(numberValue(record?.['retryAfterMs'])) ?? retryAfterFromValue(record?.['retryAfter'])
  const code = stringValue(record?.['code'])
  const isAbort = record?.['name'] === 'AbortError' || code === 'ERR_ABORTED'

  if (isAbort) return { outcome: OUTCOME.RETRYABLE, retryable: true, code: code ?? 'ERR_ABORTED', reason: 'request_aborted', raw: error }
  if (resolvedStatus !== undefined) return normalizeRequestResponse({ status: resolvedStatus, code, retryAfterMs, reason: reasonForStatus(resolvedStatus), raw: error })
  return { outcome: OUTCOME.UNAVAILABLE, retryable: true, code, reason: 'network_unavailable', raw: error }
}

export function normalizeEvidenceStatus(input: EvidenceStatusInput): EvidenceStatusViewModel {
  const mode = isEvidenceMode(input.mode) ? input.mode : EVIDENCE_MODE.UNAVAILABLE
  const freshness = mode === EVIDENCE_MODE.UNAVAILABLE
    ? FRESHNESS.MISSING
    : isFreshness(input.freshness) ? input.freshness : FRESHNESS.MISSING
  const source = normalizeText(input.source)
  const observedAt = normalizeDate(input.observedAt)
  const lastSuccessfulObservedAt = normalizeDate(input.lastSuccessfulObservedAt)
  const reason = input.reason?.trim() || undefined

  return {
    mode,
    freshness,
    ...(source ? { source } : {}),
    ...(observedAt ? { observedAt } : {}),
    ...(lastSuccessfulObservedAt ? { lastSuccessfulObservedAt } : {}),
    ...(reason ? { reason } : {}),
    actionable: mode === EVIDENCE_MODE.LIVE && freshness === FRESHNESS.FRESH && Boolean(source && observedAt),
    ...(input.raw !== undefined ? { raw: input.raw } : {}),
  }
}

export function normalizeCopilotResponse(input: CopilotResponseInput): CopilotViewModel {
  const status = input.status
  if (status !== undefined && status >= 400) {
    const request = normalizeRequestResponse({ status, code: stringValue(input.code), retryAfterMs: numberValue(input.retryAfterMs), reason: stringValue(input.unavailableReason), raw: input.raw })
    return { ...emptyCopilot(request.outcome === OUTCOME.RETRYABLE ? COPILOT_TRANSPORT.ERROR : COPILOT_TRANSPORT.UNAVAILABLE), outcome: request.outcome, retryable: request.retryable, ...(request.retryAfterMs ? { retryAfterMs: request.retryAfterMs } : {}), httpStatus: request.httpStatus, reason: request.reason, raw: input.raw }
  }

  const tokens = normalizeTokens(input.tokens)
  const answer = normalizeAnswer(input.answer, tokens)
  const citations = normalizeStrings(input.citations)
  const sources = normalizeStrings(input.sources)
  const hasValidatedLineage = input.readiness === 'ready' && Array.isArray(input.citationLineage) && input.citationLineage.length > 0
  const citationMode = isCitationMode(input.citationMode) ? input.citationMode : citations.length > 0 && hasValidatedLineage ? CITATION_MODE.VALIDATED_CONTEXT : citations.length > 0 ? CITATION_MODE.VALIDATED_CONTEXT : CITATION_MODE.NONE
  const unverifiedClaims = input.unverifiedClaims === true
  const citationUnavailable = input.citationUnavailable === true || citationMode !== CITATION_MODE.VALIDATED_CONTEXT || citations.length === 0 || unverifiedClaims
  const degraded = input.degraded === true || input.error !== undefined && input.error !== null
  const done = normalizeDone(input)
  const transport = normalizeCopilotTransport(input.transport, status, done, degraded)
  const streamLoading = done === false || transport === COPILOT_TRANSPORT.STREAMING
  const hasTokens = tokens.some((token) => token.trim().length > 0)
  const computedActionable = hasTokens && Boolean(answer.trim()) && !citationUnavailable && !degraded && !streamLoading
  const actionable = typeof input.actionable === 'boolean' ? input.actionable && computedActionable : computedActionable
  const retryable = degraded || Boolean(input.error)

  let outcome: Outcome = OUTCOME.READY
  let reason = stringValue(input.unavailableReason)
  if (status !== undefined && status >= 100 && status < 200 || streamLoading) {
    outcome = OUTCOME.LOADING
    reason ??= 'copilot_streaming'
  } else if (degraded) {
    outcome = OUTCOME.RETRYABLE
    reason ??= 'copilot_degraded'
  } else if (!hasTokens || !answer.trim() || citationUnavailable) {
    outcome = OUTCOME.EMPTY
    reason ??= !hasTokens ? 'empty_stream_or_missing_tokens' : unverifiedClaims ? 'unverified_claims' : citations.length === 0 ? 'empty_stream_or_missing_citations' : 'citation_unavailable'
  }

  const retryAfterMs = positiveInteger(numberValue(input.retryAfterMs))
  return { outcome, transport, answer, tokens, citations, sources, citationMode, citationUnavailable, unverifiedClaims, actionable, retryable, ...(retryAfterMs ? { retryAfterMs } : {}), ...(status !== undefined ? { httpStatus: status } : {}), ...(reason ? { reason } : {}), ...(input.raw !== undefined ? { raw: input.raw } : {}) }
}

export function normalizeCopilotStream(input: CopilotStreamInput): CopilotViewModel {
  return normalizeCopilotResponse(input)
}

function emptyCopilot(transport: CopilotTransport = COPILOT_TRANSPORT.UNAVAILABLE): CopilotViewModel {
  return { outcome: OUTCOME.UNAVAILABLE, transport, answer: '', tokens: [], citations: [], sources: [], citationMode: CITATION_MODE.NONE, citationUnavailable: true, unverifiedClaims: false, actionable: false, retryable: true }
}

function normalizeAnswer(answer: unknown, tokens: string[]): string {
  if (typeof answer === 'string') return answer
  return tokens.join('')
}

function normalizeTokens(value: unknown): string[] {
  if (typeof value === 'string') return value ? [value] : []
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string') return item ? [item] : []
    const record = asRecord(item)
    const token = record ? stringValue(record['token']) ?? stringValue(record['text']) : undefined
    return token !== undefined ? [token] : []
  })
}

function normalizeStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [item.trim()]
    const record = asRecord(item)
    const id = record ? stringValue(record['id']) : undefined
    return id ? [id] : []
  })
}

function reasonForStatus(status: number): string {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'capability_unavailable'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'server_unavailable'
  return 'request_failed'
}

function retryAfterFromValue(value: unknown): number | undefined {
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return positiveInteger(Number(value) * 1_000)
  return positiveInteger(numberValue(value))
}

function positiveInteger(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined
}

function normalizeDate(value: string | null | undefined): string | undefined {
  return typeof value === 'string' && value.trim() && !Number.isNaN(Date.parse(value)) ? value.trim() : undefined
}

function normalizeText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}

function isCitationMode(value: unknown): value is CitationMode {
  return value === CITATION_MODE.VALIDATED_CONTEXT || value === CITATION_MODE.CONTEXT_ONLY || value === CITATION_MODE.NONE
}

function isEvidenceMode(value: unknown): value is EvidenceMode {
  return value === EVIDENCE_MODE.LIVE || value === EVIDENCE_MODE.SEAM || value === EVIDENCE_MODE.MOCK || value === EVIDENCE_MODE.UNAVAILABLE
}

function isFreshness(value: unknown): value is Freshness {
  return value === FRESHNESS.FRESH || value === FRESHNESS.STALE || value === FRESHNESS.DEGRADED || value === FRESHNESS.MISSING
}

function normalizeCopilotTransport(value: unknown, status: number | undefined, done: boolean | undefined, degraded: boolean): CopilotTransport {
  if (value === COPILOT_TRANSPORT.SUCCESS || value === COPILOT_TRANSPORT.STREAMING || value === COPILOT_TRANSPORT.ERROR || value === COPILOT_TRANSPORT.UNAVAILABLE) return value
  if (degraded || (status !== undefined && status >= 400)) return COPILOT_TRANSPORT.ERROR
  if (done === false || (status !== undefined && status >= 100 && status < 200)) return COPILOT_TRANSPORT.STREAMING
  if (status !== undefined && status >= 200 && status < 300) return COPILOT_TRANSPORT.SUCCESS
  return COPILOT_TRANSPORT.UNAVAILABLE
}

function normalizeDone(input: CopilotResponseInput): boolean | undefined {
  const done = asRecord(input)?.['done']
  return typeof done === 'boolean' ? done : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
