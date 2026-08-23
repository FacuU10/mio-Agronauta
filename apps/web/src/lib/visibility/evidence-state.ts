const EVIDENCE_STATE_VALUES = {
  OBSERVED: 'observed',
  FORECAST: 'forecast',
  CACHED: 'cached/latest-good',
  STALE: 'stale',
  DEGRADED: 'degraded',
  MISSING: 'missing',
  MOCK: 'mock/seam',
} as const

export const EVIDENCE_STATE = EVIDENCE_STATE_VALUES
export type EvidenceState = (typeof EVIDENCE_STATE)[keyof typeof EVIDENCE_STATE]

const EVIDENCE_FRESHNESS_VALUES = {
  FRESH: 'fresh',
  CACHED: 'cached',
  STALE: 'stale',
  DEGRADED: 'degraded',
  MISSING: 'missing',
} as const

type EvidenceFreshness = (typeof EVIDENCE_FRESHNESS_VALUES)[keyof typeof EVIDENCE_FRESHNESS_VALUES]

const EVIDENCE_MODE_VALUES = {
  LIVE: 'live',
  SEAM: 'seam',
  MOCK: 'mock',
  UNAVAILABLE: 'unavailable',
} as const

type EvidenceMode = (typeof EVIDENCE_MODE_VALUES)[keyof typeof EVIDENCE_MODE_VALUES]

export interface EvidenceInput {
  state?: EvidenceState
  source?: string | null
  observedAt?: string | null
  lastSuccessfulObservedAt?: string | null
  freshness?: EvidenceFreshness
  mode?: EvidenceMode
  forecast?: boolean
  detail?: string
}

export interface EvidenceViewModel {
  state: EvidenceState
  source?: string
  observedAt?: string
  lastSuccessfulObservedAt?: string
  detail?: string
  freshness?: EvidenceFreshness
  mode?: EvidenceMode
}

const MISSING_EVIDENCE_DETAIL = 'No verified evidence returned.'
const MISSING_SOURCE_DETAIL = 'Observed and forecast evidence requires a verified source.'
const MISSING_TIMESTAMP_DETAIL = 'Observed and forecast evidence requires a verified timestamp.'
const MOCK_MODES = new Set<EvidenceMode>([EVIDENCE_MODE_VALUES.MOCK, EVIDENCE_MODE_VALUES.SEAM])

export function normalizeEvidence(input: EvidenceInput): EvidenceViewModel {
  const source = normalizeText(input.source)
  const observedAt = normalizeTimestamp(input.observedAt)
  const lastSuccessfulObservedAt = normalizeTimestamp(input.lastSuccessfulObservedAt)
  const mode = input.mode
  const timestamp = observedAt ?? lastSuccessfulObservedAt
  const state = resolveState(input, source, timestamp)

  if (state === EVIDENCE_STATE.OBSERVED || state === EVIDENCE_STATE.FORECAST) {
    if (!source) return { state: EVIDENCE_STATE.MISSING, detail: MISSING_SOURCE_DETAIL, freshness: EVIDENCE_FRESHNESS_VALUES.MISSING, mode }
    if (!observedAt) return { state: EVIDENCE_STATE.MISSING, source, detail: MISSING_TIMESTAMP_DETAIL, freshness: EVIDENCE_FRESHNESS_VALUES.MISSING, mode }
  }

  if (state === EVIDENCE_STATE.MISSING && input.observedAt !== undefined && !observedAt) {
    return { state: EVIDENCE_STATE.MISSING, source, detail: MISSING_TIMESTAMP_DETAIL, freshness: EVIDENCE_FRESHNESS_VALUES.MISSING, mode }
  }

  if (state === EVIDENCE_STATE.CACHED && !lastSuccessfulObservedAt) {
    return { state: EVIDENCE_STATE.MISSING, source, detail: MISSING_TIMESTAMP_DETAIL, freshness: EVIDENCE_FRESHNESS_VALUES.MISSING, mode }
  }

  return compactViewModel({
    state,
    source,
    observedAt,
    lastSuccessfulObservedAt,
    detail: input.detail ?? (state === EVIDENCE_STATE.MISSING ? MISSING_EVIDENCE_DETAIL : undefined),
    freshness: input.freshness,
    mode,
  })
}

export function normalizeEvidenceList(inputs: readonly EvidenceInput[]): EvidenceViewModel[] {
  return inputs.map(normalizeEvidence)
}

export function missingEvidence(detail = MISSING_EVIDENCE_DETAIL): EvidenceViewModel {
  return { state: EVIDENCE_STATE.MISSING, detail, freshness: EVIDENCE_FRESHNESS_VALUES.MISSING }
}

export function mockEvidence(detail: string, source?: string): EvidenceViewModel {
  return compactViewModel({ state: EVIDENCE_STATE.MOCK, source: normalizeText(source), detail, mode: EVIDENCE_MODE_VALUES.MOCK })
}

function resolveState(input: EvidenceInput, source: string | undefined, timestamp: string | undefined): EvidenceState {
  if (input.mode && MOCK_MODES.has(input.mode)) return EVIDENCE_STATE.MOCK
  if (input.mode === EVIDENCE_MODE_VALUES.UNAVAILABLE) return EVIDENCE_STATE.MISSING
  if (input.state) return input.state
  if (input.freshness === EVIDENCE_FRESHNESS_VALUES.CACHED) return EVIDENCE_STATE.CACHED
  if (input.freshness === EVIDENCE_FRESHNESS_VALUES.STALE) return EVIDENCE_STATE.STALE
  if (input.freshness === EVIDENCE_FRESHNESS_VALUES.DEGRADED) return EVIDENCE_STATE.DEGRADED
  if (input.freshness === EVIDENCE_FRESHNESS_VALUES.MISSING || !source || !timestamp) return EVIDENCE_STATE.MISSING
  return input.forecast ? EVIDENCE_STATE.FORECAST : EVIDENCE_STATE.OBSERVED
}

function compactViewModel(input: EvidenceViewModel): EvidenceViewModel {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as EvidenceViewModel
}

function normalizeText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function normalizeTimestamp(value: string | null | undefined): string | undefined {
  const normalized = normalizeText(value)
  if (!normalized || Number.isNaN(Date.parse(normalized))) return undefined
  return normalized
}
