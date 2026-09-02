import { AgronautasPageClient } from '@/components/agronautas/page-client'
import type { Metadata } from 'next'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/demo')
}

export default function DemoPage() {
  return <AgronautasPageClient />
}
