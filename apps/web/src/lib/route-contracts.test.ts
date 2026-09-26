import { deepStrictEqual, strictEqual } from 'node:assert/strict'
import { test } from 'node:test'
import {
  ROUTE_CONTRACTS,
  buildRouteMetadata,
  getConfiguredOrigin,
  getPublicRouteContracts,
  getRouteContract,
} from './route-contracts'

test('declares the existing routes with typed landmark and visibility contracts', () => {
  deepStrictEqual(
    ROUTE_CONTRACTS.map((route) => route.path),
    ['/', '/probar-demo', '/demo', '/login', '/agronautas', '/agronautas/marketplace', '/agronautas/fields/[fieldId]', '/agronautas/maintenance', '/demo/fields/[fieldId]', '/municipalities', '/municipalities/[id]', '/municipalities/ingest'],
  )

  for (const route of ROUTE_CONTRACTS) {
    strictEqual(route.mainId, 'main-content')
    strictEqual(route.title.length > 0, true)
    strictEqual(route.description.length > 0, true)
    strictEqual(route.recoveryLabel.length > 0, true)
    strictEqual(route.loadingLabel.endsWith('…'), true)
  }

  strictEqual(getRouteContract('/demo')?.visibility, 'demo')
  strictEqual(getRouteContract('/agronautas/marketplace')?.visibility, 'protected')
  strictEqual(getRouteContract('/municipalities/ingest')?.visibility, 'protected')
})

test('uses only an explicitly configured public origin', () => {
  strictEqual(getConfiguredOrigin({}), undefined)
  strictEqual(getConfiguredOrigin({ NEXT_PUBLIC_SITE_URL: 'https://app.example.test///' }), 'https://app.example.test')
  strictEqual(getConfiguredOrigin({ NEXT_PUBLIC_SITE_URL: 'not-an-origin', NEXT_PUBLIC_APP_URL: 'https://configured.example.test/' }), 'https://configured.example.test')
  strictEqual(getConfiguredOrigin({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' }), 'http://localhost:3000')
})

test('builds truthful metadata and absolute public URLs without inventing an origin', () => {
  const publicMetadata = buildRouteMetadata('/', { NEXT_PUBLIC_SITE_URL: 'https://app.example.test/' })
  strictEqual(publicMetadata.title, 'Agronautas | Inteligencia de riesgo productivo')
  strictEqual(publicMetadata.description, 'Landing pública de Agronautas con acceso directo a la demo del MVP de riesgo arrocero en Corrientes.')
  strictEqual(publicMetadata.alternates?.canonical, 'https://app.example.test/')
  strictEqual(publicMetadata.openGraph?.url, 'https://app.example.test/')
  strictEqual(publicMetadata.openGraph?.locale, 'es_AR')
   const twitter = publicMetadata.twitter
   if (!twitter || !('card' in twitter)) throw new Error('Expected Twitter card metadata')
   strictEqual(twitter.card, 'summary')

  const protectedMetadata = buildRouteMetadata('/demo', {})
  strictEqual(protectedMetadata.alternates, undefined)
  deepStrictEqual(protectedMetadata.robots, { index: false, follow: false })

  const marketplaceMetadata = buildRouteMetadata('/agronautas/marketplace', { NEXT_PUBLIC_SITE_URL: 'https://app.example.test/' })
  strictEqual(marketplaceMetadata.title, 'Marketplace Agronautas')
  strictEqual(marketplaceMetadata.alternates?.canonical, 'https://app.example.test/agronautas/marketplace')
  deepStrictEqual(marketplaceMetadata.robots, { index: false, follow: false })

  const unconfiguredMetadata = buildRouteMetadata('/probar-demo', {})
  strictEqual(unconfiguredMetadata.alternates, undefined)
  strictEqual(unconfiguredMetadata.openGraph?.url, undefined)
})

test('limits discovery to the public, non-parameterized routes', () => {
  deepStrictEqual(
    getPublicRouteContracts().map((route) => route.path),
    ['/', '/probar-demo', '/login', '/agronautas/maintenance'],
  )
})
