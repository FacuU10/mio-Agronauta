'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Clock3, MapPinned, ShieldCheck } from 'lucide-react'
import { formatOfficialTime, riskLabel, statusLabel } from './format'
import { municipalityTelemetrySummary, type OverviewTelemetry } from './overview-summary'
import { EvidenceStateBadge, MapFrame } from '@/components/visibility/primitives'
import { FutureCapabilities } from '@/components/visibility/future-capabilities'
import { EVIDENCE_STATE, normalizeEvidence } from '@/lib/visibility/evidence-state'


type Freshness = { source: string; status?: 'success' | 'empty' | 'failed'; freshness: string; label: string; lastSuccessfulObservedAt: string | null }
type Telemetry = OverviewTelemetry & { alertHeightM?: number; evacuationHeightM?: number }
type Municipality = {
  id: string
  localityId: string
  name: string
  provinceCode: string
  alertHeightM?: number
  evacuationHeightM?: number
  gaugeMappings: { primaryPnaPortId: string | null; secondaryPnaPortIds: string[]; inaStationIds: string[]; smnRegionIds: string[]; inmetStationIds: string[] }
  latestTelemetry: Telemetry[]
  officialAlerts: OfficialAlert[]
}
type OfficialAlert = { source: 'SMN' | 'INMET'; coverageKey: string; message: string; observedAt: string; lastSuccessfulObservedAt: string; freshness: 'fresh' | 'degraded'; sourceUrl?: string }
type OverviewPayload = {
  province: { provinceCode: string; name: string }
  sourceFreshness: Freshness[]
  provinceAlerts: Array<{ zone: string; source: string; stationId: string; observedAt: string; lastSuccessfulObservedAt: string; message: string }>
  municipalities: Municipality[]
}

type OverviewFilters = { query: string; source: string; status: string }
const OFFICIAL_SOURCES = ['PNA', 'INA', 'INMET', 'SMN'] as const

export function filterMunicipalities(municipalities: Municipality[], filters: OverviewFilters) {
  const query = filters.query.trim().toLocaleLowerCase('es-AR')
  return municipalities.filter((municipality) => {
    const matchesQuery = !query || `${municipality.name} ${municipality.localityId}`.toLocaleLowerCase('es-AR').includes(query)
    const matchesSource = filters.source === 'all' || municipality.latestTelemetry.some((item) => item.source === filters.source)
    const matchesStatus = filters.status === 'all' || municipalityStatus(municipality) === filters.status
    return matchesQuery && matchesSource && matchesStatus
  })
}

