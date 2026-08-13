'use client'

import React, { useEffect, useRef, useState, type FormEvent } from 'react'
import { pollStatusPath, sanitizeIngestResponse, type IngestStatus, type PollOptions, type SafeIngestView } from '@/lib/visibility/polling'
import { EvidenceStateBadge } from '@/components/visibility/primitives'
import { EVIDENCE_STATE, normalizeEvidence } from '@/lib/visibility/evidence-state'
export type { SafeIngestView } from '@/lib/visibility/polling'


const INGEST_BODY = JSON.stringify({ contractVersion: '1.0.0', reason: 'operator_browser' })
const VERIFY_BODY = JSON.stringify({ contractVersion: '1.0.0' })

const statusLabels: Record<IngestStatus, string> = {
  queued: 'Ingesta en cola',
  started: 'Ingesta iniciada',
  completed: 'Ingesta completada',
  partial: 'Ingesta parcial',
  failed: 'Ingesta fallida',
}

const sourceStatusLabels: Record<SafeIngestView['results'][number]['status'], string> = {
  success: 'Completó',
  failed: 'Falló',
  empty: 'Sin registros',
  skipped: 'Omitida',
}

export function IngestPanel({ pollOptions = {} }: { pollOptions?: PollOptions } = {}) {
  const [token, setToken] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<SafeIngestView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const [history, setHistory] = useState<Array<{ id: string; status: string; proofRunId: string; startedAt: string; freshness: string }>>([])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      setToken('')
      setAuthorized(false)
    }
  }, [])

  async function loadHistory() {
    if (!token.trim()) return
    const response = await fetch('/api/hydrology/ingest/runs?limit=10', { headers: { 'x-hydrology-ingest-token': token }, cache: 'no-store' })
    if (!response.ok) return
    const payload = await response.json() as { items?: Array<{ id: string; status: string; proofRunId: string; startedAt: string; freshness: string }> }
    if (mountedRef.current) setHistory(payload.items ?? [])
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !token.trim()) return

    setPending(true)
    setError(null)

    try {
      const response = await fetch('/api/hydrology/ingest/verify', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-hydrology-ingest-token': token,
        },
        body: VERIFY_BODY,
        cache: 'no-store',
      })

      if (!response.ok) throw new IngestRequestError(safeErrorForStatus(response.status))
      const payload = await response.json() as { contractVersion?: string; authorized?: boolean }
      if (payload.contractVersion !== '1.0.0' || payload.authorized !== true) {
        throw new IngestRequestError('No se pudo verificar el acceso a la ingesta.')
      }
       if (mountedRef.current) setAuthorized(true)
    } catch (cause) {
      if (mountedRef.current) {
        setToken('')
        setAuthorized(false)
        setError(cause instanceof IngestRequestError ? cause.message : 'No se pudo verificar el acceso a la ingesta.')
      }
    } finally {
      if (mountedRef.current) setPending(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !authorized || !token.trim()) return

    setPending(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch('/api/hydrology/ingest', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-hydrology-ingest-token': token,
        },
        body: INGEST_BODY,
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new IngestRequestError(safeErrorForStatus(response.status))
      }

      const admission = sanitizeIngestResponse(await response.json())
      const view = admission?.statusPath ? await pollStatusPath(admission.statusPath, pollOptions) : admission
      if (!view) throw new IngestRequestError('La respuesta de ingesta no tiene un formato válido.')
      if (mountedRef.current) setResult(view)
    } catch (cause) {
      if (mountedRef.current) setError(cause instanceof IngestRequestError ? cause.message : 'No se pudo completar la ingesta.')
    } finally {
      if (mountedRef.current) {
        setToken('')
        setAuthorized(false)
        setPending(false)
      }
    }
  }

  const statusMessage = pending
    ? authorized ? 'Procesando ingesta…' : 'Verificando acceso…'
    : result ? statusLabels[result.status]
    : authorized ? 'Acceso verificado' : 'Se requiere verificación de acceso'

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-50 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">Defensa Civil · Operaciones</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Ingesta hidrológica</h1>
        <p className="mt-4 max-w-2xl text-slate-300">Iniciá una actualización puntual de las fuentes oficiales. El token se usa únicamente para esta solicitud y se descarta al finalizar.</p>

        {!authorized ? (
          <form aria-label="Verificar acceso a ingesta" className="mt-8 rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-2xl" onSubmit={verify}>
            <label className="block text-sm font-bold text-slate-100" htmlFor="hydrology-ingest-token">Token de ingesta</label>
            <input
              id="hydrology-ingest-token"
              name="hydrology-ingest-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              onInput={(event) => setToken(event.currentTarget.value)}
              autoComplete="off"
              spellCheck={false}
              required
              aria-describedby="hydrology-ingest-token-help"
              className="mt-2 block w-full rounded-2xl border border-white/15 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-300/20"
            />
            <p id="hydrology-ingest-token-help" className="mt-2 text-sm text-slate-400">Campo obligatorio. Se conserva únicamente en memoria durante esta página.</p>
            <button
              type="submit"
              disabled={pending || !token.trim()}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-amber-300 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Verificando…' : 'Verificar acceso'}
            </button>
          </form>
        ) : (
          <form aria-label="Iniciar ingesta hidrológica" className="mt-8 rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-2xl" onSubmit={submit}>
            <p className="text-sm text-teal-100">Acceso verificado para esta página. La credencial permanece solo en memoria.</p>
            <button
              type="submit"
              disabled={pending}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-amber-300 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Procesando…' : 'Iniciar ingesta'}
            </button>
          </form>
        )}

        <p className="mt-6 rounded-2xl border border-teal-300/20 bg-teal-300/10 px-4 py-3 text-teal-100" role="status" aria-live="polite" aria-busy={pending}>
          {statusMessage}
        </p>

        {error ? <p className="mt-4 rounded-2xl border border-red-300/30 bg-red-950/60 px-4 py-3 text-red-100" role="alert">{error}</p> : null}
        {result ? <SafeResultView result={result} onRetry={() => { setResult(null); setError(null); setAuthorized(false) }} /> : null}
        {authorized ? <section className="mt-6 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6" aria-label="Historial de corridas"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">Historial durable</h2><button type="button" onClick={() => void loadHistory()} className="rounded-full border border-amber-300 px-3 py-2 text-sm font-bold text-amber-100">Actualizar</button></div>{history.length ? <ul className="mt-4 space-y-3">{history.map((run) => <li key={run.id} className="rounded-2xl bg-white/5 p-3 text-sm"><p className="font-bold">{run.id} · {run.status} · {run.freshness}</p><p className="text-slate-300">Proof: {run.proofRunId} · {run.startedAt}</p></li>)}</ul> : <p className="mt-3 text-slate-300">No hay corridas durables disponibles.</p>}</section> : null}
      </div>
    </main>
  )
}

