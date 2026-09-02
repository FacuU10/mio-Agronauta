import type { MetadataRoute } from 'next'
import { getConfiguredOrigin, getPublicRouteContracts } from '@/lib/route-contracts'

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getConfiguredOrigin()
  if (!origin) return []

  return getPublicRouteContracts().map((route) => ({
    url: `${origin}${route.path === '/' ? '/' : route.path}`,
  }))
}
