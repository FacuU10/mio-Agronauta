import type { Metadata } from 'next'
import { MarketplaceRouteClient } from '@/components/marketplace/route-client'
import { ProductShell } from '@/components/shell/product-shell'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/agronautas/marketplace')
}

export default function AgronautasMarketplacePage() {
  return <ProductShell product="agronautas" title="Marketplace Agronautas" description="Catálogo protegido y solicitudes sujetas a revisión humana, sin pagos ni pedidos implícitos." navItems={[{ href: '/agronautas', label: 'Workspace' }, { href: '/agronautas/marketplace', label: 'Marketplace', active: true }]}><MarketplaceRouteClient /></ProductShell>
}
