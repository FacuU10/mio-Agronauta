'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Clock3, MapPinned, ShieldCheck } from 'lucide-react'
import { formatOfficialTime, riskLabel, statusLabel } from './format'

type Freshness = { source: string; status: string; lastSuccessfulObservedAt: string | null; errorMessage?: string }
type Municipality = {
  id: string
  localityId: string
  name: string
  riskLevel: string
  localizedWarning: string
  latest: { pnaHeightM?: number; rainMm?: number; stormSeverity?: number; lastSuccessfulObservedAt: string | null }
}
type OverviewPayload = {
  province: { code: string; name: string }
  lastSuccessfulObservedAt: string | null
  sourceFreshness: Freshness[]
  provinceAlerts: Array<{ severity: string; title: string; source: string; observedAt: string; localizedWarning: string }>
  municipalities: Municipality[]
}

export function GovernmentOverview() {
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/hydrology/municipalities')
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar el monitoreo provincial')
        return response.json() as Promise<OverviewPayload>
      })
      .then((payload) => active && setData(payload))
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : 'Error de carga'))
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-50">
      <a href="#municipalities-list" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-amber-300 focus:px-4 focus:py-2 focus:text-slate-950">Saltar al listado</a>
      <section className="relative isolate px-5 py-8 sm:px-8 lg:px-12">
        <div className="gov-overview-bg absolute inset-0 -z-10" />
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">Defensa Civil · {data?.province.name ?? 'Corrientes'}</p>
              <h1 className="mt-5 max-w-4xl text-balance text-4xl font-black tracking-tight text-white sm:text-6xl">Centro de Monitoreo Hídrico Provincial</h1>
              <p className="mt-4 max-w-2xl text-pretty text-lg text-slate-300">Jerarquía oficial por municipios, señales observadas y pronósticos INA de apoyo operativo. Sin cálculos fuera de fuentes oficiales.</p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3 text-amber-200"><ShieldCheck aria-hidden="true" /><span className="font-semibold">Estado provincial consolidado</span></div>
              <p className="mt-4 text-3xl font-black">{data ? `${data.municipalities.length} localidades` : 'Cargando…'}</p>
              <p className="mt-2 text-sm text-slate-300">{formatOfficialTime(data?.lastSuccessfulObservedAt)}</p>
            </div>
          </div>

          {error ? <div role="alert" className="mt-8 rounded-3xl border border-red-300/40 bg-red-950/60 p-5 text-red-100">{error}. Reintentá desde la red oficial.</div> : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(data?.sourceFreshness ?? []).map((source) => (
              <article key={source.source} className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">{source.source}</h2><span className="rounded-full bg-teal-300/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-100">{statusLabel(source.status)}</span></div>
                <p className="mt-4 text-sm text-slate-300">{formatOfficialTime(source.lastSuccessfulObservedAt)}</p>
                {source.errorMessage ? <p role="status" className="mt-3 rounded-2xl bg-amber-300/10 p-3 text-sm text-amber-100">{source.errorMessage}</p> : null}
              </article>
            ))}
          </div>

          <section aria-labelledby="province-alerts" className="mt-8 grid gap-4 lg:grid-cols-2">
            {(data?.provinceAlerts ?? []).map((alert) => (
              <article key={`${alert.source}-${alert.title}`} className="rounded-[2rem] border border-amber-300/30 bg-amber-300/10 p-5 shadow-2xl">
                <div className="flex items-start gap-3"><AlertTriangle className="mt-1 text-amber-200" aria-hidden="true" /><div><h2 id="province-alerts" className="text-xl font-black">{alert.title}</h2><p className="mt-2 text-slate-200">{alert.localizedWarning}</p><p className="mt-3 text-sm text-amber-100">Fuente {alert.source} · {formatOfficialTime(alert.observedAt)}</p></div></div>
              </article>
            ))}
          </section>

          <section id="municipalities-list" aria-labelledby="municipalities-heading" className="mt-10">
            <h2 id="municipalities-heading" className="text-2xl font-black">Localidades bajo monitoreo</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(data?.municipalities ?? []).map((municipality) => (
                <article key={municipality.id} className="group rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><p className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-teal-200"><MapPinned size={16} aria-hidden="true" />{municipality.localityId}</p><h3 className="mt-2 text-2xl font-black text-white">{municipality.name}</h3></div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-950">{riskLabel(municipality.riskLevel)}</span>
                  </div>
                  <p className="mt-4 text-slate-300">{municipality.localizedWarning}</p>
                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/5 p-3"><dt className="text-slate-400">PNA</dt><dd className="font-black text-white">{municipality.latest.pnaHeightM ?? '—'} m</dd></div>
                    <div className="rounded-2xl bg-white/5 p-3"><dt className="text-slate-400">Lluvia</dt><dd className="font-black text-white">{municipality.latest.rainMm ?? '—'} mm</dd></div>
                  </dl>
                  <p className="mt-4 flex items-center gap-2 text-sm text-slate-300"><Clock3 size={16} aria-hidden="true" />{formatOfficialTime(municipality.latest.lastSuccessfulObservedAt)}</p>
                  <Link href={`/municipalities/${municipality.id}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 font-black text-slate-950 transition-colors duration-200 hover:bg-amber-200 focus-visible:ring-4 focus-visible:ring-amber-100">Abrir tablero de {municipality.name}<ArrowUpRight size={18} aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
