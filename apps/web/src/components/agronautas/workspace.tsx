'use client'

import React from 'react'
import type { FieldIntake } from '@repo/zod-schemas'
import type { AlertsCurrent, FieldOverview, GroundedChatResponse, MonitoringStatus, RecomputeRequestResult, RiskCurrent, RiskTimelineResponse, WeatherTimelineResponse } from '@/lib/agronautas/schemas'
import { AGRONAUTAS_CONTRACT_VERSION } from '@/lib/agronautas/schemas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

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
  chatResponse?: GroundedChatResponse
  chatError: string | null
  isChatPending: boolean
  recomputeStatus?: RecomputeRequestResult
  isRecomputePending: boolean
  onSelectField: (fieldId: string | null) => void
  onSubmitIntake: (input: FieldIntake) => Promise<unknown>
  onRequestRecompute: () => Promise<unknown>
  onAskChat: (message: string) => Promise<unknown>
}

export function AgronautasWorkspace(props: WorkspaceProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <section className="grid gap-4 rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,#173622_0%,#2c6f45_55%,#dbb369_100%)] px-6 py-8 text-white shadow-lg md:grid-cols-[1.4fr,0.9fr] md:px-8">
        <div className="space-y-4">
          <Badge className="bg-white/15 text-white">Web MVP · Modo {props.runtimeMode === 'demo' ? 'demo' : 'real'}</Badge>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">Intake guiado, riesgo auditable y alertas frescura-aware para arroz en Corrientes.</h1>
          <p className="max-w-2xl text-sm text-white/85 md:text-base">La UI usa contratos compartidos, mantiene la lógica pesada fuera del cliente y expone confianza, degradación y evidencia de cada snapshot.</p>
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

      <section className="grid gap-6 xl:grid-cols-[420px,1fr]">
        <IntakePanel {...props} />
        <DashboardPanel {...props} />
      </section>
    </main>
  )
}

function IntakePanel({ intakeError, isSubmitting, onSubmitIntake }: WorkspaceProps) {
  async function handleSubmit(formData: FormData) {
    await onSubmitIntake({
      contractVersion: AGRONAUTAS_CONTRACT_VERSION,
      fieldId: String(formData.get('fieldId') ?? ''),
      crop: 'rice',
      hectares: Number(formData.get('hectares') ?? 0),
      locality: String(formData.get('locality') ?? ''),
      growthStage: parseOptional(formData.get('growthStage')) as FieldIntake['growthStage'],
      location: {
        lat: Number(formData.get('lat') ?? 0),
        lng: Number(formData.get('lng') ?? 0),
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alta guiada del lote</CardTitle>
        <CardDescription>Validación contract-first para `FieldIntake`, con rechazo explícito fuera de Corrientes arrocera.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          data-testid="agronautas-intake-form"
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            try {
              await handleSubmit(new FormData(event.currentTarget))
            } catch {
              // Error surface is handled in store state by the mutation.
            }
          }}
        >
          <Field label="ID externo" name="fieldId" placeholder="corrientes-lote-001" defaultValue="corrientes-lote-001" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Latitud" name="lat" type="number" step="0.0001" defaultValue="-29.1846" />
            <Field label="Longitud" name="lng" type="number" step="0.0001" defaultValue="-58.0759" />
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
          <Field label="Localidad declarada" name="locality" defaultValue="Mercedes" />
          {intakeError ? <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{intakeError}</p> : null}
          <Button type="submit" data-testid="agronautas-submit-intake" disabled={isSubmitting}>{isSubmitting ? 'Registrando...' : 'Registrar lote'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function DashboardPanel({ selectedFieldId, field, risk, alerts, status, riskTimeline, weatherTimeline, chatResponse, chatError, isChatPending, recomputeStatus, isDashboardLoading, isRecomputePending, onSelectField, onRequestRecompute, onAskChat }: WorkspaceProps) {
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

  return (
    <div className="grid gap-6">
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
              <p className="text-sm font-semibold text-amber-900">Snapshot stale detectado</p>
              <p className="text-sm text-amber-800">La UI no promete actualidad falsa y muestra el último snapshot con recompute {recomputeStatus?.status ?? alerts?.recompute?.status ?? risk.recompute?.status ?? 'pendiente'}.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onSelectField(selectedFieldId)}>Refrescar vista</Button>
              <Button onClick={() => void onRequestRecompute()} disabled={isRecomputePending}>{isRecomputePending ? 'Solicitando...' : 'Solicitar recompute'}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
        <Card data-testid="agronautas-risk-timeline-card">
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

        <Card data-testid="agronautas-alerts-card">
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

          {chatResponse ? (
            <div className="grid gap-3 rounded-2xl border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={chatResponse.degraded ? 'warning' : 'success'}>{chatResponse.degraded ? 'Degradado' : 'Grounded'}</Badge>
                <Badge variant="outline">{chatResponse.executedAction}</Badge>
              </div>
              <p className="text-sm">{chatResponse.answer}</p>
              {chatResponse.supportingFacts.length ? (
                <ul className="space-y-1 text-sm text-[var(--muted-foreground)]">
                  {chatResponse.supportingFacts.map((fact) => <li key={`${fact.label}-${fact.value}`}>• {fact.label}: {fact.value}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
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

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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

function toAlertLabel(type: string) {
  switch (type) {
    case 'flood': return 'Riesgo de anegamiento'
    case 'water_stress': return 'Estrés hídrico'
    case 'thermal_stress': return 'Estrés térmico'
    default: return type
  }
}
