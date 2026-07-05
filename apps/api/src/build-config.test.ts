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

interface TurboJson {
  tasks?: Record<string, { cache?: boolean; dependsOn?: string[]; outputs?: string[] }>
}

async function readPackageJson(pathFromRoot: string): Promise<PackageJson> {
  const root = join(__dirname, '..', '..', '..')
  return JSON.parse(await readFile(join(root, pathFromRoot), 'utf8')) as PackageJson
}

async function readTurboJson(): Promise<TurboJson> {
  const root = join(__dirname, '..', '..', '..')
  return JSON.parse(await readFile(join(root, 'turbo.json'), 'utf8')) as TurboJson
}

async function readRootTextFile(pathFromRoot: string): Promise<string> {
  const root = join(__dirname, '..', '..', '..')
  return readFile(join(root, pathFromRoot), 'utf8')
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
  assert.equal(zodSchemasPackage.scripts?.['build'], 'node scripts/clean-build-output.mjs && tsc')
  assert.equal(zodSchemasPackage.scripts?.['build:ensure'], 'node scripts/ensure-build-output.mjs')
  assert.equal(zodSchemasPackage.main, './dist/index.js')
  assert.equal(zodSchemasPackage.types, './dist/index.d.ts')
  assert.deepEqual(zodSchemasPackage.exports, {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      default: './dist/index.js',
    },
  })
})

test('web production build is never restored from a partial Next cache artifact', async () => {
  const turbo = await readTurboJson()
  assert.equal(
    turbo.tasks?.['web#build']?.cache,
    false,
    'web#build must be uncached because Next generated server artifacts have flaked when restored from stale Turbo outputs on Windows',
  )
})

test('build and clean scripts use deterministic cross-platform commands', async () => {
  const rootPackage = await readPackageJson('package.json')
  const apiPackage = await readPackageJson('apps/api/package.json')
  const webPackage = await readPackageJson('apps/web/package.json')
  const hydrologyPackage = await readPackageJson('packages/hydrology-engine/package.json')

  assert.equal(rootPackage.scripts?.['clean'], 'turbo run clean && node scripts/clean-root.mjs')
  assert.equal(apiPackage.scripts?.['test'], 'pnpm run prisma:generate && node --import tsx --test src/**/*.test.ts')
  assert.equal(apiPackage.scripts?.['clean'], 'node -e "require(\'fs\').rmSync(\'dist\',{recursive:true,force:true})"')
  assert.equal(webPackage.scripts?.['clean'], 'node scripts/clean.mjs')
  assert.equal(webPackage.scripts?.['build'], 'pnpm --dir ../../packages/zod-schemas build:ensure && next build')
  assert.equal(hydrologyPackage.scripts?.['build:ensure'], 'node scripts/ensure-build-output.mjs')
  assert.equal(hydrologyPackage.scripts?.['test'], 'pnpm run build:ensure && node --import tsx --test src/**/*.test.ts')

  for (const [packageName, scripts] of Object.entries({
    root: rootPackage.scripts,
    api: apiPackage.scripts,
    web: webPackage.scripts,
    hydrology: hydrologyPackage.scripts,
  })) {
    for (const [scriptName, command] of Object.entries(scripts ?? {})) {
      assert.doesNotMatch(command, /\brm\s+-rf\b/, `${packageName} ${scriptName} must not use rm -rf`)
    }
  }
})

test('forced root tests build workspace exports before dependents execute', async () => {
  const turbo = await readTurboJson()
  assert.deepEqual(turbo.tasks?.['test']?.dependsOn, ['^build'])
  assert.deepEqual(turbo.tasks?.['web#build']?.dependsOn, ['@repo/zod-schemas#build'])
  assert.deepEqual(turbo.tasks?.['api#build']?.dependsOn, ['@repo/zod-schemas#build', '@repo/hydrology-engine#build'])
})

test('release provenance ignores generated cache and test-output artifacts', async () => {
  const gitignore = await readRootTextFile('.gitignore')
  for (const pattern of [
    '*.tsbuildinfo',
    '__pycache__/',
    '*.pyc',
    '.pytest_cache/',
    '*.egg-info/',
    'apps/web/test-results/',
    'apps/web/playwright-report/',
    'playwright-report/',
  ]) {
    assert.match(gitignore, new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'))
  }
})
