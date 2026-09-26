'use client'

import { createElement, useState } from 'react'
import type { AssumptionSimulationRequest, AssumptionSimulationResponse, CampaignPlanningContextResponse } from '@/lib/agronautas/schemas'
import { VisibilityState } from '@/components/visibility/primitives'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const React = { createElement }

export interface PlanningPanelProps {
  fieldId: string | null
  planningContext?: CampaignPlanningContextResponse
  simulation?: AssumptionSimulationResponse
  isLoading: boolean
  error: string | null
  isMutating: boolean
  onRetry?: () => Promise<unknown>
  onLoadPlanningContext: (input: { campaignName: string; season: string; fieldIds: string[] }) => Promise<unknown>
  onSimulateAssumptions: (input: AssumptionSimulationRequest) => Promise<unknown>
}

export function PlanningPanel(props: PlanningPanelProps) {
  const [campaignName, setCampaignName] = useState('Campaña demostrativa')
  const [season, setSeason] = useState('2026')
  const [areaHa, setAreaHa] = useState('10')
  const [yieldKg, setYieldKg] = useState('4000')
  const [price, setPrice] = useState('0.4')
  const [variableCost, setVariableCost] = useState('500')
  const [fixedCost, setFixedCost] = useState('200')
  const [formError, setFormError] = useState<string | null>(null)
  const hasField = Boolean(props.fieldId)

  const loadContext = async () => {
    setFormError(null)
    try {
      await props.onLoadPlanningContext({ campaignName, season, fieldIds: [props.fieldId ?? ''] })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo cargar el contexto de planificación.')
    }
  }

  const runSimulation = async () => {
    setFormError(null)
    const numericInputs = [areaHa, yieldKg, price, variableCost, fixedCost]
    const hasInvalidNumericInput = numericInputs.some((value) => value.trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0) || Number(areaHa) <= 0 || Number(yieldKg) <= 0
    if (hasInvalidNumericInput) {
      setFormError('Completá todos los supuestos con valores válidos antes de calcular.')
      return
    }

    try {
      await props.onSimulateAssumptions({
        contractVersion: 'agronautas-assumption-simulation-v1',
        areaHa: Number(areaHa),
        expectedYieldKgPerHa: Number(yieldKg),
        pricePerKg: Number(price),
        variableCostPerHa: Number(variableCost),
        fixedCost: Number(fixedCost),
        currency: 'ARS',
        precision: 2,
        units: { area: 'ha', expectedYield: 'kg/ha', price: 'currency/kg', variableCost: 'currency/ha', fixedCost: 'currency' },
        assumptions: ['Valores ingresados manualmente; no son datos observados.'],
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo calcular el supuesto.')
    }
  }

  return (
    <section id="agronautas-planning" className="grid gap-5" aria-label="Planificación de campaña Agronautas">
      <Card>
        <CardHeader>
          <CardTitle>Planificación de campaña</CardTitle>
          <CardDescription>Contexto de solo lectura y simulación local con supuestos de la persona usuaria. No se guarda una campaña ni una relación de propiedad.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {props.isLoading ? <p role="status">Cargando contexto de planificación…</p> : null}
          {props.error ? <VisibilityState state="error" title="Planificación no disponible" description={props.error} retryLabel="Reintentar planificación" onRetry={props.onRetry ? () => void props.onRetry?.() : undefined} /> : null}
          {!hasField ? <p role="status">No hay un lote seleccionado para consultar planificación.</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <PlanningField label="Nombre de campaña" name="campaign-name" value={campaignName} onChange={setCampaignName} />
            <PlanningField label="Temporada" name="campaign-season" value={season} onChange={setSeason} />
          </div>
          <Button type="button" disabled={!hasField || props.isLoading || props.isMutating} onClick={() => void loadContext()}>{props.isMutating ? 'Consultando…' : 'Ver contexto de lectura'}</Button>
          {props.planningContext ? <PlanningContext context={props.planningContext} /> : null}
          <div className="grid gap-4 border-t border-stone-200 pt-4">
            <div><h3 className="font-semibold">Simulador de supuestos</h3><p className="text-sm text-stone-600">Resultado aritmético transparente; no es pronóstico, recomendación ni dato de mercado.</p></div>
            <div className="grid gap-4 md:grid-cols-3">
              <PlanningField label="Área (ha)" name="simulation-area" type="number" value={areaHa} errorId={formError ? 'simulation-error' : undefined} onChange={setAreaHa} />
              <PlanningField label="Rendimiento supuesto (kg/ha)" name="simulation-yield" type="number" value={yieldKg} errorId={formError ? 'simulation-error' : undefined} onChange={setYieldKg} />
              <PlanningField label="Precio supuesto (ARS/kg)" name="simulation-price" type="number" value={price} errorId={formError ? 'simulation-error' : undefined} onChange={setPrice} />
              <PlanningField label="Costo variable (ARS/ha)" name="simulation-variable-cost" type="number" value={variableCost} errorId={formError ? 'simulation-error' : undefined} onChange={setVariableCost} />
              <PlanningField label="Costo fijo (ARS)" name="simulation-fixed-cost" type="number" value={fixedCost} errorId={formError ? 'simulation-error' : undefined} onChange={setFixedCost} />
            </div>
            <Button type="button" disabled={props.isMutating} onClick={() => void runSimulation()}>{props.isMutating ? 'Calculando…' : 'Calcular supuesto'}</Button>
            {formError ? <p id="simulation-error" role="alert">{formError}</p> : null}
            {!formError && props.simulation?.status === 'insufficient_evidence' ? <p id="simulation-insufficient-evidence" role="alert">Evidencia insuficiente: {props.simulation.reason} ({props.simulation.missingInputs.join(', ')})</p> : null}
            {!formError && props.simulation?.status === 'complete' ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold">Simulación basada en supuestos de usuario</p><p>Producción: {props.simulation.result.outputs.productionKg} kg · Diferencia del escenario: {props.simulation.result.outputs.scenarioDifference} {props.simulation.result.currency}</p><p className="text-sm">No es evidencia observada ni recomendación.</p></div> : null}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function PlanningField({ label, name, value, onChange, type = 'text', errorId }: { label: string; name: string; value: string; onChange: (value: string) => void; type?: 'text' | 'number'; errorId?: string }) {
  return <div className="grid gap-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} aria-describedby={errorId} value={value} onChange={(event) => onChange(event.target.value)} onInput={(event) => onChange(event.currentTarget.value)} /></div>
}

function PlanningContext({ context }: { context: CampaignPlanningContextResponse }) {
  return <div role="status" className="grid gap-4 rounded-2xl border border-stone-200 p-4">
    <div><p className="font-semibold">{context.campaignName} · {context.season}</p><p className="text-sm">{context.fields.length} lote(s) · persistencia: {context.persistent ? 'sí' : 'no'}</p></div>
    <div className="grid gap-2" aria-label="Datos de lotes seleccionados"><h3 className="font-semibold">Datos de lotes seleccionados</h3><ul className="grid gap-3 sm:grid-cols-2">{context.fields.map((field) => <li key={field.fieldId} className="rounded-xl border border-stone-200 p-3 text-sm"><p className="font-semibold">{field.externalFieldId}</p><dl className="mt-2 grid gap-1 text-stone-700"><div><dt className="inline font-medium">Cultivo: </dt><dd className="inline">{field.crop}</dd></div><div><dt className="inline font-medium">Área: </dt><dd className="inline">{field.hectares} ha</dd></div><div><dt className="inline font-medium">Localidad: </dt><dd className="inline">{field.locality}</dd></div><div><dt className="inline font-medium">Geometría: </dt><dd className="inline">{field.geometryStatus}</dd></div></dl></li>)}</ul></div>
    <div className="grid gap-2" aria-label="Evidencia del contexto de planificación"><h3 className="font-semibold">Evidencia del contexto</h3><ul className="grid gap-3 sm:grid-cols-2">{context.evidence.map((item) => <li key={item.fieldId} className="grid gap-2 rounded-xl border border-stone-200 p-3 text-sm"><p className="font-semibold">{item.fieldId}</p><PlanningEvidenceDetails label="Clima" evidence={item.climate} /><PlanningEvidenceDetails label="Riesgo" evidence={item.risk} /></li>)}</ul></div>
    <ul className="grid gap-2 sm:grid-cols-2">{context.availability.map((item) => <li key={item.domain} className="rounded-xl border border-dashed border-stone-300 p-3 text-sm"><span className="font-semibold">{item.domain}</span>: {item.state}. {item.reason}</li>)}</ul>
  </div>
}

type PlanningEvidence = CampaignPlanningContextResponse['evidence'][number]['climate'] | CampaignPlanningContextResponse['evidence'][number]['risk']

function PlanningEvidenceDetails({ label, evidence }: { label: string; evidence: PlanningEvidence }) {
  if (evidence.state === 'unavailable') return <div><p className="font-medium">{label}: {evidence.state}</p><p className="text-stone-600">{evidence.reason}</p></div>
  return <div><p className="font-medium">{label}: {evidence.state}</p><p className="text-stone-600">Fuente: {evidence.source} · Frescura: {evidence.freshness}</p><p className="text-stone-600">Observado: {evidence.observedAt} · Proveniencia: {evidence.provenance.join(', ')}</p></div>
}
