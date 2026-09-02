import { AgronautasFieldDetailPageClient } from '@/components/agronautas/field-detail'
import type { Metadata } from 'next'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/demo/fields/[fieldId]')
}

export default async function AgronautasFieldDetailRoute({ params }: { params: Promise<{ fieldId: string }> }) {
  const { fieldId } = await params
  return <AgronautasFieldDetailPageClient fieldId={fieldId} />
}
