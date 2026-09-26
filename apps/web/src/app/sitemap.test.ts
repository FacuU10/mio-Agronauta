import { deepStrictEqual, strictEqual } from 'node:assert/strict'
import { test } from 'node:test'
import sitemap from './sitemap'
import robots, { publicRouteCount } from './robots'

function withSiteUrl<T>(value: string | undefined, run: () => T): T {
  const previous = process.env['NEXT_PUBLIC_SITE_URL']
  if (value === undefined) delete process.env['NEXT_PUBLIC_SITE_URL']
  else process.env['NEXT_PUBLIC_SITE_URL'] = value

  try {
    return run()
  } finally {
    if (previous === undefined) delete process.env['NEXT_PUBLIC_SITE_URL']
    else process.env['NEXT_PUBLIC_SITE_URL'] = previous
  }
}

test('sitemap follows the public route registry and excludes operational marketplace routes', () => {
  const entries = withSiteUrl('https://app.example.test/', () => sitemap())

  deepStrictEqual(entries.map((entry) => entry.url), [
    'https://app.example.test/',
    'https://app.example.test/probar-demo',
    'https://app.example.test/login',
    'https://app.example.test/agronautas/maintenance',
  ])
  strictEqual(entries.some((entry) => entry.url.endsWith('/agronautas/marketplace')), false)
  strictEqual(entries.length, publicRouteCount())
})

test('robots keeps protected Agronautas and marketplace paths out of crawler discovery', () => {
  const result = withSiteUrl('https://app.example.test', () => robots())
  const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules
  const disallow = rules?.disallow
  const allow = rules?.allow
  if (!Array.isArray(disallow)) throw new Error('Expected robots disallow rules')
  if (!Array.isArray(allow)) throw new Error('Expected robots allow rules')

  strictEqual(disallow.includes('/agronautas'), true)
  strictEqual(disallow.includes('/demo'), true)
  strictEqual(allow.includes('/agronautas/maintenance'), true)
  strictEqual(result.sitemap, 'https://app.example.test/sitemap.xml')
})
