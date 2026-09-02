import { GovernmentOverview } from '@/components/government/overview'
import type { Metadata } from 'next'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/municipalities')
}

export default function MunicipalitiesPage() {
  return <GovernmentOverview />
}
