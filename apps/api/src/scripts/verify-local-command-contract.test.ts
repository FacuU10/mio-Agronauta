import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

type PackageManifest = {
  name?: string
  private?: boolean
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  workspaces?: unknown
}

const scriptsDirectory = __dirname
const repositoryRoot = resolve(scriptsDirectory, '../../../../')

function readManifest(relativePath: string): PackageManifest {
  return JSON.parse(readFileSync(resolve(repositoryRoot, relativePath), 'utf8')) as PackageManifest
}

function assertThinWrapper(relativePath: string, packageName: string, targetPackage: string): void {
  const manifest = readManifest(relativePath)

  assert.equal(manifest.name, packageName)
  assert.equal(manifest.private, true)
  assert.deepEqual(manifest.scripts, {
    dev: `pnpm --dir ../apps/${targetPackage} run dev`,
  })
  assert.equal(manifest.dependencies, undefined)
  assert.equal(manifest.devDependencies, undefined)
  assert.equal(manifest.peerDependencies, undefined)
  assert.equal(manifest.optionalDependencies, undefined)
  assert.equal(manifest.workspaces, undefined)

  const wrapperDirectory = resolve(repositoryRoot, relativePath, '..')
  assert.equal(resolve(wrapperDirectory, `../apps/${targetPackage}`), resolve(repositoryRoot, `apps/${targetPackage}`))
}

test('backend and frontend provide exact cwd-safe delegates without owning apps or dependencies', () => {
  assertThinWrapper('backend/package.json', 'backend', 'api')
  assertThinWrapper('frontend/package.json', 'frontend', 'web')

  const rootScripts = readManifest('package.json').scripts ?? {}
  assert.equal(rootScripts['backend'], 'pnpm --dir backend run dev')
  assert.equal(rootScripts['frontend'], 'pnpm --dir frontend run dev')
  assert.equal(rootScripts['dev'], 'turbo run dev')
  assert.equal(rootScripts['build'], 'turbo run build')
  assert.equal(rootScripts['test'], 'turbo run test')
})

test('local startup exposes required infrastructure and stops before app dev on prerequisite failure', () => {
  const rootScripts = readManifest('package.json').scripts ?? {}
  const localUp = rootScripts['local:up']
  const localDev = rootScripts['local:dev']

  assert.equal(localUp, 'docker compose up -d postgres redis worker')
  assert.equal(localDev, 'pnpm run local:up && pnpm --parallel --filter api --filter web run dev')
  assert.match(localUp ?? '', /postgres/)
  assert.match(localUp ?? '', /redis/)
  assert.match(localUp ?? '', /worker/)
  assert.match(localDev ?? '', /^pnpm run local:up && /)

  for (const command of [localUp, localDev]) {
    assert.ok(command)
    assert.doesNotMatch(command, /(^|\s)(true|:)(\s|$)|\|\||2>\s*[nul\/]/i)
    assert.doesNotMatch(command, /\.env|DATABASE_URL|REDIS_URL|TOKEN|SECRET|PASSWORD/i)
  }
})

test('wrapper failure paths remain observable instead of fabricating readiness or success', () => {
  const rootScripts = readManifest('package.json').scripts ?? {}
  const wrapperScripts = [readManifest('backend/package.json').scripts?.['dev'], readManifest('frontend/package.json').scripts?.['dev']]

  assert.ok(rootScripts['local:up'])
  assert.ok(rootScripts['local:dev'])
  assert.ok(wrapperScripts.every(Boolean))
  assert.ok(wrapperScripts.every((command) => command?.startsWith('pnpm --dir ../apps/')))
  assert.doesNotMatch(rootScripts['local:dev'] ?? '', /--if-present|--silent|continue-on-error/i)
  assert.doesNotMatch(rootScripts['local:up'] ?? '', /--if-present|--silent|continue-on-error/i)
})

test('Compose declares fail-closed health dependencies for the required local topology', () => {
  const compose = readFileSync(resolve(repositoryRoot, 'docker-compose.yml'), 'utf8')
  const mongodbService = compose.match(/^  mongodb:\n([\s\S]*?)(?=^  \w|^volumes:)/m)?.[1] ?? ''

  assert.match(compose, /postgres:[\s\S]*?healthcheck:[\s\S]*?PostGIS_Version/i)
  assert.match(compose, /redis:[\s\S]*?healthcheck:/i)
  assert.match(compose, /api:[\s\S]*?healthcheck:[\s\S]*?\/health/i)
  assert.match(compose, /worker:[\s\S]*?healthcheck:[\s\S]*?WORKER_POSTGRES_DSN[\s\S]*?WORKER_REDIS_URL/i)
  assert.match(compose, /api:[\s\S]*?depends_on:[\s\S]*?worker:[\s\S]*?condition:\s*service_healthy/i)
  assert.doesNotMatch(mongodbService, /depends_on:/i)
})
