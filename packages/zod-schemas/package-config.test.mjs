import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

async function readPackageJson() {
  const packageJsonPath = join(process.cwd(), 'package.json')
  return JSON.parse(await readFile(packageJsonPath, 'utf8'))
}

async function readRootTurboJson() {
  const turboJsonPath = join(process.cwd(), '..', '..', 'turbo.json')
  return JSON.parse(await readFile(turboJsonPath, 'utf8'))
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

test('package declares ESM semantics for bundlers and Node runtime', async () => {
  const packageJson = await readPackageJson()

  assert.equal(
    packageJson.type,
    'module',
    'dist/index.js contains ESM export syntax and must be declared as ESM for Next/Vercel bundlers and Node runtime',
  )
})

test('build script removes stale incremental and dist outputs before compiling', async () => {
  const packageJson = await readPackageJson()

  assert.equal(
    packageJson.scripts?.build,
    'node scripts/clean-build-output.mjs && tsc',
    'zod-schemas build must clean stale dist and tsbuildinfo before tsc so Turbo/Vercel cannot replay or preserve partial ESM outputs',
  )
})

test('Turbo never replays cached zod-schemas build artifacts', async () => {
  const turboJson = await readRootTurboJson()

  assert.equal(
    turboJson.tasks?.['@repo/zod-schemas#build']?.cache,
    false,
    'Vercel/Turbo must execute @repo/zod-schemas build instead of replaying stale remote cache entries that may omit dist/example.js',
  )
})

test('built ESM re-export targets exist and dist entrypoint imports in Node', async () => {
  const distIndexPath = join(process.cwd(), 'dist', 'index.js')
  const distIndex = await readFile(distIndexPath, 'utf8')
  const reExportSpecifiers = [...distIndex.matchAll(/export \* from ['"](\.\/[^'"]+\.js)['"]/g)].map(
    (match) => match[1],
  )

  assert.deepEqual(
    reExportSpecifiers,
    ['./example.js', './agronautas.js'],
    'dist/index.js should re-export exactly the built schema modules with explicit .js specifiers',
  )

  for (const specifier of reExportSpecifiers) {
    await access(join(process.cwd(), 'dist', specifier.slice('./'.length)))
  }

  const schemaModule = await import(pathToFileURL(distIndexPath).href)
  assert.equal(typeof schemaModule.exampleSchema?.parse, 'function')
  assert.equal(typeof schemaModule.fieldIntakeSchema?.parse, 'function')
})
