'use client'

import Link from 'next/link'
import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bot, DatabaseZap, Send, ShieldAlert } from 'lucide-react'
import { formatOfficialTime, statusLabel } from './format'
import { applyChatEvent, canRetryChat, createChatStreamState, createChatViewModelFromStream, type ChatStreamState } from '@/lib/visibility/chat'
import { parseSseText } from '@/lib/visibility/chat'
import { CopilotStatus, EvidenceStateBadge } from '@/components/visibility/primitives'
import { EVIDENCE_STATE, normalizeEvidence } from '@/lib/visibility/evidence-state'


type TelemetryCard = { source: string; stationId: string; metric: string; value: number | null; unit: string; observedAt?: string | null; lastSuccessfulObservedAt?: string | null; label: string; freshness?: 'fresh' | 'stale' | 'degraded' | 'missing'; forecastHorizonDays?: number | null; sourceUrl?: string | null }
type ForecastRow = TelemetryCard & { forecastHorizonDays?: number | null; confidence?: string | null; sourceUrl?: string | null }
 type Provenance = { source: string; freshness: string; label: string; lastSuccessfulObservedAt: string | null }
type OfficialAlert = { source: 'SMN' | 'INMET'; coverageKey: string; message: string; observedAt: string; lastSuccessfulObservedAt: string; freshness: 'fresh' | 'degraded'; sourceUrl?: string }
type DashboardPayload = {
  municipality: { id: string; localityId: string; name: string; alertHeightM?: number; evacuationHeightM?: number; officialAlerts: OfficialAlert[]; coverageStatus?: string; geometryStatus?: string; sourceRegistry?: Array<{ source: string; stationId: string | null; coverageKey: string | null; sourceUrl: string; freshnessPolicy: string; registryVersion: string; reviewStatus: string; reviewedAt: string | null }> }
  gaugeMappings: { primaryPnaPortId: string | null; secondaryPnaPortIds: string[]; inaStationIds: string[]; smnRegionIds: string[]; inmetStationIds: string[] }
  telemetryCards: TelemetryCard[]
  inaPredictions30d: ForecastRow[]
  alerts: TelemetryCard[]
  provenance: Provenance[]
  coverageGaps?: string[]
  explanation?: { threshold: { alertHeightM: number | null; evacuationHeightM: number | null }; observed: { value: number | null; comparison: string; source: string | null; sourceUrl?: string | null; observedAt: string | null; freshness: string | null }; tendency: { value: string | null; window: string }; forecast: { horizonDays: number; confidence: string; label: string; source: string; sourceUrl?: string | null; observedAt: string } | null; relationLabel: string }
  timeline?: { events: Array<{ id: string; kind: string; occurredAt: string; source: string; title: string; detail: string; evidenceState: string }>; currentStatus?: string; nextCursor?: string | null }
}

const MUNICIPALITY_DETAIL_INDEX_ITEMS = [
  { href: '#telemetry', label: 'Telemetría' },
  { href: '#municipal-evidence', label: 'Evidencia' },
  { href: '#municipal-explanation', label: 'Explicación' },
  { href: '#municipal-coverage', label: 'Cobertura' },
  { href: '#municipal-mappings', label: 'Mapeos' },
  { href: '#municipal-alerts', label: 'Alertas' },
  { href: '#municipal-forecast', label: 'Pronóstico INA' },
  { href: '#municipal-provenance', label: 'Procedencia' },
] as const

export interface MunicipalityOperatorSummary {
  status: string
  freshness: string
  threshold: string
  confidence: string
  nextSafeAction: string
}

export function createMunicipalityOperatorSummary(data: DashboardPayload | null): MunicipalityOperatorSummary {
  const telemetry = data?.telemetryCards ?? []
  const usableTelemetry = telemetry.filter((card) => card.value != null && card.freshness !== 'missing' && Boolean(card.observedAt))
  const hasMissing = telemetry.length === 0 || telemetry.some((card) => card.value == null || card.freshness === 'missing')
  const hasDegraded = telemetry.some((card) => card.freshness === 'stale' || card.freshness === 'degraded') || data?.provenance.some((item) => item.freshness === 'stale' || item.freshness === 'degraded') === true
  const hasConflict = data?.provenance.some((item) => item.freshness === 'fresh' && telemetry.some((card) => card.source === item.source && (card.value == null || card.freshness === 'missing'))) === true
  const pna = telemetry.find((card) => card.source === 'PNA' && card.metric === 'river_height_m' && card.value != null && card.freshness !== 'missing')
  const threshold = pna?.value != null && data?.municipality.evacuationHeightM != null && pna.value >= data.municipality.evacuationHeightM
    ? 'Sobre el umbral de evacuación'
    : pna?.value != null && data?.municipality.alertHeightM != null && pna.value >= data.municipality.alertHeightM
      ? 'Sobre el umbral de alerta'
      : pna?.value != null && data?.municipality.alertHeightM != null
        ? 'Por debajo del umbral de alerta'
        : 'No disponible'

  if (!usableTelemetry.length || hasConflict) return { status: 'Sin datos verificables', freshness: 'Sin datos', threshold, confidence: hasConflict ? 'Insuficiente por conflicto de evidencia' : 'No disponible', nextSafeAction: 'Confirmar la última lectura en la fuente oficial antes de decidir' }
  if (hasMissing || hasDegraded) return { status: 'Datos parciales', freshness: 'Degradada', threshold, confidence: 'Limitada por cobertura', nextSafeAction: 'Confirmar la última lectura en la fuente oficial antes de decidir' }
  return { status: 'Observado', freshness: 'Vigente', threshold, confidence: 'Evidencia observada', nextSafeAction: 'Continuar monitoreo y confirmar el protocolo oficial antes de escalar' }
}

