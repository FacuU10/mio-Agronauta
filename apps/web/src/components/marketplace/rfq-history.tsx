'use client'
import { createElement, Fragment, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import type {
  AgronautasMarketplaceRfq,
  AgronautasMarketplaceRfqResponse,
} from '@/lib/agronautas/schemas'
import { MarketplaceNotice } from './notice'
import { marketDate } from './catalog'
const React = { createElement, Fragment }
export interface MarketplaceRfqHistoryProps {
  workspaceId: string
  response: AgronautasMarketplaceRfqResponse
  isMutating: boolean
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  onCancel: (rfq: AgronautasMarketplaceRfq) => Promise<AgronautasMarketplaceRfqResponse | void>
}
const labels: Record<string, string> = {
  submitted: 'Enviada',
  under_review: 'En revisión',
  approved_for_handoff: 'Lista para continuar',
  declined: 'No aceptada',
  cancelled: 'Cancelada',
  unavailable: 'No disponible',
  expired: 'Vencida',
}
export function MarketplaceRfqHistory({
  workspaceId,
  response,
  isMutating,
  isLoading,
  error,
  onRetry,
  onCancel,
}: MarketplaceRfqHistoryProps) {
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const items = response.items.filter((item) => item.workspaceId === workspaceId)
  const cancel = async (rfq: AgronautasMarketplaceRfq) => {
    setMutationError(null)
    setNotice(null)
    try {
      const result = await onCancel(rfq)
      if (result?.status === 'cancelled') setNotice('Tu consulta fue cancelada.')
      else
        setMutationError(
          'No pudimos confirmar la cancelación. Actualizá tus consultas e intentá de nuevo.'
        )
    } catch {
      setMutationError(
        'No pudimos cancelar la consulta. Puede haber cambiado; actualizá tus consultas e intentá de nuevo.'
      )
    }
  }
  return (
    <section className="mkt-history" aria-label="Mis consultas">
      <div className="mkt-section-heading">
        <h2>
          <ClipboardList size={21} aria-hidden="true" />
          Mis consultas
        </h2>
      </div>
      {isLoading ? (
        <MarketplaceNotice title="Cargando tus consultas…">Esperá un momento.</MarketplaceNotice>
      ) : error || response.status === 'unavailable' ? (
        <MarketplaceNotice error title="No pudimos cargar tus consultas" onRetry={onRetry}>
          Podés seguir viendo las publicaciones. Volvé a intentar para consultar tus solicitudes.
        </MarketplaceNotice>
      ) : (
        <>
          {mutationError ? (
            <p role="alert" className="mkt-inline-error">
              {mutationError}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="mkt-inline-success">
              {notice}
            </p>
          ) : null}
          {!items.length ? (
            <div className="mkt-history-empty">
              <p>
                <strong>Todavía no enviaste consultas</strong>
              </p>
              <p>Cuando consultes por un producto, vas a poder seguir su estado acá.</p>
            </div>
          ) : (
            <div className="mkt-history-list">
              {items.map((item) => (
                <article key={item.rfqId} className="mkt-request">
                  <div>
                    <h3>{item.itemName}</h3>
                    <p>
                      {item.quantity.toLocaleString('es-AR')} {item.unit} · {item.locality}
                    </p>
                    <small>Enviada el {marketDate(item.createdAt)}</small>
                  </div>
                  <span className="mkt-badge">{labels[item.reviewStatus] ?? 'En revisión'}</span>
                  {item.reviewStatus === 'submitted' || item.reviewStatus === 'under_review' ? (
                    <button
                      className="mkt-button mkt-button-outline"
                      disabled={isMutating}
                      onClick={() => void cancel(item)}
                      aria-label={`Cancelar consulta de ${item.itemName}`}
                    >
                      Cancelar consulta
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
