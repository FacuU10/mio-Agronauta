import type { Metadata } from 'next'
import { AgronautasAuthPage } from '@/components/agronautas/auth-page'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/login')
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams
  return <AgronautasAuthPage destination={params.next === 'marketplace' ? '/agronautas/marketplace' : params.next === 'livestock' ? '/agronautas?view=livestock' : '/agronautas'} />
}
