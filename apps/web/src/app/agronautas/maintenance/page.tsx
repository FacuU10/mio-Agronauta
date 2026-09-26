import type { Metadata } from 'next'
import { AgronautasMaintenancePage } from '@/components/agronautas/maintenance-page'
import { buildRouteMetadata } from '@/lib/route-contracts'

export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/agronautas/maintenance')
}

export default function AgronautasMaintenanceRoute() {
  return <AgronautasMaintenancePage />
}
