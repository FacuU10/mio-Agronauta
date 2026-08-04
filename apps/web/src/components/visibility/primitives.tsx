import { createElement, type ReactNode } from 'react'
import type { EvidenceState } from '@/lib/visibility/evidence-state'

const React = { createElement }

export type VisibilityStateName = 'loading' | 'empty' | 'error' | 'retry' | 'unauthorized' | 'forbidden' | 'stale' | 'degraded' | 'missing' | 'success' | 'partial'
export type FreshnessState = 'fresh' | 'stale' | 'degraded' | 'missing'
export type SourceMode = 'live' | 'seam' | 'mock' | 'fallback' | 'unavailable'

const stateLabels: Record<VisibilityStateName, string> = {
  loading: 'Cargando',
  empty: 'Sin datos',
  error: 'Error',
  retry: 'Reintentar',
  unauthorized: 'No autorizado',
  forbidden: 'Acceso restringido',
  stale: 'Stale',
  degraded: 'Degradado',
  missing: 'Falta información',
  success: 'Actualizado',
  partial: 'Parcial',
}

export function StatusBadge({ state }: { state: VisibilityStateName }) {
  return <span role="status" aria-live="polite" className="inline-flex items-center rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-stone-700">{stateLabels[state]}</span>
}

export function EvidenceStateBadge({ state, label }: { state: EvidenceState; label?: string }) {
  const name = label ? `${label}: ${state}` : state
  return <span aria-label={`Estado de evidencia ${name}`} className="inline-flex items-center rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-stone-700">{name}</span>
}

export function VisibilityState({ state, title, description, retryLabel = 'Reintentar', onRetry }: { state: VisibilityStateName; title: string; description: string; retryLabel?: string; onRetry?: () => void }) {
  const isAlert = state === 'error' || state === 'missing' || state === 'unauthorized' || state === 'forbidden'
  return (
    <section aria-live="polite" aria-label={title} className="rounded-3xl border border-stone-300 bg-white p-5 shadow-sm" role={isAlert ? 'alert' : 'status'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <StatusBadge state={state} />
          <h2 className="mt-3 font-serif text-2xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">{description}</p>
        </div>
        {onRetry || state === 'error' || state === 'retry' || state === 'missing' ? <button className="rounded-full border border-stone-400 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" type="button" onClick={onRetry}>{retryLabel}</button> : null}
      </div>
    </section>
  )
}

export function FreshnessBanner({ state, lastSuccessfulAt }: { state: FreshnessState; lastSuccessfulAt?: string | null }) {
  const message = state === 'fresh' ? 'Datos actuales según el contrato.' : state === 'stale' ? 'La lectura está vencida; no se presenta como tiempo real.' : state === 'degraded' ? 'Hay fuentes degradadas; se conserva el último dato exitoso.' : 'No hay un dato exitoso disponible para esta lectura.'
  return <aside className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" aria-live="polite"><div className="flex flex-wrap items-center gap-2"><StatusBadge state={state === 'fresh' ? 'success' : state} /><span>{message}</span></div>{lastSuccessfulAt ? <p className="mt-2 text-amber-900">Último dato exitoso: {lastSuccessfulAt}</p> : null}</aside>
}

export function SourceCard({ source, mode, observedAt, lastSuccessfulObservedAt, validUntil, sourceUrl }: { source: string; mode: SourceMode; observedAt?: string | null; lastSuccessfulObservedAt?: string | null; validUntil?: string | null; sourceUrl?: string | null }) {
  return <article className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{source}</h3><span className="text-xs font-semibold uppercase tracking-wide text-stone-500">{mode}</span></div><dl className="mt-3 grid gap-1 text-sm text-stone-600"><div><dt className="inline font-medium text-stone-800">Observado: </dt><dd className="inline">{observedAt ?? 'Sin fecha'}</dd></div><div><dt className="inline font-medium text-stone-800">Último éxito: </dt><dd className="inline">{lastSuccessfulObservedAt ?? 'Sin dato'}</dd></div>{validUntil ? <div><dt className="inline font-medium text-stone-800">Válido hasta: </dt><dd className="inline">{validUntil}</dd></div> : null}</dl>{sourceUrl ? <a className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline underline-offset-2" href={sourceUrl} target="_blank" rel="noreferrer">Ver fuente</a> : null}</article>
}

export function EvidenceDrawer({ evidence, title = 'Evidencia y citas' }: { evidence: readonly string[]; title?: string }) {
  return <details className="rounded-2xl border border-stone-200 bg-white p-4"><summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">{title}</summary><ul className="mt-3 grid gap-2 text-sm text-stone-600">{evidence.map((item) => <li key={item}>{item}</li>)}</ul></details>
}

export function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-stone-950">{value}</p>{detail ? <p className="mt-1 text-sm text-stone-600">{detail}</p> : null}</article>
}

export function DataTable({ label, columns, rows }: { label: string; columns: readonly string[]; rows: readonly (readonly string[])[] }) {
  return <div className="overflow-x-auto rounded-2xl border border-stone-200"><table className="w-full min-w-[34rem] text-left text-sm" aria-label={label}><thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600"><tr>{columns.map((column) => <th className="px-4 py-3" key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr className="border-t border-stone-200" key={`${label}-${index}`}>{row.map((cell, cellIndex) => <td className="px-4 py-3" key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>
}

export function Timeline({ items, title = 'Timeline' }: { items: readonly { label: string; value: string; detail?: string }[]; title?: string }) {
  return <section aria-labelledby={`${title}-heading`}><h2 id={`${title}-heading`} className="font-serif text-2xl font-semibold">{title}</h2><ol className="mt-4 grid gap-3 border-l-2 border-emerald-700 pl-4">{items.map((item) => <li key={`${item.label}-${item.value}`}><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{item.label}</p><p className="font-semibold">{item.value}</p>{item.detail ? <p className="text-sm text-stone-600">{item.detail}</p> : null}</li>)}</ol></section>
}

export function MapFrame({ title, fallback, children }: { title: string; fallback: string; children?: ReactNode }) {
  return <section className="rounded-3xl border border-stone-300 bg-stone-200 p-4" aria-labelledby={`${title}-heading`}><div className="min-h-36 rounded-2xl border border-dashed border-stone-400 bg-stone-100 p-5"><h2 id={`${title}-heading`} className="font-serif text-2xl font-semibold">{title}</h2>{children ?? <p className="mt-2 text-sm text-stone-600">Proveedor cartográfico no configurado en este slice.</p>}</div><div className="mt-3 rounded-2xl border border-emerald-800/20 bg-white p-4" role="region" aria-label="Alternativa no cartográfica"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Alternativa no cartográfica</p><p className="mt-1 text-sm text-stone-700">{fallback}</p></div></section>
}

export function ChatPanel({ title = 'Chat existente', children }: { title?: string; children?: ReactNode }) {
  return <section className="rounded-3xl border border-stone-200 bg-white p-5" aria-labelledby={`${title}-heading`}><h2 id={`${title}-heading`} className="font-serif text-2xl font-semibold">{title}</h2><div aria-live="polite" className="mt-3">{children}</div></section>
}

export function ReportAction({ href, label = 'Abrir reporte' }: { href: string; label?: string }) {
  return <a className="inline-flex items-center justify-center rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" href={href}>{label}</a>
}
