import { GovernmentDetail } from '@/components/government/detail'
import type { Metadata } from 'next'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/municipalities/[id]')
}

type PageProps = { params: Promise<{ id: string }> }

export default async function MunicipalityDetailPage({ params }: PageProps) {
  const { id } = await params
  return <GovernmentDetail municipalityId={id} />
}
