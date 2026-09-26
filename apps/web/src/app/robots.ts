import type { MetadataRoute } from 'next'
import { getConfiguredOrigin, getPublicRouteContracts } from '@/lib/route-contracts'

export default function robots(): MetadataRoute.Robots {
  const origin = getConfiguredOrigin()
  const sitemap = origin ? `${origin}/sitemap.xml` : undefined

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/agronautas/maintenance'],
      disallow: ['/demo', '/agronautas', '/municipalities', '/api/'],
    },
    ...(sitemap ? { sitemap } : {}),
  }
}

export function publicRouteCount(): number {
  return getPublicRouteContracts().length
}
