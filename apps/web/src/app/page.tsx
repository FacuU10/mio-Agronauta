import { LandingHomepage } from '@/components/landing/homepage'
import type { Metadata } from 'next'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/')
}

export default function HomePage() {
  return <LandingHomepage />
}
