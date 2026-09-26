'use client'

import { createElement, useState } from 'react'
import type { AgronautasMarketplaceDiscoveryResponse, AgronautasMarketplaceListing, AgronautasMarketplaceRfq, AgronautasMarketplaceRfqResponse } from '@/lib/agronautas/schemas'
import { MarketplaceCatalog } from './catalog'
import { MarketplaceRfqForm } from './rfq-form'
import { MarketplaceRfqHistory } from './rfq-history'

const React = { createElement }

interface MarketplaceCatalogRfqProps {
  workspaceId?: string
  listings: AgronautasMarketplaceDiscoveryResponse
  rfqs: AgronautasMarketplaceRfqResponse
  isLoading: boolean
  error: string | null
  accessState?: 'unauthorized' | 'forbidden' | 'maintenance'
  accessReason?: string
  onRetry: () => Promise<unknown>
  onSubmit: (input: { workspaceId?: string; listingId?: string | null; itemName: string; quantity: number; unit: string; locality: string; idempotencyKey: string; participantRefs: string[] }) => Promise<AgronautasMarketplaceRfqResponse | void>
  onCancel?: (rfq: AgronautasMarketplaceRfq) => Promise<AgronautasMarketplaceRfqResponse | void>
}

export function MarketplaceCatalogRfq({ workspaceId, listings, rfqs, isLoading, error, accessState, accessReason, onRetry, onSubmit, onCancel }: MarketplaceCatalogRfqProps) {
  const resolvedWorkspaceId = workspaceId ?? listings.items[0]?.workspaceId ?? rfqs.items[0]?.workspaceId ?? ''
  const [selectedListing, setSelectedListing] = useState<AgronautasMarketplaceListing | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  const submit = async (input: Parameters<typeof onSubmit>[0]): Promise<AgronautasMarketplaceRfqResponse | void> => {
    setIsMutating(true)
    try {
      return await onSubmit({ ...input, workspaceId: resolvedWorkspaceId })
    } finally {
      setIsMutating(false)
    }
  }

  const cancel = async (rfq: AgronautasMarketplaceRfq): Promise<AgronautasMarketplaceRfqResponse | void> => {
    if (!onCancel) return undefined
    setIsMutating(true)
    try {
      return await onCancel(rfq)
    } finally {
      setIsMutating(false)
    }
  }

  return <section className="grid gap-8" aria-label="Catálogo local Agronautas">
    {error && !accessState ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950"><p>{error}</p><button type="button" className="mt-3 min-h-11 rounded-full bg-stone-950 px-4 py-2 font-semibold text-white" onClick={() => void onRetry()}>Reintentar catálogo</button></div> : null}
    <MarketplaceCatalog workspaceId={resolvedWorkspaceId} response={listings} isLoading={isLoading} accessState={accessState} accessReason={accessReason} onRetry={() => void onRetry()} onSelectListing={setSelectedListing} />
    {selectedListing ? <MarketplaceRfqForm workspaceId={resolvedWorkspaceId} listing={selectedListing} isSubmitting={isMutating} onSubmit={(input) => submit(input)} /> : null}
    <MarketplaceRfqHistory workspaceId={resolvedWorkspaceId} response={rfqs} isMutating={isMutating} error={error} onRetry={() => void onRetry()} onCancel={(rfq) => cancel(rfq)} />
  </section>
}
