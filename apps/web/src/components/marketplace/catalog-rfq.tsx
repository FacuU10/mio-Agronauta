'use client'

import { createElement, useState } from 'react'
import type {
  AgronautasMarketplaceDiscoveryResponse,
  AgronautasMarketplaceListing,
  AgronautasMarketplaceRfq,
  AgronautasMarketplaceRfqResponse,
} from '@/lib/agronautas/schemas'
import { MarketplaceCatalog } from './catalog'
import { MessageCircle, ClipboardList, Check } from 'lucide-react'
import { MarketplaceRfqForm } from './rfq-form'
import { MarketplaceRfqHistory } from './rfq-history'
import { MarketplaceProductDetail, MarketplacePricePreview } from './product-detail'

const React = { createElement }

interface MarketplaceCatalogRfqProps {
  publicPreview?: boolean
  workspaceId?: string
  listings: AgronautasMarketplaceDiscoveryResponse
  rfqs: AgronautasMarketplaceRfqResponse
  isLoading: boolean
  error: string | null
  historyError?: string | null
  historyLoading?: boolean
  onHistoryRetry?: () => Promise<unknown>
  accessState?: 'unauthorized' | 'forbidden' | 'maintenance'
  accessReason?: string
  onRetry: () => Promise<unknown>
  onSubmit: (input: {
    workspaceId?: string
    listingId?: string | null
    itemName: string
    quantity: number
    unit: string
    locality: string
    idempotencyKey: string
    participantRefs: string[]
  }) => Promise<AgronautasMarketplaceRfqResponse | void>
  onCancel?: (rfq: AgronautasMarketplaceRfq) => Promise<AgronautasMarketplaceRfqResponse | void>
}

export function MarketplaceCatalogRfq({
  publicPreview = false,
  workspaceId,
  listings,
  rfqs,
  isLoading,
  error,
  historyError,
  historyLoading,
  onHistoryRetry,
  accessState,
  accessReason,
  onRetry,
  onSubmit,
  onCancel,
}: MarketplaceCatalogRfqProps) {
  const resolvedWorkspaceId =
    workspaceId ?? listings.items[0]?.workspaceId ?? rfqs.items[0]?.workspaceId ?? ''
  const [selectedListing, setSelectedListing] = useState<AgronautasMarketplaceListing | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  const submit = async (
    input: Parameters<typeof onSubmit>[0]
  ): Promise<AgronautasMarketplaceRfqResponse | void> => {
    setIsMutating(true)
    try {
      return await onSubmit({ ...input, workspaceId: resolvedWorkspaceId })
    } finally {
      setIsMutating(false)
    }
  }

  const cancel = async (
    rfq: AgronautasMarketplaceRfq
  ): Promise<AgronautasMarketplaceRfqResponse | void> => {
    if (!onCancel) return undefined
    setIsMutating(true)
    try {
      return await onCancel(rfq)
    } finally {
      setIsMutating(false)
    }
  }

  const available =
    !publicPreview &&
    !accessState &&
    !isLoading &&
    !error &&
    listings.status !== 'unavailable' &&
    listings.status !== 'degraded'
  const scoped = listings.items.filter((item) => item.workspaceId === resolvedWorkspaceId)
  const activeListing = available
    ? (scoped.find((item) => item.listingId === selectedListing?.listingId) ?? scoped[0])
    : undefined
  const showExample = publicPreview || accessState === 'unauthorized' || (available && scoped.length === 0)
  return (
    <div className="mkt-layout">
      <div className="mkt-main-column">
        {activeListing || showExample ? (
          <MarketplaceProductDetail listing={activeListing} />
        ) : null}
        {!showExample && (
          <MarketplaceCatalog
            workspaceId={resolvedWorkspaceId}
            response={error ? { ...listings, status: 'unavailable' } : listings}
            isLoading={isLoading}
            accessState={accessState}
            accessReason={accessReason}
            selectedId={activeListing?.listingId}
            onRetry={() => void onRetry()}
            onSelectListing={(item) => {
              setSelectedListing(item)
              document
                .getElementById('marketplace-product')
                ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
            }}
          />
        )}
        {!publicPreview && !accessState ? (
          <div id="mis-consultas">
            <MarketplaceRfqHistory
              workspaceId={resolvedWorkspaceId}
              response={rfqs}
              isLoading={historyLoading ?? isLoading}
              isMutating={isMutating}
              error={historyError}
              onRetry={() => void (onHistoryRetry ?? onRetry)()}
              onCancel={cancel}
            />
          </div>
        ) : null}
      </div>
      <aside className="mkt-sidebar" aria-label="Consulta y ayuda">
        {activeListing ? (
          <MarketplaceRfqForm
            key={activeListing.listingId}
            workspaceId={resolvedWorkspaceId}
            listing={activeListing}
            isSubmitting={isMutating}
            onSubmit={submit}
          />
        ) : showExample ? (
          <MarketplacePricePreview requiresLogin={publicPreview || accessState === 'unauthorized'} />
        ) : (
          <section className="mkt-panel">
            <MessageCircle size={28} aria-hidden="true" />
            <h2>Consultá antes de comprar</h2>
            <p>Elegí una publicación para pedir precio, cantidad y entrega.</p>
            <div className="mkt-hint">
              La consulta es el primer paso. Las condiciones se acuerdan después.
            </div>
          </section>
        )}
        <section className="mkt-panel mkt-how">
          <h2>Así de sencillo</h2>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>Elegí un producto</strong>
                <p>Mirá los detalles de la publicación.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Contanos qué necesitás</strong>
                <p>Indicá cantidad y localidad de entrega.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Seguí tu consulta</strong>
                <p>Revisá su estado en Mis consultas.</p>
              </div>
            </li>
          </ol>
        </section>
        <section className="mkt-panel mkt-reassurance">
          <Check size={22} aria-hidden="true" />
          <div>
            <strong>Vos decidís cómo seguir</strong>
            <p>Enviar una consulta no confirma una compra ni genera un pago.</p>
          </div>
        </section>
        <a className="mkt-history-link" href="#mis-consultas">
          <ClipboardList size={18} aria-hidden="true" />
          Ver mis consultas
        </a>
      </aside>
    </div>
  )
}
