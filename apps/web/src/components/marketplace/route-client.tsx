'use client'

import { useQuery } from '@tanstack/react-query'
import { createAgronautasApiService } from '@/lib/agronautas/service'
import { createAgronautasAuthClient } from '@/lib/agronautas/auth-client'
import { MarketplaceCatalogRfq } from './catalog-rfq'

export function MarketplaceRouteClient() {
  const service = createAgronautasApiService()
  const authQuery = useQuery({ queryKey: ['agronautas', 'marketplace', 'auth-status'], queryFn: () => createAgronautasAuthClient().status(), retry: false })
  const listingsQuery = useQuery({ queryKey: ['agronautas', 'marketplace', 'listings'], queryFn: () => service.listMarketplaceListings(), retry: false })
  const rfqsQuery = useQuery({ queryKey: ['agronautas', 'marketplace', 'rfqs'], queryFn: () => service.listMarketplaceRfqs(), retry: false })
  const error = listingsQuery.error instanceof Error ? listingsQuery.error.message : rfqsQuery.error instanceof Error ? rfqsQuery.error.message : null
  const workspaceId = authQuery.data?.principal.workspaceId
  const accessState = authQuery.error && typeof authQuery.error === 'object' && 'status' in authQuery.error && authQuery.error.status === 403 ? 'forbidden' : authQuery.error && typeof authQuery.error === 'object' && 'status' in authQuery.error && authQuery.error.status === 503 ? 'maintenance' : authQuery.error ? 'unauthorized' : undefined
  const accessReason = authQuery.error instanceof Error ? authQuery.error.message : undefined
  const retry = async () => { await Promise.all([listingsQuery.refetch(), rfqsQuery.refetch(), authQuery.refetch()]) }
  if (!listingsQuery.data || !rfqsQuery.data) return <div className="mx-auto max-w-6xl p-5 md:p-10"><MarketplaceCatalogRfq workspaceId={workspaceId} listings={listingsQuery.data ?? { contractVersion: 'agronautas-marketplace-v1', status: 'empty', staleListingCount: 0, generatedAt: new Date().toISOString(), items: [], retryable: false }} rfqs={rfqsQuery.data ?? { contractVersion: 'agronautas-marketplace-v1', status: 'unavailable', items: [], audit: [], retryable: true, reason: 'loading' }} isLoading={listingsQuery.isLoading || rfqsQuery.isLoading} error={error} accessState={accessState} accessReason={accessReason} onRetry={retry} onSubmit={async (input) => { if (!workspaceId) throw new Error('La sesión Agronautas no está disponible.'); const result = await service.submitMarketplaceRfq({ ...input, workspaceId }); await Promise.all([listingsQuery.refetch(), rfqsQuery.refetch()]); return result }} onCancel={async (rfq) => { if (!workspaceId) throw new Error('La sesión Agronautas no está disponible.'); const result = await service.cancelMarketplaceRfq({ rfqId: rfq.rfqId, expectedRevision: rfq.revision }); await rfqsQuery.refetch(); return result }} /></div>
  return <div className="mx-auto max-w-6xl p-5 md:p-10"><MarketplaceCatalogRfq workspaceId={workspaceId} listings={listingsQuery.data} rfqs={rfqsQuery.data} isLoading={false} error={error} accessState={accessState} accessReason={accessReason} onRetry={retry} onSubmit={async (input) => { if (!workspaceId) throw new Error('La sesión Agronautas no está disponible.'); const result = await service.submitMarketplaceRfq({ ...input, workspaceId }); await rfqsQuery.refetch(); return result }} onCancel={async (rfq) => { if (!workspaceId) throw new Error('La sesión Agronautas no está disponible.'); const result = await service.cancelMarketplaceRfq({ rfqId: rfq.rfqId, expectedRevision: rfq.revision }); await rfqsQuery.refetch(); return result }} /></div>
}
