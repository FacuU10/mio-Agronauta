'use client'

import { createElement, Fragment, useRef, useState, type InputHTMLAttributes } from 'react'
import type { FieldIntake } from '@repo/zod-schemas'
import { agronautasSupportedCrops } from '@repo/zod-schemas'
import type { AlertsCurrent, DashboardSnapshot, FieldGeometryResponse, FieldOverview, GroundedChatResponse, HydrologyDashboard, HydrologyItem, MonitoringStatus, RecomputeRequestResult, RiskCurrent, RiskTimelineResponse, WeatherTimelineResponse, AgronautasWorkspaceFieldPage, AgronautasWorkspaceContext, AgronautasActivityResponse, AgronautasIntelligence, CampaignPlanningContextResponse, AssumptionSimulationResponse, AssumptionSimulationRequest, AgronautasManagementItem, AgronautasManagementAuditItem } from '@/lib/agronautas/schemas'
import { AGRONAUTAS_CONTRACT_VERSION } from '@/lib/agronautas/schemas'
import { buildIngestionAdminRows, buildSourceFreshnessCards, deriveSafeOperationalAlerts } from '@/lib/agronautas/ingestion-status'
import { AGRONAUTAS_LOCALITIES, createAgronautasMapAdapter, previewAgronautasPoint } from '@/lib/agronautas/intake-map'
import { ProductShell } from '@/components/shell/product-shell'
import { EvidenceStateBadge, FreshnessBanner, MapFrame, StatusBadge, MetricCard as VisibilityMetricCard, VisibilityState } from '@/components/visibility/primitives'
import { FutureCapabilities } from '@/components/visibility/future-capabilities'
import type { ChatStreamState } from '@/lib/visibility/chat'
import type { AgronautasCanonicalLocation } from '@/lib/agronautas/schemas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EVIDENCE_STATE, normalizeEvidence, type EvidenceViewModel } from '@/lib/visibility/evidence-state'
import { ApiError } from '@/lib/api-client'
import { normalizeRequestError } from '@/lib/visibility/view-models'
import type { EvidenceDashboardModel, EvidenceSourceRecord } from '@/lib/agronautas/ingestion-status'
import { FieldGeometryEditor } from './field-geometry-editor'
import { ManagementPanel } from './management-panel'
import { LivestockPanel } from './livestock/livestock-panel'
import { PlanningPanel } from './planning-panel'
import { CopilotPanel } from './copilot-panel'
import { EvidencePanel } from './evidence-panel'
import { IntelligencePanel } from './intelligence-panel'
import { buildWorkspaceHref, OPERATIONAL_WORKSPACE_VIEWS, type OperationalWorkspaceView } from './workspace-navigation'

const React = { createElement, Fragment }

const AGRONAUTAS_INTAKE_ERROR_ID = 'agronautas-intake-error'
const AGRONAUTAS_CHAT_ERROR_ID = 'agronautas-chat-error'
const AGRONAUTAS_HYDROLOGY_CHAT_ERROR_ID = 'agronautas-hydrology-chat-error'
const focusVisibleClassName = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700'

const AGRONAUTAS_ACCESS_STATE_VALUES = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  DEMO: 'demo',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  UNAVAILABLE: 'unavailable',
  MAINTENANCE: 'maintenance',
} as const

export type AgronautasAccessState = (typeof AGRONAUTAS_ACCESS_STATE_VALUES)[keyof typeof AGRONAUTAS_ACCESS_STATE_VALUES]

const AGRONAUTAS_CAPABILITY_STATE_VALUES = {
  LOADING: 'loading',
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  ERROR: 'error',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
} as const

export type AgronautasCapabilityStateName = (typeof AGRONAUTAS_CAPABILITY_STATE_VALUES)[keyof typeof AGRONAUTAS_CAPABILITY_STATE_VALUES]

export interface AgronautasCapabilityState {
  state: AgronautasCapabilityStateName
  status?: number
  reason?: string
}

export interface AgronautasCapabilityStates {
  geometry: AgronautasCapabilityState
  activity: AgronautasCapabilityState
  intelligence: AgronautasCapabilityState
  hydrology: AgronautasCapabilityState
}

interface WorkspaceProps {
  accessState?: AgronautasAccessState
  accessReason?: string | null
  workspaceReady: boolean
  capabilityStates?: AgronautasCapabilityStates
  runtimeMode: 'real' | 'demo'
  runtimeStatus: 'loading' | 'ready' | 'error'
  runtimeError: string | null
  selectedFieldId: string | null
  selectedLocation: AgronautasCanonicalLocation | null
  selectionError: string | null
  isLocationResolving: boolean
  fieldIndex?: AgronautasWorkspaceFieldPage
  isFieldIndexLoading: boolean
  isFieldIndexFetchingNextPage: boolean
  hasNextFieldPage: boolean
  workspace?: AgronautasWorkspaceContext
  activity?: AgronautasActivityResponse
  managementItems: AgronautasManagementItem[]
  managementAudit: AgronautasManagementAuditItem[]
  isManagementLoading: boolean
  managementError: string | null
  isManagementMutating: boolean
  onRetryManagement: () => Promise<unknown>
  onCreateManagementOperation: (name: string) => Promise<unknown>
  onTransitionManagement: (item: AgronautasManagementItem) => Promise<unknown>
  intelligence?: AgronautasIntelligence
  planningContext?: CampaignPlanningContextResponse
  simulation?: AssumptionSimulationResponse
  isPlanningLoading: boolean
  isPlanningMutating: boolean
  planningError: string | null
  onRetryPlanning: () => Promise<unknown>
  onLoadPlanningContext: (input: { campaignName: string; season: string; fieldIds: string[] }) => Promise<unknown>
  onSimulateAssumptions: (input: AssumptionSimulationRequest) => Promise<unknown>
  lastCreatedFieldId: string | null
  intakeError: string | null
  isSubmitting: boolean
  isDashboardLoading: boolean
  queryErrors: string[]
  field?: FieldOverview
  risk?: RiskCurrent
  alerts?: AlertsCurrent
  status?: MonitoringStatus
  riskTimeline?: RiskTimelineResponse
  weatherTimeline?: WeatherTimelineResponse
   dashboardPayload?: DashboardSnapshot
   evidenceDashboard?: EvidenceDashboardModel
   evidenceDashboardError?: unknown
  hydrologyDashboard?: HydrologyDashboard
  geometry?: FieldGeometryResponse
  chatResponse?: GroundedChatResponse
  hydrologyChatState: ChatStreamState
  chatError: string | null
  isChatPending: boolean
  isHydrologyChatPending: boolean
  recomputeStatus?: RecomputeRequestResult
  isRecomputePending: boolean
  onSelectField: (fieldId: string | null) => void
  onLoadMoreFields: () => void
  onSubmitIntake: (input: FieldIntake) => Promise<unknown>
  onSaveGeometry?: (input: { polygonWkt: string; expectedUpdatedAt?: string }) => Promise<FieldGeometryResponse>
  onSelectPolygon?: (polygonWkt: string) => Promise<void>
  onRequestRecompute: () => Promise<unknown>
  onAskChat: (message: string) => Promise<unknown>
  onRetryChat: () => Promise<unknown>
  onAskHydrologyChat: (message: string) => Promise<unknown>
  onRetryHydrologyChat: () => Promise<unknown>
  onRetrySync: () => Promise<unknown>
  workspaceView: OperationalWorkspaceView
  workspaceBasePath: string
}

