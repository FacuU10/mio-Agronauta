import type { Metadata } from 'next'
import { createElement } from 'react'
import { AgronautasFieldDetailPageClient } from '@/components/agronautas/field-detail'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/agronautas/fields/[fieldId]')
}

export default async function AgronautasFieldDetailRoute({ params }: { params: Promise<{ fieldId: string }> }) {
  const { fieldId } = await params
  const workspaceHref = `/agronautas?view=fields&fieldId=${encodeURIComponent(fieldId)}`
  return createElement(AgronautasFieldDetailPageClient, { fieldId, workspaceHref })
}
