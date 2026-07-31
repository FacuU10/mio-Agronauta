'use client'

import { createElement, useState, type InputHTMLAttributes } from 'react'
import type { FieldIntake } from '@repo/zod-schemas'
import { agronautasSupportedCrops } from '@repo/zod-schemas'
import type { AlertsCurrent, DashboardSnapshot, FieldOverview, GroundedChatResponse, HydrologyDashboard, HydrologyItem, MonitoringStatus, RecomputeRequestResult, RiskCurrent, RiskTimelineResponse, WeatherTimelineResponse } from '@/lib/agronautas/schemas'
import { AGRONAUTAS_CONTRACT_VERSION } from '@/lib/agronautas/schemas'
import { buildIngestionAdminRows, buildSourceFreshnessCards, deriveSafeOperationalAlerts } from '@/lib/agronautas/ingestion-status'
import { AGRONAUTAS_LOCALITIES, createAgronautasMapAdapter, previewAgronautasPoint } from '@/lib/agronautas/intake-map'
import { ProductShell } from '@/components/shell/product-shell'
import { FreshnessBanner, MapFrame, StatusBadge, MetricCard as VisibilityMetricCard } from '@/components/visibility/primitives'
import { FutureCapabilities } from '@/components/visibility/future-capabilities'
import { ChatEvidencePanel } from '@/components/visibility/chat-evidence'
import type { ChatStreamState } from '@/lib/visibility/chat'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

const React = { createElement }

interface WorkspaceProps {
  runtimeMode: 'real' | 'demo'
  selectedFieldId: string | null
  lastCreatedFieldId: string | null
  intakeError: string | null
  isSubmitting: boolean
  isDashboardLoading: boolean
  field?: FieldOverview
  risk?: RiskCurrent
  alerts?: AlertsCurrent
  status?: MonitoringStatus
  riskTimeline?: RiskTimelineResponse
  weatherTimeline?: WeatherTimelineResponse
  dashboardPayload?: DashboardSnapshot
  hydrologyDashboard?: HydrologyDashboard
  chatResponse?: GroundedChatResponse
  hydrologyChatState: ChatStreamState
  chatError: string | null
  isChatPending: boolean
  isHydrologyChatPending: boolean
  recomputeStatus?: RecomputeRequestResult
  isRecomputePending: boolean
  onSelectField: (fieldId: string | null) => void
  onSubmitIntake: (input: FieldIntake) => Promise<unknown>
  onRequestRecompute: () => Promise<unknown>
  onAskChat: (message: string) => Promise<unknown>
  onRetryChat: () => Promise<unknown>
  onAskHydrologyChat: (message: string) => Promise<unknown>
  onRetryHydrologyChat: () => Promise<unknown>
}

export function AgronautasWorkspace(props: WorkspaceProps) {
  return (
    <ProductShell
      product="agronautas"
      title="Workspace Agronautas"
      description="De la ubicación del lote a una decisión verificable: cobertura por punto, nivel de riesgo, siguiente acción y evidencia contratada."
      navItems={[{ href: '#agronautas-intake', label: 'Nuevo lote' }, { href: '#agronautas-dashboard', label: 'Decisión' }, { href: '#agronautas-alerts', label: 'Alertas' }, { href: '#agronautas-timeline', label: 'Timeline' }]}
    >
    <main className="agronautas-canvas mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 rounded-[2rem] px-4 py-8 md:px-8">
      <section className="grid gap-4 rounded-[32px] border border-emerald-950/20 bg-stone-950 px-6 py-8 text-white shadow-lg md:grid-cols-[1.4fr,0.9fr] md:px-8">
        <div className="space-y-4">
          <Badge className="bg-amber-200 text-stone-950">Web MVP · Modo {props.runtimeMode === 'demo' ? 'demo' : 'real'}</Badge>
          <h2 className="max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-5xl">Agronautas: dashboard de riesgo para el campo argentino.</h2>
          <p className="max-w-2xl text-sm text-white/85 md:text-base">Riesgo, frescura, fuentes y evidencia persistida para lotes agrícolas de Corrientes, sin reglas de negocio calculadas en el cliente.</p>
        </div>
        <Card className="border-white/10 bg-white/10 text-white backdrop-blur">
          <CardHeader>
            <CardTitle>Estado operativo</CardTitle>
            <CardDescription className="text-white/75">Contrato {AGRONAUTAS_CONTRACT_VERSION} · React Query + Zustand</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <StatusRow label="Lote activo" value={props.selectedFieldId ?? 'Ninguno'} />
            <StatusRow label="Última alta" value={props.lastCreatedFieldId ?? 'Sin actividad'} />
            <StatusRow label="Alertas actuales" value={String(props.alerts?.alerts.length ?? 0)} />
            <StatusRow label="Runtime backend" value={props.runtimeMode} />
          </CardContent>
        </Card>
      </section>

      <section id="agronautas-intake" className="grid gap-6 xl:grid-cols-[420px,1fr]">
        <IntakePanel {...props} />
        <DashboardPanel {...props} />
      </section>
      <FutureCapabilities product="agronautas" />
    </main>
    </ProductShell>
  )
}

