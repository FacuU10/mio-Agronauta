'use client'

import { createElement } from 'react'
import { useMutation, useQueries } from '@tanstack/react-query'
import type { AlertsCurrent, AlertsTimelineResponse, DashboardSnapshot, FieldGeometryResponse, FieldOverview, MonitoringStatus, RecomputeRequestResult, RiskCurrent, RiskTimelineResponse, WeatherTimelineResponse } from '@/lib/agronautas/schemas'
import { createAgronautasMockService, resolveAgronautasService, type AgronautasService } from '@/lib/agronautas/service'
import { ApiError } from '@/lib/api-client'
import { ProductShell } from '@/components/shell/product-shell'
import { EvidenceDrawer, EvidenceStateBadge, FreshnessBanner, MapFrame, MetricCard, ReportAction, SourceCard, StatusBadge, Timeline, VisibilityState } from '@/components/visibility/primitives'
import { EVIDENCE_STATE, normalizeEvidence } from '@/lib/visibility/evidence-state'
import { normalizeRequestError } from '@/lib/visibility/view-models'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGeometryEditor } from './field-geometry-editor'
import type { AgronautasCapabilityState } from './workspace'

const React = { createElement }
const CANONICAL_DEMO_FIELD_ID = 'field-demo-1'

const FIELD_DETAIL_INDEX_ITEMS = [
  { href: '#field-decision', label: 'Decisión' },
  { href: '#field-evidence', label: 'Evidencia' },
  { href: '#field-drivers', label: 'Drivers y alertas' },
  { href: '#field-timelines', label: 'Timelines' },
  { href: '#field-coverage', label: 'Cobertura' },
  { href: '#field-provenance', label: 'Procedencia' },
  { href: '#field-actions', label: 'Recompute y reporte' },
] as const

export interface AgronautasFieldDetailProps {
  field: FieldOverview
  risk: RiskCurrent
  alerts: AlertsCurrent
  status: MonitoringStatus
  riskTimeline: RiskTimelineResponse
  weatherTimeline: WeatherTimelineResponse
  dashboard: DashboardSnapshot
  alertsTimeline: AlertsTimelineResponse
  geometry?: FieldGeometryResponse
  geometryOutcome?: AgronautasCapabilityState
  onSaveGeometry?: (input: { polygonWkt: string; expectedUpdatedAt?: string }) => Promise<FieldGeometryResponse>
  recomputeStatus?: RecomputeRequestResult
  isRecomputePending: boolean
  onRequestRecompute: () => Promise<unknown>
}

