export type ViewModelState = 'loading' | 'error' | 'missing' | 'stale' | 'degraded' | 'success'

export function deriveVisibilityState(input: { isLoading: boolean; hasData: boolean; error?: string | null; freshness?: 'fresh' | 'stale' | 'degraded'; retryable?: boolean }): ViewModelState {
  if (input.isLoading) return 'loading'
  if (input.error) return 'error'
  if (!input.hasData) return 'missing'
  if (input.freshness === 'stale') return 'stale'
  if (input.freshness === 'degraded') return 'degraded'
  return 'success'
}
