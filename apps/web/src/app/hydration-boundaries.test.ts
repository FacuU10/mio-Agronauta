import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = dirname(fileURLToPath(import.meta.url))

const serverRoutes = [
  'page.tsx',
  'probar-demo/page.tsx',
  'demo/page.tsx',
  'demo/fields/[fieldId]/page.tsx',
  'municipalities/page.tsx',
  'municipalities/[id]/page.tsx',
  'municipalities/ingest/page.tsx',
] as const

const clientIslands = [
  '../components/landing/homepage.tsx',
  '../components/landing/demo-contact-form.tsx',
  '../components/agronautas/page-client.tsx',
  '../components/agronautas/workspace.tsx',
  '../components/agronautas/field-detail.tsx',
  '../components/government/overview.tsx',
  '../components/government/detail.tsx',
  '../components/government/ingest-panel.tsx',
] as const

async function sourceAt(relativePath: string) {
  return readFile(join(appRoot, relativePath), 'utf8')
}

test('declared route pages remain server components without browser orchestration or secrets', async () => {
  const sources = await Promise.all(serverRoutes.map((route) => sourceAt(route)))

  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(source, /^\s*['"]use client['"]/m, serverRoutes[index])
    assert.doesNotMatch(source, /\b(?:useEffect|useLayoutEffect|useState)\s*\(/, serverRoutes[index])
    assert.doesNotMatch(source, /\b(?:Authorization|process\.env|secret|accessToken|refreshToken)\b/i, serverRoutes[index])
  }
})

test('browser interaction stays inside the declared client islands', async () => {
  const sources = await Promise.all(clientIslands.map((file) => sourceAt(file)))

  for (const [index, source] of sources.entries()) {
    assert.match(source, /^\s*['"]use client['"]/m, clientIslands[index])
  }
})
