'use client'

import Link from 'next/link'
import React from 'react'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Bot, DatabaseZap, Send, ShieldAlert } from 'lucide-react'
import { formatOfficialTime, statusLabel } from './format'

type TelemetryCard = { source: string; stationId: string; metric: string; value: number | null; unit: string; observedAt?: string | null; lastSuccessfulObservedAt?: string | null; label: string }
type ForecastRow = TelemetryCard & { forecastHorizonDays?: number | null; confidence?: string | null; sourceUrl?: string | null }
type Provenance = { source: string; freshness: string; label: string; lastSuccessfulObservedAt: string | null }
type OfficialAlert = { source: 'SMN' | 'INMET'; coverageKey: string; message: string; observedAt: string; lastSuccessfulObservedAt: string; freshness: 'fresh' | 'degraded'; sourceUrl?: string }
type DashboardPayload = {
  municipality: { id: string; localityId: string; name: string; alertHeightM?: number; evacuationHeightM?: number; officialAlerts: OfficialAlert[] }
  telemetryCards: TelemetryCard[]
  inaPredictions30d: ForecastRow[]
  alerts: TelemetryCard[]
  provenance: Provenance[]
}

export function GovernmentDetail({ municipalityId, initialData = null }: { municipalityId: string; initialData?: DashboardPayload | null }) {
  const [data, setData] = useState<DashboardPayload | null>(initialData)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [chatStatus, setChatStatus] = useState('Listo para recibir consultas oficiales')

  useEffect(() => {
    let active = true
    if (initialData) return () => { active = false }
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
  }, [municipalityId, initialData])

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
    const tokens = text.split('\n').filter((line) => line.startsWith('data:')).map((line) => parseSseData(line.slice(5).trim())).filter(Boolean)
    setAnswer(tokens.join('') || 'Sin tokens recibidos desde el asesor.')
    setChatStatus('Respuesta generada con contexto municipal')
    setMessage('')
  }

  const degraded = data?.provenance.some((item) => item.freshness !== 'fresh')

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
              {data && data.telemetryCards.length === 0 ? <p className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 text-stone-300">Sin telemetría oficial reciente para este municipio.</p> : null}
            </div>
          </section>

          <section aria-labelledby="alerts-heading" className="mt-10 rounded-[2rem] border border-amber-200/20 bg-amber-200/10 p-4 shadow-2xl sm:p-6">
            <h2 id="alerts-heading" className="text-2xl font-black">Alertas oficiales</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(data?.municipality.officialAlerts ?? []).map((alert) => (<article key={`${alert.source}-${alert.coverageKey}-${alert.observedAt}`} className="rounded-2xl bg-stone-900/80 p-4"><h3 className="font-black">{`${alert.source} · ${alert.coverageKey}`}</h3><p className="mt-2 text-stone-200">{alert.message}</p><p className="mt-2 text-sm text-amber-100"><span>{`Cobertura ${alert.coverageKey}`}</span><span> · </span><span>{statusLabel(alert.freshness)}</span></p><p className="mt-2 text-sm text-amber-100">{formatOfficialTime(alert.lastSuccessfulObservedAt || alert.observedAt)}{alert.sourceUrl ? <> · <a className="underline underline-offset-2" href={alert.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial</a></> : null}</p></article>))}
              {data && data.municipality.officialAlerts.length === 0 ? <p className="text-stone-300"><span>Sin alertas oficiales recientes</span><span>.</span></p> : null}
            </div>
          </section>

          <section aria-labelledby="ina-heading" className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl sm:p-6">
            <h2 id="ina-heading" className="text-2xl font-black">Predicción INA a 30 días</h2>
            <div className="mt-5 overflow-x-auto">
              <table aria-label="Predicción INA a 30 días" className="w-full min-w-[620px] border-separate border-spacing-y-2 text-left">
                <thead><tr className="text-sm uppercase tracking-[0.2em] text-stone-400"><th className="px-4 py-2">Horizonte</th><th className="px-4 py-2">Estación</th><th className="px-4 py-2">Altura</th><th className="px-4 py-2">Confianza</th><th className="px-4 py-2">Observado</th></tr></thead>
                <tbody>{(data?.inaPredictions30d ?? []).map((row) => (<tr key={`${row.stationId}-${row.forecastHorizonDays}-${row.observedAt}`} className="rounded-2xl bg-stone-900/80"><td className="px-4 py-3 font-black">Día {row.forecastHorizonDays ?? '—'}</td><td className="px-4 py-3">{row.stationId}</td><td className="px-4 py-3 tabular-nums">{row.value ?? '—'} {row.unit}</td><td className="px-4 py-3">{row.confidence === 'speculative' ? 'tendencia' : 'normal'}</td><td className="px-4 py-3">{formatOfficialTime(row.observedAt).replace('Último dato obtenido: ', '')}</td></tr>))}</tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="provenance-heading" className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5"><h2 id="provenance-heading" className="text-2xl font-black">Procedencia oficial</h2><div className="mt-5 space-y-3">{(data?.provenance ?? []).map((item) => (<article key={`${item.source}-${item.lastSuccessfulObservedAt ?? 'missing'}`} className="rounded-2xl bg-stone-900/80 p-4"><h3 className="font-black">{item.source}</h3><p className="text-sm text-stone-300">Estado: {statusLabel(item.freshness)}</p><p className="mt-2 text-sm text-stone-300">{item.label || formatOfficialTime(item.lastSuccessfulObservedAt)}</p></article>))}</div></div>
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
