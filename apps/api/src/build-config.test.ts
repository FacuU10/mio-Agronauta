import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

interface PackageJson {
  packageManager?: string
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

const API_RENDER_ENV_NAMES = [
  'PORT',
  'API_PORT',
  'DATABASE_URL',
  'REDIS_URL',
  'TRUST_PROXY',
  'RENDER',
  'HYDROLOGY_INGEST_TOKEN',
  'HYDROLOGY_SCHEDULER_ENABLED',
  'AGRONAUTAS_SCHEDULER_ENABLED',
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'GROQ_TIMEOUT_MS',
] as const

const WEB_RENDER_ENV_NAMES = [
  'PORT',
  'AGRONAUTAS_API_INTERNAL_URL',
  'AGRONAUTAS_BFF_BEARER_TOKEN',
  'AGRONAUTAS_BFF_TIMEOUT_MS',
] as const

const ENV_IGNORE_PATTERNS = ['.env', '.env.*', '*.env', '*.env.*', '!*.env.example'] as const
const IGNORED_ENV_PATHS = ['.env', '.env.production', 'service.env', 'service.env.local', 'nested/service.env.local'] as const
const TRACKABLE_ENV_PATHS = ['.env.example', 'service.env.example', 'nested/service.env.example'] as const

function repositoryRoot(): string {
  return join(__dirname, '..', '..', '..')
}

async function readRootText(pathFromRoot: string): Promise<string> {
  return readFile(join(repositoryRoot(), pathFromRoot), 'utf8')
}

async function readPackage(pathFromRoot: string): Promise<PackageJson> {
  return JSON.parse(await readRootText(pathFromRoot)) as PackageJson
}

async function readPackageJson(pathFromRoot: string): Promise<PackageJson> {
  return readPackage(pathFromRoot)
}

async function readTurboJson(): Promise<TurboJson> {
  return JSON.parse(await readRootText('turbo.json')) as TurboJson
}

async function readRootTextFile(pathFromRoot: string): Promise<string> {
  return readRootText(pathFromRoot)
}

function isIgnoredByGit(pathFromRoot: string): boolean {
  const result = spawnSync('git', ['check-ignore', '--no-index', '--quiet', '--', pathFromRoot], {
    cwd: repositoryRoot(),
    encoding: 'utf8',
  })

  assert.equal(result.error, undefined, `git check-ignore failed for ${pathFromRoot}`)
  return result.status === 0
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
    assert.match(gitignore, new RegExp(`^${escapeRegExp(pattern)}$`, 'm'))
  }
})

test('environment policy ignores secret variants while preserving safe examples', async () => {
  const gitignore = await readRootTextFile('.gitignore')

  for (const pattern of ENV_IGNORE_PATTERNS) {
    assert.match(
      gitignore,
      new RegExp(`^${escapeRegExp(pattern)}$`, 'm'),
      `${pattern} must be explicit in the root ignore policy`,
    )
  }

  for (const path of IGNORED_ENV_PATHS) {
    assert.equal(isIgnoredByGit(path), true, `${path} must be ignored`)
  }

  for (const path of TRACKABLE_ENV_PATHS) {
    assert.equal(isIgnoredByGit(path), false, `${path} must remain trackable`)
  }
})

test('api environment template uses a secret-manager placeholder for ingest', async () => {
  const envExample = await readRootTextFile('apps/api/.env.example')

  assert.match(envExample, /^HYDROLOGY_INGEST_TOKEN=replace-with-secret-manager-reference$/m)
})

