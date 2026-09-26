import type { Metadata } from 'next'
import { AgronautasAuthPage } from '@/components/agronautas/auth-page'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/login')
}

export default function LoginPage() {
  return <AgronautasAuthPage />
}
