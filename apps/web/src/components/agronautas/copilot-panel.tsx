import { createElement } from 'react'
import type { GroundedChatResponse } from '@/lib/agronautas/schemas'
import { CopilotStatus, StatusBadge } from '@/components/visibility/primitives'
import { createChatViewModel, createChatViewModelFromStream, type ChatStreamState } from '@/lib/visibility/chat'

const React = { createElement }

interface CopilotPanelProps {
  response?: GroundedChatResponse
  stream?: ChatStreamState
  onRetry?: () => void
}

export function CopilotPanel({ response, stream, onRetry }: CopilotPanelProps) {
  const viewModel = response ? createChatViewModel(response) : stream ? createChatViewModelFromStream(stream) : null
  if (!viewModel) return null
  const badgeState = viewModel.status === 'done' ? 'success' : viewModel.status === 'degraded' ? 'degraded' : viewModel.status === 'partial' ? 'partial' : viewModel.status === 'error' ? 'error' : 'loading'
  const evidenceMode = response?.providerModes.join(', ') || response?.providerMode || readString(stream?.metadata['providerModes']) || readString(stream?.metadata['providerMode'])
  const evidenceFreshness = response?.evidenceStatus || readString(stream?.metadata['evidenceStatus'])
  const sourceRunIds = response?.sourceRunIds ?? readStrings(stream?.metadata['sourceRunIds'])
  const isEvidenceStale = evidenceFreshness === 'stale' || evidenceFreshness === 'missing' || evidenceFreshness === 'unavailable' || evidenceFreshness === 'degraded'

  return <section className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5" aria-label="Copilot con evidencia"><div><h2 className="font-serif text-2xl font-semibold">Copilot con grounding backend</h2><p className="mt-1 text-sm text-stone-600">Explica el estado contratado; no reemplaza el dashboard, el criterio local ni una decisión oficial.</p></div><div className="flex flex-wrap items-center gap-2"><StatusBadge state={badgeState} />{viewModel.status === 'partial' ? <span className="text-sm font-medium text-amber-900">Respuesta parcial conservada</span> : null}</div>{evidenceMode || evidenceFreshness || sourceRunIds.length || isEvidenceStale ? <dl className="grid gap-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><div><dt className="inline font-semibold">Modo de evidencia: </dt><dd className="inline">{evidenceMode || 'No disponible'}</dd></div><div><dt className="inline font-semibold">Frescura de evidencia: </dt><dd className="inline">{evidenceFreshness || 'No disponible'}</dd></div>{sourceRunIds.length ? <div><dt className="inline font-semibold">Corridas de origen: </dt><dd className="inline break-all">{sourceRunIds.join(', ')}</dd></div> : null}{isEvidenceStale ? <div className="font-medium">Contexto de evidencia limitado; la respuesta no constituye consejo verificado.</div> : null}</dl> : null}<CopilotStatus outcome={viewModel.outcome} citationUnavailable={viewModel.citationUnavailable ?? true} actionable={viewModel.actionable ?? false} retryAfterMs={viewModel.retryAfterMs} unverifiedClaims={viewModel.unverifiedClaims ?? false} onRetry={viewModel.retryable ? onRetry : undefined} reason={viewModel.error ?? viewModel.unavailableReason} /><p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">{viewModel.answer || 'El stream todavía no entregó tokens verificables.'}</p><div className="grid gap-4 md:grid-cols-2"><EvidenceList title="Fuentes y citas" items={[...viewModel.citations, ...viewModel.sources]} empty="El contrato no devolvió citas o fuentes verificables." /><EvidenceList title="Límites" items={viewModel.limits} empty="El contrato no expuso límites adicionales." /></div>{viewModel.receivedAt ? <p className="text-sm text-stone-600">Recibido: {viewModel.receivedAt}</p> : null}</section>
}

function readString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').join(', ') || undefined
  return undefined
}

function readStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function EvidenceList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="rounded-2xl border border-stone-200 p-4"><h3 className="font-semibold">{title}</h3>{items.length ? <ul className="mt-2 grid gap-1 text-sm text-stone-600">{items.map((item, index) => <li key={`${title}-${item}-${index}`}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-stone-600">{empty}</p>}</section>
}