test('Render manifest declares two Native Node services, one Python worker, and one hydrology Cron', async () => {
  const renderYaml = await readRootText('render.yaml')
  const serviceNames = [...renderYaml.matchAll(/^\s+name: ([a-z0-9-]+)$/gm)].map((match) => match[1])

  assert.equal((renderYaml.match(/^\s+- type: web$/gm) ?? []).length, 2)
  assert.equal((renderYaml.match(/^\s+runtime: node$/gm) ?? []).length, 3)
  assert.equal((renderYaml.match(/^\s+- type: worker$/gm) ?? []).length, 1)
  assert.match(renderYaml, /^\s+runtime: python$/m)
  assert.equal((renderYaml.match(/^\s+- type: cron$/gm) ?? []).length, 1)
  assert.deepEqual(serviceNames, ['agronautas-api', 'agronautas-runtime-worker', 'ibera-hydrology-cron', 'agronautas-web'])
  assert.doesNotMatch(renderYaml, /docker/i)
  assert.doesNotMatch(renderYaml, /\$\{|\{\{|\}\}|<%/)
})

test('Render worker wiring is explicit but scheduler remains disabled and deployment is not claimed', async () => {
  const renderYaml = await readRootText('render.yaml')
  const workerProject = await readRootText('apps/workflow-runtime-python/pyproject.toml')

  assert.match(renderYaml, /agronautas-runtime-worker/)
  assert.match(renderYaml, /workflow-runtime-consumer/)
  assert.match(renderYaml, /WORKER_POSTGRES_DSN/)
  assert.match(renderYaml, /REDIS_URL/)
  assert.match(renderYaml, /AGRONAUTAS_SCHEDULER_ENABLED[\s\S]*?value: false/)
  assert.match(workerProject, /workflow-runtime\s*=\s*"worker\.main:main"/)
  assert.doesNotMatch(renderYaml, /deploy(ed|ment)\s*(proof|verified)/i)
})

test('Python worker hosting is documented as a separate prerequisite from Render Node services', async () => {
  const workerReadme = await readRootText('apps/workflow-runtime-python/README.md')
  assert.match(workerReadme, /separate.*hosting|hosting.*separate/i)
  assert.match(workerReadme, /PostgreSQL|Redis/i)
  assert.match(workerReadme, /not live deployment evidence|configuration only/i)
})

test('Render commands match current workspace scripts and preserve separate routes', async () => {
  const [renderYaml, rootPackage, apiPackage, webPackage, hydrologyPackage, server] = await Promise.all([
    readRootText('render.yaml'),
    readPackage('package.json'),
    readPackage('apps/api/package.json'),
    readPackage('apps/web/package.json'),
    readPackage('packages/hydrology-engine/package.json'),
    readRootText('apps/api/src/server.ts'),
  ])

  assert.equal(rootPackage.packageManager, 'pnpm@9.0.0')
  assert.equal(apiPackage.scripts?.['build'], 'tsc')
  assert.equal(apiPackage.scripts?.['start'], 'node dist/index.js')
  assert.equal(webPackage.scripts?.['build'], 'pnpm --dir ../../packages/zod-schemas build:ensure && next build')
  assert.equal(webPackage.scripts?.['start'], 'next start .')
  assert.equal(hydrologyPackage.scripts?.['build'], 'tsc')

  assert.match(renderYaml, /buildCommand: pnpm install --frozen-lockfile && pnpm --dir packages\/zod-schemas build && pnpm --dir packages\/hydrology-engine build && pnpm --dir apps\/api build/)
  assert.match(renderYaml, /startCommand: pnpm --dir apps\/api start/)
  assert.match(renderYaml, /buildCommand: pnpm install --frozen-lockfile && pnpm --dir apps\/web build/)
  assert.match(renderYaml, /startCommand: pnpm --dir apps\/web start/)
  assert.match(renderYaml, /schedule: "0 \* \* \* \*"/)
  assert.match(renderYaml, /startCommand: pnpm --dir apps\/api scheduler:once -- --render-cron/)
  assert.match(renderYaml, /HYDROLOGY_CRON_OWNER_ID/)
  assert.match(server, /app\.use\('\/api\/hydrology'/)
  assert.match(server, /app\.use\(runtimeConfig\.routePrefix, createAgronautasRouter\(\)\)/)
  assert.match(server, /app\.use\(`\$\{runtimeConfig\.routePrefix\}\/v1`/)
})

test('Render manifest declares current environment names and disables both schedulers', async () => {
  const renderYaml = await readRootText('render.yaml')

  for (const envName of [...API_RENDER_ENV_NAMES, ...WEB_RENDER_ENV_NAMES]) {
    assert.match(renderYaml, new RegExp(`^\\s+- key: ${envName}$`, 'm'), `${envName} must be declared by name`)
  }

  for (const schedulerName of ['HYDROLOGY_SCHEDULER_ENABLED', 'AGRONAUTAS_SCHEDULER_ENABLED']) {
    assert.match(renderYaml, new RegExp(`- key: ${schedulerName}\\r?\\n\\s+value: false`))
  }
  assert.match(renderYaml, /- key: HYDROLOGY_CRON_OWNER_ID\r?\n\s+value: ibera-hydrology-cron/)

  for (const secretName of ['DATABASE_URL', 'REDIS_URL', 'HYDROLOGY_INGEST_TOKEN', 'GROQ_API_KEY', 'AGRONAUTAS_BFF_BEARER_TOKEN']) {
    assert.match(renderYaml, new RegExp(`- key: ${secretName}\\r?\\n\\s+sync: false`))
  }
})

test('canonical package and lock state remains Next.js 15.5.19', async () => {
  const [webPackage, lockfile] = await Promise.all([
    readPackage('apps/web/package.json'),
    readRootText('pnpm-lock.yaml'),
  ])

  assert.equal(webPackage.dependencies?.['next'], '^15.0.0')
  assert.match(lockfile, /^\s+next@15\.5\.19:/m)
  assert.doesNotMatch(lockfile, /next@15\.5\.20/)
})
