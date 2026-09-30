import type { Metadata } from 'next'
import { AgronautasPageClient } from '@/components/agronautas/page-client'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/agronautas')
}

export default async function AgronautasPage({ searchParams }: { searchParams?: Promise<{ view?: string; fieldId?: string }> }) {
  const params = await searchParams
  const supportedViews = ['fields', 'activity', 'geometry', 'management', 'livestock', 'planning', 'evidence', 'intelligence', 'copilot'] as const
  const view = supportedViews.includes(params?.view as (typeof supportedViews)[number]) ? params?.view as (typeof supportedViews)[number] : 'fields'
  return <AgronautasPageClient initialFieldId={params?.fieldId} initialView={view} />
}
