const VIEW_MODEL_STATE_VALUES = {
  LOADING: 'loading',
  ERROR: 'error',
  MISSING: 'missing',
  STALE: 'stale',
  DEGRADED: 'degraded',
  SUCCESS: 'success',
} as const

export const VIEW_MODEL_STATE = VIEW_MODEL_STATE_VALUES
export type ViewModelState = (typeof VIEW_MODEL_STATE)[keyof typeof VIEW_MODEL_STATE]

const RECOVERY_STATE_VALUES = {
  READY: 'ready',
  RETRY: 'retry',
  MAINTENANCE: 'maintenance',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  MISSING: 'missing',
} as const

export const RECOVERY_STATE = RECOVERY_STATE_VALUES
export type RecoveryState = (typeof RECOVERY_STATE)[keyof typeof RECOVERY_STATE]

export interface RecoveryInput {
  status?: number
  hasData: boolean
}

export interface RecoveryViewModel {
  state: RecoveryState
  retryable: boolean
  preservesData: boolean
}

export function deriveVisibilityState(input: { isLoading: boolean; hasData: boolean; error?: string | null; freshness?: 'fresh' | 'stale' | 'degraded'; retryable?: boolean }): ViewModelState {
  if (input.isLoading) return VIEW_MODEL_STATE.LOADING
  if (input.error) return VIEW_MODEL_STATE.ERROR
  if (!input.hasData) return VIEW_MODEL_STATE.MISSING
  if (input.freshness === 'stale') return VIEW_MODEL_STATE.STALE
  if (input.freshness === 'degraded') return VIEW_MODEL_STATE.DEGRADED
  return VIEW_MODEL_STATE.SUCCESS
}

export function deriveRecoveryState(input: RecoveryInput): RecoveryViewModel {
  if (input.status === 401) return { state: RECOVERY_STATE.UNAUTHORIZED, retryable: false, preservesData: false }
  if (input.status === 403) return { state: RECOVERY_STATE.FORBIDDEN, retryable: false, preservesData: false }
  if (input.status === 503 || (input.status !== undefined && input.status >= 500)) return { state: RECOVERY_STATE.MAINTENANCE, retryable: true, preservesData: input.hasData }
  if (input.status === 429) return { state: RECOVERY_STATE.RETRY, retryable: true, preservesData: input.hasData }
  if (!input.hasData) return { state: RECOVERY_STATE.MISSING, retryable: false, preservesData: false }
  return { state: RECOVERY_STATE.READY, retryable: false, preservesData: true }
}