function SafeResultView({ result, onRetry }: { result: SafeIngestView; onRetry: () => void }) {
  return (
    <section aria-labelledby="ingest-result-heading" className="mt-6 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
      <h2 id="ingest-result-heading" className="text-2xl font-black">Resultado de la ingesta</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-400">Estado</dt><dd className="font-bold text-white">{statusLabels[result.status]}</dd></div>
        {result.runId ? <div><dt className="text-slate-400">Run ID</dt><dd className="break-all font-mono text-white">{result.runId}</dd></div> : null}
        {result.proofRunId ? <div><dt className="text-slate-400">Proof run ID</dt><dd className="break-all font-mono text-white">{result.proofRunId}</dd></div> : null}
        {result.statusPath ? <div><dt className="text-slate-400">Ruta de estado</dt><dd className="break-all font-mono text-white">{result.statusPath}</dd></div> : null}
      </dl>

      <div className="mt-5">
        <h3 className="font-bold text-slate-100">Fuentes solicitadas</h3>
        <p className="mt-2 text-slate-300">{result.requestedSources.length ? result.requestedSources.join(' · ') : 'No informadas'}</p>
        <p className="mt-2 text-sm text-amber-100">Cobertura local: {result.coverageGaps.length ? result.coverageGaps.join(' · ') : 'Sin brechas informadas'}</p>
      </div>

      {result.results.length ? (
        <ul className="mt-5 grid gap-3" aria-label="Resultados por fuente">
          {result.results.map((source) => (
            <li key={source.source} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
              <span className="font-bold text-white">{source.source}</span>
              <span className="text-sm text-slate-300">{sourceStatusLabels[source.status]} · {source.recordsIngested} registros</span>
              {source.observedFrom || source.observedTo ? <span className="basis-full text-xs text-slate-400">Rango: {source.observedFrom ?? '—'} → {source.observedTo ?? '—'}</span> : null}
              {source.httpSummary ? <span className="basis-full text-xs text-slate-400">HTTP: {source.httpSummary.status ?? '—'} · {source.httpSummary.host}{source.httpSummary.path} · {source.httpSummary.elapsedMs} ms · {source.httpSummary.attempts} intento(s)</span> : null}
              {source.diagnostic ? <span className="basis-full text-xs text-amber-100">Diagnóstico: {source.diagnostic.failureKind ?? 'degradación'}{source.diagnostic.providerHost ? ` · ${source.diagnostic.providerHost}` : ''}{source.diagnostic.upstreamStatus ? ` · HTTP ${source.diagnostic.upstreamStatus}` : ''}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <IngestEvidenceStatePanel result={result} />
      {result.status === 'partial' || result.status === 'failed' || result.status === 'queued' || result.status === 'started' ? <button type="button" onClick={onRetry} className="mt-5 rounded-full border border-amber-300 px-4 py-2 font-bold text-amber-100 hover:bg-amber-300/10 focus-visible:ring-4 focus-visible:ring-amber-100">Reintentar ingesta</button> : null}
    </section>
  )
}

function IngestEvidenceStatePanel({ result }: { result: SafeIngestView }) {
  const overallState = result.status === 'partial' || result.status === 'failed' ? EVIDENCE_STATE.DEGRADED : result.status === 'completed' ? EVIDENCE_STATE.OBSERVED : EVIDENCE_STATE.MISSING
  const overall = normalizeEvidence({ state: overallState, source: 'Iberá-Alerta ingest', observedAt: result.results.find((item) => item.observedFrom)?.observedFrom, detail: `Ingest status: ${result.status}` })

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4" aria-label="Diagnósticos de ingesta">
      <h3 className="font-bold text-slate-100">Estados y diagnósticos seguros</h3>
      <p className="mt-2 text-sm text-slate-300">Resultado contractual: {result.status} · los detalles privados del proveedor permanecen ocultos.</p>
      <ul className="mt-3 grid gap-2 text-sm">
        <li className="flex flex-wrap items-center justify-between gap-2"><span>Estado general</span><EvidenceStateBadge state={overall.state} /></li>
        {result.results.map((item) => {
          const state = item.status === 'success' && item.observedFrom ? EVIDENCE_STATE.OBSERVED : item.status === 'failed' ? EVIDENCE_STATE.DEGRADED : EVIDENCE_STATE.MISSING
          const evidence = normalizeEvidence({ state, source: item.source, observedAt: item.observedFrom, detail: item.status })
          return <li key={`diagnostic-${item.source}`} className="flex flex-wrap items-center justify-between gap-2"><span>{item.source} · {item.status}</span><EvidenceStateBadge state={evidence.state} /></li>
        })}
      </ul>
    </section>
  )
}

class IngestRequestError extends Error {}

function safeErrorForStatus(status: number) {
  if (status === 401 || status === 403) return 'No se pudo autorizar la ingesta con el token indicado.'
  if (status === 429) return 'La ingesta está temporalmente limitada. Intentá nuevamente más tarde.'
  if (status >= 500) return 'El servicio de ingesta no está disponible. Intentá nuevamente más tarde.'
  return 'No se pudo completar la ingesta.'
}
