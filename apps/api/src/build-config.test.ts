import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

interface PackageJson {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  main?: string
  types?: string
  exports?: Record<string, unknown> | string
}

async function readPackageJson(pathFromRoot: string): Promise<PackageJson> {
  const root = join(__dirname, '..', '..', '..')
  return JSON.parse(await readFile(join(root, pathFromRoot), 'utf8')) as PackageJson
}

test('api production build keeps TypeScript declaration packages installable', async () => {
  const apiPackage = await readPackageJson('apps/api/package.json')
  for (const packageName of ['@types/express', '@types/cors', '@types/pg', '@types/node']) {
    assert.equal(apiPackage.dependencies?.[packageName], apiPackage.devDependencies?.[packageName] ?? apiPackage.dependencies?.[packageName])
    assert.ok(apiPackage.dependencies?.[packageName], `${packageName} must be a production dependency for Render type-check builds`)
  }
})

test('zod-schemas exposes built declarations and participates in turbo build order', async () => {
  const zodSchemasPackage = await readPackageJson('packages/zod-schemas/package.json')
  assert.equal(zodSchemasPackage.scripts?.['build'], 'tsc')
  assert.equal(zodSchemasPackage.main, './dist/index.js')
  assert.equal(zodSchemasPackage.types, './dist/index.d.ts')
  assert.deepEqual(zodSchemasPackage.exports, {
    '.': {
      types: './dist/index.d.ts',
      default: './dist/index.js',
    },
  })
})
