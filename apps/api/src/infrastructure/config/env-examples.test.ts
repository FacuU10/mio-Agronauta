import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

interface EnvExample {
  entries: Map<string, string>
  source: string
}

const API_OWNED_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'WORKER_POSTGRES_DSN',
  'WORKER_REDIS_URL',
  'API_PORT',
  'NODE_ENV',
] as const

const WEB_ALLOWED_KEYS = new Set([
  'NODE_ENV',
  'PORT',
  'AGRONAUTAS_API_INTERNAL_URL',
  'AGRONAUTAS_BFF_BEARER_TOKEN',
  'AGRONAUTAS_BFF_TIMEOUT_MS',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
])

const WEB_FORBIDDEN_KEYS = new Set([
  'DATABASE_URL',
  'REDIS_URL',
  'MONGODB_URL',
  'WORKER_POSTGRES_DSN',
  'WORKER_REDIS_URL',
  'HYDROLOGY_INGEST_TOKEN',
  'HYDROLOGY_CRON_OWNER_ID',
  'NASA_FIRMS_API_KEY',
  'SENTINEL_CLIENT_ID',
  'SENTINEL_CLIENT_SECRET',
  'JWT_SECRET',
  'GROQ_API_KEY',
  'CONTACT_INTAKE_WEBHOOK_SECRET',
])

const SAFE_PLACEHOLDER_MARKERS = [
  'replace-with-secret-manager-reference',
  'replace-with-local',
  'set-via-secret-manager',
]

function repositoryRoot(): string {
  return join(__dirname, '..', '..', '..', '..', '..')
}

async function readEnvExample(pathFromRoot: string): Promise<EnvExample> {
  const source = await readFile(join(repositoryRoot(), pathFromRoot), 'utf8')
  const entries = new Map<string, string>()

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    const key = match?.[1]
    const value = match?.[2]
    if (key !== undefined && value !== undefined) entries.set(key, value.replace(/^['"]|['"]$/g, ''))
  }

  return { entries, source }
}

function hasProductionDocumentation(example: EnvExample): boolean {
  const normalized = example.source.toLowerCase()
  return normalized.includes('production') && normalized.includes('secret manager')
}

function isSafePlaceholder(value: string | undefined): boolean {
  if (value === undefined || value === '') return true
  const normalized = value.toLowerCase()
  return SAFE_PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker))
}

test('environment examples separate API-owned local secrets from web BFF configuration', async () => {
  const [root, api, web] = await Promise.all([
    readEnvExample('.env.example'),
    readEnvExample('apps/api/.env.example'),
    readEnvExample('apps/web/.env.example'),
  ])

  for (const key of API_OWNED_KEYS) {
    assert.equal(api.entries.has(key), true, `apps/api/.env.example must own ${key}`)
  }

  assert.equal(api.entries.get('NODE_ENV'), 'development')
  assert.equal(api.entries.get('API_PORT'), '3001')
  assert.equal(api.entries.get('DATABASE_URL')?.includes('localhost'), true)
  assert.equal(api.entries.get('REDIS_URL')?.includes('localhost'), true)
  assert.equal(api.entries.get('WORKER_POSTGRES_DSN')?.includes('localhost'), true)
  assert.equal(api.entries.get('WORKER_REDIS_URL')?.includes('localhost'), true)

  for (const key of WEB_FORBIDDEN_KEYS) {
    assert.equal(web.entries.has(key), false, `apps/web/.env.example must not define ${key}`)
  }

  for (const key of web.entries.keys()) {
    assert.equal(WEB_ALLOWED_KEYS.has(key), true, `apps/web/.env.example contains non-BFF key ${key}`)
  }

  assert.equal(web.entries.get('NODE_ENV'), 'development')
  assert.equal(web.entries.get('PORT'), '3000')
  assert.equal(web.entries.get('AGRONAUTAS_API_INTERNAL_URL'), 'http://localhost:3001')
  assert.equal(isSafePlaceholder(web.entries.get('AGRONAUTAS_BFF_BEARER_TOKEN')), true)

  for (const example of [root, api, web]) {
    assert.equal(hasProductionDocumentation(example), true, 'each environment example must distinguish production secret injection')
  }
})

test('web BFF placeholder cannot contain a credential-bearing value', async () => {
  const web = await readEnvExample('apps/web/.env.example')
  const bearerToken = web.entries.get('AGRONAUTAS_BFF_BEARER_TOKEN')

  assert.equal(isSafePlaceholder(bearerToken), true)
  assert.equal(bearerToken?.includes('://'), false)
  assert.equal(bearerToken?.includes('@'), false)
})
