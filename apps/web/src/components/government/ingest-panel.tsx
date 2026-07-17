'use client'

import React, { useEffect, useRef, useState, type FormEvent } from 'react'

type IngestStatus = 'queued' | 'started' | 'completed' | 'partial' | 'failed'
type SourceStatus = 'success' | 'failed' | 'empty' | 'skipped'

type SafeIngestResult = {
  source: string
  status: SourceStatus
  recordsIngested: number
}

export type SafeIngestView = {
  status: IngestStatus
  runId?: string
  proofRunId?: string
  requestedSources: string[]
  results: SafeIngestResult[]
}

const INGEST_BODY = JSON.stringify({ contractVersion: '1.0.0', reason: 'operator_browser' })
const VERIFY_BODY = JSON.stringify({ contractVersion: '1.0.0' })

const statusLabels: Record<IngestStatus, string> = {
  queued: 'Ingesta en cola',
  started: 'Ingesta iniciada',
  completed: 'Ingesta completada',
  partial: 'Ingesta parcial',
  failed: 'Ingesta fallida',
}

const sourceStatusLabels: Record<SourceStatus, string> = {
  success: 'Completó',
  failed: 'Falló',
  empty: 'Sin registros',
  skipped: 'Omitida',
}

export function IngestPanel() {
  const [token, setToken] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<SafeIngestView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      setToken('')
      setAuthorized(false)
    }
  }, [])

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

      const view = sanitizeIngestView(await response.json())
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
        {result ? <SafeResultView result={result} /> : null}
      </div>
    </main>
  )
}

function SafeResultView({ result }: { result: SafeIngestView }) {
  return (
    <section aria-labelledby="ingest-result-heading" className="mt-6 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
      <h2 id="ingest-result-heading" className="text-2xl font-black">Resultado de la ingesta</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-400">Estado</dt><dd className="font-bold text-white">{statusLabels[result.status]}</dd></div>
        {result.runId ? <div><dt className="text-slate-400">Run ID</dt><dd className="break-all font-mono text-white">{result.runId}</dd></div> : null}
        {result.proofRunId ? <div><dt className="text-slate-400">Proof run ID</dt><dd className="break-all font-mono text-white">{result.proofRunId}</dd></div> : null}
      </dl>

      <div className="mt-5">
        <h3 className="font-bold text-slate-100">Fuentes solicitadas</h3>
        <p className="mt-2 text-slate-300">{result.requestedSources.length ? result.requestedSources.join(' · ') : 'No informadas'}</p>
      </div>

      {result.results.length ? (
        <ul className="mt-5 grid gap-3" aria-label="Resultados por fuente">
          {result.results.map((source) => (
            <li key={source.source} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
              <span className="font-bold text-white">{source.source}</span>
              <span className="text-sm text-slate-300">{sourceStatusLabels[source.status]} · {source.recordsIngested} registros</span>
            </li>
          ))}
        </ul>
      ) : null}
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

function sanitizeIngestView(value: unknown): SafeIngestView | null {
  if (!isRecord(value) || !isIngestStatus(value['status'])) return null

  const requestedSources = safeStringArray(value['requestedSources'])
  const results = Array.isArray(value['results']) ? value['results'].flatMap((item) => {
    if (!isRecord(item) || typeof item['source'] !== 'string' || !isSourceStatus(item['status'])) return []
    const recordsIngested = typeof item['recordsIngested'] === 'number' && Number.isFinite(item['recordsIngested']) && item['recordsIngested'] >= 0 ? Math.floor(item['recordsIngested']) : 0
    return [{ source: item['source'].slice(0, 80), status: item['status'], recordsIngested }]
  }).slice(0, 20) : []

  return {
    status: value['status'],
    runId: safeOptionalString(value['runId']),
    proofRunId: safeOptionalString(value['proofRunId']),
    requestedSources,
    results,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function safeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.slice(0, 80)).slice(0, 20) : []
}

function safeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 120) : undefined
}

function isIngestStatus(value: unknown): value is IngestStatus {
  return value === 'queued' || value === 'started' || value === 'completed' || value === 'partial' || value === 'failed'
}

function isSourceStatus(value: unknown): value is SourceStatus {
  return value === 'success' || value === 'failed' || value === 'empty' || value === 'skipped'
}
