import { createElement } from 'react'
import type { AgronautasIntelligence } from '@/lib/agronautas/schemas'
import type { AgronautasCapabilityState } from './workspace'
import { Badge } from '@/components/ui/badge'
import { EvidenceStateBadge } from '@/components/visibility/primitives'
import { EVIDENCE_STATE, normalizeEvidence } from '@/lib/visibility/evidence-state'

const React = { createElement }

interface IntelligencePanelProps {
  intelligence?: AgronautasIntelligence
  availability?: AgronautasCapabilityState
  onRetry: () => Promise<unknown>
}

export function IntelligencePanel({ intelligence, availability, onRetry }: IntelligencePanelProps) {
  if (!intelligence) return <IntelligenceUnavailable availability={availability} onRetry={onRetry} />

  const recommendationReason = 'reason' in intelligence.recommendation ? intelligence.recommendation.reason : 'No hay evidencia suficiente para una recomendación.'
  const recommendationInputs = 'missingInputs' in intelligence.recommendation ? intelligence.recommendation.missingInputs ?? [] : []
  const capabilities = [
    ['Suelo', intelligence.soil],
    ['Precios', intelligence.prices],
    ['Dólar / FX', intelligence.dollar],
    ['Economía', intelligence.economics],
  ] as const

  return <section className="grid gap-4 rounded-[2rem] border border-amber-900/20 bg-amber-50 p-5" aria-label="Inteligencia económica basada en evidencia" data-testid="agronautas-intelligence-panel">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900">Inteligencia económica</p>
      <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-950">Explicación climática y riesgo sin inventar datos</h2>
      <p className="mt-2 text-sm text-stone-700">La inteligencia es soporte operativo; no reemplaza criterio agronómico local ni constituye una recomendación automática.</p>
    </div>
     <div className="grid gap-3 md:grid-cols-2">
       <IntelligenceEvidence label="Clima" capability={intelligence.climate} />
       <IntelligenceEvidence label="Riesgo" capability={intelligence.risk} />
     </div>
     <div className="rounded-2xl border border-amber-900/15 bg-white p-4"><p className="font-semibold text-stone-950">Referencias de evidencia</p>{intelligence.explanation.evidenceRefs.length ? <ul className="mt-2 grid gap-1 break-all text-sm text-stone-700">{intelligence.explanation.evidenceRefs.map((reference) => <li key={reference}>{reference}</li>)}</ul> : <p className="mt-2 text-sm text-stone-600">El contrato no devolvió referencias de evidencia.</p>}</div>
    <div className="grid gap-3 md:grid-cols-4">{capabilities.map(([label, capability]) => <div key={label} className="rounded-2xl border border-amber-900/15 bg-white p-4"><div className="flex items-center justify-between gap-2"><p className="font-medium text-stone-900">{label}</p><Badge variant={capability.state === 'available' ? 'success' : 'warning'}>{capability.state}</Badge></div><p className="mt-2 text-sm text-stone-600">{'reason' in capability ? capability.reason : 'No se eleva disponibilidad sin una observación contractual.'}</p></div>)}</div>
    <div className="rounded-2xl border border-amber-900/20 bg-white p-4"><p className="font-semibold text-stone-950">Recomendación bloqueada</p><p className="mt-1 text-sm text-stone-700">{recommendationReason}</p><ul className="mt-2 list-disc pl-5 text-sm text-stone-700">{recommendationInputs.map((input) => <li key={input}>{input}</li>)}</ul></div>
  </section>
}

function IntelligenceEvidence({ label, capability }: { label: string; capability: AgronautasIntelligence['climate'] | AgronautasIntelligence['risk'] }) {
  if (capability.state !== 'available') return <article className="rounded-2xl border border-amber-900/15 bg-white p-4"><div className="flex items-center justify-between gap-2"><p className="font-medium text-stone-900">{label}</p><EvidenceStateBadge state={EVIDENCE_STATE.MISSING} /></div><p className="mt-2 text-sm text-stone-600">{capability.reason}</p></article>

  const freshness = capability.value.freshness
  const state = freshness === 'fresh' ? EVIDENCE_STATE.OBSERVED : freshness === 'stale' ? EVIDENCE_STATE.STALE : EVIDENCE_STATE.DEGRADED
  const evidence = normalizeEvidence({ state, source: capability.metadata.source, observedAt: capability.metadata.observedAt, detail: capability.value.degradationReasons.join(', ') || undefined })
  return <article className="rounded-2xl border border-amber-900/15 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-stone-900">{label}</p><EvidenceStateBadge state={evidence.state} /></div><dl className="mt-3 grid gap-1 text-sm text-stone-600"><div><dt className="inline font-medium text-stone-800">Fuente: </dt><dd className="inline">{capability.metadata.source}</dd></div><div><dt className="inline font-medium text-stone-800">Modo: </dt><dd className="inline">Sin modo de evidencia en el contrato</dd></div><div><dt className="inline font-medium text-stone-800">Frescura: </dt><dd className="inline">{freshness}</dd></div><div><dt className="inline font-medium text-stone-800">Observado: </dt><dd className="inline">{capability.metadata.observedAt}</dd></div><div><dt className="inline font-medium text-stone-800">Recibido: </dt><dd className="inline">{capability.metadata.retrievedAt}</dd></div><div><dt className="inline font-medium text-stone-800">Corridas de origen: </dt><dd className="inline break-all">{capability.metadata.lineage.sourceRunIds.length ? capability.metadata.lineage.sourceRunIds.join(', ') : 'No disponibles'}</dd></div><div><dt className="inline font-medium text-stone-800">Referencias: </dt><dd className="inline break-all">{capability.metadata.lineage.observationRefs.length ? capability.metadata.lineage.observationRefs.join(', ') : 'No disponibles'}</dd></div>{capability.value.degradationReasons.length ? <div><dt className="inline font-medium text-stone-800">Límites: </dt><dd className="inline">{capability.value.degradationReasons.join(', ')}</dd></div> : null}</dl></article>
}

function IntelligenceUnavailable({ availability, onRetry }: { availability?: AgronautasCapabilityState; onRetry: () => Promise<unknown> }) {
  const title = availability?.state === 'forbidden' ? 'Inteligencia restringida' : availability?.state === 'unauthorized' ? 'Inteligencia requiere autenticación' : 'Inteligencia no disponible'
  const description = availability?.state === 'forbidden' ? 'Tu sesión no tiene permisos para esta capacidad; no se sustituye con datos de otro workspace.' : availability?.state === 'unauthorized' ? 'La capacidad requiere una sesión autorizada; no se muestran datos protegidos.' : 'No se recibió inteligencia verificable. La vista conserva el contexto y permite reintentar solo si el contrato lo habilita.'
  return <section className="grid gap-3 rounded-[2rem] border border-amber-900/20 bg-amber-50 p-5" aria-label="Inteligencia económica basada en evidencia" data-testid="agronautas-intelligence-panel"><h2 className="font-serif text-2xl font-semibold">{title}</h2><p className="text-sm text-stone-700">{description}</p>{availability?.state !== 'unauthorized' && availability?.state !== 'forbidden' ? <button type="button" onClick={() => void onRetry()} className="w-fit rounded-full border border-stone-400 px-4 py-2 text-sm font-semibold">Reintentar inteligencia</button> : null}</section>
}