export function GovernmentDetail({ municipalityId, initialData = null }: { municipalityId: string; initialData?: DashboardPayload | null }) {
  const [data, setData] = useState<DashboardPayload | null>(initialData)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!initialData)
  const [errorRetryable, setErrorRetryable] = useState(false)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [message, setMessage] = useState('')
  const [chatState, setChatState] = useState<ChatStreamState>(createChatStreamState())
  const [lastMessage, setLastMessage] = useState('')
  const [messageError, setMessageError] = useState<string | null>(null)
  const messageInputRef = useRef<HTMLInputElement>(null!)
  const dashboardRetryRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    let active = true
    if (initialData) {
      setData(initialData)
      setError(null)
      setErrorRetryable(false)
      setLoading(false)
      return () => { active = false }
    }
    setLoading(true)
    setError(null)
    fetch(`/api/hydrology/municipalities/${municipalityId}/dashboard`)
      .then((response) => {
        if (!response.ok) throw new DashboardRequestError(dashboardErrorForStatus(response.status), dashboardRetryableForStatus(response.status))
        return response.json() as Promise<DashboardPayload>
      })
      .then((payload) => {
        if (!isDashboardPayload(payload)) throw new DashboardRequestError('El tablero respondió sin datos verificables ni un contrato válido.', false)
        if (!active) return
        setData(payload)
        setErrorRetryable(false)
      })
      .catch((cause) => {
        if (!active) return
        setError(cause instanceof DashboardRequestError ? cause.message : 'No se pudo cargar el tablero local. Verificá conectividad con la API oficial.')
        setErrorRetryable(cause instanceof DashboardRequestError ? cause.retryable : true)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [municipalityId, initialData, retryAttempt])

  useEffect(() => {
    if (error && errorRetryable && !loading) dashboardRetryRef.current?.focus()
  }, [error, errorRetryable, loading])

  async function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!message.trim()) {
      setMessageError('Escribí una consulta antes de enviarla.')
      messageInputRef.current?.focus()
      return
    }
    setMessageError(null)
    await requestCopilot(message)
    setMessage('')
  }

  async function requestCopilot(nextMessage: string) {
    if (chatState.status === 'streaming') return
    setLastMessage(nextMessage)
    setChatState({ ...createChatStreamState(), status: 'streaming' })
    try {
      const response = await fetch(`/api/hydrology/municipalities/${municipalityId}/copilot/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contractVersion: '1.0.0', message: nextMessage }),
      })
      const text = await response.text()
      if (!response.ok) throw new CopilotRequestError(copilotErrorForStatus(response.status), copilotRetryableForStatus(response.status), response.status)
      setChatState(parseSseText(text).reduce(applyChatEvent, createChatStreamState()))
    } catch (cause) {
      setChatState((current) => ({ ...current, status: current.answer ? 'partial' : 'error', error: cause instanceof Error ? cause.message : 'No se pudo completar la consulta.', retryable: cause instanceof CopilotRequestError ? cause.retryable : true, httpStatus: cause instanceof CopilotRequestError ? cause.httpStatus : 503 }))
    }
  }

  const degraded = data?.provenance.some((item) => item.freshness !== 'fresh')
  const operatorSummary = createMunicipalityOperatorSummary(data)
  const chatView = createChatViewModelFromStream(chatState)
  const canRetryCopilot = chatView.retryable && canRetryChat(chatState) && chatView.httpStatus !== 401 && chatView.httpStatus !== 403

  return (
    <main className="min-h-screen overflow-x-hidden bg-stone-950 text-stone-50">
      <a href="#telemetry" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-lime-200 focus:px-4 focus:py-2 focus:text-stone-950">Saltar a telemetría</a>
      <section className="relative isolate px-5 py-8 sm:px-8 lg:px-12">
        <div className="gov-detail-bg absolute inset-0 -z-10" />
        <div className="mx-auto max-w-7xl">
          <Link href="/municipalities" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-stone-100 transition-colors duration-200 hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-lime-200"><ArrowLeft size={16} aria-hidden="true" /> Volver al mapa provincial</Link>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-lime-200">Tablero local · {data?.municipality.localityId ?? municipalityId}</p>
              <h1 className="mt-4 text-balance text-4xl font-black tracking-tight sm:text-6xl">{data?.municipality.name ?? (loading ? 'Cargando municipio…' : 'Municipio no disponible')}</h1>
              <p className="mt-4 max-w-2xl text-pretty text-stone-300">Lectura ejecutiva de PNA, SMN, INMET e INA con procedencia oficial y continuidad operativa ante fuentes degradadas.</p>
            </div>
            <aside className="rounded-[2rem] border border-lime-200/20 bg-lime-200/10 p-5 shadow-2xl">
              <div className="flex items-center gap-3 text-lime-100"><ShieldAlert aria-hidden="true" /><h2 className="font-black">Tablero usable con fuentes degradadas</h2></div>
              <p className="mt-3 text-sm text-stone-300">{!data ? 'No se recibió información verificable del municipio.' : degraded ? 'Hay fuentes con estado degradado; se mantienen visibles los últimos datos oficiales.' : 'Todas las fuentes reportadas están disponibles.'}</p>
            </aside>
          </div>

          <MunicipalityOperatorSummaryPanel summary={operatorSummary} />
          <MunicipalityStickySummaryPanel summary={operatorSummary} />
          <MunicipalitySectionIndex />

          {loading ? <p role="status" aria-live="polite" aria-busy="true" className="mt-8 rounded-3xl border border-white/10 bg-white/[0.08] p-5 text-stone-200">Cargando tablero municipal…</p> : null}
          {error ? <div role="alert" aria-live="assertive" aria-atomic="true" className="mt-8 grid gap-3 rounded-3xl border border-red-300/40 bg-red-950/70 p-5 text-red-100"><p>{error}</p>{errorRetryable ? <button ref={dashboardRetryRef} type="button" onClick={() => setRetryAttempt((attempt) => attempt + 1)} className="w-fit rounded-full border border-lime-200 px-4 py-2 font-bold text-lime-100 hover:bg-lime-200/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-100">Reintentar tablero</button> : null}</div> : null}

            <section id="telemetry" tabIndex={-1} aria-labelledby="telemetry-heading" className="mt-10 scroll-mt-32 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60">
            <h2 id="telemetry-heading" className="text-2xl font-black">Telemetría oficial</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(data?.telemetryCards ?? []).map((card) => (
                <article key={`${card.source}-${card.stationId}-${card.metric}`} className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-200">{card.source} · {card.stationId}</p><h3 className="mt-2 text-xl font-black">{card.label}</h3></div><DatabaseZap className="text-lime-200" aria-hidden="true" /></div>
                  <p className="mt-5 text-4xl font-black tabular-nums">{card.value ?? '—'} <span className="text-lg text-stone-300">{card.unit}</span></p>
                   <p className="mt-3 text-xs font-bold uppercase tracking-wide text-lime-200">{telemetryMode(card)}</p>
                   <p className="mt-2 text-sm text-stone-300">{formatTelemetryTime(card)}</p>
                   {card.sourceUrl ? <a className="mt-2 inline-block text-sm font-bold text-lime-200 underline underline-offset-2" href={card.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial</a> : null}
                </article>
              ))}
              {data && data.telemetryCards.length === 0 ? <p className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 text-stone-300">Sin telemetría oficial reciente para este municipio.</p> : null}
            </div>
           </section>
             <div id="municipal-evidence" tabIndex={-1} className="scroll-mt-32 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60"><MunicipalEvidenceStatePanel data={data} /></div>
              <div id="municipal-explanation" tabIndex={-1} className="scroll-mt-32 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60"><MunicipalityExplanationPanel data={withoutForecastWhenEmpty(data)} /></div>
             <div id="municipal-coverage" tabIndex={-1} className="scroll-mt-32 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60"><InstitutionalCoveragePanel data={data} /></div>
           {data && data.coverageGaps?.length ? <section aria-label="Brechas de cobertura local" className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-200/10 p-4 text-sm text-amber-100"><strong>Brechas de cobertura local:</strong> {data.coverageGaps.join(' · ')}</section> : null}

            <section id="municipal-mappings" tabIndex={-1} aria-labelledby="mappings-heading" className="mt-10 scroll-mt-32 rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60">
            <h2 id="mappings-heading" className="text-2xl font-black">Mapeos de estaciones</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-stone-400">PNA principal</dt><dd className="font-black">PNA principal: {data?.gaugeMappings.primaryPnaPortId ?? 'Sin mapeo'}</dd></div>
              <div><dt className="text-stone-400">PNA secundarios</dt><dd className="font-black">{data?.gaugeMappings.secondaryPnaPortIds.join(', ') || 'Sin mapeo'}</dd></div>
              <div><dt className="text-stone-400">INA</dt><dd className="font-black">{data?.gaugeMappings.inaStationIds.join(', ') || 'Sin mapeo'}</dd></div>
              <div><dt className="text-stone-400">SMN</dt><dd className="font-black">{data?.gaugeMappings.smnRegionIds.join(', ') || 'Sin mapeo'}</dd></div>
              <div><dt className="text-stone-400">INMET</dt><dd className="font-black">{data?.gaugeMappings.inmetStationIds.join(', ') || 'Sin mapeo'}</dd></div>
            </dl>
          </section>

            <section id="municipal-alerts" tabIndex={-1} aria-labelledby="alerts-heading" className="mt-10 scroll-mt-32 rounded-[2rem] border border-amber-200/20 bg-amber-200/10 p-4 shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60 sm:p-6">
            <h2 id="alerts-heading" className="text-2xl font-black">Alertas oficiales</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(data?.municipality.officialAlerts ?? []).map((alert) => (<article key={`${alert.source}-${alert.coverageKey}-${alert.observedAt}`} className="rounded-2xl bg-stone-900/80 p-4"><h3 className="font-black">{`${alert.source} · ${alert.coverageKey}`}</h3><p className="mt-2 text-stone-200">{alert.message}</p><p className="mt-2 text-sm text-amber-100"><span>{`Cobertura ${alert.coverageKey}`}</span><span> · </span><span>{statusLabel(alert.freshness)}</span></p><p className="mt-2 text-sm text-amber-100">{formatOfficialTime(alert.lastSuccessfulObservedAt || alert.observedAt)}{alert.sourceUrl ? <> · <a className="underline underline-offset-2" href={alert.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial</a></> : null}</p></article>))}
              {data && data.municipality.officialAlerts.length === 0 ? <p className="text-stone-300"><span>Sin alertas oficiales recientes</span><span>.</span></p> : null}
            </div>
          </section>

            <section id="municipal-forecast" tabIndex={-1} role="region" aria-labelledby="ina-heading" className="mt-10 scroll-mt-32 rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60 sm:p-6">
            <h2 id="ina-heading" className="text-2xl font-black">Predicción INA a 30 días</h2>
            {data && data.inaPredictions30d.length === 0 ? <div role="status" className="mt-5 rounded-2xl border border-amber-200/40 bg-amber-200/15 p-5 text-amber-50"><strong className="text-lg">No hay pronóstico INA disponible</strong><p className="mt-2 text-sm">No se presenta planificación ni una tendencia como pronóstico hasta contar con filas verificables.</p></div> : <>
              <div className="mt-5 overflow-x-auto">
                <table aria-label="Predicción INA a 30 días" className="w-full min-w-[620px] border-separate border-spacing-y-2 text-left">
                  <thead><tr className="text-sm uppercase tracking-[0.2em] text-stone-400"><th className="px-4 py-2">Horizonte</th><th className="px-4 py-2">Estación</th><th className="px-4 py-2">Altura</th><th className="px-4 py-2">Confianza</th><th className="px-4 py-2">Observado</th></tr></thead>
                   <tbody>{(data?.inaPredictions30d ?? []).map((row) => (<tr key={`${row.stationId}-${row.forecastHorizonDays}-${row.observedAt}`} className="rounded-2xl bg-stone-900/80"><td className="px-4 py-3 font-black">Día {row.forecastHorizonDays ?? '—'}</td><td className="px-4 py-3">{row.stationId}</td><td className="px-4 py-3 tabular-nums">{row.value ?? '—'} {row.unit}</td><td className="px-4 py-3">{row.confidence === 'speculative' ? 'tendencia' : 'normal'}</td><td className="px-4 py-3">{formatOfficialTime(row.observedAt).replace('Último dato obtenido: ', '')}{row.sourceUrl ? <> · <a className="underline" href={row.sourceUrl} target="_blank" rel="noreferrer">Fuente</a></> : null}</td></tr>))}</tbody>
                </table>
               </div>
               <p className="mt-3 text-sm text-amber-100">Días 15–30: planificación especulativa o de baja confianza.</p>
            </>}
          </section>

              <section id="municipal-provenance" tabIndex={-1} aria-labelledby="provenance-heading" className="mt-10 scroll-mt-32 grid gap-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5"><h2 id="provenance-heading" className="text-2xl font-black">Procedencia oficial</h2><div className="mt-5 space-y-3">{(data?.provenance ?? []).map((item) => (<article key={`${item.source}-${item.lastSuccessfulObservedAt ?? 'missing'}`} className="rounded-2xl bg-stone-900/80 p-4"><h3 className="font-black">{item.source}</h3><p className="text-sm text-stone-300">Estado: {statusLabel(provenanceDisplayFreshness(data, item))}</p><p className="mt-2 text-sm text-stone-300">{item.label || formatOfficialTime(item.lastSuccessfulObservedAt)}</p></article>))}{data && data.provenance.length === 0 ? <p className="rounded-2xl border border-amber-200/20 bg-amber-200/10 p-4 text-sm text-amber-100">Procedencia no disponible para este municipio.</p> : null}</div></div>
              <CopilotPanel view={chatView} message={message} messageError={messageError} inputRef={messageInputRef} onMessageChange={(value) => { setMessage(value); setMessageError(null) }} onSubmit={submitChat} onRetry={canRetryCopilot && lastMessage ? () => requestCopilot(lastMessage) : undefined} />
          </section>
        </div>
      </section>
    </main>
  )
}

function MunicipalityOperatorSummaryPanel({ summary }: { summary: MunicipalityOperatorSummary }) {
  return <section className="mt-8 rounded-[2rem] border border-lime-200/25 bg-lime-200/10 p-5 shadow-2xl" aria-label="Resumen operativo municipal">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-100">Lectura para operación</p><h2 className="mt-2 text-2xl font-black">Resumen operativo</h2></div>
      <span className="rounded-full border border-lime-100/40 px-3 py-1 text-sm font-black text-lime-50">{summary.status}</span>
    </div>
    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl bg-stone-950/40 p-3"><dt className="text-lime-100/75">Estado:</dt><dd className="mt-1 font-black">{summary.status}</dd></div>
      <div className="rounded-2xl bg-stone-950/40 p-3"><dt className="text-lime-100/75">Frescura:</dt><dd className="mt-1 font-black">{summary.freshness}</dd></div>
      <div className="rounded-2xl bg-stone-950/40 p-3"><dt className="text-lime-100/75">Umbral:</dt><dd className="mt-1 font-black">{summary.threshold}</dd></div>
      <div className="rounded-2xl bg-stone-950/40 p-3"><dt className="text-lime-100/75">Confianza:</dt><dd className="mt-1 font-black">{summary.confidence}</dd></div>
    </dl>
    <p className="mt-4 rounded-2xl border border-lime-100/20 bg-stone-950/30 p-4 text-sm text-lime-50"><strong>Próxima acción segura:</strong> {summary.nextSafeAction}</p>
  </section>
}

function MunicipalityStickySummaryPanel({ summary }: { summary: MunicipalityOperatorSummary }) {
  return <section aria-label="Estado resumido municipal" className="sticky top-2 z-20 mt-4 max-w-full min-w-0 overflow-hidden rounded-2xl border border-lime-100/25 bg-stone-900/95 p-3 shadow-xl backdrop-blur sm:p-4">
    <dl className="grid min-w-0 grid-cols-2 gap-2 text-xs sm:grid-cols-6 sm:gap-3">
      <div className="min-w-0 rounded-xl bg-stone-950/60 p-2 sm:col-span-1 sm:p-3"><dt className="text-lime-100/75">Estado:</dt><dd className="mt-1 break-words font-black">{summary.status}</dd></div>
      <div className="min-w-0 rounded-xl bg-stone-950/60 p-2 sm:col-span-1 sm:p-3"><dt className="text-lime-100/75">Frescura:</dt><dd className="mt-1 break-words font-black">{summary.freshness}</dd></div>
      <div className="min-w-0 rounded-xl bg-stone-950/60 p-2 sm:col-span-1 sm:p-3"><dt className="text-lime-100/75">Umbral:</dt><dd className="mt-1 break-words font-black">{summary.threshold}</dd></div>
      <div className="min-w-0 rounded-xl bg-stone-950/60 p-2 sm:col-span-1 sm:p-3"><dt className="text-lime-100/75">Confianza:</dt><dd className="mt-1 break-words font-black">{summary.confidence}</dd></div>
      <div className="col-span-2 min-w-0 rounded-xl border border-lime-100/15 bg-lime-100/10 p-2 text-lime-50 sm:col-span-2 sm:p-3"><dt className="text-lime-100/75">Próxima acción segura:</dt><dd className="mt-1 break-words font-black">{summary.nextSafeAction}</dd></div>
    </dl>
  </section>
}

function MunicipalitySectionIndex() {
  return <nav aria-label="Índice del tablero municipal" className="mt-6 rounded-2xl border border-lime-200/20 bg-stone-950/50 p-4">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-100">Índice rápido</p>
    <ul className="mt-3 flex flex-wrap gap-2">
      {MUNICIPALITY_DETAIL_INDEX_ITEMS.map((item) => <li key={item.href} className="min-w-0 max-w-full"><a href={item.href} className="inline-flex max-w-full whitespace-normal break-words rounded-full border border-white/20 px-3 py-2 text-sm font-bold text-stone-100 transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200">{item.label}</a></li>)}
    </ul>
  </nav>
}

function InstitutionalCoveragePanel({ data }: { data: DashboardPayload | null }) {
  const status = data?.municipality.coverageStatus ?? 'unavailable'
  const geometryLabel = data?.municipality.geometryStatus === 'verified' ? 'Geometría verificada: solo indica una referencia revisada; no implica impacto hidráulico.' : data?.municipality.geometryStatus === 'partial' ? 'Geometría parcial: faltan referencias revisadas y no se publica un límite.' : data?.municipality.geometryStatus === 'unverified' ? 'Geometría no verificada: no se publica un polígono oficial.' : 'Geometría no disponible: no se publica un polígono oficial.'
  return <section className="mt-10 rounded-[2rem] border border-teal-200/20 bg-teal-200/10 p-5" aria-label="Gobernanza de cobertura"><h2 className="text-2xl font-black">Gobernanza de cobertura</h2><p className="mt-2 text-sm text-stone-200">Cobertura {status === 'partial' ? 'parcial' : status === 'supported' ? 'soportada' : 'no disponible'}.</p><p className="mt-2 text-sm text-stone-200">Las asociaciones describen fuentes, no influencia ni impacto.</p><p className="mt-2 text-sm text-amber-100">{geometryLabel}</p><div className="mt-4 space-y-2">{(data?.municipality.sourceRegistry ?? []).map((item) => <article key={`${item.source}-${item.stationId ?? item.coverageKey ?? 'unmapped'}`} className="rounded-2xl bg-stone-950/50 p-3 text-sm text-stone-200"><p className="font-black">{item.source} · {item.stationId ?? 'sin estación'}</p><p>Cobertura: {item.coverageKey ?? 'sin clave'} · frescura: {item.freshnessPolicy} · versión: {item.registryVersion} · {item.reviewStatus}</p><p>Revisado: {formatRegistryTime(item.reviewedAt)}</p><a className="underline underline-offset-2" href={item.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial</a></article>)}</div>{data && data.municipality.sourceRegistry?.length === 0 ? <p className="mt-4 text-sm text-amber-100">Registro de fuentes no disponible.</p> : null}</section>
}

function MunicipalityExplanationPanel({ data }: { data: DashboardPayload | null }) {
  return <section className="mt-10 rounded-[2rem] border border-lime-200/20 bg-lime-200/10 p-5" aria-label="Explicación municipal"><h2 className="text-2xl font-black">Explicación verificable</h2>{data?.explanation ? <><p className="mt-2 text-sm text-lime-100">Relación: {data.explanation.relationLabel}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-stone-300">Umbral de alerta</dt><dd className="font-black">{data.explanation.threshold.alertHeightM ?? '—'} m</dd></div><div><dt className="text-stone-300">Umbral de evacuación</dt><dd className="font-black">{data.explanation.threshold.evacuationHeightM ?? '—'} m</dd></div><div><dt className="text-stone-300">Comparación</dt><dd className="font-black">{data.explanation.observed.comparison}</dd></div><div><dt className="text-stone-300">Tendencia</dt><dd className="font-black">{data.explanation.tendency.value ?? 'Sin dato'} · {data.explanation.tendency.window}</dd></div><div><dt className="text-stone-300">Pronóstico</dt><dd className="font-black">{data.explanation.forecast ? `${data.explanation.forecast.horizonDays} días · ${data.explanation.forecast.label}` : 'No disponible'}</dd></div></dl><p className="mt-3 text-xs text-stone-300">Fuente observada: {data.explanation.observed.source ?? 'No disponible'} · {data.explanation.observed.sourceUrl ? <a className="underline" href={data.explanation.observed.sourceUrl} target="_blank" rel="noreferrer">URL oficial</a> : 'URL no disponible'} · observado: {formatRegistryTime(data.explanation.observed.observedAt)} · frescura: {data.explanation.observed.freshness ?? 'No disponible'}</p>{data.explanation.forecast ? <p className="mt-2 text-xs text-stone-300">Fuente del pronóstico: {data.explanation.forecast.source} · {data.explanation.forecast.sourceUrl ? <a className="underline" href={data.explanation.forecast.sourceUrl} target="_blank" rel="noreferrer">{data.explanation.forecast.sourceUrl}</a> : 'URL no disponible'} · observado: {data.explanation.forecast.observedAt} · confianza: {data.explanation.forecast.confidence}</p> : null}</> : <p className="mt-3 text-stone-300">Explicación no disponible sin evidencia oficial suficiente.</p>}<h3 className="mt-5 text-lg font-black">Línea de evidencia</h3>{data?.timeline?.events.length ? <ol className="mt-3 space-y-3 border-l border-lime-200/30 pl-4">{data.timeline.events.map((event) => <li key={event.id}><p className="text-xs uppercase tracking-wide text-lime-200">{event.occurredAt} · {event.source} · {event.evidenceState}</p><p className="font-bold">{event.title}</p><p className="text-sm text-stone-300">{event.detail}</p></li>)}</ol> : <p className="mt-3 text-sm text-stone-300">Sin eventos municipales persistidos para mostrar.</p>}</section>
}

function CopilotPanel(props: { message: string; messageError: string | null; inputRef: React.RefObject<HTMLInputElement>; view: ReturnType<typeof createChatViewModelFromStream>; onMessageChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onRetry?: () => void }) {
  return (
    <section aria-labelledby="copilot-heading" className="rounded-[2rem] border border-teal-200/20 bg-teal-200/10 p-5 shadow-2xl">
      <div className="flex items-center gap-3"><Bot className="text-teal-100" aria-hidden="true" /><div><h2 id="copilot-heading" className="text-2xl font-black">Copilot Advisor</h2><p className="text-sm text-teal-50/80">Consultas de apoyo con fuentes observadas y pronosticadas oficiales.</p></div></div>
        <div aria-live="polite" aria-busy={props.view.status === 'streaming' ? 'true' : undefined} className="mt-5 min-h-28 rounded-3xl bg-stone-950/70 p-4 text-sm text-stone-100">
         <p className="font-bold uppercase tracking-wide text-lime-200">Estado: {chatStatusLabel(props.view.status)}</p>
           {!props.messageError ? <CopilotStatus outcome={props.view.outcome} citationUnavailable={props.view.citationUnavailable ?? true} actionable={props.view.actionable ?? false} retryAfterMs={props.view.retryAfterMs} unverifiedClaims={props.view.unverifiedClaims ?? false} onRetry={props.view.retryable ? props.onRetry : undefined} /> : null}
          <p className="mt-3">{props.view.answer || 'El stream todavía no entregó tokens.'}</p>
          {props.view.error && (!props.view.citationUnavailable || Boolean(props.view.answer.trim())) ? <p role="alert" aria-live="assertive" aria-atomic="true" className="mt-3 rounded-2xl bg-red-950/70 p-3 text-red-100">{props.view.error}</p> : null}
          {props.view.citationUnavailable ? <p role="status" className="mt-3 rounded-2xl border border-amber-200/30 bg-amber-200/10 p-3 text-amber-100">{props.view.unavailableReason ?? 'Citación no disponible: la respuesta no tiene una referencia oficial verificable.'}</p> : null}
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
         <p><strong>Fuentes:</strong> {props.view.sources.join(' · ') || 'No provistas'}</p>
         <p><strong>Límites:</strong> {props.view.limits.join(' · ') || 'No provistos por el endpoint'}</p>
           <p><strong>Última actualización del Copilot:</strong> {formatOfficialTime(chatTimestamp(props.view)).replace('Último dato obtenido: ', '')}</p>
          <p><strong>Metadata:</strong> {Object.keys(props.view.metadata).length ? JSON.stringify(props.view.metadata) : 'No provista'}</p>
          <p><strong>Citación:</strong> {props.view.citationUnavailable ? 'No disponible' : props.view.citationMode === 'validated-context' ? `${props.view.citations.length} referencia(s) verificadas` : 'Contexto sin referencias verificadas'}</p>
          {props.view.citations.length ? <ul className="sm:col-span-2" aria-label="Referencias verificadas">{props.view.citations.map((citation) => <li key={citation}>{citation}</li>)}</ul> : null}
       </div>
       {props.view.retryable && props.onRetry ? <button type="button" onClick={props.onRetry} className="mt-4 rounded-full border border-lime-200 px-4 py-2 text-sm font-bold text-lime-100 hover:bg-lime-200/10 focus-visible:ring-4 focus-visible:ring-lime-100">Reintentar consulta</button> : null}
      <form onSubmit={props.onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="government-copilot-message">Consulta para Copilot Advisor</label>
           <input ref={props.inputRef} id="government-copilot-message" name="governmentMessage" autoComplete="off" aria-invalid={props.messageError ? 'true' : undefined} aria-describedby={props.messageError ? 'government-copilot-message-error' : undefined} value={props.message} onChange={(event) => props.onMessageChange(event.target.value)} onInput={(event) => props.onMessageChange(event.currentTarget.value)} placeholder="Ej.: resumí el estado oficial de Ituzaingó…" className="min-w-0 flex-1 rounded-full border border-white/10 bg-white px-4 py-3 text-stone-950 placeholder:text-stone-500 focus-visible:ring-4 focus-visible:ring-teal-200" />
          {props.messageError ? <p id="government-copilot-message-error" role="alert" aria-live="assertive" aria-atomic="true" className="basis-full rounded-2xl bg-red-950/70 p-3 text-red-100">{props.messageError}</p> : null}
        <button type="submit" disabled={props.view.status === 'streaming'} className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-200 px-5 py-3 font-black text-stone-950 transition-colors duration-200 hover:bg-lime-100 focus-visible:ring-4 focus-visible:ring-lime-100 disabled:cursor-not-allowed disabled:opacity-60"><Send size={18} aria-hidden="true" /> {props.view.status === 'streaming' ? 'Enviando…' : 'Enviar Consulta'}</button>
      </form>
    </section>
  )
}

function withoutForecastWhenEmpty(data: DashboardPayload | null): DashboardPayload | null {
  if (!data || data.inaPredictions30d.length > 0 || !data.explanation?.forecast) return data
  return { ...data, explanation: { ...data.explanation, forecast: null } }
}

function provenanceEvidenceState(data: DashboardPayload | null, degraded: Provenance | undefined) {
  const provenance = data?.provenance ?? []
  const hasFreshConflict = provenance.some((item) => item.freshness === 'fresh' && data?.telemetryCards.some((card) => card.source === item.source && (card.value == null || card.freshness === 'missing')))
  if (hasFreshConflict) return EVIDENCE_STATE.MISSING
  if (degraded) return EVIDENCE_STATE.DEGRADED
  if (!provenance.length || !data?.telemetryCards.some((card) => card.value != null && card.freshness !== 'missing')) return EVIDENCE_STATE.MISSING
  return EVIDENCE_STATE.OBSERVED
}

function provenanceDisplayFreshness(data: DashboardPayload | null, item: Provenance) {
  const telemetryConflict = data?.telemetryCards.some((card) => card.source === item.source && (card.value == null || card.freshness === 'missing')) === true
  return telemetryConflict ? 'missing' : item.freshness
}

function MunicipalEvidenceStatePanel({ data }: { data: DashboardPayload | null }) {
  const telemetry = data?.telemetryCards[0]
  const forecast = data?.inaPredictions30d[0]
  const missing = data?.telemetryCards.find((item) => item.value == null || item.freshness === 'missing')
  const degraded = data?.provenance.find((item) => item.freshness !== 'fresh')
  const items = [
    { label: 'Telemetría PNA', evidence: normalizeEvidence({ state: telemetry?.forecastHorizonDays != null ? EVIDENCE_STATE.FORECAST : telemetry?.freshness === 'stale' ? EVIDENCE_STATE.STALE : telemetry?.freshness === 'degraded' ? EVIDENCE_STATE.DEGRADED : telemetry?.value != null ? EVIDENCE_STATE.OBSERVED : EVIDENCE_STATE.MISSING, source: telemetry?.source, observedAt: telemetry?.observedAt, lastSuccessfulObservedAt: telemetry?.lastSuccessfulObservedAt }) },
    { label: 'INA', evidence: normalizeEvidence({ source: forecast?.source, observedAt: forecast?.observedAt, forecast: true }) },
    { label: 'Missing telemetry', evidence: normalizeEvidence({ state: EVIDENCE_STATE.MISSING, source: missing?.source, detail: 'No verified telemetry returned for this metric.' }) },
    { label: 'Source provenance', evidence: normalizeEvidence({ state: provenanceEvidenceState(data, degraded), source: degraded?.source ?? data?.provenance[0]?.source, lastSuccessfulObservedAt: degraded?.lastSuccessfulObservedAt ?? data?.provenance[0]?.lastSuccessfulObservedAt }) },
  ]

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.07] p-5" aria-label="Estados de evidencia municipal">
      <h2 className="text-xl font-black">Estados de evidencia municipal</h2>
      <p className="mt-2 text-sm text-stone-300">La telemetría, INA, procedencia y ausencia de datos se muestran sin convertir mapeos en impacto hidráulico.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => <li key={item.label} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-stone-950/50 p-3"><span className="text-sm font-semibold">{item.label}</span><EvidenceStateBadge state={item.evidence.state} /></li>)}
      </ul>
    </section>
  )
}

function telemetryMode(card: TelemetryCard) {
  if (card.forecastHorizonDays != null) return 'Pronóstico'
  if (card.freshness === 'missing' || card.value == null) return 'Sin datos'
  if (card.freshness === 'degraded' || card.freshness === 'stale') return 'Degradado'
  return 'Observado'
}

function formatTelemetryTime(card: TelemetryCard) {
  const formatted = formatOfficialTime(card.lastSuccessfulObservedAt ?? card.observedAt)
  return card.source === 'INA' ? formatted.replace('Último dato obtenido: ', 'Último dato INA: ') : formatted
}

function chatStatusLabel(status: ChatStreamState['status']) {
  return { idle: 'Listo', streaming: 'Recibiendo tokens', done: 'Completado', partial: 'Parcial · tokens conservados', error: 'Error · reintentable', degraded: 'Degradado' }[status]
}

class DashboardRequestError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message)
    this.name = 'DashboardRequestError'
  }
}

function isDashboardPayload(value: unknown): value is DashboardPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<DashboardPayload>
  return Boolean(
    payload.municipality &&
    payload.gaugeMappings &&
    Array.isArray(payload.telemetryCards) &&
    Array.isArray(payload.inaPredictions30d) &&
    Array.isArray(payload.alerts) &&
    Array.isArray(payload.provenance),
  )
}

class CopilotRequestError extends Error {
  constructor(message: string, public readonly retryable: boolean, public readonly httpStatus: number) {
    super(message)
    this.name = 'CopilotRequestError'
  }
}

function dashboardErrorForStatus(status: number) {
  if (status === 401) return 'No estás autorizado para consultar este tablero.'
  if (status === 403) return 'No tenés permisos para consultar este tablero.'
  if (status === 404) return 'No se encontró el municipio solicitado.'
  if (status >= 500) return 'El tablero municipal no está disponible. Intentá nuevamente más tarde.'
  return 'No se pudo cargar el tablero local. Verificá la conectividad con la API oficial.'
}

function dashboardRetryableForStatus(status: number) {
  return status === 429 || status >= 500
}

function copilotErrorForStatus(status: number) {
  if (status === 401) return 'No estás autorizado para consultar Copilot Advisor.'
  if (status === 403) return 'No tenés permisos para consultar Copilot Advisor.'
  if (status === 429) return 'Copilot Advisor está temporalmente limitado. Intentá nuevamente más tarde.'
  if (status >= 500) return 'Copilot Advisor no está disponible. Intentá nuevamente más tarde.'
  return 'No se pudo completar la consulta de Copilot Advisor.'
}

function copilotRetryableForStatus(status: number) {
  return status === 429 || status >= 500
}

function chatTimestamp(view: ReturnType<typeof createChatViewModelFromStream>) {
  for (const key of ['observedAt', 'lastSuccessfulObservedAt', 'receivedAt']) {
    const value = view.metadata[key]
    if (typeof value === 'string') return value
  }
  return view.receivedAt ?? null
}

function formatRegistryTime(value?: string | null) {
  if (!value) return 'No disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No disponible'
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(date)
}

export function parseSseData(value: string) {
  const parsed = safeJson(value)
  if (typeof parsed === 'string') return parsed
  if (parsed && typeof parsed === 'object' && 'text' in parsed && typeof parsed.text === 'string') return parsed.text
  return null
}

function safeJson(value: string | undefined): unknown {
  if (!value) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}