export function AgronautasWorkspace(props: WorkspaceProps) {
  if (props.accessState === 'unauthorized') {
    return <ProductShell product="agronautas" title="Workspace Agronautas" description="Acceso controlado al workspace Agronautas." navItems={[]}><div className="mx-auto max-w-4xl px-4 py-12"><VisibilityState state="unauthorized" title="Acceso Agronautas no autorizado" description="Este workspace requiere una sesión autorizada. La vista no muestra datos de producción mientras falta autenticación." /><a className="mt-4 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" href="/probar-demo">Solicitar entrada al demo</a></div></ProductShell>
  }

  if (props.accessState === 'loading') {
    return <ProductShell product="agronautas" title="Workspace Agronautas" description="Verificando el acceso controlado al workspace Agronautas." navItems={[]}><div className="mx-auto max-w-4xl px-4 py-12"><VisibilityState state="loading" title="Verificando autenticación Agronautas" description="Confirmando la sesión y el workspace antes de mostrar datos protegidos." retryAllowed={false} /></div></ProductShell>
  }

  if (props.accessState === 'forbidden') {
    return <ProductShell product="agronautas" title="Workspace Agronautas" description="Acceso restringido al workspace Agronautas." navItems={[]}><div className="mx-auto max-w-4xl px-4 py-12"><VisibilityState state="forbidden" title="Acceso Agronautas restringido" description={`Tu sesión no tiene permisos para este workspace (HTTP 403). Consultá al administrador para solicitar acceso.`} /></div></ProductShell>
  }

  if (props.accessState === 'unavailable') {
    return <ProductShell product="agronautas" title="Workspace Agronautas" description="Estado de disponibilidad del workspace Agronautas." navItems={[]}><div className="mx-auto max-w-4xl px-4 py-12"><VisibilityState state="error" title="Backend Agronautas no disponible" description={props.accessReason ?? 'No se pudo conectar con el backend. No se muestran datos como si fueran actuales.'} retryLabel="Reintentar conexión" onRetry={props.onRetrySync} /></div></ProductShell>
  }

  if (props.accessState === 'maintenance') {
    return <ProductShell product="agronautas" title="Workspace Agronautas" description="La autenticación Agronautas está en mantenimiento." navItems={[]}><div className="mx-auto max-w-4xl px-4 py-12"><VisibilityState state="error" title="Autenticación Agronautas en mantenimiento" description={props.accessReason ?? 'No se pudo probar la política de seguridad. Tus datos permanecen protegidos; intentá más tarde.'} retryAllowed={false} /></div></ProductShell>
  }

  const isDemo = props.runtimeMode === 'demo' || props.accessState === 'demo'
  const operationalNavItems = OPERATIONAL_WORKSPACE_VIEWS.map((view) => ({
    href: buildWorkspaceHref(view.key, props.selectedFieldId, props.workspaceBasePath),
    label: view.label,
    active: props.workspaceView === view.key,
  }))

  return (
    <ProductShell
      product="agronautas"
      title="Workspace Agronautas"
      description="De la ubicación del lote a una decisión verificable: cobertura por punto, nivel de riesgo, siguiente acción y evidencia contratada."
       navItems={[{ href: '#agronautas-intake', label: 'Nuevo lote' }, ...operationalNavItems, { href: '#agronautas-dashboard', label: 'Decisión' }, { href: '#agronautas-alerts', label: 'Alertas' }, { href: '#agronautas-timeline', label: 'Timeline' }]}
    >
    <div className="agronautas-canvas mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 rounded-[2rem] px-4 py-8 md:px-8">
      {props.workspaceReady ? <p role="status" aria-label="Workspace Agronautas listo" data-testid="agronautas-workspace-ready" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">Workspace Agronautas listo: sesión, runtime y contexto autorizados.</p> : null}
      <section className="grid gap-4 rounded-[32px] border border-emerald-950/20 bg-stone-950 px-6 py-8 text-white shadow-lg md:grid-cols-[1.4fr,0.9fr] md:px-8">
        <div className="space-y-4">
          <Badge className="bg-amber-200 text-stone-950">Web MVP · Modo {isDemo ? 'demo' : 'real'}</Badge>
          <h2 className="max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-5xl">Agronautas: dashboard de riesgo para el campo argentino.</h2>
          <p className="max-w-2xl text-sm text-white/85 md:text-base">Riesgo, frescura, fuentes y evidencia persistida para lotes agrícolas de Corrientes, sin reglas de negocio calculadas en el cliente.</p>
           {isDemo ? <p role="status" className="max-w-2xl rounded-2xl border border-amber-200/40 bg-amber-100/10 px-4 py-3 text-sm text-amber-100">DEMO LOCAL · SIN PERSISTENCIA. Los cambios de esta sesión son ilustrativos y no representan identidad, rol ni tenancy de producción.</p> : null}
        </div>
        <Card className="border-white/10 bg-white/10 text-white backdrop-blur">
          <CardHeader>
            <CardTitle>Estado operativo</CardTitle>
            <CardDescription className="text-white/75">Contrato {AGRONAUTAS_CONTRACT_VERSION} · React Query + Zustand</CardDescription>
          </CardHeader>
           <CardContent className="grid gap-3 text-sm" data-testid="agronautas-capability-status">
             <StatusRow label="Lote activo" value={props.selectedFieldId ?? 'Ninguno'} />
             <StatusRow label="Última alta" value={props.lastCreatedFieldId ?? 'Sin actividad'} />
             <StatusRow label="Alertas actuales" value={String(props.alerts?.alerts.length ?? 0)} />
             <StatusRow label="Runtime backend" value={props.runtimeStatus === 'ready' ? props.runtimeMode : props.runtimeStatus} />
             <StatusRow label="Fuentes y telemetría" value={props.dashboardPayload?.presentation.sourcesUnavailable ? 'degradado' : 'observado'} />
             {props.runtimeError ? <p role="alert" className="rounded-xl bg-rose-950/60 px-3 py-2 text-sm text-rose-100">{props.runtimeError}</p> : null}
              {props.queryErrors.length ? <div role="alert" aria-label="Error de capacidades Agronautas" className="rounded-xl bg-rose-950/60 px-3 py-2 text-sm text-rose-100"><p>Una capacidad no está disponible: {props.queryErrors[0]}</p><p className="mt-1 text-rose-200">Las demás capacidades continúan visibles con su último estado conocido.</p></div> : null}
             <Button type="button" variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20" onClick={() => void props.onRetrySync()}>Reintentar sincronización</Button>
           </CardContent>
        </Card>
      </section>

       <section className="grid gap-4" aria-label="Contexto de workspace Agronautas">
           <Card><CardHeader><CardTitle>Contexto de trabajo</CardTitle><CardDescription>{props.workspace ? `${props.workspace.name} · ${props.workspace.fieldCount} lotes en contexto predeterminado · Solo datos persistidos.` : 'Cargando contexto Agronautas…'}</CardDescription></CardHeader><CardContent><SelectionLineageState location={props.selectedLocation} error={props.selectionError} isResolving={props.isLocationResolving} /></CardContent></Card>
       </section>
        <section id="agronautas-intake" className="grid gap-6 xl:grid-cols-[420px,1fr]">
         <FieldIndexPanel index={props.fieldIndex} isLoading={props.isFieldIndexLoading} isFetchingNextPage={props.isFieldIndexFetchingNextPage} hasNextPage={props.hasNextFieldPage} onLoadMore={props.onLoadMoreFields} onSelectField={props.onSelectField} />
        <IntakePanel {...props} />
          <DashboardPanel {...props} />
       </section>
          <PlanningPanel fieldId={props.selectedFieldId ?? (props.runtimeMode === 'demo' ? 'field-demo-1' : props.fieldIndex?.items[0]?.fieldId ?? null)} planningContext={props.planningContext} simulation={props.simulation} isLoading={props.isPlanningLoading} isMutating={props.isPlanningMutating} error={props.planningError} onRetry={props.onRetryPlanning} onLoadPlanningContext={props.onLoadPlanningContext} onSimulateAssumptions={props.onSimulateAssumptions} />

          {props.workspaceView === 'livestock' ? (
            <section
              id="agronautas-livestock"
              tabIndex={-1}
              className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <LivestockPanel />
            </section>
          ) : null}

          <section id="agronautas-management" tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
            <ManagementPanel selectedFieldId={props.selectedFieldId} items={props.managementItems} audit={props.managementAudit} isLoading={props.isManagementLoading} error={props.managementError} isMutating={props.isManagementMutating} onRetry={props.onRetryManagement} onCreateOperation={props.onCreateManagementOperation} onTransition={props.onTransitionManagement} />
          </section>
         <FutureCapabilities product="agronautas" />
    </div>
    </ProductShell>
  )
}

function SelectionLineageState({ location, error, isResolving }: { location: AgronautasCanonicalLocation | null; error: string | null; isResolving: boolean }) {
  if (isResolving) return <p role="status">Confirmando selección autorizada…</p>
  if (error) return <p role="alert" aria-label="Selección de lote no disponible">Selección no disponible: {error}</p>
  if (!location) return <p role="status">Elegí un lote para confirmar su ubicación y alcance.</p>
  return <p role="status">Selección autorizada · {location.locationId} · {location.geometry.type} · cobertura {location.coverage.status}</p>
}

function LegacyPlanningPanel({ fieldIndex, planningContext, simulation, onLoadPlanningContext, onSimulateAssumptions }: WorkspaceProps) {
  const [campaignName, setCampaignName] = useState('Campaña demostrativa')
  const [season, setSeason] = useState('2026')
  const [areaHa, setAreaHa] = useState('10')
  const [yieldKg, setYieldKg] = useState('4000')
  const [price, setPrice] = useState('0.4')
  const [variableCost, setVariableCost] = useState('500')
  const [fixedCost, setFixedCost] = useState('200')
  const [error, setError] = useState<string | null>(null)
  const fieldId = fieldIndex?.items[0]?.fieldId
  const runSimulation = async () => {
    setError(null)
    const numericInputs = [areaHa, yieldKg, price, variableCost, fixedCost]
    const hasInvalidNumericInput = numericInputs.some((value) => value.trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0) || Number(areaHa) <= 0 || Number(yieldKg) <= 0
    if (hasInvalidNumericInput) {
      setError('Completá todos los supuestos con valores válidos antes de calcular.')
      return
    }
    try {
      await onSimulateAssumptions({ contractVersion: 'agronautas-assumption-simulation-v1', areaHa: Number(areaHa), expectedYieldKgPerHa: Number(yieldKg), pricePerKg: Number(price), variableCostPerHa: Number(variableCost), fixedCost: Number(fixedCost), currency: 'ARS', precision: 2, units: { area: 'ha', expectedYield: 'kg/ha', price: 'currency/kg', variableCost: 'currency/ha', fixedCost: 'currency' }, assumptions: ['Valores ingresados manualmente; no son datos observados.'] })
    } catch {
      setError('Completá todos los supuestos con valores válidos antes de calcular.')
    }
  }
  return <section id="agronautas-planning" className="grid gap-5" aria-label="Planificación de campaña Agronautas">
    <Card><CardHeader><CardTitle>Planificación de campaña</CardTitle><CardDescription>Contexto de solo lectura y simulación local con supuestos de la persona usuaria. No se guarda una campaña ni una relación de propiedad.</CardDescription></CardHeader><CardContent className="grid gap-4">
       <div className="grid gap-4 md:grid-cols-2"><Field label="Nombre de campaña" name="campaign-name" autoComplete="off" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /><Field label="Temporada" name="campaign-season" autoComplete="off" value={season} onChange={(event) => setSeason(event.target.value)} /></div>
        <Button type="button" className={focusVisibleClassName} onClick={() => void onLoadPlanningContext({ campaignName, season, fieldIds: [fieldId ?? 'field-demo-1'] })}>Ver contexto de lectura</Button>
       {planningContext ? <div role="status" className="grid gap-4 rounded-2xl border border-stone-200 p-4">
         <div>
           <p className="font-semibold">{planningContext.campaignName} · {planningContext.season}</p>
           <p className="text-sm">{planningContext.fields.length} lote(s) · persistencia: {planningContext.persistent ? 'sí' : 'no'}</p>
         </div>
         <div className="grid gap-2" aria-label="Datos de lotes seleccionados">
           <h3 className="font-semibold">Datos de lotes seleccionados</h3>
           <ul className="grid gap-3 sm:grid-cols-2">
             {planningContext.fields.map((field) => <li key={field.fieldId} className="rounded-xl border border-stone-200 p-3 text-sm">
               <p className="font-semibold">{field.externalFieldId}</p>
               <dl className="mt-2 grid gap-1 text-stone-700">
                 <div><dt className="inline font-medium">Cultivo: </dt><dd className="inline">{field.crop}</dd></div>
                 <div><dt className="inline font-medium">Área: </dt><dd className="inline">{field.hectares} ha</dd></div>
                 <div><dt className="inline font-medium">Localidad: </dt><dd className="inline">{field.locality}</dd></div>
                 <div><dt className="inline font-medium">Geometría: </dt><dd className="inline">{field.geometryStatus}</dd></div>
               </dl>
             </li>)}
           </ul>
         </div>
         <div className="grid gap-2" aria-label="Evidencia del contexto de planificación">
           <h3 className="font-semibold">Evidencia del contexto</h3>
           <ul className="grid gap-3 sm:grid-cols-2">
             {planningContext.evidence.map((item) => <li key={item.fieldId} className="grid gap-2 rounded-xl border border-stone-200 p-3 text-sm">
               <p className="font-semibold">{item.fieldId}</p>
               <PlanningEvidenceDetails label="Clima" evidence={item.climate} />
               <PlanningEvidenceDetails label="Riesgo" evidence={item.risk} />
             </li>)}
           </ul>
         </div>
         <ul className="grid gap-2 sm:grid-cols-2">{planningContext.availability.map((item: CampaignPlanningContextResponse['availability'][number]) => <li key={item.domain} className="rounded-xl border border-dashed border-stone-300 p-3 text-sm"><span className="font-semibold">{item.domain}</span>: {item.state}. {item.reason}</li>)}</ul>
       </div> : null}
       <div className="grid gap-4 border-t border-stone-200 pt-4"><div><h3 className="font-semibold">Simulador de supuestos</h3><p className="text-sm text-stone-600">Resultado aritmético transparente; no es pronóstico, recomendación ni dato de mercado.</p></div><div className="grid gap-4 md:grid-cols-3"><Field label="Área (ha)" name="simulation-area" type="number" min="0" step="0.01" value={areaHa} aria-describedby={error ? 'simulation-error' : undefined} onChange={(event) => setAreaHa(event.target.value)} /><Field label="Rendimiento supuesto (kg/ha)" name="simulation-yield" type="number" min="0" step="0.01" value={yieldKg} aria-describedby={error ? 'simulation-error' : undefined} onChange={(event) => setYieldKg(event.target.value)} /><Field label="Precio supuesto (ARS/kg)" name="simulation-price" type="number" min="0" step="0.01" value={price} aria-describedby={error ? 'simulation-error' : undefined} onChange={(event) => setPrice(event.target.value)} /><Field label="Costo variable (ARS/ha)" name="simulation-variable-cost" type="number" min="0" step="0.01" value={variableCost} aria-describedby={error ? 'simulation-error' : undefined} onChange={(event) => setVariableCost(event.target.value)} /><Field label="Costo fijo (ARS)" name="simulation-fixed-cost" type="number" min="0" step="0.01" value={fixedCost} aria-describedby={error ? 'simulation-error' : undefined} onChange={(event) => setFixedCost(event.target.value)} /></div><Button type="button" onClick={() => void runSimulation()}>Calcular supuesto</Button>{error ? <p id="simulation-error" role="alert">{error}</p> : null}{!error && simulation?.status === 'insufficient_evidence' ? <p id="simulation-insufficient-evidence" role="alert">Evidencia insuficiente: {simulation.reason} ({simulation.missingInputs.join(', ')})</p> : null}{!error && simulation?.status === 'complete' ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold">Simulación basada en supuestos de usuario</p><p className="text-sm">Etiqueta: {simulation.result.label} · moneda: {simulation.result.currency}</p><dl className="mt-3 grid gap-2 sm:grid-cols-4">{Object.entries(simulation.result.outputs).map(([key, value]) => <div key={key}><dt className="text-xs text-stone-600">{key}</dt><dd className="font-semibold">{value}</dd></div>)}</dl></div> : null}</div>
     </CardContent></Card>
   </section>
}

type PlanningEvidence = CampaignPlanningContextResponse['evidence'][number]['climate'] | CampaignPlanningContextResponse['evidence'][number]['risk']

function PlanningEvidenceDetails({ label, evidence }: { label: string; evidence: PlanningEvidence }) {
  if (evidence.state === 'unavailable') return <div><p className="font-medium">{label}: {evidence.state}</p><p className="text-stone-600">{evidence.reason}</p></div>
  return <div><p className="font-medium">{label}: {evidence.state}</p><p className="text-stone-600">Fuente: {evidence.source} · Frescura: {evidence.freshness}</p><p className="text-stone-600">Observado: {evidence.observedAt} · Proveniencia: {evidence.provenance.join(', ')}</p></div>
}

function FieldIndexPanel({ index, isLoading, isFetchingNextPage, hasNextPage, onLoadMore, onSelectField }: { index?: AgronautasWorkspaceFieldPage; isLoading: boolean; isFetchingNextPage: boolean; hasNextPage: boolean; onLoadMore: () => void; onSelectField: (fieldId: string) => void }) {
  return <Card className="xl:col-span-2" aria-label="Índice de lotes Agronautas"><CardHeader><CardTitle>Índice de lotes</CardTitle><CardDescription>Registros persistidos del contexto seleccionado, ordenados por última actualización. No se inventan lotes cuando la fuente está vacía.</CardDescription></CardHeader><CardContent>{isLoading || !index ? <p role="status">Cargando lotes…</p> : index.items.length === 0 ? <p role="status">No hay lotes disponibles.</p> : <><ul className="grid gap-3 md:grid-cols-2">{index.items.map((item) => <li key={item.fieldId} className="rounded-2xl border border-stone-200 p-4"><p className="font-semibold">{item.externalFieldId}</p><p className="text-sm text-stone-600">{item.locality} · {item.crop} · {item.hectares} ha</p><p className="mt-2 text-xs uppercase tracking-wide text-stone-500">Geometría: {item.geometryStatus === 'saved' ? 'guardada' : 'sólo punto'}</p><Button type="button" variant="outline" className="mt-3" onClick={() => onSelectField(item.fieldId)}>Abrir detalle</Button></li>)}</ul>{hasNextPage ? <Button type="button" variant="outline" className="mt-4" onClick={onLoadMore} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Cargando lotes…' : 'Cargar más lotes'}</Button> : null}</>}</CardContent></Card>
}

function IntakePanel({ intakeError, isSubmitting, onSubmitIntake }: WorkspaceProps) {
  const mapAdapter = createAgronautasMapAdapter()
  const defaultPoint = { lat: -29.1846, lng: -58.0759 }
  const [localityQuery, setLocalityQuery] = useState('Mercedes')
  const [selectedLocality, setSelectedLocality] = useState(AGRONAUTAS_LOCALITIES[0])
  const [point, setPoint] = useState(defaultPoint)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const submitInFlightRef = useRef(false)
  const coverage = previewAgronautasPoint(point)
  const matches = mapAdapter.searchLocalities(localityQuery)

  async function handleSubmit(form: HTMLFormElement) {
    const valueFor = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? ''
    const values = {
      fieldId: valueFor('fieldId'),
      locality: selectedLocality && localityQuery.trim() === selectedLocality.name ? selectedLocality.name : '',
      lat: valueFor('lat'),
      lng: valueFor('lng'),
      hectares: valueFor('hectares'),
      growthStage: valueFor('growthStage'),
      crop: valueFor('crop'),
    }
    const nextErrors = validateIntakeValues(values)
    if (Object.keys(nextErrors).length) {
      setValidationErrors(nextErrors)
      const firstInvalidField = Object.keys(nextErrors)[0]
      if (firstInvalidField) document.getElementById(firstInvalidField)?.focus()
      return
    }

    setValidationErrors({})
    await onSubmitIntake({
      contractVersion: AGRONAUTAS_CONTRACT_VERSION,
      fieldId: values.fieldId,
      cropCategory: 'cereal',
      crop: values.crop as FieldIntake['crop'],
      provinceCode: 'AR-W',
      countryCode: 'AR',
      hectares: Number(values.hectares),
      locality: values.locality,
      growthStage: parseOptional(values.growthStage) as FieldIntake['growthStage'],
      location: {
        lat: Number(values.lat || point.lat),
        lng: Number(values.lng || point.lng),
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
          aria-label="Alta de lote Agronautas"
          aria-describedby={intakeError ? AGRONAUTAS_INTAKE_ERROR_ID : undefined}
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (submitInFlightRef.current) return
            submitInFlightRef.current = true
            try {
               await handleSubmit(event.currentTarget)
            } catch {
              // Error surface is handled in store state by the mutation.
            } finally {
              submitInFlightRef.current = false
            }
          }}
        >
           <Field label="ID externo" name="fieldId" autoComplete="off" error={validationErrors['fieldId']} placeholder="corrientes-lote-001" defaultValue="corrientes-lote-001" />
          <div className="grid gap-2">
            <Label htmlFor="locality-search">Buscar localidad</Label>
              <Input id="locality-search" name="localityQuery" autoComplete="address-level2" aria-invalid={validationErrors['locality'] ? true : undefined} aria-describedby={validationErrors['locality'] ? 'locality-error' : undefined} value={localityQuery} onChange={(event) => setLocalityQuery(event.target.value)} placeholder="Mercedes" className={focusVisibleClassName} />
            {localityQuery.trim() ? <div className="grid gap-2" role="listbox" aria-label="Localidades sugeridas">{matches.map((locality) => <button className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-left text-sm hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" key={locality.id} type="button" role="option" aria-selected={selectedLocality?.id === locality.id} onClick={() => { setSelectedLocality(locality); setLocalityQuery(locality.name); if (locality.coordinates) setPoint(locality.coordinates) }}>{locality.name} · {locality.provinceCode}</button>)}</div> : null}
             <input type="hidden" name="locality" value={selectedLocality?.name ?? localityQuery} />
              {validationErrors['locality'] ? <p id="locality-error" role="alert" aria-live="assertive" aria-atomic="true">{validationErrors['locality']}</p> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
              <Field label="Latitud" name="lat" autoComplete="off" error={validationErrors['lat']} type="number" step="0.0001" defaultValue={point.lat} onChange={(event) => setPoint((current) => ({ ...current, lat: Number(event.target.value) }))} />
              <Field label="Longitud" name="lng" autoComplete="off" error={validationErrors['lng']} type="number" step="0.0001" defaultValue={point.lng} onChange={(event) => setPoint((current) => ({ ...current, lng: Number(event.target.value) }))} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hectáreas" name="hectares" autoComplete="off" error={validationErrors['hectares']} type="number" step="0.1" defaultValue="42.5" />
            <div className="grid gap-2">
              <Label htmlFor="growthStage">Etapa</Label>
                <Select id="growthStage" name="growthStage" autoComplete="off" aria-invalid={validationErrors['growthStage'] ? true : undefined} aria-describedby={validationErrors['growthStage'] ? 'growthStage-error' : undefined} className={focusVisibleClassName} defaultValue="tillering">
                <option value="emergence">Emergencia</option>
                <option value="tillering">Macollaje</option>
                <option value="panicle_initiation">Iniciación de panoja</option>
                <option value="flowering">Floración</option>
                <option value="maturity">Madurez</option>
               </Select>
                {validationErrors['growthStage'] ? <p id="growthStage-error" role="alert" aria-live="assertive" aria-atomic="true">{validationErrors['growthStage']}</p> : null}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="crop">Cultivo permitido</Label>
              <Select id="crop" name="crop" autoComplete="off" aria-invalid={validationErrors['crop'] ? true : undefined} aria-describedby={validationErrors['crop'] ? 'crop-error' : undefined} className={focusVisibleClassName} defaultValue="rice">
              {agronautasSupportedCrops.map((crop) => <option key={crop} value={crop}>{cropLabel(crop)}</option>)}
             </Select>
              {validationErrors['crop'] ? <p id="crop-error" role="alert" aria-live="assertive" aria-atomic="true">{validationErrors['crop']}</p> : null}
          </div>
          <div className="grid gap-3">
            <MapFrame title="Previsualización de cobertura" fallback={`${selectedLocality?.name ?? 'Localidad no seleccionada'} · ${coverage.provinceCode ?? 'sin provincia'} · ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}>
              <div className="flex flex-wrap items-center gap-2"><StatusBadge state={coverage.state === 'inside' ? 'success' : coverage.state === 'outside' ? 'missing' : 'degraded'} /><span className="text-sm text-stone-700">Cobertura por punto · {coverage.locality ?? 'fuera del alcance previsualizado'}</span></div>
            </MapFrame>
            <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-600">`polygonWkt` se conserva en el contrato, pero este MVP resuelve cobertura por punto y no promete análisis poligonal.</p>
            <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-600">Google Maps no está disponible sin una clave pública restringida; la búsqueda por localidad y coordenadas continúa operativa.</p>
          </div>
           {intakeError ? <p id={AGRONAUTAS_INTAKE_ERROR_ID} role="alert" aria-label="Error de intake Agronautas" aria-live="assertive" aria-atomic="true" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{intakeError}</p> : null}
           <Button type="submit" className={focusVisibleClassName} data-testid="agronautas-submit-intake" disabled={isSubmitting}>{isSubmitting ? 'Registrando…' : 'Registrar lote'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function DashboardPanel({ selectedFieldId, field, risk, alerts, status, riskTimeline, weatherTimeline, dashboardPayload, evidenceDashboard, evidenceDashboardError, hydrologyDashboard, geometry, activity, intelligence, capabilityStates, onSaveGeometry, onSelectPolygon, chatResponse, hydrologyChatState, chatError, isChatPending, isHydrologyChatPending, recomputeStatus, isDashboardLoading, isRecomputePending, onSelectField, onRequestRecompute, onAskChat, onRetryChat, onAskHydrologyChat, onRetryHydrologyChat, onRetrySync }: WorkspaceProps) {
  const [chatValidationError, setChatValidationError] = useState<string | null>(null)

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
        <section id="agronautas-geometry" tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" aria-label="Geometría del lote">
          {geometry && onSaveGeometry ? <FieldGeometryEditor fieldId={selectedFieldId} initialGeometry={geometry} onSave={async (input) => onSaveGeometry({ polygonWkt: input.polygonWkt ?? '', expectedUpdatedAt: input.expectedUpdatedAt })} onSelectPolygon={onSelectPolygon} /> : <CapabilityUnavailableState capability={capabilityStates?.geometry} label="Geometría" onRetry={onRetrySync} />}
        </section>
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

       <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4" data-testid="agronautas-dashboard-metrics">
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
               <Button onClick={() => void onRequestRecompute()} disabled={isRecomputePending}>{isRecomputePending ? 'Solicitando…' : 'Solicitar recompute'}</Button>
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

       <section id="agronautas-copilot" tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" aria-label="Copilot Agronautas">
         <HydrologyPanel dashboard={hydrologyDashboard} availability={capabilityStates?.hydrology} locality={field?.locality ?? null} hydrologyChatState={hydrologyChatState} isHydrologyChatPending={isHydrologyChatPending} onAskHydrologyChat={onAskHydrologyChat} onRetryHydrologyChat={onRetryHydrologyChat} />
       </section>

       <section id="agronautas-evidence" tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" aria-label="Evidencia Agronautas">
          <EvidencePanel model={evidenceDashboard} error={evidenceDashboardError} onRetry={onRetrySync} />
       </section>

       <AgronautasEvidenceStatePanel dashboardPayload={dashboardPayload} hydrologyDashboard={hydrologyDashboard} risk={risk} />

       <section id="agronautas-intelligence" tabIndex={-1} className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" aria-label="Inteligencia Agronautas">
         <IntelligencePanel intelligence={intelligence} availability={capabilityStates?.intelligence} onRetry={onRetrySync} />
       </section>

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

      <Card id="agronautas-activity" data-testid="agronautas-activity-card">
        <CardHeader><CardTitle>Actividad derivada de fuentes</CardTitle><CardDescription>No es historial autoral: muestra únicamente registros persistidos de campo, riesgo, alertas, ingestión y recompute.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {capabilityStates?.activity && capabilityStates.activity.state !== 'available' && capabilityStates.activity.state !== 'loading' ? <CapabilityUnavailableState capability={capabilityStates.activity} label="Actividad" onRetry={onRetrySync} /> : activity?.items.length ? activity.items.map((item) => <div key={item.activityId} className="rounded-2xl border border-[var(--border)] p-3"><p className="font-medium">{item.title}</p><p className="text-[var(--muted-foreground)]">{item.sourceType} · {item.sourceId} · {formatDateTime(item.occurredAt)}</p></div>) : <p role="status">Sin actividad fuente para este lote.</p>}
        </CardContent>
      </Card>

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

       <Card data-testid="agronautas-chat-card" aria-label="Chat Agronautas">
        <CardHeader>
          <CardTitle>Chat acotado con grounding backend</CardTitle>
          <CardDescription>Solo explica overview, riesgo, alertas o comparaciones aprobadas. Nunca reemplaza el dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
           <form
             aria-label="Consulta al chat Agronautas"
             aria-describedby={chatError ? AGRONAUTAS_CHAT_ERROR_ID : undefined}
             className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault()
               const formData = new FormData(event.currentTarget)
               const message = String(formData.get('chatMessage') ?? '').trim()
               if (!message) {
                 setChatValidationError('Escribí una pregunta antes de consultar el chat.')
                 document.getElementById('chatMessage')?.focus()
                 return
               }
               setChatValidationError(null)
               await onAskChat(message)
             }}
           >
             <Field label="Pregunta" name="chatMessage" autoComplete="off" error={chatValidationError ?? undefined} placeholder="Explicá el riesgo actual del lote" />
             <Button type="submit" className={focusVisibleClassName} disabled={isChatPending}>{isChatPending ? 'Consultando…' : 'Preguntar al chat'}</Button>
           </form>

           {chatError ? <p id={AGRONAUTAS_CHAT_ERROR_ID} role="alert" aria-live="assertive" aria-atomic="true" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{chatError}</p> : null}

           {chatResponse ? <CopilotPanel response={chatResponse} onRetry={onRetryChat} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function CapabilityUnavailableState({ capability, label, onRetry }: { capability?: AgronautasCapabilityState; label: string; onRetry: () => Promise<unknown> }) {
  if (!capability || capability.state === 'available') return null
  if (capability.state === 'loading') return <VisibilityState state="loading" title={`Cargando ${label.toLowerCase()}`} description={`Sincronizando ${label.toLowerCase()} con el contrato disponible.`} retryAllowed={false} />
  const isNotFound = capability.state === 'unavailable' && capability.status === 404
  const isBoundary = isNotFound || capability.state === 'unauthorized' || capability.state === 'forbidden'
  const boundaryDescription = capability.state === 'unauthorized'
    ? `La capacidad de ${label.toLowerCase()} requiere autenticación (HTTP 401). No se muestra información de producción.`
    : capability.state === 'forbidden'
      ? `Tu sesión no tiene permisos para ${label.toLowerCase()} (HTTP 403). No se sustituye con otra capacidad.`
      : undefined
  const description = isNotFound
    ? `El endpoint de ${label.toLowerCase()} respondió HTTP 404. Esta capacidad no está disponible en el contrato actual; no se reemplaza con datos fabricados.`
    : boundaryDescription ?? capability.reason ?? `No se pudo cargar ${label.toLowerCase()} desde el backend.`
  const state = capability.state === 'unauthorized' || capability.state === 'forbidden' ? capability.state : capability.state === 'unavailable' ? 'missing' : 'error'
  const title = capability.state === 'unauthorized' ? `${label} requiere autenticación` : capability.state === 'forbidden' ? `${label} restringida` : `${label} no disponible`
  return <VisibilityState state={state} title={title} description={description} retryLabel={`Reintentar ${label.toLowerCase()}`} retryAllowed={!isBoundary} onRetry={isBoundary ? undefined : () => void onRetry()} />
}

function LegacyIntelligencePanel({ intelligence, availability, onRetry }: { intelligence?: AgronautasIntelligence; availability?: AgronautasCapabilityState; onRetry: () => Promise<unknown> }) {
  if (!intelligence) return <CapabilityUnavailableState capability={availability} label="Inteligencia" onRetry={onRetry} />
  const recommendationReason = 'reason' in intelligence.recommendation ? intelligence.recommendation.reason : 'No hay evidencia suficiente para una recomendación.'
  const recommendationInputs = 'missingInputs' in intelligence.recommendation ? intelligence.recommendation.missingInputs ?? [] : []
  const capabilities = [
    ['Suelo', intelligence.soil], ['Precios', intelligence.prices], ['Dólar / FX', intelligence.dollar], ['Economía', intelligence.economics],
  ] as const
  return <section className="grid gap-4 rounded-[2rem] border border-amber-900/20 bg-amber-50 p-5" aria-label="Inteligencia económica basada en evidencia" data-testid="agronautas-intelligence-panel">
    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900">Inteligencia económica</p><h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">Explicación climática y riesgo sin inventar datos</h2><p className="mt-2 text-sm text-stone-700">Fuente {intelligence.climate.state === 'available' ? intelligence.climate.metadata.source : 'no disponible'} · selección de motor de riesgo: {intelligence.risk.state === 'available' ? intelligence.risk.value.engine.selectionStatus : 'no disponible'}</p></div>
    <div className="grid gap-3 md:grid-cols-4">{capabilities.map(([label, capability]) => <div key={label} className="rounded-2xl border border-amber-900/15 bg-white p-4"><div className="flex items-center justify-between gap-2"><p className="font-medium text-stone-900">{label}</p><Badge variant={capability.state === 'available' ? 'success' : 'warning'}>{capability.state}</Badge></div><p className="mt-2 text-sm text-stone-600">{'reason' in capability ? capability.reason : 'Observación respaldada con metadata de fuente, unidad y lineage.'}</p></div>)}</div>
    <div className="rounded-2xl border border-amber-900/20 bg-white p-4"><p className="font-semibold text-stone-950">Recomendación bloqueada</p><p className="mt-1 text-sm text-stone-700">{recommendationReason}</p><ul className="mt-2 list-disc pl-5 text-sm text-stone-700">{recommendationInputs.map((input) => <li key={input}>{input}</li>)}</ul></div>
   </section>
}

function LegacyEvidenceDashboardPanel({ model, error, onRetry }: { model?: EvidenceDashboardModel; error?: unknown; onRetry: () => Promise<unknown> }) {
  if (error) {
    const outcome = normalizeRequestError(error)
    const status = error instanceof ApiError ? error.status : outcome.httpStatus
    const isUnauthorized = status === 401
    const isForbidden = status === 403
    const isNotFound = status === 404
    const state = isUnauthorized ? 'unauthorized' : isForbidden ? 'forbidden' : isNotFound ? 'missing' : 'error'
    const title = isUnauthorized
      ? 'Evidencia requiere autenticación'
      : isForbidden
        ? 'Evidencia restringida'
        : isNotFound
          ? 'Evidencia no disponible'
          : `Evidencia no disponible${status ? ` (HTTP ${status})` : ''}`
    const description = isUnauthorized
      ? 'La respuesta HTTP 401 no permite leer evidencia. Iniciá sesión; no se reemplaza el contenido con demo.'
      : isForbidden
        ? 'La respuesta HTTP 403 mantiene el límite de workspace/campo. No se muestra evidencia de otra sesión.'
        : isNotFound
          ? 'La API no devolvió un contrato de evidencia para este campo. No se inventan fuentes ni readiness.'
          : `${outcome.reason}. La vista conserva el alcance seleccionado y permite reintentar sin usar datos simulados.`
    return <section data-testid="agronautas-evidence-dashboard" aria-label="Dashboard de evidencia Agronautas" className="grid gap-4">
      <Card className="border-rose-200 bg-rose-50"><CardHeader><CardTitle>Dashboard de evidencia</CardTitle><CardDescription>Respuesta real de API/BFF</CardDescription></CardHeader><CardContent><VisibilityState state={state} title={title} description={description} retryAllowed={!isUnauthorized && !isForbidden && !isNotFound} retryLabel="Reintentar evidencia" onRetry={() => void onRetry()} /></CardContent></Card>
    </section>
  }

  if (!model) return null

  return <section data-testid="agronautas-evidence-dashboard" aria-label="Dashboard de evidencia Agronautas" className="grid gap-5">
    <Card>
      <CardHeader>
        <CardTitle>Evidencia por fuente</CardTitle>
        <CardDescription>Contrato location-scoped servido por API/BFF. Cada fuente conserva su modo, tiempos, confianza, lineage y próxima acción.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {model.overallState === 'empty' ? <div role="status"><VisibilityState state="empty" title="Sin registros de evidencia" description="La API respondió un conjunto vacío para el campo seleccionado. Empty no es fallo y no se completa con datos demo." retryAllowed={true} retryLabel="Reintentar evidencia" onRetry={() => void onRetry()} /></div> : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {model.sources.map((source) => <EvidenceSourceCard key={`${source.key}-${source.provider}-${source.signalType}`} source={source} />)}
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card data-testid="agronautas-ingestion-records">
        <CardHeader><CardTitle>Registros de ingestión</CardTitle><CardDescription>Runs y reintentos devueltos por el contrato; no se deduce éxito desde HTTP 200.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {model.ingestion.length ? model.ingestion.map((record) => <div key={`${record.provider}-${record.signalType}-${record.runId ?? record.state}`} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{record.provider} · {record.signalType}</p><Badge variant={record.state === 'succeeded' ? 'success' : record.state === 'failed' ? 'destructive' : 'warning'}>{record.state}</Badge></div><p className="mt-2 break-words text-[var(--muted-foreground)]">Run {record.runId ?? 'no disponible'} · retrieved {formatDateTime(record.retrievedAt)} · próximo {formatDateTime(record.nextDueAt)}</p><p className="mt-2 text-[var(--muted-foreground)]">{record.reason ?? (record.retryable ? 'Reintento permitido por el contrato.' : 'Sin reintento permitido.')}</p></div>) : <p role="status">La respuesta no incluyó registros de ingestión; no se inventan corridas.</p>}
        </CardContent>
      </Card>
      <Card data-testid="agronautas-readiness-records">
        <CardHeader><CardTitle>Readiness por fuente</CardTitle><CardDescription>Solo se muestra readiness emitido por backend con evidencia y run lineage.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {model.readiness.length ? model.readiness.map((record) => <div key={`${record.source}-${record.productSlice}`} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{record.source} · {record.productSlice}</p><Badge variant={record.state === 'ready' ? 'success' : 'warning'}>{record.state}</Badge></div><p className="mt-2 break-words text-[var(--muted-foreground)]">Evaluado {formatDateTime(record.evaluatedAt)} · evidence {record.evidenceRefs.join(', ') || 'no disponible'} · runs {record.runIds.join(', ') || 'no disponible'}</p>{record.reason ? <p className="mt-2 text-[var(--muted-foreground)]">{record.reason}</p> : null}</div>) : <p role="status">Readiness no fue devuelto por la API; no se eleva ningún estado desde el cliente.</p>}
        </CardContent>
      </Card>
    </div>
  </section>
}

function EvidenceSourceCard({ source }: { source: EvidenceSourceRecord }) {
  const variant = source.status === 'fresh' ? 'success' : source.status === 'unavailable' || source.status === 'missing' ? 'destructive' : 'warning'
  return <article className="min-w-0 rounded-2xl border border-[var(--border)] p-4" aria-label={`${source.label} evidence`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold">{source.label}</p><p className="break-words text-xs text-[var(--muted-foreground)]">{source.provider} · {source.signalType}</p></div><Badge variant={variant}>{source.status}</Badge></div>
    <dl className="mt-3 grid gap-1 text-xs leading-5 text-[var(--muted-foreground)]">
      <div><dt className="inline font-medium text-[var(--foreground)]">Modo: </dt><dd className="inline">{source.providerMode}</dd></div>
      <div><dt className="inline font-medium text-[var(--foreground)]">Observed: </dt><dd className="inline">{formatDateTime(source.observedAt)}</dd></div>
      <div><dt className="inline font-medium text-[var(--foreground)]">Acquired: </dt><dd className="inline">{formatDateTime(source.acquiredAt)}</dd></div>
      <div><dt className="inline font-medium text-[var(--foreground)]">Forecast: </dt><dd className="inline">{formatDateTime(source.forecastAt)}</dd></div>
      <div><dt className="inline font-medium text-[var(--foreground)]">Retrieved: </dt><dd className="inline">{formatDateTime(source.retrievedAt)}</dd></div>
      <div><dt className="inline font-medium text-[var(--foreground)]">Confidence: </dt><dd className="inline">{source.confidence === null ? 'No provista' : `${Math.round(source.confidence * 100)}%`}</dd></div>
      <div><dt className="inline font-medium text-[var(--foreground)]">Lineage: </dt><dd className="inline break-all">{source.runId ?? 'No disponible'}</dd></div>
      <div><dt className="inline font-medium text-[var(--foreground)]">Source: </dt><dd className="inline break-all">{source.sourceUrl ?? source.sourceKey ?? 'No disponible'}</dd></div>
    </dl>
    {source.degradationReasons.length ? <p className="mt-3 break-words text-xs text-amber-800">Límite: {source.degradationReasons.join(', ')}</p> : null}
    <p className="mt-3 text-xs font-medium text-stone-700">Siguiente acción: {source.nextAction}</p>
  </article>
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

function HydrologyPanel({ dashboard, availability, locality, hydrologyChatState, isHydrologyChatPending, onAskHydrologyChat, onRetryHydrologyChat }: { dashboard?: HydrologyDashboard; availability?: AgronautasCapabilityState; locality: string | null; hydrologyChatState: ChatStreamState; isHydrologyChatPending: boolean; onAskHydrologyChat: (message: string) => Promise<unknown>; onRetryHydrologyChat: () => Promise<unknown> }) {
  const [hydrologyChatValidationError, setHydrologyChatValidationError] = useState<string | null>(null)

  if (!dashboard && availability && availability.state !== 'available' && availability.state !== 'loading') {
    return <section className="grid gap-6" data-testid="agronautas-hydrology-panel"><Card className="border-amber-200 bg-amber-50"><CardHeader><CardTitle>Agronautas · Hidrología</CardTitle><CardDescription>La señal hidrológica conserva su límite contractual y no se sustituye con otra zona o fuente.</CardDescription></CardHeader><CardContent><CapabilityUnavailableState capability={availability} label="Hidrología" onRetry={onRetryHydrologyChat} /></CardContent></Card></section>
  }

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
            <HydrologyFact label="Umbral de alerta" value="No disponible" detail="El contrato hidrológico actual no informa umbrales." />
            <HydrologyFact label="Umbral de evacuación" value="No disponible" detail="El contrato hidrológico actual no informa umbrales." />
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
             aria-label="Consulta al Copilot Hidrológico"
             aria-describedby={hydrologyChatState.error ? AGRONAUTAS_HYDROLOGY_CHAT_ERROR_ID : undefined}
             className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault()
               const message = String(new FormData(event.currentTarget).get('hydrologyMessage') ?? '').trim()
               if (!message) {
                 setHydrologyChatValidationError('Escribí una pregunta antes de consultar el Copilot Hidrológico.')
                 document.getElementById('hydrologyMessage')?.focus()
                 return
               }
               setHydrologyChatValidationError(null)
               await onAskHydrologyChat(message)
             }}
           >
             <Field label="Pregunta hidrológica" name="hydrologyMessage" autoComplete="off" error={hydrologyChatValidationError ?? undefined} placeholder="¿Qué riesgo de crecida tiene mi lote en los próximos 7 días?" />
             <Button type="submit" className={focusVisibleClassName} disabled={isHydrologyChatPending}>{isHydrologyChatPending ? 'Transmitiendo respuesta…' : 'Preguntar al Copilot Hidrológico'}</Button>
          </form>
            {hydrologyChatState.status !== 'idle' ? <div id={AGRONAUTAS_HYDROLOGY_CHAT_ERROR_ID}><CopilotPanel stream={hydrologyChatState} onRetry={onRetryHydrologyChat} /></div> : null}
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

interface IntakeValues {
  fieldId: string
  locality: string
  lat: string
  lng: string
  hectares: string
  growthStage: string
  crop: string
}

function validateIntakeValues(values: IntakeValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!values.fieldId.trim()) errors['fieldId'] = 'El ID externo es obligatorio.'
  if (!values.locality.trim()) errors['locality'] = 'Seleccioná una localidad.'
  if (!values.lat.trim() || !Number.isFinite(Number(values.lat))) errors['lat'] = 'Ingresá una latitud válida.'
  if (!values.lng.trim() || !Number.isFinite(Number(values.lng))) errors['lng'] = 'Ingresá una longitud válida.'
  if (!values.hectares.trim() || !Number.isFinite(Number(values.hectares)) || Number(values.hectares) <= 0) errors['hectares'] = 'Ingresá una superficie mayor que cero.'
  if (!values.growthStage.trim()) errors['growthStage'] = 'Seleccioná una etapa del cultivo.'
  if (!values.crop.trim()) errors['crop'] = 'Seleccioná un cultivo permitido.'
  return errors
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: string
}

function Field({ label, name, error, className, ...props }: FieldProps) {
  const errorId = `${name}-error`
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        {...props}
        id={name}
        name={name}
        autoComplete={props.autoComplete ?? 'off'}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={error ? errorId : props['aria-describedby']}
        className={`${focusVisibleClassName}${className ? ` ${className}` : ''}`}
      />
      {error ? <p id={errorId} role="alert" aria-label={`Error de formulario: ${label}`} aria-live="assertive" aria-atomic="true">{error}</p> : null}
    </div>
  )
}

function parseOptional(value: FormDataEntryValue | null) {
  const parsed = String(value ?? '').trim()
  return parsed.length ? parsed : undefined
}

function AgronautasEvidenceStatePanel({ dashboardPayload, hydrologyDashboard, risk }: { dashboardPayload?: DashboardSnapshot; hydrologyDashboard?: HydrologyDashboard; risk?: RiskCurrent }) {
  const weather = dashboardPayload?.provenance.find((item) => item.signalType === 'weather')
  const missingSignal = dashboardPayload?.signals.find((item) => item.status === 'missing')
  const forecast = hydrologyDashboard?.forecasts[0]
  const items: Array<{ label: string; evidence: EvidenceViewModel }> = [
    { label: 'Risk snapshot', evidence: normalizeEvidence({ state: EVIDENCE_STATE.OBSERVED, source: 'Agronautas risk snapshot', observedAt: risk?.snapshot.computedAt }) },
    { label: 'INA forecast', evidence: normalizeEvidence({ source: forecast?.source, observedAt: forecast?.observedAt, forecast: true }) },
    { label: 'Latest-good cache', evidence: normalizeEvidence({ state: EVIDENCE_STATE.CACHED, source: weather?.provider, lastSuccessfulObservedAt: weather?.lastSuccessfulObservedAt }) },
    { label: 'Risk freshness', evidence: normalizeEvidence({ state: risk?.status === 'stale' ? EVIDENCE_STATE.STALE : EVIDENCE_STATE.DEGRADED, source: 'Agronautas risk snapshot', lastSuccessfulObservedAt: risk?.snapshot.computedAt }) },
    { label: 'Dashboard availability', evidence: normalizeEvidence({ state: dashboardPayload?.freshness === 'degraded' ? EVIDENCE_STATE.DEGRADED : EVIDENCE_STATE.MISSING, detail: dashboardPayload?.presentation.staleFlags.join(', ') }) },
    { label: 'Provider mode', evidence: normalizeEvidence({ source: weather?.provider, observedAt: weather?.observedAt, mode: weather?.providerMode === 'mock' ? 'mock' : weather?.providerMode === 'seam' ? 'seam' : 'unavailable' }) },
    { label: 'Satellite signal', evidence: normalizeEvidence({ state: missingSignal ? EVIDENCE_STATE.MISSING : EVIDENCE_STATE.OBSERVED, source: 'satellite-vegetation', observedAt: missingSignal ? undefined : dashboardPayload?.generatedAt, detail: missingSignal?.degradationReasons.join(', ') }) },
  ]

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5" aria-label="Estados de evidencia Agronautas">
      <h2 className="text-xl font-semibold">Estados de evidencia</h2>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">Cada estado conserva la diferencia entre dato observado, pronóstico, cacheado y seam sin afirmar una adquisición nueva.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => <li key={item.label} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3"><span className="text-sm font-medium">{item.label}</span><EvidenceStateBadge state={item.evidence.state} /></li>)}
      </ul>
    </section>
  )
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

function stationLabel(stationId: string) {
  return stationId.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
