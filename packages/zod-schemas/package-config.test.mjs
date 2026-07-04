import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

async function readPackageJson() {
  const packageJsonPath = join(process.cwd(), 'package.json')
  return JSON.parse(await readFile(packageJsonPath, 'utf8'))
}

test('Node type definitions are installed for production dependency builds', async () => {
  const packageJson = await readPackageJson()

  assert.equal(
    packageJson.dependencies?.['@types/node'],
    '^20.11.24',
    'zod-schemas tsconfig requires Node types during Render dependency builds, so @types/node must be installed outside devDependencies',
  )
  assert.equal(
    packageJson.devDependencies?.['@types/node'],
    undefined,
    '@types/node should not be dev-only for packages built as production dependencies',
  )
})

test('shared TypeScript config is installed for production dependency builds', async () => {
  const packageJson = await readPackageJson()

  assert.equal(
    packageJson.dependencies?.['@repo/typescript-config'],
    'workspace:*',
    'zod-schemas extends @repo/typescript-config/base.json during Render dependency builds, so the config package must be installed outside devDependencies',
  )
  assert.equal(
    packageJson.devDependencies?.['@repo/typescript-config'],
    undefined,
    '@repo/typescript-config should not be dev-only for packages built as production dependencies',
  )
})
