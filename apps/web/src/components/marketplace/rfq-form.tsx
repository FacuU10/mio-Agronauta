'use client'

import { createElement, useState } from 'react'
import type { AgronautasMarketplaceListing, AgronautasMarketplaceRfqCreateRequest, AgronautasMarketplaceRfqResponse } from '@/lib/agronautas/schemas'

const React = { createElement }

export interface MarketplaceRfqFormProps {
  workspaceId: string
  listing: AgronautasMarketplaceListing
  isSubmitting: boolean
  onSubmit: (input: Omit<AgronautasMarketplaceRfqCreateRequest, 'contractVersion'>) => Promise<AgronautasMarketplaceRfqResponse | void>
}

export function MarketplaceRfqForm({ workspaceId, listing, isSubmitting, onSubmit }: MarketplaceRfqFormProps) {
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState(listing.unit ?? '')
  const [locality, setLocality] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)

  const submit = async () => {
    const parsedQuantity = Number(quantity)
    const normalizedUnit = unit.trim()
    const normalizedLocality = locality.trim()
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !normalizedUnit || !normalizedLocality) {
      setFormError('Indicá una cantidad positiva, unidad y localidad antes de enviar la solicitud a revisión humana.')
      setNotice(null)
      return
    }

    setFormError(null)
    setNotice(null)
    setRequestId(null)
    try {
      const response = await onSubmit({ workspaceId, listingId: listing.listingId, itemName: listing.itemName, quantity: parsedQuantity, unit: normalizedUnit, locality: normalizedLocality, idempotencyKey: `rfq-${listing.listingId}-${normalizedLocality.toLowerCase()}-${parsedQuantity}-${normalizedUnit.toLowerCase()}`, participantRefs: [listing.participantRef] })
      if (response?.status === 'created') setNotice('Solicitud enviada a revisión humana; el registro fue creado.')
      if (response?.status === 'duplicate') setNotice('Solicitud duplicada: se conservó la misma clave de idempotencia.')
      if (response?.status === 'conflict' || response?.status === 'stale') setNotice('La solicitud cambió; recargá el historial antes de reintentar.')
      if (response?.status === 'unavailable') setNotice('La solicitud no está disponible; no se creó ningún registro local.')
      const latestAudit = response?.audit.at(-1)
      if (latestAudit) setRequestId(latestAudit.requestId)
    } catch (error) {
      setFormError(rfqMutationErrorMessage(error))
    }
  }

  return <section className="grid gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5" aria-labelledby="marketplace-rfq-heading">
    <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Solicitud RFQ</p><h2 id="marketplace-rfq-heading" className="mt-1 font-serif text-2xl font-semibold text-emerald-950">Revisión humana para {listing.itemName}</h2><p className="mt-1 text-sm text-emerald-950/75">Esto registra una solicitud identificada. No crea una oferta, precio, pedido, pago ni compromiso financiero.</p></div>
    <form className="grid gap-4 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <label className="grid gap-1 text-sm font-medium" htmlFor="rfq-quantity">Cantidad solicitada<input id="rfq-quantity" aria-label="Cantidad solicitada" className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 py-2" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} onInput={(event) => setQuantity(event.currentTarget.value)} /></label>
      <label className="grid gap-1 text-sm font-medium" htmlFor="rfq-unit">Unidad solicitada<input id="rfq-unit" aria-label="Unidad solicitada" className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 py-2" value={unit} onChange={(event) => setUnit(event.target.value)} onInput={(event) => setUnit(event.currentTarget.value)} /></label>
      <label className="grid gap-1 text-sm font-medium" htmlFor="rfq-locality">Localidad de entrega<input id="rfq-locality" aria-label="Localidad de entrega" className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 py-2" value={locality} onChange={(event) => setLocality(event.target.value)} onInput={(event) => setLocality(event.currentTarget.value)} /></label>
      <div className="md:col-span-3 flex flex-wrap items-center gap-3"><button type="submit" className="min-h-11 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>{isSubmitting ? 'Enviando solicitud…' : 'Enviar a revisión humana'}</button><p className="text-xs text-emerald-950/75">La clave de idempotencia se deriva del listing, localidad, cantidad y unidad.</p></div>
    </form>
    {formError ? <p role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">{formError}</p> : null}
    {notice ? <p role="status" aria-live="polite" className="rounded-xl border border-emerald-300 bg-white p-3 text-sm text-emerald-950">{notice}</p> : null}
    {requestId ? <p className="text-xs text-emerald-950">Solicitud HTTP: {requestId}</p> : null}
  </section>
}

function rfqMutationErrorMessage(error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : undefined
  if (status === 401) return 'La sesión ya no está autorizada para enviar solicitudes. Conservamos el formulario.'
  if (status === 403) return 'No tenés permisos para enviar solicitudes en este workspace. Conservamos el formulario.'
  if (status === 409) return 'La solicitud entró en conflicto o ya existe. Conservamos el formulario y la clave de idempotencia.'
  if (status === 503) return 'El servicio de solicitudes no está disponible. Conservamos el formulario para recuperación.'
  return error instanceof Error && error.message ? error.message : 'No se pudo confirmar la solicitud. Conservamos el formulario.'
}
