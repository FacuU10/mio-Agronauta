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

test('built ESM entrypoint uses Node-resolvable relative export specifiers', async () => {
  const distIndexPath = join(process.cwd(), 'dist', 'index.js')
  const distIndex = await readFile(distIndexPath, 'utf8')

  assert.match(
    distIndex,
    /export \* from ['"]\.\/example\.js['"]/,
    'dist/index.js must include the .js extension when re-exporting ./example for Node ESM',
  )
  assert.match(
    distIndex,
    /export \* from ['"]\.\/agronautas\.js['"]/,
    'dist/index.js must include the .js extension when re-exporting ./agronautas for Node ESM',
  )
  assert.doesNotMatch(
    distIndex,
    /from ['"]\.\/(?:example|agronautas)['"]/,
    'Node ESM cannot resolve extensionless relative specifiers emitted in dist/index.js',
  )
})
