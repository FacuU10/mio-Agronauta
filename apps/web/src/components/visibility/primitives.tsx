import { createElement, type ReactNode } from 'react'
import type { EvidenceState } from '@/lib/visibility/evidence-state'
import type { FocusTarget, LiveRegionAdapter } from '@/lib/visibility/focus'
import type { EvidenceStatusViewModel, Outcome } from '@/lib/visibility/view-models'

const React = { createElement }

export type VisibilityStateName = 'loading' | 'empty' | 'error' | 'retry' | 'unauthorized' | 'forbidden' | 'stale' | 'degraded' | 'missing' | 'unavailable' | 'success' | 'partial'
export type FreshnessState = 'fresh' | 'stale' | 'degraded' | 'missing'
export type SourceMode = 'live' | 'seam' | 'mock' | 'fallback' | 'unavailable'

export interface StatusViewModel {
  state: VisibilityStateName
  retryable: boolean
  outcome?: Outcome
  reason?: string
  source?: string
  freshness?: FreshnessState
  mode?: SourceMode
}

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
  unavailable: 'No disponible',
  success: 'Actualizado',
  partial: 'Parcial',
}

const sourceModeLabels: Record<SourceMode, string> = {
  live: 'Live',
  seam: 'Seam',
  mock: 'Mock',
  fallback: 'Fallback',
  unavailable: 'Unavailable',
}

const freshnessLabels: Record<FreshnessState, string> = {
  fresh: 'fresh',
  stale: 'stale',
  degraded: 'degraded',
  missing: 'missing',
}

export function StatusBadge({ state }: { state: VisibilityStateName }) {
  return <span role="status" className="inline-flex items-center rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-stone-700">{stateLabels[state]}</span>
}

interface CopilotStatusProps {
  outcome: Outcome
  citationUnavailable: boolean
  actionable: boolean
  reason?: string
  retryAfterMs?: number
  onRetry?: () => void
  unverifiedClaims?: boolean
}

