import { createElement } from 'react'
import type { EvidenceDashboardModel, EvidenceSourceRecord } from '@/lib/agronautas/ingestion-status'
import { ApiError } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VisibilityState } from '@/components/visibility/primitives'
import { normalizeRequestError } from '@/lib/visibility/view-models'

const React = { createElement }

interface EvidencePanelProps {
  model?: EvidenceDashboardModel
  error?: unknown
  onRetry: () => Promise<unknown>
}

export function EvidencePanel({ model, error, onRetry }: EvidencePanelProps) {
  if (error) {
    const outcome = normalizeRequestError(error)
    const status = error instanceof ApiError ? error.status : outcome.httpStatus
    const boundary = status === 401 ? ['unauthorized', 'Evidencia requiere autenticación', 'La respuesta HTTP 401 no permite leer evidencia.'] as const : status === 403 ? ['forbidden', 'Evidencia restringida', 'La respuesta HTTP 403 mantiene el límite del workspace.'] as const : status === 404 ? ['missing', 'Evidencia no disponible', 'La API no devolvió un contrato de evidencia para este campo.'] as const : ['error', 'Evidencia no disponible', `${outcome.reason}. El contexto se conserva sin usar datos simulados.`] as const
    return <section data-testid="agronautas-evidence-dashboard" aria-label="Dashboard de evidencia Agronautas" className="grid gap-4"><Card className="border-rose-200 bg-rose-50"><CardHeader><CardTitle>Dashboard de evidencia</CardTitle><CardDescription>Respuesta real de API/BFF</CardDescription></CardHeader><CardContent><VisibilityState state={boundary[0]} title={boundary[1]} description={boundary[2]} retryAllowed={!['unauthorized', 'forbidden', 'missing'].includes(boundary[0])} retryLabel="Reintentar evidencia" onRetry={() => void onRetry()} /></CardContent></Card></section>
  }

  if (!model) return <section data-testid="agronautas-evidence-dashboard" aria-label="Dashboard de evidencia Agronautas"><VisibilityState state="loading" title="Cargando evidencia" description="Sincronizando fuentes y procedencia del campo." retryAllowed={false} /></section>

  return <section data-testid="agronautas-evidence-dashboard" aria-label="Dashboard de evidencia Agronautas" className="grid gap-5"><Card><CardHeader><CardTitle>Evidencia por fuente</CardTitle><CardDescription>Fuente, modo, frescura, timestamps, lineage y próximo límite provienen del contrato; HTTP 200 vacío no se convierte en disponibilidad.</CardDescription></CardHeader><CardContent className="grid gap-4">{model.overallState === 'empty' ? <VisibilityState state="empty" title="Sin registros de evidencia" description="La API respondió un conjunto vacío. No se completa con datos demo." retryAllowed={true} retryLabel="Reintentar evidencia" onRetry={() => void onRetry()} /> : null}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{model.sources.map((source) => <EvidenceSourceCard key={`${source.key}-${source.provider}-${source.signalType}`} source={source} />)}</div></CardContent></Card><div className="grid gap-5 lg:grid-cols-2"><Card data-testid="agronautas-ingestion-records"><CardHeader><CardTitle>Registros de ingestión</CardTitle><CardDescription>Runs devueltos por el contrato; no se deduce éxito desde HTTP 200.</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm">{model.ingestion.length ? model.ingestion.map((record) => <div key={`${record.provider}-${record.signalType}-${record.runId ?? record.state}`} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{record.provider} · {record.signalType}</p><Badge variant={record.state === 'succeeded' ? 'success' : record.state === 'failed' ? 'destructive' : 'warning'}>{record.state}</Badge></div><p className="mt-2 break-words text-[var(--muted-foreground)]">Run {record.runId ?? 'no disponible'} · retrieved {formatDateTime(record.retrievedAt)} · próximo {formatDateTime(record.nextDueAt)}</p><p className="mt-2 text-[var(--muted-foreground)]">{record.reason ?? (record.retryable ? 'Reintento permitido por el contrato.' : 'Sin reintento permitido.')}</p></div>) : <p role="status">La respuesta no incluyó registros de ingestión; no se inventan corridas.</p>}</CardContent></Card><Card data-testid="agronautas-readiness-records"><CardHeader><CardTitle>Readiness por fuente</CardTitle><CardDescription>Solo se muestra readiness emitido por backend con evidencia y run lineage.</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm">{model.readiness.length ? model.readiness.map((record) => <div key={`${record.source}-${record.productSlice}`} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{record.source} · {record.productSlice}</p><Badge variant={record.state === 'ready' ? 'success' : 'warning'}>{record.state}</Badge></div><p className="mt-2 break-words text-[var(--muted-foreground)]">Evaluado {formatDateTime(record.evaluatedAt)} · evidence {record.evidenceRefs.join(', ') || 'no disponible'} · runs {record.runIds.join(', ') || 'no disponible'}</p>{record.reason ? <p className="mt-2 text-[var(--muted-foreground)]">{record.reason}</p> : null}</div>) : <p role="status">Readiness no fue devuelto por la API; no se eleva desde el cliente.</p>}</CardContent></Card></div></section>
}

function EvidenceSourceCard({ source }: { source: EvidenceSourceRecord }) {
  const variant = source.status === 'fresh' ? 'success' : source.status === 'unavailable' || source.status === 'missing' ? 'destructive' : 'warning'
  return <article className="min-w-0 rounded-2xl border border-[var(--border)] p-4" aria-label={`${source.label} evidence`}><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold">{source.label}</p><p className="break-words text-xs text-[var(--muted-foreground)]">{source.provider} · {source.signalType}</p></div><Badge variant={variant}>{source.status}</Badge></div><dl className="mt-3 grid gap-1 text-xs leading-5 text-[var(--muted-foreground)]"><div><dt className="inline font-medium text-[var(--foreground)]">Modo: </dt><dd className="inline">{source.providerMode}</dd></div><div><dt className="inline font-medium text-[var(--foreground)]">Observed: </dt><dd className="inline">{formatDateTime(source.observedAt)}</dd></div><div><dt className="inline font-medium text-[var(--foreground)]">Retrieved: </dt><dd className="inline">{formatDateTime(source.retrievedAt)}</dd></div><div><dt className="inline font-medium text-[var(--foreground)]">Lineage: </dt><dd className="inline break-all">{source.runId ?? 'No disponible'}</dd></div><div><dt className="inline font-medium text-[var(--foreground)]">Source: </dt><dd className="inline break-all">{source.sourceUrl ?? source.sourceKey ?? 'No disponible'}</dd></div></dl>{source.degradationReasons.length ? <p className="mt-3 break-words text-xs text-amber-800">Límite: {source.degradationReasons.join(', ')}</p> : null}<p className="mt-3 text-xs font-medium text-stone-700">Siguiente acción: {source.nextAction}</p></article>
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Sin fecha disponible'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}
