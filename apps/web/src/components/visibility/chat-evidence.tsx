import { createElement } from 'react'
import type { GroundedChatResponse } from '@/lib/agronautas/schemas'
import { createChatViewModel, createChatViewModelFromStream, type ChatStreamState } from '@/lib/visibility/chat'
import { ChatPanel, StatusBadge } from './primitives'

const React = { createElement }

export function ChatEvidencePanel({ response, stream, onRetry }: { response?: GroundedChatResponse; stream?: ChatStreamState; onRetry?: () => void }) {
  const viewModel = response ? createChatViewModel(response) : stream ? createChatViewModelFromStream(stream) : null
  if (!viewModel) return null

  const badgeState = viewModel.status === 'done' ? 'success' : viewModel.status === 'degraded' ? 'degraded' : viewModel.status === 'partial' ? 'partial' : viewModel.status === 'error' ? 'error' : 'loading'
  return (
    <ChatPanel title="Chat existente · evidencia observable">
      <div className="grid gap-4" data-testid="agronautas-chat-evidence">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge state={badgeState} />
          {viewModel.status === 'partial' ? <span className="text-sm font-medium text-amber-900">Respuesta parcial conservada</span> : null}
          {viewModel.status === 'degraded' ? <span className="text-sm font-medium text-amber-900">Modo degradado</span> : null}
        </div>
        <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">{viewModel.answer || 'El stream todavía no entregó tokens.'}</p>
        {viewModel.error ? <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-800">{viewModel.error}</p> : null}
        {viewModel.unavailableReason ? <p className="text-sm text-stone-600">Motivo de disponibilidad: {viewModel.unavailableReason}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <EvidenceList title="Facts inyectados" items={viewModel.facts.map((fact) => `${fact.label}: ${fact.value}`)} empty="El contrato no devolvió facts adicionales." />
          <EvidenceList title="Citas y fuentes" items={[...viewModel.citations, ...viewModel.sources]} empty="El contrato no devolvió citas o fuentes." />
          <EvidenceList title="Trace resumida" items={viewModel.trace.map((step) => `${step.action} · ${step.status}`)} empty="El contrato no devolvió trace." />
          <EvidenceList title="Límites" items={viewModel.limits} empty="Límites detallados no expuestos por este contrato." />
        </div>

        <dl className="grid gap-2 rounded-2xl border border-stone-200 p-4 text-sm md:grid-cols-2">
          <div><dt className="font-semibold">Metadata</dt><dd>{Object.keys(viewModel.metadata).length ? JSON.stringify(viewModel.metadata) : 'No provista por el endpoint'}</dd></div>
          <div><dt className="font-semibold">Timestamp recibido</dt><dd>{viewModel.receivedAt ?? 'No provisto por el endpoint'}</dd></div>
        </dl>
        {viewModel.retryable && onRetry ? <button type="button" onClick={onRetry} className="w-fit rounded-full border border-stone-400 px-4 py-2 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">Reintentar chat</button> : null}
      </div>
    </ChatPanel>
  )
}

function EvidenceList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="rounded-2xl border border-stone-200 p-4"><h3 className="font-semibold">{title}</h3>{items.length ? <ul className="mt-2 grid gap-1 text-sm text-stone-600">{items.map((item, index) => <li key={`${title}-${item}-${index}`}>• {item}</li>)}</ul> : <p className="mt-2 text-sm text-stone-600">{empty}</p>}</section>
}
