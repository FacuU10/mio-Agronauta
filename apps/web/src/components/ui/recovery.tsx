import { createElement } from 'react'
import { STATUS, type StatusState } from './status'

const React = { createElement }

export const RECOVERY_STATE = {
  EMPTY: 'empty',
  ERROR: 'error',
  UNAVAILABLE: 'unavailable',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  MAINTENANCE: 'maintenance',
  DEGRADED: 'degraded',
} as const

export type RecoveryState = (typeof RECOVERY_STATE)[keyof typeof RECOVERY_STATE]

export interface RecoveryAction {
  href: string
  label: string
}

export interface RecoveryProps {
  state: RecoveryState
  title: string
  description: string
  action?: RecoveryAction
  retryable?: boolean
  onRetry?: () => void
  retryLabel?: string
}

const recoveryStatus: Record<RecoveryState, StatusState> = {
  empty: STATUS.EMPTY,
  error: STATUS.ERROR,
  unavailable: STATUS.UNAVAILABLE,
  unauthorized: STATUS.UNAUTHORIZED,
  forbidden: STATUS.FORBIDDEN,
  maintenance: STATUS.MAINTENANCE,
  degraded: STATUS.DEGRADED,
}

const defaultRetryable: Record<RecoveryState, boolean> = {
  empty: false,
  error: true,
  unavailable: true,
  unauthorized: false,
  forbidden: false,
  maintenance: false,
  degraded: true,
}

const recoveryLabels: Record<RecoveryState, string> = {
  empty: 'Sin datos',
  error: 'Error',
  unavailable: 'No disponible',
  unauthorized: 'Sesión requerida',
  forbidden: 'Acceso restringido',
  maintenance: 'Mantenimiento',
  degraded: 'Degradado',
}

export function Recovery({ state, title, description, action, retryable = defaultRetryable[state], onRetry, retryLabel = 'Reintentar' }: RecoveryProps) {
  const status = recoveryStatus[state]
  const isAlert = status !== STATUS.EMPTY

  return (
    <section aria-atomic="true" aria-label={title} aria-live={isAlert ? 'assertive' : 'polite'} className="focus-safe-target rounded-3xl border border-status-muted bg-status-muted-surface p-5 shadow-sm" role={isAlert ? 'alert' : 'status'} tabIndex={-1}>
      <span className="inline-flex rounded-full border border-current px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">{recoveryLabels[state]}</span>
      <h2 className="mt-3 font-serif text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {retryable && onRetry ? <button className="min-h-11 rounded-full border border-current px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-focus" type="button" onClick={onRetry}>{retryLabel}</button> : null}
        {action ? <a className="inline-flex min-h-11 items-center rounded-full bg-status-action px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-focus" href={action.href}>{action.label}</a> : null}
      </div>
    </section>
  )
}