function IntakePanel({ intakeError, isSubmitting, onSubmitIntake }: WorkspaceProps) {
  const mapAdapter = createAgronautasMapAdapter()
  const defaultPoint = { lat: -29.1846, lng: -58.0759 }
  const [localityQuery, setLocalityQuery] = useState('Mercedes')
  const [selectedLocality, setSelectedLocality] = useState(AGRONAUTAS_LOCALITIES[0])
  const [point, setPoint] = useState(defaultPoint)
  const coverage = previewAgronautasPoint(point)
  const matches = mapAdapter.searchLocalities(localityQuery)

  async function handleSubmit(form: HTMLFormElement) {
    const valueFor = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? ''
    await onSubmitIntake({
      contractVersion: AGRONAUTAS_CONTRACT_VERSION,
      fieldId: valueFor('fieldId'),
      cropCategory: 'cereal',
      crop: valueFor('crop') as FieldIntake['crop'],
      provinceCode: 'AR-W',
      countryCode: 'AR',
      hectares: Number(valueFor('hectares') || 0),
      locality: selectedLocality?.name ?? valueFor('locality'),
      growthStage: parseOptional(valueFor('growthStage')) as FieldIntake['growthStage'],
      location: {
        lat: Number(valueFor('lat') || point.lat),
        lng: Number(valueFor('lng') || point.lng),
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo lote · intake geográfico</CardTitle>
        <CardDescription>Buscá una localidad o mové el pin textual. La previsualización orienta; el backend mantiene la decisión contractual de cobertura.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          data-testid="agronautas-intake-form"
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            try {
               await handleSubmit(event.currentTarget)
            } catch {
              // Error surface is handled in store state by the mutation.
            }
          }}
        >
          <Field label="ID externo" name="fieldId" placeholder="corrientes-lote-001" defaultValue="corrientes-lote-001" />
          <div className="grid gap-2">
            <Label htmlFor="locality-search">Buscar localidad</Label>
            <Input id="locality-search" aria-label="Buscar localidad" value={localityQuery} onChange={(event) => setLocalityQuery(event.target.value)} placeholder="Mercedes" />
            {localityQuery.trim() ? <div className="grid gap-2" role="listbox" aria-label="Localidades sugeridas">{matches.map((locality) => <button className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-left text-sm hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" key={locality.id} type="button" role="option" aria-selected={selectedLocality?.id === locality.id} onClick={() => { setSelectedLocality(locality); setLocalityQuery(locality.name); if (locality.coordinates) setPoint(locality.coordinates) }}>{locality.name} · {locality.provinceCode}</button>)}</div> : null}
            <input type="hidden" name="locality" value={selectedLocality?.name ?? localityQuery} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Latitud" name="lat" type="number" step="0.0001" defaultValue={point.lat} onChange={(event) => setPoint((current) => ({ ...current, lat: Number(event.target.value) }))} />
            <Field label="Longitud" name="lng" type="number" step="0.0001" defaultValue={point.lng} onChange={(event) => setPoint((current) => ({ ...current, lng: Number(event.target.value) }))} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hectáreas" name="hectares" type="number" step="0.1" defaultValue="42.5" />
            <div className="grid gap-2">
              <Label htmlFor="growthStage">Etapa</Label>
              <Select id="growthStage" name="growthStage" defaultValue="tillering">
                <option value="emergence">Emergencia</option>
                <option value="tillering">Macollaje</option>
                <option value="panicle_initiation">Iniciación de panoja</option>
                <option value="flowering">Floración</option>
                <option value="maturity">Madurez</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="crop">Cultivo permitido</Label>
            <Select id="crop" name="crop" defaultValue="rice">
              {agronautasSupportedCrops.map((crop) => <option key={crop} value={crop}>{cropLabel(crop)}</option>)}
            </Select>
          </div>
          <div className="grid gap-3">
            <MapFrame title="Previsualización de cobertura" fallback={`${selectedLocality?.name ?? 'Localidad no seleccionada'} · ${coverage.provinceCode ?? 'sin provincia'} · ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}>
              <div className="flex flex-wrap items-center gap-2"><StatusBadge state={coverage.state === 'inside' ? 'success' : coverage.state === 'outside' ? 'missing' : 'degraded'} /><span className="text-sm text-stone-700">Cobertura por punto · {coverage.locality ?? 'fuera del alcance previsualizado'}</span></div>
            </MapFrame>
            <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-600">`polygonWkt` se conserva en el contrato, pero este MVP resuelve cobertura por punto y no promete análisis poligonal.</p>
          </div>
          {intakeError ? <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{intakeError}</p> : null}
          <Button type="submit" data-testid="agronautas-submit-intake" disabled={isSubmitting}>{isSubmitting ? 'Registrando...' : 'Registrar lote'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function DashboardPanel({ selectedFieldId, field, risk, alerts, status, riskTimeline, weatherTimeline, dashboardPayload, hydrologyDashboard, chatResponse, hydrologyChatState, chatError, isChatPending, isHydrologyChatPending, recomputeStatus, isDashboardLoading, isRecomputePending, onSelectField, onRequestRecompute, onAskChat, onRetryChat, onAskHydrologyChat, onRetryHydrologyChat }: WorkspaceProps) {
  if (!selectedFieldId) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Dashboard listo para el primer lote</CardTitle>
          <CardDescription>Registrá un lote para ver score, frescura, drivers y alertas activas sin depender del copiloto.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isDashboardLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando panel del lote</CardTitle>
          <CardDescription>Sincronizando overview, snapshot y alertas.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const decisionLevel = risk?.snapshot.level ?? dashboardPayload?.risk.level ?? 'sin dato'
  const nextAction = risk?.snapshot.level === 'high' ? 'Revisar drivers de lluvia y estrés antes de operar el lote.' : 'Confirmar la próxima lectura con evidencia vigente.'

  return (
    <div id="agronautas-dashboard" className="grid gap-6">
      <section className="grid gap-5 rounded-[2rem] border border-emerald-900/20 bg-emerald-950 p-5 text-white shadow-lg md:grid-cols-[1.15fr,0.85fr] md:p-7" aria-labelledby="decision-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Resumen · {field?.externalFieldId ?? selectedFieldId}</p>
          <h2 id="decision-heading" className="mt-2 font-serif text-3xl font-semibold">Decisión del lote</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/80">Primero la decisión y su límite; después el detalle de señales, alertas y procedencia.</p>
          <div className="mt-5 flex flex-wrap gap-3"><a className="rounded-full bg-amber-200 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-100" href="#agronautas-alerts">Ver alertas</a><a className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" href="#agronautas-timeline">Ver timeline</a></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <VisibilityMetricCard label="Nivel de riesgo" value={String(decisionLevel)} detail={`Lectura ${risk?.snapshot.score ?? dashboardPayload?.risk.score ?? 'sin dato'}/100`} />
          <VisibilityMetricCard label="Confianza" value={risk ? `${Math.round(risk.snapshot.confidence * 100)}%` : 'Sin dato'} detail="Calculada por el backend" />
          <VisibilityMetricCard label="Siguiente acción" value="Revisar" detail={nextAction} />
          <VisibilityMetricCard label="Frescura" value={risk?.status ?? dashboardPayload?.freshness ?? 'missing'} detail={dashboardPayload?.lastDataFetchedAt ?? risk?.snapshot.computedAt ?? 'Sin fecha'} />
        </div>
      </section>

      <FreshnessBanner state={risk?.status ?? dashboardPayload?.freshness ?? 'missing'} lastSuccessfulAt={dashboardPayload?.lastDataFetchedAt ?? risk?.snapshot.computedAt} />

      <div className="grid gap-4 md:grid-cols-4" data-testid="agronautas-dashboard-metrics">
        <MetricCard label="Lote" value={field?.externalFieldId ?? selectedFieldId} detail={field?.locality ?? 'Sin localidad'} />
        <MetricCard label="Score" value={risk ? String(risk.snapshot.score) : '—'} detail={risk?.snapshot.level ?? 'Sin snapshot'} />
        <MetricCard label="Confianza" value={risk ? `${Math.round(risk.snapshot.confidence * 100)}%` : '—'} detail={risk?.status ?? 'Sin estado'} />
        <MetricCard label="Alertas" value={String(alerts?.alerts.length ?? 0)} detail={alerts?.status ?? 'Sin alertas'} />
      </div>

      {risk?.status === 'stale' ? (
        <Card className="border-amber-200 bg-amber-50" data-testid="agronautas-stale-banner">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-semibold text-amber-900">Snapshot stale detectado · Último dato obtenido: {formatDateTime(risk.snapshot.computedAt)}</p>
              <p className="text-sm text-amber-800">La UI no promete actualidad falsa y permite solicitar recompute {recomputeStatus?.status ?? alerts?.recompute?.status ?? risk.recompute?.status ?? 'pendiente'}.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onSelectField(selectedFieldId)}>Refrescar vista</Button>
              <Button onClick={() => void onRequestRecompute()} disabled={isRecomputePending}>{isRecomputePending ? 'Solicitando...' : 'Solicitar recompute'}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {dashboardPayload?.freshness === 'degraded' || risk?.status === 'degraded' ? (
        <Card className="border-rose-200 bg-rose-50" data-testid="agronautas-degraded-banner">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-semibold text-rose-900">Señal degradada detectada · Evidencia histórica provista como fallback honesto</p>
              <p className="text-sm text-rose-800">Los proveedores en tiempo real se encuentran caídos o inaccesibles. Mostrando datos persistidos en caché de corridas previas.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onSelectField(selectedFieldId)}>Sincronizar fuentes</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <HydrologyPanel dashboard={hydrologyDashboard} locality={field?.locality ?? null} hydrologyChatState={hydrologyChatState} isHydrologyChatPending={isHydrologyChatPending} onAskHydrologyChat={onAskHydrologyChat} onRetryHydrologyChat={onRetryHydrologyChat} />

      <NextFeaturesPanel dashboardPayload={dashboardPayload} />

      <Card data-testid="agronautas-persisted-payload-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Agronautas · payload persistido</CardTitle>
              <CardDescription>La exportación PDF usa el mismo estado de dashboard servido por API.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2"><a className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)]" href={`/demo/fields/${selectedFieldId}`}>Abrir detalle</a><a className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]" href={`/api/agronautas/v1/fields/${selectedFieldId}/dashboard.pdf`}>Exportar PDF</a></div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <MetricCard label="Frescura" value={`Frescura ${dashboardPayload?.freshness === 'fresh' ? 'fresh' : 'degradada'}`} detail={(dashboardPayload?.presentation.staleFlags.length ? dashboardPayload.presentation.staleFlags.join(', ') : status?.degradationReasons.join(', ') || risk?.snapshot.degradationReasons.join(', ') || 'Sin degradación')} />
          <MetricCard label="Fuentes" value={dashboardPayload?.provenance[0]?.provider ?? weatherTimeline?.items[0]?.provider ?? 'Sin fuente'} detail={dashboardPayload?.presentation.sourcesUnavailable ? 'Fuentes degradadas o no disponibles' : weatherTimeline?.items[0]?.staleCause ?? 'persistida'} />
          <MetricCard label="Último dato obtenido" value={formatDateTime(dashboardPayload?.lastDataFetchedAt ?? weatherTimeline?.items[0]?.observedAt ?? null)} detail={`Confianza ${dashboardPayload?.presentation.confidenceLabel ?? (risk ? confidenceLabel(risk.snapshot.confidence) : 'sin dato')}`} />
          <div className="rounded-2xl border border-[var(--border)] p-4 md:col-span-3">
            <p className="text-sm font-medium">Disclaimers e indicadores</p>
            <p className="text-sm text-[var(--muted-foreground)]">{dashboardPayload?.presentation.disclaimer ?? 'Los indicadores son soporte operativo y no reemplazan criterio agronómico local.'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card data-testid="agronautas-status-card">
          <CardHeader>
            <CardTitle>Estado monitoreo</CardTitle>
            <CardDescription>Fuente de verdad backend para frescura, alertas y última actualización.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <StatusRow label="Estado" value={status?.fieldStatus ?? 'Sin estado'} />
            <StatusRow label="Riesgo" value={status?.riskStatus ?? 'missing'} />
            <StatusRow label="Alertas" value={status?.alertsStatus ?? 'missing'} />
            <StatusRow label="Última actualización" value={status?.lastUpdatedAt ?? 'N/D'} />
          </CardContent>
        </Card>
        <Card id="agronautas-timeline" data-testid="agronautas-risk-timeline-card">
          <CardHeader>
            <CardTitle>Timeline de riesgo</CardTitle>
            <CardDescription>Snapshots persistidos para auditar score y vigencia.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {riskTimeline?.items.length ? riskTimeline.items.map((item) => (
              <div key={item.snapshotId} className="rounded-2xl border border-[var(--border)] p-3">
                <p className="font-medium">{item.computedAt}</p>
                <p>Score {item.score} · {item.level}</p>
              </div>
            )) : <p className="text-[var(--muted-foreground)]">Sin timeline persistido.</p>}
          </CardContent>
        </Card>
        <Card data-testid="agronautas-weather-timeline-card">
          <CardHeader>
            <CardTitle>Timeline climático</CardTitle>
            <CardDescription>Contexto backend para revisar frescura y señal usada.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {weatherTimeline?.items.length ? weatherTimeline.items.map((item) => (
              <div key={`${item.provider}-${item.observedAt}`} className="rounded-2xl border border-[var(--border)] p-3">
                <p className="font-medium">{item.provider}</p>
                <p>{item.observedAt}</p>
                <p>{item.temperatureC}°C · lluvia 7d {item.rainfallMm7d}mm</p>
              </div>
            )) : <p className="text-[var(--muted-foreground)]">Sin timeline climático persistido.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <Card data-testid="agronautas-risk-card">
          <CardHeader>
            <CardTitle>Drivers y evidencia</CardTitle>
            <CardDescription>Los drivers vienen del snapshot persistido, no del cliente.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {risk?.snapshot.drivers.map((driver) => (
              <div key={driver.key} className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{driver.label}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">Peso {Math.round(driver.weight * 100)}%</p>
                  </div>
                  <Badge variant={driver.value >= 0.75 ? 'destructive' : driver.value >= 0.5 ? 'warning' : 'success'}>{driver.value.toFixed(2)}</Badge>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-[var(--border)] p-4">
              <p className="mb-2 font-medium">Evidencia persistida</p>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]" data-testid="agronautas-evidence-list">
                {risk?.snapshot.evidenceRefs.map((ref) => <li key={ref}>• {ref}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card id="agronautas-alerts" data-testid="agronautas-alerts-card">
          <CardHeader>
            <CardTitle>Alertas actuales</CardTitle>
            <CardDescription>Se priorizan desde snapshots frescos o se etiquetan como stale si corresponde.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {alerts?.alerts.length ? alerts.alerts.map((alert) => (
              <div key={alert.alertId} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium">{toAlertLabel(alert.type)}</p>
                  <Badge variant={alert.freshness === 'stale' ? 'warning' : 'success'}>{alert.freshness}</Badge>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">Prioridad {alert.priority} · confianza {Math.round(alert.confidence * 100)}%</p>
                {alert.degradationReasons.length ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">Degradación: {alert.degradationReasons.join(', ')}</p> : null}
              </div>
            )) : <p className="text-sm text-[var(--muted-foreground)]">No hay alertas activas para este lote.</p>}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="agronautas-chat-card">
        <CardHeader>
          <CardTitle>Chat acotado con grounding backend</CardTitle>
          <CardDescription>Solo explica overview, riesgo, alertas o comparaciones aprobadas. Nunca reemplaza el dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              const message = String(formData.get('chatMessage') ?? '').trim()
              if (!message) return
              await onAskChat(message)
            }}
          >
            <Field label="Pregunta" name="chatMessage" placeholder="Explicá el riesgo actual del lote" />
            <Button type="submit" disabled={isChatPending}>{isChatPending ? 'Consultando...' : 'Preguntar al chat'}</Button>
          </form>

          {chatError ? <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{chatError}</p> : null}

          {chatResponse ? <ChatEvidencePanel response={chatResponse} onRetry={onRetryChat} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function NextFeaturesPanel({ dashboardPayload }: { dashboardPayload?: DashboardSnapshot }) {
  if (!dashboardPayload) return null

  const adminRows = buildIngestionAdminRows(dashboardPayload)
  const freshnessCards = buildSourceFreshnessCards(dashboardPayload)
  const operationalAlerts = deriveSafeOperationalAlerts(dashboardPayload)

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
      <Card data-testid="agronautas-ingestion-admin-panel">
        <CardHeader>
          <CardTitle>Panel de ingestión</CardTitle>
          <CardDescription>Control operativo por proveedor: modo resuelto, próxima corrida estimada y estado seguro de trigger.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {adminRows.map((row) => (
            <div key={`${row.provider}-${row.signalType}`} className="rounded-2xl border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{row.provider}</p>
                  <p className="text-[var(--muted-foreground)]">{row.signalType} · Próxima corrida {row.nextRunLabel}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={row.modeLabel === 'Live' ? 'success' : row.modeLabel === 'Fallback' ? 'destructive' : 'warning'}>{row.modeLabel}</Badge>
                  <Badge variant={row.currentState === 'Failed' || row.currentState === 'Stale' ? 'warning' : 'success'}>{row.currentState}</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[var(--muted-foreground)]">{row.reason}</p>
                <Button type="button" variant="outline" disabled={!row.triggerEnabled}>{row.triggerLabel}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card data-testid="agronautas-source-freshness-panel">
          <CardHeader>
            <CardTitle>Freshness monitor</CardTitle>
            <CardDescription>Señales por SLA investigado: clima, suelo y satélite para campos agrícolas de Corrientes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {freshnessCards.map((card) => (
              <div key={card.sourceLabel} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{card.sourceLabel}</p>
                  <Badge variant={card.freshnessLabel === 'fresh' ? 'success' : card.freshnessLabel === 'stale' ? 'warning' : 'destructive'}>{card.freshnessLabel}</Badge>
                </div>
                <p className="mt-2 text-[var(--muted-foreground)]">Último éxito {card.lastSuccessLabel} · Próximo {card.nextDueLabel} · {card.slaLabel}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="agronautas-operational-alerts-panel">
          <CardHeader>
            <CardTitle>Alertas operativas explícitas</CardTitle>
            <CardDescription>Anegamiento, estrés y heladas se muestran con marca de seguridad antes de notificaciones productivas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {operationalAlerts.map((alert) => (
              <div key={alert.label} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{alert.label}</p>
                  <Badge variant={alert.safetyLabel.includes('no producción') ? 'warning' : 'success'}>{alert.safetyLabel}</Badge>
                </div>
                <p className="mt-2 text-[var(--muted-foreground)]">{alert.stateLabel}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function HydrologyPanel({ dashboard, locality, hydrologyChatState, isHydrologyChatPending, onAskHydrologyChat, onRetryHydrologyChat }: { dashboard?: HydrologyDashboard; locality: string | null; hydrologyChatState: ChatStreamState; isHydrologyChatPending: boolean; onAskHydrologyChat: (message: string) => Promise<unknown>; onRetryHydrologyChat: () => Promise<unknown> }) {
  const zone = dashboard?.zone ?? locality ?? 'Zona no mapeada'
  const height = dashboard?.heights[0]
  const trend = dashboard?.trends[0] ?? height
  const lastSuccessful = dashboard?.status.lastSuccessfulObservedAt ?? height?.lastSuccessfulObservedAt ?? null

  return (
    <section className="grid gap-6" data-testid="agronautas-hydrology-panel">
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Agronautas · Tarjeta hidrológica {zone}</CardTitle>
              <CardDescription>Monitoreo PNA + INA + INMET + SMN como una señal más del riesgo agrícola persistido.</CardDescription>
            </div>
            <Badge variant={dashboard?.status.riskLevel === 'high' ? 'destructive' : dashboard?.status.riskLevel === 'moderate' ? 'warning' : 'success'}>{toRiskLabel(dashboard?.status.riskLevel)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-4">
            <HydrologyFact label="Altura actual" value={height ? `${height.value.toFixed(2)} ${height.unit}` : 'Sin dato'} detail={height?.stationId ?? 'PNA'} />
            <HydrologyFact label="Tendencia 24h" value={toTendencyLabel(trend?.tendency)} detail={trend ? `${trend.value} ${trend.unit}` : 'Sin variación'} />
            <HydrologyFact label="Umbral de alerta" value={thresholdForZone(zone).alert} detail="Referencia local operativa" />
            <HydrologyFact label="Umbral evacuación" value={thresholdForZone(zone).evacuation} detail="Referencia para logística crítica" />
          </div>

          <p className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-900">Último dato obtenido: {formatDateTime(lastSuccessful)}</p>

          <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
            <LocalAlertsCard dashboard={dashboard} zone={zone} />
            <ForecastCard forecasts={dashboard?.forecasts ?? []} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FutureFeatureCard title="Sentinel-1 inline" description="Próximamente: capa radar integrada en el mapa de Agronautas. Fase 1 no muestra links externos ni redirecciones." />
            <FutureFeatureCard title="Simulación interactiva" description="Próximamente: escenarios de inundación dentro del panel. Fase 1 evita controles hidráulicos personalizados." />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="agronautas-copilot-card">
        <CardHeader>
          <CardTitle>Copilot Hidrológico</CardTitle>
          <CardDescription>Seleccioná el lote activo y preguntá en español sobre riesgo de crecida, caminos, maquinaria o alertas locales. La respuesta se transmite en vivo con contexto oficial.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const message = String(new FormData(event.currentTarget).get('hydrologyMessage') ?? '').trim()
              if (!message) return
              await onAskHydrologyChat(message)
            }}
          >
            <Field label="Pregunta hidrológica" name="hydrologyMessage" placeholder="¿Qué riesgo de crecida tiene mi lote en los próximos 7 días?" />
            <Button type="submit" disabled={isHydrologyChatPending}>{isHydrologyChatPending ? 'Transmitiendo respuesta...' : 'Preguntar al Copilot Hidrológico'}</Button>
          </form>
          {hydrologyChatState.status !== 'idle' ? <ChatEvidencePanel stream={hydrologyChatState} onRetry={onRetryHydrologyChat} /> : null}
        </CardContent>
      </Card>
    </section>
  )
}

function LocalAlertsCard({ dashboard, zone }: { dashboard?: HydrologyDashboard; zone: string }) {
  const alerts = dashboard?.alerts ?? []
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Alertas locales · {zone}</CardTitle>
        <CardDescription>Las alertas aparecen solo dentro de la tarjeta de su zona o estación de referencia.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {alerts.length ? alerts.map((alert) => (
          <div key={`${alert.source}-${alert.stationId}-${alert.observedAt}`} className="rounded-2xl border border-[var(--border)] p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-medium">{stationLabel(alert.stationId)} · {alert.source}</p>
              <Badge variant="warning">Activa</Badge>
            </div>
            <p className="text-[var(--muted-foreground)]">Valor {alert.value} {alert.unit}. Último dato obtenido: {formatDateTime(alert.lastSuccessfulObservedAt)}</p>
          </div>
        )) : <p className="text-[var(--muted-foreground)]">No hay alertas activas para esta zona.</p>}
      </CardContent>
    </Card>
  )
}

function ForecastCard({ forecasts }: { forecasts: HydrologyItem[] }) {
  const visibleForecasts = forecasts.filter((item) => (item.forecastHorizonDays ?? 0) <= 30)
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Pronóstico INA en tabla HTML</CardTitle>
        <CardDescription>Alturas a 7-30 días visibles en el panel para evitar descargar y revisar PDFs estáticos.</CardDescription>
      </CardHeader>
      <CardContent>
        {visibleForecasts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[var(--muted-foreground)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 pr-3">Horizonte</th>
                  <th className="py-2 pr-3">Altura prevista</th>
                  <th className="py-2 pr-3">Confianza</th>
                  <th className="py-2 pr-3">Último dato obtenido</th>
                </tr>
              </thead>
              <tbody>
                {visibleForecasts.map((item) => (
                  <tr key={`${item.stationId}-${item.forecastHorizonDays}`} className="border-b border-[var(--border)]/70">
                    <td className="py-2 pr-3">Día {item.forecastHorizonDays}</td>
                    <td className="py-2 pr-3 font-medium">{item.value.toFixed(2)} {item.unit}</td>
                    <td className="py-2 pr-3">{item.confidence === 'speculative' ? 'Planificación especulativa / baja confianza' : 'Normal'}</td>
                    <td className="py-2 pr-3">{formatDateTime(item.lastSuccessfulObservedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-[var(--muted-foreground)]">Sin pronóstico INA disponible para esta estación.</p>}
      </CardContent>
    </Card>
  )
}

function HydrologyFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-emerald-200 bg-white p-4"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><p className="text-2xl font-semibold text-emerald-950">{value}</p><p className="text-sm text-[var(--muted-foreground)]">{detail}</p></div>
}

function FutureFeatureCard({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-4"><Badge variant="outline">Próximamente</Badge><p className="mt-3 font-medium">{title}</p><p className="text-sm text-[var(--muted-foreground)]">{description}</p></div>
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{detail}</p>
      </CardContent>
    </Card>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/10 px-4 py-3"><span className="text-white/70">{label}</span><span className="font-medium">{value}</span></div>
}

function Field({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  )
}

function parseOptional(value: FormDataEntryValue | null) {
  const parsed = String(value ?? '').trim()
  return parsed.length ? parsed : undefined
}

function cropLabel(crop: string) {
  const labels: Record<string, string> = { rice: 'Arroz', maize: 'Maíz', soybean: 'Soja', wheat: 'Trigo', sunflower: 'Girasol', pasture: 'Pastura', citrus: 'Cítricos', other: 'Otro' }
  return labels[crop] ?? crop
}

function toAlertLabel(type: string) {
  switch (type) {
    case 'flood': return 'Riesgo de anegamiento'
    case 'water_stress': return 'Estrés hídrico'
    case 'thermal_stress': return 'Estrés térmico'
    default: return type
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Sin fecha disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function confidenceLabel(confidence: number): 'alta' | 'media' | 'baja' {
  if (confidence >= 0.75) return 'alta'
  if (confidence >= 0.5) return 'media'
  return 'baja'
}

function toRiskLabel(level: HydrologyDashboard['status']['riskLevel'] | undefined) {
  switch (level) {
    case 'high': return 'Riesgo alto'
    case 'moderate': return 'Riesgo moderado'
    case 'low': return 'Riesgo bajo'
    default: return 'Riesgo sin clasificar'
  }
}

function toTendencyLabel(tendency: string | undefined) {
  const normalized = tendency?.toLowerCase()
  if (normalized?.includes('crece') || normalized?.includes('rising')) return 'Crece'
  if (normalized?.includes('baja') || normalized?.includes('falling')) return 'Baja'
  if (normalized?.includes('estable') || normalized?.includes('stable')) return 'Estable'
  return tendency ?? 'Sin tendencia'
}

function thresholdForZone(zone: string) {
  if (zone.toLowerCase().includes('ituzaing')) return { alert: '3,50 m', evacuation: '4,20 m' }
  if (zone.toLowerCase().includes('virasoro')) return { alert: 'Lluvia 70 mm/24h', evacuation: 'Corte de acceso' }
  return { alert: '5,60 m', evacuation: '6,20 m' }
}

function stationLabel(stationId: string) {
  return stationId.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
