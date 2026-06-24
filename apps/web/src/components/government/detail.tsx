'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Bot, DatabaseZap, Send, ShieldAlert } from 'lucide-react'
import { formatOfficialTime, statusLabel } from './format'

type TelemetryCard = { source: string; stationId: string; metric: string; value: number | null; unit: string; observedAt?: string | null; lastSuccessfulObservedAt?: string | null; label: string }
type ForecastRow = { stationId: string; horizonDays: number; forecastHeightM: number; observedAt: string; confidence: string }
type Provenance = { source: string; url?: string; lastRunStatus?: string; errorMessage?: string }
type DashboardPayload = {
  municipality: { id: string; localityId: string; name: string; alertHeightM?: number; evacuationHeightM?: number }
  telemetryCards: TelemetryCard[]
  inaForecast30Days: ForecastRow[]
  smn: { alerts: unknown[]; rainfall: unknown[]; freshness: string }
  inmet: { stations: unknown[]; rainfall: unknown[]; freshness: string }
  provenance: Provenance[]
}

export function GovernmentDetail({ municipalityId }: { municipalityId: string }) {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [chatStatus, setChatStatus] = useState('Listo para recibir consultas oficiales')

  useEffect(() => {
    let active = true
    fetch(`/api/hydrology/municipalities/${municipalityId}/dashboard`)
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar el tablero local')
        return response.json() as Promise<DashboardPayload>
      })
      .then((payload) => active && setData(payload))
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : 'Error de carga'))
    return () => {
      active = false
    }
  }, [municipalityId])

  async function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!message.trim()) return
    setAnswer('')
    setChatStatus('Consultando fuentes oficiales…')
    const response = await fetch(`/api/hydrology/municipalities/${municipalityId}/copilot/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contractVersion: '1.0.0', message }),
    })
    const text = await response.text()
    const tokens = Array.from(text.matchAll(/data:\s*(\{[^\n]+\})/g))
      .map((match) => safeJson(match[1]))
      .filter((eventData): eventData is { text: string } => Boolean(eventData?.text))
      .map((eventData) => eventData.text)
    setAnswer(tokens.join('') || 'Sin tokens recibidos desde el asesor.')
    setChatStatus('Respuesta generada con contexto municipal')
    setMessage('')
  }

  const degraded = data?.provenance.some((item) => item.lastRunStatus === 'degraded' || item.errorMessage)

  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <a href="#telemetry" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-lime-200 focus:px-4 focus:py-2 focus:text-stone-950">Saltar a telemetría</a>
      <section className="relative isolate px-5 py-8 sm:px-8 lg:px-12">
        <div className="gov-detail-bg absolute inset-0 -z-10" />
        <div className="mx-auto max-w-7xl">
          <Link href="/municipalities" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-stone-100 transition-colors duration-200 hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-lime-200"><ArrowLeft size={16} aria-hidden="true" /> Volver al mapa provincial</Link>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-lime-200">Tablero local · {data?.municipality.localityId ?? municipalityId}</p>
              <h1 className="mt-4 text-balance text-4xl font-black tracking-tight sm:text-6xl">{data?.municipality.name ?? 'Cargando municipio…'}</h1>
              <p className="mt-4 max-w-2xl text-pretty text-stone-300">Lectura ejecutiva de PNA, SMN, INMET e INA con procedencia oficial y continuidad operativa ante fuentes degradadas.</p>
            </div>
            <aside className="rounded-[2rem] border border-lime-200/20 bg-lime-200/10 p-5 shadow-2xl">
              <div className="flex items-center gap-3 text-lime-100"><ShieldAlert aria-hidden="true" /><h2 className="font-black">Tablero usable con fuentes degradadas</h2></div>
              <p className="mt-3 text-sm text-stone-300">{degraded ? 'Hay fuentes con estado degradado; se mantienen visibles los últimos datos oficiales.' : 'Todas las fuentes reportadas están disponibles.'}</p>
            </aside>
          </div>

          {error ? <div role="alert" className="mt-8 rounded-3xl border border-red-300/40 bg-red-950/70 p-5 text-red-100">{error}. Verificá conectividad con la API oficial.</div> : null}

          <section id="telemetry" aria-labelledby="telemetry-heading" className="mt-10">
            <h2 id="telemetry-heading" className="text-2xl font-black">Telemetría oficial</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(data?.telemetryCards ?? []).map((card) => (
                <article key={`${card.source}-${card.stationId}-${card.metric}`} className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-200">{card.source} · {card.stationId}</p><h3 className="mt-2 text-xl font-black">{card.label}</h3></div><DatabaseZap className="text-lime-200" aria-hidden="true" /></div>
                  <p className="mt-5 text-4xl font-black tabular-nums">{card.value ?? '—'} <span className="text-lg text-stone-300">{card.unit}</span></p>
                  <p className="mt-4 text-sm text-stone-300">{formatOfficialTime(card.lastSuccessfulObservedAt ?? card.observedAt)}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="ina-heading" className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl sm:p-6">
            <h2 id="ina-heading" className="text-2xl font-black">Predicción INA a 30 días</h2>
            <div className="mt-5 overflow-x-auto">
              <table aria-label="Predicción INA a 30 días" className="w-full min-w-[620px] border-separate border-spacing-y-2 text-left">
                <thead><tr className="text-sm uppercase tracking-[0.2em] text-stone-400"><th className="px-4 py-2">Horizonte</th><th className="px-4 py-2">Estación</th><th className="px-4 py-2">Altura</th><th className="px-4 py-2">Confianza</th><th className="px-4 py-2">Observado</th></tr></thead>
                <tbody>{(data?.inaForecast30Days ?? []).map((row) => (<tr key={`${row.stationId}-${row.horizonDays}`} className="rounded-2xl bg-stone-900/80"><td className="px-4 py-3 font-black">Día {row.horizonDays}</td><td className="px-4 py-3">{row.stationId}</td><td className="px-4 py-3 tabular-nums">{row.forecastHeightM} m</td><td className="px-4 py-3">{row.confidence === 'speculative' ? 'tendencia' : 'normal'}</td><td className="px-4 py-3">{formatOfficialTime(row.observedAt).replace('Último dato obtenido: ', '')}</td></tr>))}</tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="provenance-heading" className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5"><h2 id="provenance-heading" className="text-2xl font-black">Procedencia oficial</h2><div className="mt-5 space-y-3">{(data?.provenance ?? []).map((item) => (<article key={`${item.source}-${item.errorMessage ?? item.url ?? 'ok'}`} className="rounded-2xl bg-stone-900/80 p-4"><h3 className="font-black">{item.source}</h3><p className="text-sm text-stone-300">Estado: {statusLabel(item.lastRunStatus)}</p>{item.url ? <a href={item.url} className="break-words text-sm text-lime-200 underline decoration-lime-200/40 underline-offset-4">{item.url}</a> : null}{item.errorMessage ? <p role="status" className="mt-2 text-sm text-amber-100">{item.errorMessage}</p> : null}</article>))}</div></div>
            <CopilotPanel message={message} answer={answer} chatStatus={chatStatus} onMessageChange={setMessage} onSubmit={submitChat} />
          </section>
        </div>
      </section>
    </main>
  )
}

function CopilotPanel(props: { message: string; answer: string; chatStatus: string; onMessageChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <section aria-labelledby="copilot-heading" className="rounded-[2rem] border border-teal-200/20 bg-teal-200/10 p-5 shadow-2xl">
      <div className="flex items-center gap-3"><Bot className="text-teal-100" aria-hidden="true" /><div><h2 id="copilot-heading" className="text-2xl font-black">Copilot Advisor</h2><p className="text-sm text-teal-50/80">Consultas de apoyo con fuentes observadas y pronosticadas oficiales.</p></div></div>
      <div aria-live="polite" className="mt-5 min-h-28 rounded-3xl bg-stone-950/70 p-4 text-sm text-stone-100">{props.answer || props.chatStatus}</div>
      <form onSubmit={props.onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="government-copilot-message">Consulta para Copilot Advisor</label>
        <input id="government-copilot-message" name="government-copilot-message" autoComplete="off" value={props.message} onChange={(event) => props.onMessageChange(event.target.value)} placeholder="Ej.: resumí el estado oficial de Ituzaingó…" className="min-w-0 flex-1 rounded-full border border-white/10 bg-white px-4 py-3 text-stone-950 placeholder:text-stone-500 focus-visible:ring-4 focus-visible:ring-teal-200" />
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-200 px-5 py-3 font-black text-stone-950 transition-colors duration-200 hover:bg-lime-100 focus-visible:ring-4 focus-visible:ring-lime-100"><Send size={18} aria-hidden="true" /> Enviar Consulta</button>
      </form>
    </section>
  )
}

function safeJson(value: string | undefined) {
  if (!value) return null
  try {
    return JSON.parse(value) as { text?: string }
  } catch {
    return null
  }
}
