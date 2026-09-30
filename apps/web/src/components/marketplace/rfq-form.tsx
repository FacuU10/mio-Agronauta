'use client'

import { createElement, useState } from 'react'
import type {
  AgronautasMarketplaceListing,
  AgronautasMarketplaceRfqCreateRequest,
  AgronautasMarketplaceRfqResponse,
} from '@/lib/agronautas/schemas'

const React = { createElement }

export interface MarketplaceRfqFormProps {
  workspaceId: string
  listing: AgronautasMarketplaceListing
  isSubmitting: boolean
  onSubmit: (
    input: Omit<AgronautasMarketplaceRfqCreateRequest, 'contractVersion'>
  ) => Promise<AgronautasMarketplaceRfqResponse | void>
}

export function MarketplaceRfqForm({
  workspaceId,
  listing,
  isSubmitting,
  onSubmit,
}: MarketplaceRfqFormProps) {
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState(listing.unit ?? '')
  const [locality, setLocality] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async () => {
    const parsedQuantity = Number(quantity)
    const normalizedUnit = unit.trim()
    const normalizedLocality = locality.trim()
    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      !normalizedUnit ||
      !normalizedLocality
    ) {
      setFormError('Completá la cantidad, la unidad y la localidad de entrega.')
      setNotice(null)
      return
    }

    setFormError(null)
    setNotice(null)
    try {
      const response = await onSubmit({
        workspaceId,
        listingId: listing.listingId,
        itemName: listing.itemName,
        quantity: parsedQuantity,
        unit: normalizedUnit,
        locality: normalizedLocality,
        idempotencyKey: `rfq-${listing.listingId}-${normalizedLocality.toLowerCase()}-${parsedQuantity}-${normalizedUnit.toLowerCase()}`,
        participantRefs: [listing.participantRef],
      })
      if (response?.status === 'created')
        setNotice('Recibimos tu consulta. Podés seguirla en Mis consultas.')
      if (response?.status === 'duplicate')
        setNotice('Ya recibimos esta consulta. No hace falta enviarla de nuevo.')
      if (response?.status === 'conflict' || response?.status === 'stale')
        setNotice('Esta consulta cambió. Actualizá Mis consultas antes de volver a enviarla.')
      if (response?.status === 'unavailable')
        setNotice('No pudimos guardar la consulta. Intentá nuevamente en unos minutos.')
    } catch (error) {
      setFormError(rfqMutationErrorMessage(error))
    }
  }

  return (
    <section
      id="marketplace-consult"
      className="mkt-panel mkt-consult"
      aria-labelledby="marketplace-rfq-heading"
    >
      <h2 id="marketplace-rfq-heading">Pedí una cotización</h2>
      <p>
        Consultá por <strong>{listing.itemName}</strong>. Indicá lo que necesitás.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="mkt-form-row">
          <label htmlFor="rfq-quantity">
            Cantidad
            <input
              id="rfq-quantity"
              aria-label="Cantidad solicitada"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              onInput={(event) => setQuantity(event.currentTarget.value)}
            />
          </label>
          <label htmlFor="rfq-unit">
            Unidad
            <input
              id="rfq-unit"
              aria-label="Unidad solicitada"
              placeholder="Ej.: kg, cabezas"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              onInput={(event) => setUnit(event.currentTarget.value)}
            />
          </label>
        </div>
        <label htmlFor="rfq-locality">
          ¿Dónde lo necesitás?
          <input
            id="rfq-locality"
            aria-label="Localidad de entrega"
            placeholder="Tu localidad"
            value={locality}
            onChange={(event) => setLocality(event.target.value)}
            onInput={(event) => setLocality(event.currentTarget.value)}
          />
        </label>
        <div className="mkt-quote-note">
          <span>Precio y forma de entrega</span>
          <strong>A confirmar con la consulta</strong>
        </div>
        <button type="submit" className="mkt-button" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Enviar consulta'}
        </button>
        <p className="mkt-small">Tu solicitud será revisada antes de avanzar.</p>
      </form>
      {formError ? (
        <p role="alert" className="mkt-inline-error">
          {formError}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mkt-inline-success">
          {notice}
        </p>
      ) : null}
    </section>
  )
}

function rfqMutationErrorMessage(error: unknown): string {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
      ? error.status
      : undefined
  if (status === 401)
    return 'La sesión ya no está autorizada para enviar solicitudes. Conservamos el formulario.'
  if (status === 403)
    return 'No tenés permisos para enviar solicitudes con tu cuenta. Conservamos el formulario.'
  if (status === 409)
    return 'La solicitud entró en conflicto o ya existe. Tus datos siguen en el formulario.'
  if (status === 503)
    return 'El servicio de solicitudes no está disponible. Tus datos siguen en el formulario.'
  return 'No pudimos enviar tu consulta. Tus datos siguen en el formulario.'
}
