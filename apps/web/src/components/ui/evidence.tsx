import { createElement } from 'react'

const React = { createElement }

export const SOURCE_MODE = {
  LIVE: 'live',
  SEAM: 'seam',
  MOCK: 'mock',
  UNAVAILABLE: 'unavailable',
} as const

export type SourceMode = (typeof SOURCE_MODE)[keyof typeof SOURCE_MODE]

export const FRESHNESS = {
  FRESH: 'fresh',
  STALE: 'stale',
  DEGRADED: 'degraded',
  MISSING: 'missing',
} as const

export type Freshness = (typeof FRESHNESS)[keyof typeof FRESHNESS]

export interface EvidenceState {
  mode: SourceMode
  freshness: Freshness
  source?: string
  observedAt?: string
  lastSuccessfulObservedAt?: string
  reason?: string
}

const modeLabels: Record<SourceMode, string> = {
  live: 'Live',
  seam: 'Seam',
  mock: 'Mock',
  unavailable: 'Unavailable',
}

export function Evidence({ title = 'Estado de evidencia', state }: { title?: string; state: EvidenceState }) {
  return (
    <article aria-label={title} className="evidence-surface rounded-2xl border border-status-muted bg-status-muted-surface p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className="break-words font-semibold">{title}</h3>
        <span aria-label={`Freshness ${state.freshness}`} className="rounded-full border border-current px-2 py-1 text-xs font-semibold uppercase tracking-wide">{state.freshness}</span>
      </div>
      <dl className="mt-3 grid gap-1 break-words text-sm">
        <div><dt className="inline font-medium">Fuente: </dt><dd className="inline">{state.source ?? 'Sin fuente'}</dd></div>
        <div><dt className="inline font-medium">Modo: </dt><dd className="inline">{modeLabels[state.mode]}</dd></div>
        <div><dt className="inline font-medium">Freshness: </dt><dd className="inline">{state.freshness}</dd></div>
        <div><dt className="inline font-medium">Observado: </dt><dd className="inline">{state.observedAt ?? 'Sin fecha'}</dd></div>
        {state.lastSuccessfulObservedAt ? <div><dt className="inline font-medium">Último éxito: </dt><dd className="inline">{state.lastSuccessfulObservedAt}</dd></div> : null}
        {state.reason ? <div><dt className="inline font-medium">Motivo: </dt><dd className="inline">{state.reason}</dd></div> : null}
      </dl>
    </article>
  )
}
