import { createElement, type ReactNode } from 'react'
import { FRESHNESS, type Freshness, SOURCE_MODE, type SourceMode } from './evidence'

const React = { createElement }

export const STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
  UNAVAILABLE: 'unavailable',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  MAINTENANCE: 'maintenance',
  DEGRADED: 'degraded',
} as const

export type StatusState = (typeof STATUS)[keyof typeof STATUS]

export interface StatusProps {
  state: StatusState
  title: string
  description: string
  source?: string
  freshness?: Freshness
  mode?: SourceMode
  reason?: string
  retryable?: boolean
  onRetry?: () => void
  retryLabel?: string
  children?: ReactNode
}

const stateLabels: Record<StatusState, string> = {
  loading: 'Cargando',
  ready: 'Disponible',
  empty: 'Sin datos',
  error: 'Error',
  unavailable: 'No disponible',
  unauthorized: 'Sesión requerida',
  forbidden: 'Acceso restringido',
  maintenance: 'Mantenimiento',
  degraded: 'Degradado',
}

const modeLabels: Record<SourceMode, string> = {
  live: 'Live',
  seam: 'Seam',
  mock: 'Mock',
  unavailable: 'Unavailable',
}

const toneClasses: Record<StatusState, string> = {
  loading: 'border-status-info bg-status-info-surface',
  ready: 'border-status-success bg-status-success-surface',
  empty: 'border-status-muted bg-status-muted-surface',
  error: 'border-status-error bg-status-error-surface',
  unavailable: 'border-status-warning bg-status-warning-surface',
  unauthorized: 'border-status-warning bg-status-warning-surface',
  forbidden: 'border-status-warning bg-status-warning-surface',
  maintenance: 'border-status-warning bg-status-warning-surface',
  degraded: 'border-status-warning bg-status-warning-surface',
}

function isAlertState(state: StatusState): boolean {
  return state === STATUS.ERROR || state === STATUS.UNAVAILABLE || state === STATUS.UNAUTHORIZED || state === STATUS.FORBIDDEN || state === STATUS.MAINTENANCE || state === STATUS.DEGRADED
}

export function Status({ state, title, description, source, freshness, mode, reason, retryable = false, onRetry, retryLabel = 'Reintentar', children }: StatusProps) {
  const role = isAlertState(state) ? 'alert' : 'status'

  return (
    <section aria-atomic="true" aria-busy={state === STATUS.LOADING ? 'true' : undefined} aria-label={title} aria-live={isAlertState(state) ? 'assertive' : 'polite'} className={`rounded-3xl border p-5 shadow-sm ${toneClasses[state]}`} role={role} tabIndex={-1}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 break-words">
          <span className="inline-flex rounded-full border border-current px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">{stateLabels[state]}</span>
          <h2 className="mt-3 font-serif text-2xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6">{description}</p>
          {source ? <p className="mt-2 text-sm">Fuente: {source}</p> : null}
          {freshness ? <p className="text-sm">Freshness: {freshness}</p> : null}
          {mode ? <p className="text-sm">Modo: {modeLabels[mode]}</p> : null}
          {reason ? <p className="text-sm">Motivo: {reason}</p> : null}
        </div>
        {retryable && onRetry ? <button className="min-h-11 rounded-full border border-current px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-focus" type="button" onClick={onRetry}>{retryLabel}</button> : null}
      </div>
      {children}
    </section>
  )
}

export { FRESHNESS, SOURCE_MODE }
export type { Freshness, SourceMode }