export function GovernmentOverview({ initialData = null, initialError = null }: { initialData?: OverviewPayload | null; initialError?: string | null } = {}) {
  const [data, setData] = useState<OverviewPayload | null>(initialData)
  const [error, setError] = useState<string | null>(initialError)
  const [filters, setFilters] = useState<OverviewFilters>({ query: '', source: 'all', status: 'all' })

  useEffect(() => {
    let active = true
    if (initialData || initialError) return () => { active = false }
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
  }, [initialData, initialError])

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
              <p className="mt-2 text-sm text-slate-300">{formatOfficialTime(latestOverviewTime(data))}</p>
            </div>
          </div>

          {error ? <div role="alert" className="mt-8 rounded-3xl border border-red-300/40 bg-red-950/60 p-5 text-red-100">{error}. Reintentá desde la red oficial.</div> : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {OFFICIAL_SOURCES.map((sourceName) => {
              const source = data?.sourceFreshness.find((item) => item.source === sourceName)
              return <article key={sourceName} className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">{sourceName}</h2><span className="rounded-full bg-teal-300/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-100">{source?.lastSuccessfulObservedAt ? statusLabel(source.freshness) : 'No disponible'}</span></div>
                <p className="mt-4 text-sm text-slate-300">{source?.label || 'La fuente no informó datos recientes.'}</p>
                <p className="mt-2 text-xs text-slate-400">{formatOfficialTime(source?.lastSuccessfulObservedAt)}</p>
              </article>
            })}
          </div>
          <OverviewEvidenceStatePanel data={data} />

          <section aria-labelledby="province-alerts" className="mt-8 grid gap-4 lg:grid-cols-2">
            {(data?.provinceAlerts ?? []).map((alert) => (
              <article key={`${alert.source}-${alert.stationId}-${alert.observedAt}`} className="rounded-[2rem] border border-amber-300/30 bg-amber-300/10 p-5 shadow-2xl">
                <div className="flex items-start gap-3"><AlertTriangle className="mt-1 text-amber-200" aria-hidden="true" /><div><h2 id="province-alerts" className="text-xl font-black">{alert.zone}</h2><p className="mt-2 text-slate-200">{alert.message}</p><p className="mt-3 text-sm text-amber-100">Fuente {alert.source} · {formatOfficialTime(alert.lastSuccessfulObservedAt ?? alert.observedAt)}</p></div></div>
              </article>
            ))}
          </section>

          <section id="municipalities-list" aria-labelledby="municipalities-heading" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><h2 id="municipalities-heading" className="text-2xl font-black">Localidades bajo monitoreo</h2><p className="mt-2 text-sm text-slate-300">Lista verificable equivalente al mapa; los filtros no modifican el contrato oficial.</p></div>
              <div className="flex flex-wrap gap-2 text-sm">
                <label className="sr-only" htmlFor="municipality-query">Filtrar localidades</label>
                <input id="municipality-query" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Buscar localidad" className="rounded-full border border-white/15 bg-white px-4 py-2 text-slate-950 outline-none focus-visible:ring-4 focus-visible:ring-amber-200" />
                <label className="sr-only" htmlFor="municipality-source">Fuente</label>
                <select id="municipality-source" value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })} className="rounded-full border border-white/15 bg-white px-3 py-2 text-slate-950 outline-none focus-visible:ring-4 focus-visible:ring-amber-200"><option value="all">Todas las fuentes</option>{OFFICIAL_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}</select>
                <label className="sr-only" htmlFor="municipality-status">Estado</label>
                <select id="municipality-status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="rounded-full border border-white/15 bg-white px-3 py-2 text-slate-950 outline-none focus-visible:ring-4 focus-visible:ring-amber-200"><option value="all">Todos los estados</option><option value="observed">Observado</option><option value="forecast">Pronóstico</option><option value="missing">Sin datos</option><option value="degraded">Degradado</option></select>
              </div>
            </div>
            <MapFrame title="Vista territorial" fallback="Cada localidad, provincia y estado queda disponible en la lista accesible siguiente; el mapa no es requisito para operar."><ul className="grid gap-2 text-sm text-stone-700 sm:grid-cols-2">{(data?.municipalities ?? []).map((municipality) => <li key={municipality.id}><Link className="font-semibold underline" href={`/municipalities/${municipality.id}`}>{municipality.name}</Link> · {municipality.provinceCode}</li>)}</ul></MapFrame>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {filterMunicipalities(data?.municipalities ?? [], filters).map((municipality) => {
                const summary = municipalitySummary(municipality)
                return (
                <article key={municipality.id} className="group rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><p className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-teal-200"><MapPinned size={16} aria-hidden="true" />{municipality.localityId}</p><h3 className="mt-2 text-2xl font-black text-white">{municipality.name}</h3></div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-950">{riskLabel(summary.riskLevel)}</span>
                  </div>
                  <p className="mt-4 text-slate-300">{summary.warning}</p>
                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/5 p-3"><dt className="text-slate-400">PNA</dt><dd className="font-black text-white">{summary.pnaHeightM ?? '—'} m</dd></div>
                    <div className="rounded-2xl bg-white/5 p-3"><dt className="text-slate-400">INA</dt><dd className="font-black text-white">{summary.inaHeightM ?? '—'} m</dd></div>
                  </dl>
                  {summary.inaHeightM != null ? <p className="mt-3 text-sm text-slate-300">INA · {formatOfficialTime(summary.inaObservedAt)}{summary.inaSourceUrl ? <> · <a className="underline underline-offset-2" href={summary.inaSourceUrl} target="_blank" rel="noreferrer">Ver fuente INA</a></> : null}</p> : null}
                  <p className="mt-4 flex items-center gap-2 text-sm text-slate-300"><Clock3 size={16} aria-hidden="true" />{formatOfficialTime(summary.lastSuccessfulObservedAt)}</p>
                  <div className="mt-5 border-t border-white/10 pt-4" aria-label={`Alertas oficiales de ${municipality.name}`}>
                    {municipality.officialAlerts.length > 0 ? municipality.officialAlerts.map((alert) => (
                      <div key={`${alert.source}-${alert.coverageKey}-${alert.observedAt}`} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-100">{alert.source}</p>
                        <p className="mt-2 font-black text-white">{alert.message}</p>
                        <p className="mt-2 text-sm text-amber-100"><span>{`Cobertura ${alert.coverageKey}`}</span><span> · </span><span>{`Estado: ${statusLabel(alert.freshness)}`}</span></p>
                        <p className="mt-1 text-sm text-amber-100">{formatOfficialTime(alert.lastSuccessfulObservedAt || alert.observedAt)}{alert.sourceUrl ? <> · <a className="underline underline-offset-2" href={alert.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial</a></> : null}</p>
                      </div>
                    )) : <p className="text-sm text-slate-300"><span>Sin alertas oficiales recientes</span><span>.</span></p>}
                  </div>
                  <Link href={`/municipalities/${municipality.id}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 font-black text-slate-950 transition-colors duration-200 hover:bg-amber-200 focus-visible:ring-4 focus-visible:ring-amber-100">Abrir tablero de {municipality.name}<ArrowUpRight size={18} aria-hidden="true" /></Link>
                </article>
              )})}
              {data && filterMunicipalities(data.municipalities, filters).length === 0 ? <p className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 text-slate-300">No hay localidades que coincidan con estos filtros.</p> : null}
            </div>
          </section>
          <div className="mt-10">
            <FutureCapabilities product="ibera-alerta" />
          </div>
        </div>
      </section>
    </main>
  )
}

function latestOverviewTime(data: OverviewPayload | null): string | null {
  return data?.sourceFreshness.map((item) => item.lastSuccessfulObservedAt).filter(Boolean).sort().at(-1) ?? null
}

function municipalitySummary(municipality: Municipality) {
  const summary = municipalityTelemetrySummary(municipality.latestTelemetry)
  const height = summary.pnaHeightM
  const riskLevel = height == null ? 'unknown' : municipality.evacuationHeightM != null && height >= municipality.evacuationHeightM ? 'high' : municipality.alertHeightM != null && height >= municipality.alertHeightM ? 'moderate' : 'low'
  const warning = height == null ? 'Sin datos oficiales recientes' : riskLevel === 'high' ? 'Altura sobre umbral de evacuación informado por PNA.' : riskLevel === 'moderate' ? 'Altura sobre umbral de alerta informado por PNA.' : 'Sin alerta hidrométrica oficial para este municipio.'
  return { ...summary, riskLevel, warning }
}

function OverviewEvidenceStatePanel({ data }: { data: OverviewPayload | null }) {
  const source = data?.sourceFreshness.find((item) => item.source === 'PNA')
  const forecast = data?.municipalities.flatMap((item) => item.latestTelemetry).find((item) => item.forecastHorizonDays != null)
  const emptyMunicipality = data?.municipalities.find((item) => item.latestTelemetry.length === 0)
  const items = [
    { label: 'PNA provincial', evidence: normalizeEvidence({ state: source?.freshness === 'stale' ? EVIDENCE_STATE.STALE : source?.freshness === 'degraded' ? EVIDENCE_STATE.DEGRADED : source?.lastSuccessfulObservedAt ? EVIDENCE_STATE.OBSERVED : EVIDENCE_STATE.MISSING, source: source?.source, observedAt: source?.lastSuccessfulObservedAt }) },
    { label: 'INA forecast', evidence: normalizeEvidence({ source: forecast?.source, observedAt: forecast?.observedAt, forecast: true }) },
    { label: 'Municipality telemetry', evidence: normalizeEvidence({ state: emptyMunicipality ? EVIDENCE_STATE.MISSING : EVIDENCE_STATE.OBSERVED, source: emptyMunicipality ? undefined : 'municipal telemetry', observedAt: emptyMunicipality ? undefined : data?.sourceFreshness[0]?.lastSuccessfulObservedAt }) },
  ]

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.08] p-5" aria-label="Estados de evidencia provincial">
      <h2 className="text-xl font-black">Estados de evidencia provincial</h2>
      <p className="mt-2 text-sm text-slate-300">La lista distingue datos observados, pronósticos y municipios sin evidencia reciente.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map((item) => <li key={item.label} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-3"><span className="text-sm font-semibold">{item.label}</span><EvidenceStateBadge state={item.evidence.state} /></li>)}
      </ul>
    </section>
  )
}

function municipalityStatus(municipality: Municipality) {
  if (municipality.latestTelemetry.length === 0) return 'missing'
  if (municipality.latestTelemetry.some((item) => item.freshness === 'degraded' || item.freshness === 'stale')) return 'degraded'
  if (municipality.latestTelemetry.some((item) => item.forecastHorizonDays != null)) return 'forecast'
  return 'observed'
}
