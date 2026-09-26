'use client'

import { createElement, useState } from 'react'
import type { AgronautasMarketplaceRfq, AgronautasMarketplaceRfqResponse } from '@/lib/agronautas/schemas'
import { Status } from '@/components/ui/status'

const React = { createElement }

export interface MarketplaceRfqHistoryProps {
  workspaceId: string
  response: AgronautasMarketplaceRfqResponse
  isMutating: boolean
  error?: string | null
  onRetry?: () => void
  onCancel: (rfq: AgronautasMarketplaceRfq) => Promise<AgronautasMarketplaceRfqResponse | void>
}

export function MarketplaceRfqHistory({ workspaceId, response, isMutating, error, onRetry, onCancel }: MarketplaceRfqHistoryProps) {
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const scopedItems = response.items.filter((item) => item.workspaceId === workspaceId)

  if (error || response.status === 'unavailable') return <section className="grid gap-4" aria-label="Historial de solicitudes RFQ"><Status state="unavailable" title="Historial RFQ no disponible" description={error ?? response.reason ?? 'No se pudo consultar el historial persistido.'} source="Agronautas marketplace BFF" freshness="missing" retryable={response.retryable} onRetry={onRetry} retryLabel="Reintentar historial" /></section>
  if (!scopedItems.length) return <section className="grid gap-3" aria-label="Historial de solicitudes RFQ"><Status state="empty" title="Sin solicitudes en este workspace" description="Las solicitudes de otros workspaces no se muestran en este historial." /></section>

  const cancel = async (rfq: AgronautasMarketplaceRfq) => {
    setMutationError(null)
    setNotice(null)
    try {
      const result = await onCancel(rfq)
      setNotice(result?.status === 'cancelled' ? `Cancelación de ${rfq.rfqId} confirmada.` : 'La cancelación fue recibida para actualización del historial.')
    } catch (error) {
      setMutationError(cancelErrorMessage(error))
    }
  }

  return <section className="grid gap-4" aria-label="Historial de solicitudes RFQ">
    <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Trazabilidad</p><h2 className="font-serif text-2xl font-semibold text-stone-950">Historial y revisión</h2><p className="mt-1 text-sm text-stone-600">Los estados describen el ciclo de revisión humana. No representan órdenes, ofertas ni liquidaciones.</p></div>
    {mutationError ? <p role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">{mutationError}</p> : null}
    {notice ? <p role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">{notice}</p> : null}
    <div className="grid gap-3">{scopedItems.map((rfq) => <article key={rfq.rfqId} className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">RFQ {rfq.rfqId}</p><h3 className="mt-1 text-lg font-semibold text-stone-950">{rfq.itemName} · {rfq.quantity} {rfq.unit}</h3><p className="text-sm text-stone-600">Localidad: {rfq.locality} · Estado: {rfq.reviewStatus} · Revisión {rfq.revision}</p></div><span className="rounded-full border border-stone-300 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">{rfq.reviewStatus}</span></div><dl className="grid gap-1 break-words text-sm text-stone-600"><div><dt className="inline font-medium text-stone-800">Clave de idempotencia: </dt><dd className="inline">{rfq.idempotencyKey}</dd></div><div><dt className="inline font-medium text-stone-800">Creada: </dt><dd className="inline">{rfq.createdAt}</dd></div>{response.audit.filter((audit) => audit.targetId === rfq.rfqId).map((audit) => <div key={audit.auditId}><dt className="inline font-medium text-stone-800">Solicitud HTTP: </dt><dd className="inline">{audit.requestId} · {audit.action} · {audit.outcome}</dd></div>)}</dl>{rfq.reviewStatus === 'submitted' || rfq.reviewStatus === 'under_review' ? <button type="button" className="min-h-11 w-fit rounded-full border border-stone-400 px-4 py-2 text-sm font-semibold text-stone-900 disabled:cursor-not-allowed disabled:opacity-60" disabled={isMutating} onClick={() => void cancel(rfq)}>Cancelar solicitud {rfq.rfqId}</button> : null}</article>)}</div>
  </section>
}

function cancelErrorMessage(error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : undefined
  if (status === 401) return 'La sesión ya no está autorizada para cancelar esta solicitud. Conservamos el historial.'
  if (status === 403) return 'No tenés permisos para cancelar esta solicitud en este workspace. Conservamos el registro.'
  if (status === 404) return 'La solicitud ya no existe en este workspace. Recargá el historial para recuperar el estado confirmado.'
  if (status === 409) return 'La solicitud cambió mientras la revisabas. Recargá el historial para recuperar la revisión actual.'
  if (status === 503) return 'El servicio de cancelación no está disponible. Conservamos el registro y podés reintentar.'
  return error instanceof Error && error.message ? error.message : 'No se pudo confirmar la cancelación. Conservamos el registro.'
}