export function CopilotStatus({ outcome, citationUnavailable, actionable, reason, retryAfterMs, onRetry, unverifiedClaims = false }: CopilotStatusProps) {
  const isActionable = outcome === 'ready' && actionable && !citationUnavailable && !unverifiedClaims
  const retryAfterSeconds = retryAfterMs && retryAfterMs > 0 ? Math.ceil(retryAfterMs / 1_000) : undefined
  const toneClass = isActionable ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'

  return (
    <div role={isActionable ? 'status' : 'alert'} aria-live={isActionable ? 'polite' : 'assertive'} aria-atomic="true" className={`rounded-2xl border p-4 text-sm ${toneClass}`}>
      <strong>{isActionable ? 'Copilot fundamentado' : 'Citación no disponible'}</strong>
      <span className="ml-2">{isActionable ? `Estado: ${outcome}` : 'Resultado no es accionable.'}</span>
      {reason ? <p className="mt-1">{reason}</p> : null}
      {retryAfterSeconds ? <p className="mt-1">Reintentar Copilot en {retryAfterSeconds} segundos.</p> : null}
      {onRetry ? <button className="mt-3 rounded-full border border-stone-400 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={onRetry} disabled={Boolean(retryAfterSeconds)}>{'Reintentar Copilot'}</button> : null}
    </div>
  )
}

export function EvidenceStateBadge({ state, label }: { state: EvidenceState; label?: string }) {
  const name = label ? `${label}: ${state}` : state
  return <span aria-label={`Estado de evidencia ${name}`} className="inline-flex items-center rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-stone-700">{name}</span>
}

export interface VisibilityStateProps {
  state?: VisibilityStateName
  status?: StatusViewModel
  title: string
  description: string
  retryLabel?: string
  onRetry?: () => void
  retryAllowed?: boolean
  retryAfterMs?: number
  source?: string
  freshness?: FreshnessState
  mode?: SourceMode
  reason?: string
}

export function VisibilityState({ state, status, title, description, retryLabel = 'Reintentar', onRetry, retryAllowed, retryAfterMs, source, freshness, mode, reason }: VisibilityStateProps) {
  const resolvedState = status?.state ?? state ?? 'unavailable'
  const isAlert = resolvedState === 'error' || resolvedState === 'missing' || resolvedState === 'unavailable' || resolvedState === 'unauthorized' || resolvedState === 'forbidden'
  const hasRetryState = resolvedState === 'error' || resolvedState === 'retry' || resolvedState === 'missing' || resolvedState === 'unavailable'
  const resolvedRetryAllowed = retryAllowed ?? status?.retryable ?? hasRetryState
  const resolvedSource = source ?? status?.source
  const resolvedFreshness = freshness ?? status?.freshness
  const resolvedMode = mode ?? status?.mode
  const resolvedReason = reason ?? status?.reason
  const retryAfterSeconds = retryAfterMs && retryAfterMs > 0 ? Math.ceil(retryAfterMs / 1_000) : undefined

  return (
    <section aria-live={isAlert ? 'assertive' : 'polite'} aria-atomic="true" aria-busy={resolvedState === 'loading' ? 'true' : undefined} aria-label={title} className="evidence-surface rounded-3xl border border-stone-300 bg-white p-5 shadow-sm" role={isAlert ? 'alert' : 'status'}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 break-words">
          <StatusBadge state={resolvedState} />
          <h2 className="mt-3 font-serif text-2xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">{description}</p>
          {resolvedSource ? <p className="mt-2 text-sm text-stone-600">Fuente: {resolvedSource}</p> : null}
          {resolvedFreshness ? <p className="text-sm text-stone-600">Freshness: {resolvedFreshness}</p> : null}
          {resolvedMode ? <p className="text-sm text-stone-600">Modo: {sourceModeLabels[resolvedMode]}</p> : null}
          {resolvedReason ? <p className="text-sm text-stone-600">Motivo: {resolvedReason}</p> : null}
          {retryAfterSeconds ? <p className="mt-2 text-sm text-amber-900">Reintentar en {retryAfterSeconds} segundos.</p> : null}
        </div>
        {hasRetryState && resolvedRetryAllowed ? <button className="rounded-full border border-stone-400 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" type="button" onClick={onRetry} disabled={!onRetry || Boolean(retryAfterSeconds)}>{retryLabel}</button> : null}
      </div>
    </section>
  )
}

export interface StatusViewProps extends Omit<VisibilityStateProps, 'state' | 'status'> {
  status: StatusViewModel
}

export function StatusView({ status, ...props }: StatusViewProps) {
  return <VisibilityState {...props} status={status} />
}

export interface StatePrimitiveProps extends Omit<VisibilityStateProps, 'state'> {
  title: string
  description: string
}

export function LoadingState(props: StatePrimitiveProps) {
  return <VisibilityState {...props} state="loading" retryAllowed={false} />
}

export function EmptyState(props: StatePrimitiveProps) {
  return <VisibilityState {...props} state="empty" retryAllowed={false} />
}

export function ErrorState(props: StatePrimitiveProps) {
  return <VisibilityState {...props} state="error" />
}

export function UnavailableState(props: StatePrimitiveProps) {
  return <VisibilityState {...props} state="unavailable" />
}

export interface RetryActionProps {
  onRetry: () => void
  label?: string
  allowed?: boolean
  retryAfterMs?: number
  className?: string
}

export function RetryAction({ onRetry, label = 'Reintentar', allowed = true, retryAfterMs, className }: RetryActionProps) {
  if (!allowed) return null
  const retryAfterSeconds = retryAfterMs && retryAfterMs > 0 ? Math.ceil(retryAfterMs / 1_000) : undefined
  return <button className={className ?? 'rounded-full border border-stone-400 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700'} type="button" onClick={onRetry} disabled={Boolean(retryAfterSeconds)}>{retryAfterSeconds ? `Reintentar en ${retryAfterSeconds} segundos` : label}</button>
}

export function EvidenceStatus({ status, label = 'Estado de evidencia' }: { status: EvidenceStatusViewModel; label?: string }) {
  const displayState = status.freshness === 'fresh' ? 'success' : status.freshness
  return <article aria-label={label} className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{label}</h3><StatusBadge state={displayState} /></div><dl className="mt-3 grid gap-1 text-sm text-stone-600"><div><dt className="inline font-medium text-stone-800">Fuente: </dt><dd className="inline">{status.source ?? 'Sin fuente'}</dd></div><div><dt className="inline font-medium text-stone-800">Modo: </dt><dd className="inline">{sourceModeLabels[status.mode]}</dd></div><div><dt className="inline font-medium text-stone-800">Freshness: </dt><dd className="inline">{status.freshness}</dd></div><div><dt className="inline font-medium text-stone-800">Observado: </dt><dd className="inline">{status.observedAt ?? 'Sin fecha'}</dd></div>{status.lastSuccessfulObservedAt ? <div><dt className="inline font-medium text-stone-800">Último éxito: </dt><dd className="inline">{status.lastSuccessfulObservedAt}</dd></div> : null}{status.reason ? <div><dt className="inline font-medium text-stone-800">Motivo: </dt><dd className="inline">{status.reason}</dd></div> : null}</dl></article>
}

export interface LiveRegionProps extends Partial<Pick<LiveRegionAdapter, 'targetId' | 'message' | 'role' | 'ariaLive' | 'atomic' | 'announcementKey'>> {
  adapter?: LiveRegionAdapter
  className?: string
}

export function LiveRegion({ adapter, targetId, message, role, ariaLive, atomic, announcementKey, className }: LiveRegionProps) {
  const resolved = adapter ?? (targetId && message && role && ariaLive && announcementKey ? { targetId, message, role, ariaLive, atomic: atomic ?? true, announcementKey } : undefined)
  if (!resolved) return null
  return <div id={resolved.targetId} role={resolved.role} aria-live={resolved.ariaLive} aria-atomic="true" data-announcement-key={resolved.announcementKey} className={className}>{resolved.message}</div>
}

export function FocusVisibleBoundary({ target, children, className }: { target: FocusTarget; children: ReactNode; className?: string }) {
  return <section id={target.targetId} tabIndex={-1} aria-label={target.accessibleLabel} className={`focus-safe-target scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${className ?? ''}`}>{children}</section>
}

export function FreshnessBanner({ state, lastSuccessfulAt, reason }: { state: FreshnessState; lastSuccessfulAt?: string | null; reason?: string }) {
  const message = state === 'fresh' ? 'Datos actuales según el contrato.' : state === 'stale' ? 'La lectura está vencida; no se presenta como tiempo real.' : state === 'degraded' ? 'Hay fuentes degradadas; se conserva el último dato exitoso.' : 'No hay un dato exitoso disponible para esta lectura.'
  return <aside className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" aria-live="polite"><div className="flex flex-wrap items-center gap-2"><StatusBadge state={state === 'fresh' ? 'success' : state} /><span>{message}</span></div>{lastSuccessfulAt ? <p className="mt-2 text-amber-900">Último dato exitoso: {lastSuccessfulAt}</p> : null}{reason ? <p className="mt-2 text-amber-900">Motivo: {reason}</p> : null}</aside>
}

export function SourceCard({ source, mode, observedAt, lastSuccessfulObservedAt, validUntil, sourceUrl, freshness, reason }: { source: string; mode: SourceMode; observedAt?: string | null; lastSuccessfulObservedAt?: string | null; validUntil?: string | null; sourceUrl?: string | null; freshness?: FreshnessState; reason?: string }) {
  return <article className="evidence-surface rounded-2xl border border-stone-200 bg-stone-50 p-4"><div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><h3 className="break-words font-semibold">{source}</h3><span aria-label={`Modo de fuente ${mode}`} className="max-w-full break-words text-xs font-semibold uppercase tracking-wide text-stone-500">{sourceModeLabels[mode]}</span></div><dl className="mt-3 grid gap-1 break-words text-sm text-stone-600"><div><dt className="inline font-medium text-stone-800">Fuente: </dt><dd className="inline">{source}</dd></div><div><dt className="inline font-medium text-stone-800">Modo: </dt><dd className="inline">{mode}</dd></div>{freshness ? <div><dt className="inline font-medium text-stone-800">Freshness: </dt><dd className="inline">{freshnessLabels[freshness]}</dd></div> : null}<div><dt className="inline font-medium text-stone-800">Observado: </dt><dd className="inline">{observedAt ?? 'Sin fecha'}</dd></div><div><dt className="inline font-medium text-stone-800">Último éxito: </dt><dd className="inline">{lastSuccessfulObservedAt ?? 'Sin dato'}</dd></div>{validUntil ? <div><dt className="inline font-medium text-stone-800">Válido hasta: </dt><dd className="inline">{validUntil}</dd></div> : null}{reason ? <div><dt className="inline font-medium text-stone-800">Motivo: </dt><dd className="inline">{reason}</dd></div> : null}</dl>{sourceUrl ? <a className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" href={sourceUrl} target="_blank" rel="noreferrer">Ver fuente</a> : null}</article>
}

export function EvidenceDrawer({ evidence, title = 'Evidencia y citas' }: { evidence: readonly string[]; title?: string }) {
  return <details className="rounded-2xl border border-stone-200 bg-white p-4"><summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">{title}</summary><ul className="mt-3 grid gap-2 text-sm text-stone-600">{evidence.map((item) => <li key={item}>{item}</li>)}</ul></details>
}

export function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-stone-950">{value}</p>{detail ? <p className="mt-1 text-sm text-stone-600">{detail}</p> : null}</article>
}

export function DataTable({ label, columns, rows }: { label: string; columns: readonly string[]; rows: readonly (readonly string[])[] }) {
  return <div className="evidence-scroll rounded-2xl border border-stone-200"><table className="evidence-table w-full text-left text-sm" aria-label={label}><thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600"><tr>{columns.map((column) => <th className="break-words px-4 py-3" key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr className="border-t border-stone-200" key={`${label}-${index}`}>{row.map((cell, cellIndex) => <td className="break-words px-4 py-3" key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>
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
