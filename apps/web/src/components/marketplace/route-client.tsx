'use client'
import { useQuery } from '@tanstack/react-query'
import { createAgronautasApiService } from '@/lib/agronautas/service'
import { createAgronautasAuthClient } from '@/lib/agronautas/auth-client'
import { MarketplaceCatalogRfq } from './catalog-rfq'

export function MarketplaceRouteClient() {
  const service = createAgronautasApiService()
  const authQuery = useQuery({
    queryKey: ['agronautas', 'marketplace', 'auth-status'],
    queryFn: () => createAgronautasAuthClient().status(),
    retry: false,
  })
  const workspaceId = authQuery.data?.principal.workspaceId
  const enabled = authQuery.isSuccess && !authQuery.error && Boolean(workspaceId)
  const listingsQuery = useQuery({
    queryKey: ['agronautas', 'marketplace', 'listings', workspaceId],
    enabled,
    queryFn: () => service.listMarketplaceListings(),
    retry: false,
  })
  const rfqsQuery = useQuery({
    queryKey: ['agronautas', 'marketplace', 'rfqs', workspaceId],
    enabled,
    queryFn: () => service.listMarketplaceRfqs(),
    retry: false,
  })
  const authError = authQuery.error as { status?: number } | null
  const accessState = authError
    ? authError.status === 401
      ? 'unauthorized'
      : authError.status === 403
        ? 'forbidden'
        : 'maintenance'
    : undefined
  const retryAuth = async () => {
    await authQuery.refetch()
  }
  return (
    <MarketplaceCatalogRfq
      workspaceId={workspaceId}
      listings={
        listingsQuery.isError
          ? {
              contractVersion: 'agronautas-marketplace-v1',
              status: 'unavailable',
              staleListingCount: 0,
              generatedAt: new Date().toISOString(),
              items: [],
              retryable: true,
            }
          : (listingsQuery.data ?? {
              contractVersion: 'agronautas-marketplace-v1',
              status: 'empty',
              staleListingCount: 0,
              generatedAt: new Date().toISOString(),
              items: [],
              retryable: false,
            })
      }
      rfqs={
        rfqsQuery.data ?? {
          contractVersion: 'agronautas-marketplace-v1',
          status: 'unavailable',
          items: [],
          audit: [],
          retryable: true,
        }
      }
      isLoading={authQuery.isPending || listingsQuery.isLoading}
      historyLoading={authQuery.isPending || rfqsQuery.isLoading}
      error={listingsQuery.isError ? 'catalog_unavailable' : null}
      historyError={rfqsQuery.isError ? 'history_unavailable' : null}
      accessState={accessState}
      onRetry={
        accessState
          ? retryAuth
          : async () => {
              await listingsQuery.refetch()
            }
      }
      onHistoryRetry={async () => {
        await rfqsQuery.refetch()
      }}
      onSubmit={async (input) => {
        if (!workspaceId) throw new Error('Iniciá sesión para enviar tu consulta.')
        const result = await service.submitMarketplaceRfq({ ...input, workspaceId })
        await rfqsQuery.refetch()
        return result
      }}
      onCancel={async (rfq) => {
        if (!workspaceId) throw new Error('Iniciá sesión para cancelar tu consulta.')
        const result = await service.cancelMarketplaceRfq({
          rfqId: rfq.rfqId,
          expectedRevision: rfq.revision,
        })
        await rfqsQuery.refetch()
        return result
      }}
    />
  )
}