export function AgronautasFieldDetail(props: AgronautasFieldDetailProps) {
  const nextAction = props.risk.snapshot.level === 'high'
    ? 'Revisar drivers de lluvia y estrés antes de operar el lote.'
    : 'Confirmar la próxima lectura con evidencia vigente.'
  const reportHref = `/api/agronautas/v1/fields/${props.field.fieldId}/dashboard.pdf${props.field.fieldId === CANONICAL_DEMO_FIELD_ID ? '?mode=demo' : ''}`

  return (
    <ProductShell
      product="agronautas"
      title="Detalle del lote"
      description="Evidencia, evolución y acciones contratadas para un lote Agronautas."
      navItems={[{ href: '/demo', label: 'Workspace' }, { href: '#field-decision', label: 'Decisión' }, { href: '#field-timelines', label: 'Timelines' }, { href: '/demo#agronautas-chat-card', label: 'Chat existente' }]}
    >
      <div className="agronautas-canvas mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 rounded-[2rem] px-4 py-8 md:px-8">
        <header className="grid gap-5 rounded-[2rem] border border-emerald-950/20 bg-stone-950 p-6 text-white shadow-lg md:grid-cols-[1.2fr,0.8fr] md:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Agronautas · {props.field.externalFieldId}</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold leading-tight md:text-6xl">Detalle del lote</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">{props.field.locality}, Corrientes · {props.field.hectares} ha · {cropLabel(props.field.crop)}. La decisión se lee junto a su evidencia y frescura.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <MetricCard label="Field ID" value={props.field.fieldId} detail="Identificador contractual" />
            <MetricCard label="Cultivo" value={cropLabel(props.field.crop)} detail={`Punto ${props.field.centroid.lat.toFixed(4)}, ${props.field.centroid.lng.toFixed(4)}`} />
          </div>
        </header>

         <section id="field-decision" tabIndex={-1} className="scroll-mt-24 grid gap-5 rounded-[2rem] border border-emerald-900/20 bg-emerald-950 p-5 text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 md:grid-cols-[1.1fr,0.9fr] md:p-7">
          <div>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge state={props.risk.status === 'fresh' ? 'success' : props.risk.status} /><Badge variant="outline" className="border-white/30 text-white">Confianza {Math.round(props.risk.snapshot.confidence * 100)}%</Badge></div>
            <h2 className="mt-3 font-serif text-3xl font-semibold">Decisión: {riskLabel(props.risk.snapshot.level)}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85"><strong>Siguiente acción:</strong> {nextAction}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/70">Snapshot {props.risk.snapshot.snapshotId} · calculado {formatDateTime(props.risk.snapshot.computedAt)} · válido hasta {formatDateTime(props.risk.snapshot.validUntil)}.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <MetricCard label="Score" value={`${props.risk.snapshot.score}/100`} detail={`Nivel ${riskLabel(props.risk.snapshot.level)}`} />
            <MetricCard label="Confianza" value={`${Math.round(props.risk.snapshot.confidence * 100)}%`} detail="Calculada por backend" />
            <MetricCard label="Frescura" value={props.risk.status} detail={props.dashboard.lastDataFetchedAt} />
          </div>
        </section>

         <FreshnessBanner state={props.dashboard.freshness} lastSuccessfulAt={props.dashboard.lastDataFetchedAt} />
         {props.dashboard.presentation.staleFlags.length ? <VisibilityState state="degraded" title="Fuentes degradadas o vencidas" description={`El dashboard conserva el estado disponible y marca: ${props.dashboard.presentation.staleFlags.join(', ')}.`} /> : null}
         <FieldEvidenceStatePanel {...props} />
         <FieldDetailSectionIndex />

         <section id="field-drivers" tabIndex={-1} aria-label="Drivers y alertas del lote" className="scroll-mt-24 grid gap-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 lg:grid-cols-[1.1fr,0.9fr]">
          <Card>
            <CardHeader><CardTitle>Drivers y evidencia</CardTitle><CardDescription>Factores calculados por el snapshot persistido; la UI no re-calcula riesgo.</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              {props.risk.snapshot.drivers.map((driver) => <div key={driver.key} className="rounded-2xl border border-stone-200 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{driver.label}</p><p className="text-sm text-stone-600">Peso {Math.round(driver.weight * 100)}%</p></div><Badge variant={driver.value >= 0.75 ? 'destructive' : driver.value >= 0.5 ? 'warning' : 'success'}>{driver.value.toFixed(2)}</Badge></div></div>)}
              <EvidenceDrawer evidence={props.risk.snapshot.evidenceRefs} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Alertas del lote</CardTitle><CardDescription>Sin alertas no significa sin datos: el estado y la frescura se muestran aparte.</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              {props.alerts.alerts.length ? props.alerts.alerts.map((alert) => <div key={alert.alertId} className="rounded-2xl border border-stone-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium">{alertLabel(alert.type)}</p><StatusBadge state={alert.freshness === 'fresh' ? 'success' : alert.freshness} /></div><p className="mt-2 text-sm text-stone-600">Prioridad {alert.priority} · confianza {Math.round(alert.confidence * 100)}%</p>{alert.degradationReasons.length ? <p className="mt-2 text-sm text-amber-800">Degradación: {alert.degradationReasons.join(', ')}</p> : null}</div>) : <VisibilityState state="empty" title="Sin alertas activas" description="El contrato no devolvió alertas para este snapshot; no se interpreta como ausencia de riesgo." />}
            </CardContent>
          </Card>
        </section>

         <section id="field-timelines" tabIndex={-1} className="scroll-mt-24 grid gap-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:grid-cols-2 lg:grid-cols-3">
           <Card><CardHeader><CardTitle>Riesgo timeline</CardTitle><CardDescription>Snapshots persistidos para auditar evolución y vigencia.</CardDescription></CardHeader><CardContent>{props.riskTimeline.items.length ? <Timeline items={props.riskTimeline.items.map((item) => ({ label: formatDateTime(item.computedAt), value: `${item.score}/100 · ${riskLabel(item.level)}`, detail: `Confianza ${Math.round(item.confidence * 100)}% · ${item.snapshotId}` }))} title="Evolución de riesgo" /> : <VisibilityState state="empty" title="Sin timeline de riesgo persistido" description="El contrato no devolvió snapshots históricos para este lote; no se completa la evolución con datos inventados." retryAllowed={false} />}</CardContent></Card>
          <Card><CardHeader><CardTitle>Clima timeline</CardTitle><CardDescription>Observaciones contratadas, con frescura y causa de degradación.</CardDescription></CardHeader><CardContent className="grid gap-3">{props.weatherTimeline.items.length ? props.weatherTimeline.items.map((item) => <div key={`${item.provider}-${item.observedAt}`} className="rounded-2xl border border-stone-200 p-3"><p className="font-medium">{item.provider}</p><p className="text-sm text-stone-600">{formatDateTime(item.observedAt)} · {item.temperatureC}°C · lluvia 7d {item.rainfallMm7d} mm</p><p className="text-sm text-stone-600">Confianza {Math.round(item.confidence * 100)}%{item.staleCause ? ` · ${item.staleCause}` : ''}</p></div>) : <p className="text-sm text-stone-600">Sin timeline climático persistido.</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Alertas timeline</CardTitle><CardDescription>Historial de alertas y snapshot de origen.</CardDescription></CardHeader><CardContent className="grid gap-3">{props.alertsTimeline.items.length ? props.alertsTimeline.items.map((item) => <div key={item.alertId} className="rounded-2xl border border-stone-200 p-3"><p className="font-medium">{alertLabel(item.type)}</p><p className="text-sm text-stone-600">{item.alertId} · {item.freshness} · snapshot {item.basedOnSnapshotId}</p></div>) : <p className="text-sm text-stone-600">Sin alertas persistidas.</p>}</CardContent></Card>
        </section>

           <section id="field-coverage" tabIndex={-1} aria-label="Cobertura y ubicación del lote" className="scroll-mt-24 grid gap-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 lg:grid-cols-[1fr,1.1fr]">
           {props.geometry && props.onSaveGeometry ? <FieldGeometryEditor fieldId={props.field.fieldId} initialGeometry={props.geometry} onSave={async (input) => props.onSaveGeometry?.({ polygonWkt: input.polygonWkt ?? '', expectedUpdatedAt: input.expectedUpdatedAt }) as Promise<FieldGeometryResponse>} /> : props.geometryOutcome ? <GeometryCapabilityState outcome={props.geometryOutcome} /> : null}
           <MapFrame title="Ubicación y cobertura" fallback={`${props.field.locality} · ${props.field.provinceCode} · punto ${props.field.centroid.lat.toFixed(4)}, ${props.field.centroid.lng.toFixed(4)}`}>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge state="success" /><span className="text-sm text-stone-700">Cobertura por punto resuelta.</span></div>
          </MapFrame>
            <Card id="field-provenance" tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><CardHeader><CardTitle>Frescura y procedencia</CardTitle><CardDescription>Las señales no disponibles se mantienen visibles como límite, no como cero.</CardDescription></CardHeader><CardContent className="grid gap-3">{props.dashboard.provenance.length ? props.dashboard.provenance.map((source) => <SourceCard key={source.evidenceId} source={source.provider} mode={source.providerMode} observedAt={source.observedAt} lastSuccessfulObservedAt={source.lastSuccessfulObservedAt} validUntil={source.nextDueAt} sourceUrl={source.sourceUrl} />) : <VisibilityState state="missing" title="Procedencia no disponible" description="El backend no devolvió fuentes verificables para esta vista." />}<p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">`polygonWkt` se conserva en el contrato de intake, pero este MVP sólo resuelve cobertura y evidencia por punto; no promete análisis poligonal.</p></CardContent></Card>
        </section>

         <Card id="field-actions" tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
          <CardHeader><CardTitle>Recompute y reporte</CardTitle><CardDescription>Solicitar recompute no promete un resultado inmediato; el estado proviene del contrato actual.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3"><StatusBadge state={props.recomputeStatus?.status === 'already_in_progress' ? 'partial' : props.recomputeStatus?.status === 'enqueued' ? 'loading' : 'missing'} /><span className="text-sm text-stone-600">{props.recomputeStatus ? `recompute ${props.recomputeStatus.status}${props.recomputeStatus.runId ? ` · ${props.recomputeStatus.runId}` : ''}` : 'Sin solicitud en esta vista'}</span><Button type="button" onClick={() => void props.onRequestRecompute()} disabled={props.isRecomputePending}>{props.isRecomputePending ? 'Solicitando…' : 'Solicitar recompute'}</Button><ReportAction href={reportHref} label="Descargar reporte PDF" /></CardContent>
          <CardContent className="pt-0"><p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{props.dashboard.presentation.disclaimer}</p></CardContent>
        </Card>
      </div>
    </ProductShell>
  )
}

function FieldEvidenceStatePanel(props: AgronautasFieldDetailProps) {
  const weather = props.weatherTimeline.items[0]
  const missing = props.dashboard.provenance.find((item) => item.freshness === 'missing')
  const items = [
    { label: 'Risk snapshot', evidence: normalizeEvidence({ state: EVIDENCE_STATE.OBSERVED, source: 'Agronautas risk snapshot', observedAt: props.risk.snapshot.computedAt }) },
    { label: 'Risk freshness', evidence: normalizeEvidence({ state: props.risk.status === 'stale' ? EVIDENCE_STATE.STALE : EVIDENCE_STATE.DEGRADED, source: 'Agronautas risk snapshot', lastSuccessfulObservedAt: props.risk.snapshot.computedAt }) },
    { label: 'Weather provider', evidence: normalizeEvidence({ state: weather?.staleCause ? EVIDENCE_STATE.STALE : EVIDENCE_STATE.OBSERVED, source: weather?.provider, observedAt: weather?.observedAt }) },
    { label: 'Unavailable source', evidence: normalizeEvidence({ state: EVIDENCE_STATE.MISSING, source: missing?.provider, detail: missing?.failureReason ?? 'No verified source returned.' }) },
  ]

  return (
    <section id="field-evidence" tabIndex={-1} className="scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" aria-label="Estados de evidencia del lote">
      <h2 className="text-xl font-semibold">Estados de evidencia</h2>
      <p className="mt-2 text-sm text-stone-600">La vista conserva los límites del contrato y distingue snapshot observado, frescura vencida y fuentes ausentes.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => <li key={item.label} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 p-3"><span className="text-sm font-medium">{item.label}</span><EvidenceStateBadge state={item.evidence.state} /></li>)}
      </ul>
    </section>
  )
}

function FieldDetailSectionIndex() {
  return <nav aria-label="Índice del detalle del lote" className="rounded-2xl border border-emerald-900/20 bg-emerald-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900">Índice rápido</p>
    <ul className="mt-3 flex flex-wrap gap-2">
      {FIELD_DETAIL_INDEX_ITEMS.map((item) => <li key={item.href} className="min-w-0 max-w-full"><a href={item.href} className="inline-flex max-w-full whitespace-normal break-words rounded-full border border-emerald-900/20 bg-white px-3 py-2 text-sm font-semibold text-stone-900 transition-colors duration-200 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">{item.label}</a></li>)}
    </ul>
  </nav>
}

function GeometryCapabilityState({ outcome }: { outcome: AgronautasCapabilityState }) {
  if (outcome.state === 'loading') return <VisibilityState state="loading" title="Cargando geometría" description="Sincronizando la capacidad de geometría sin sustituirla con una forma inventada." retryAllowed={false} />
  if (outcome.state === 'unauthorized') return <VisibilityState state="unauthorized" title="Geometría requiere autenticación" description="La capacidad de geometría requiere una sesión autorizada (HTTP 401). Se conserva la ubicación por punto disponible." retryAllowed={false} />
  if (outcome.state === 'forbidden') return <VisibilityState state="forbidden" title="Geometría restringida" description="Tu sesión no tiene permisos para editar o consultar esta geometría (HTTP 403). Se conserva la ubicación por punto disponible." retryAllowed={false} />
  if (outcome.status === 404) return <VisibilityState state="missing" title="Geometría no disponible" description="El endpoint de geometría respondió HTTP 404: la capacidad no está disponible en el contrato actual. Se conserva la evidencia disponible, sin sustituir el polígono." retryAllowed={false} />
  if (outcome.state === 'error') return <VisibilityState state="error" title="Geometría no disponible" description={outcome.reason ?? 'La geometría opcional no está disponible. Se conserva la evidencia disponible, sin fabricar un polígono.'} />
  return <VisibilityState state="missing" title="Geometría no disponible" description="La geometría opcional no está disponible. Se conserva la evidencia disponible, sin fabricar un polígono." retryAllowed={false} />
}

export function AgronautasFieldDetailPageClient({ fieldId, service }: { fieldId: string; service?: AgronautasService }) {
  const resolvedService = service ?? resolveAgronautasService({ mode: fieldId === CANONICAL_DEMO_FIELD_ID ? 'demo' : undefined })
  const queries = useQueries({ queries: [
    { queryKey: ['agronautas', 'detail-field', fieldId], queryFn: () => resolvedService.getField(fieldId), retry: false },
    { queryKey: ['agronautas', 'detail-risk', fieldId], queryFn: () => resolvedService.getCurrentRisk(fieldId), retry: false },
    { queryKey: ['agronautas', 'detail-alerts', fieldId], queryFn: () => resolvedService.getCurrentAlerts(fieldId), retry: false },
    { queryKey: ['agronautas', 'detail-status', fieldId], queryFn: () => resolvedService.getMonitoringStatus(fieldId), retry: false },
    { queryKey: ['agronautas', 'detail-risk-timeline', fieldId], queryFn: () => resolvedService.getRiskTimeline(fieldId), retry: false },
    { queryKey: ['agronautas', 'detail-weather-timeline', fieldId], queryFn: () => resolvedService.getWeatherTimeline(fieldId), retry: false },
    { queryKey: ['agronautas', 'detail-dashboard', fieldId], queryFn: () => resolvedService.getDashboard(fieldId), retry: false },
     { queryKey: ['agronautas', 'detail-alerts-timeline', fieldId], queryFn: () => resolvedService.getAlertsTimeline(fieldId), retry: false },
     { queryKey: ['agronautas', 'detail-geometry', fieldId], queryFn: () => resolvedService.getFieldGeometry?.(fieldId), enabled: Boolean(resolvedService.getFieldGeometry), retry: false },
  ] })
  const recompute = useMutation({ mutationFn: () => resolvedService.requestRecompute(fieldId) })
  // Geometry is an optional provider-neutral enhancement; its absence must not
  // hide the contract-backed risk and evidence detail.
  const requiredQueries = queries.slice(0, 8)
  const hasError = requiredQueries.find((query) => query.error)
  const isLoading = requiredQueries.some((query) => query.isLoading)
  const field = queries[0]?.data as FieldOverview | undefined
  const risk = queries[1]?.data as RiskCurrent | undefined
  const alerts = queries[2]?.data as AlertsCurrent | undefined
  const status = queries[3]?.data as MonitoringStatus | undefined
  const riskTimeline = queries[4]?.data as RiskTimelineResponse | undefined
  const weatherTimeline = queries[5]?.data as WeatherTimelineResponse | undefined
  const dashboard = queries[6]?.data as DashboardSnapshot | undefined
  const alertsTimeline = queries[7]?.data as AlertsTimelineResponse | undefined
  const geometry = queries[8]?.data as FieldGeometryResponse | undefined
  const geometryOutcome = resolveCapabilityState(queries[8])

  if (hasError) {
    const outcome = normalizeRequestError(hasError.error)
    const status = hasError.error instanceof ApiError ? hasError.error.status : outcome.httpStatus
    const boundary = status === 401 ? { state: 'unauthorized' as const, title: 'Acceso al detalle no autorizado', description: 'Este lote requiere una sesión autorizada (HTTP 401). No se muestran datos de producción sin identidad verificada.' } : status === 403 ? { state: 'forbidden' as const, title: 'Detalle del lote restringido', description: 'Tu sesión no tiene permisos para consultar este lote (HTTP 403). Consultá al administrador.' } : status === 404 ? { state: 'unavailable' as const, title: 'Lote no encontrado', description: 'El contrato devolvió HTTP 404 para este lote o capacidad. No se sustituye con un registro inventado.' } : undefined
    return <ProductShell product="agronautas" title="Detalle del lote" description="No se pudo leer el contrato del lote." navItems={[{ href: '/demo', label: 'Workspace' }]}><div className="mx-auto max-w-4xl px-4 py-12"><VisibilityState state={boundary?.state ?? 'error'} title={boundary?.title ?? 'No se pudo cargar el lote'} description={boundary?.description ?? 'El endpoint existente devolvió un error. Podés reintentar sin perder el contexto de la ruta.'} retryAllowed={!boundary} onRetry={boundary ? undefined : () => void Promise.all(queries.map((query) => query.refetch()))} /></div></ProductShell>
  }
  if (isLoading || !field || !risk || !alerts || !status || !riskTimeline || !weatherTimeline || !dashboard || !alertsTimeline) return <ProductShell product="agronautas" title="Detalle del lote" description="Cargando datos contratados." navItems={[{ href: '/demo', label: 'Workspace' }]}><div className="mx-auto max-w-4xl px-4 py-12"><VisibilityState state="loading" title="Cargando detalle del lote" description="Sincronizando riesgo, alertas, timelines y procedencia." /></div></ProductShell>

  const saveGeometry = async (input: { polygonWkt: string; expectedUpdatedAt?: string }) => {
    if (!resolvedService.updateFieldGeometry) throw new Error('La edición de geometría no está disponible')
    const result = await resolvedService.updateFieldGeometry(fieldId, input)
    await queries[8]?.refetch()
    return result
  }
  return <AgronautasFieldDetail field={field} risk={risk} alerts={alerts} status={status} riskTimeline={riskTimeline} weatherTimeline={weatherTimeline} dashboard={dashboard} alertsTimeline={alertsTimeline} geometry={geometry} geometryOutcome={geometryOutcome} onSaveGeometry={saveGeometry} recomputeStatus={recompute.data} isRecomputePending={recompute.isPending} onRequestRecompute={() => recompute.mutateAsync()} />
}

export function AgronautasFieldDetailPageClientForTests() {
  return <AgronautasFieldDetailPageClient fieldId="field-corrientes-lote-001" service={createAgronautasMockService()} />
}

function cropLabel(crop: string) { return ({ rice: 'Arroz', maize: 'Maíz', soybean: 'Soja', wheat: 'Trigo', sunflower: 'Girasol', pasture: 'Pastura', citrus: 'Cítricos', other: 'Otro' } as Record<string, string>)[crop] ?? crop }
function riskLabel(level: string) { return level === 'high' ? 'Riesgo alto' : level === 'medium' ? 'Riesgo medio' : 'Riesgo bajo' }
function alertLabel(type: string) { return type === 'flood' ? 'Riesgo de anegamiento' : type === 'water_stress' ? 'Estrés hídrico' : 'Estrés térmico' }
function formatDateTime(value: string | null | undefined) { if (!value) return 'Sin fecha disponible'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date) }

function resolveCapabilityState(query: { data?: unknown; error: unknown; isLoading: boolean }): AgronautasCapabilityState {
  if (query.isLoading) return { state: 'loading' }
  if (query.error) {
    const status = query.error instanceof ApiError ? query.error.status : undefined
    if (status === 401) return { state: 'unauthorized', status, reason: 'unauthorized' }
    if (status === 403) return { state: 'forbidden', status, reason: 'forbidden' }
    return { state: status === 404 ? 'unavailable' : 'error', status, reason: query.error instanceof Error ? query.error.message : 'capability_unavailable' }
  }
  return { state: query.data === undefined ? 'unavailable' : 'available' }
}
