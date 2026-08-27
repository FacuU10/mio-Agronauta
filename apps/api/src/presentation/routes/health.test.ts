import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import { getAgronautasRuntimeConfig } from '../../infrastructure/config/agronautas-runtime'
import { createHealthRouter, READINESS_DEPENDENCY_TIMEOUT_MS, withReadinessTimeout } from './health'
import { PostgresAgronautasRuntimeReadinessRepository } from '../../infrastructure/database/postgres/agronautas-runtime-readiness-repository'

const baseConfig = {
  mode: 'real' as const,
  routePrefix: '/agronautas',
  trustProxy: false,
  schedulerEnabled: false,
  optionalReadinessServices: [],
  runtimeRequired: false,
  workerHeartbeatMaxAgeSeconds: 180,
  readinessDependencyTimeoutMs: 2000,
  revision: null,
}

test('READINESS_DEPENDENCY_TIMEOUT_MS is fixed at 2000ms', () => {
  assert.equal(READINESS_DEPENDENCY_TIMEOUT_MS, 2000)
})

test('runtime config uses the valid readiness timeout, falls back, and caps unsafe values', () => {
  assert.equal(getAgronautasRuntimeConfig({ AGRONAUTAS_READINESS_DEPENDENCY_TIMEOUT_MS: '4500' }).readinessDependencyTimeoutMs, 4500)
  assert.equal(getAgronautasRuntimeConfig({ AGRONAUTAS_READINESS_DEPENDENCY_TIMEOUT_MS: '0' }).readinessDependencyTimeoutMs, 2000)
  assert.equal(getAgronautasRuntimeConfig({ AGRONAUTAS_READINESS_DEPENDENCY_TIMEOUT_MS: '999999999' }).readinessDependencyTimeoutMs, 60000)
  assert.equal(getAgronautasRuntimeConfig({ AGRONAUTAS_READINESS_DEPENDENCY_TIMEOUT_MS: 'not-a-number' }).readinessDependencyTimeoutMs, 2000)
})

test('runtime config accepts only a safe Render commit revision and ignores other environment values', () => {
  const config = getAgronautasRuntimeConfig({
    RENDER_GIT_COMMIT: '0123456789abcdef0123456789abcdef01234567',
    DATABASE_URL: 'postgres://user:secret@example.invalid/app',
    HYDROLOGY_INGEST_TOKEN: 'do-not-expose',
    AGRONAUTAS_API_INTERNAL_URL: 'https://private.example.invalid',
  })
  assert.equal(config.revision, '0123456789abcdef0123456789abcdef01234567')
  assert.doesNotMatch(JSON.stringify(config), /postgres|secret|private\.example|do-not-expose|DATABASE_URL|HYDROLOGY_INGEST_TOKEN/)
  assert.equal(getAgronautasRuntimeConfig({ RENDER_GIT_COMMIT: 'https://private.example.invalid/secret' }).revision, null)
})

test('withReadinessTimeout reports timed out dependency checks', async () => {
  const result = await withReadinessTimeout('redis', () => new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(true), 50)
  }), 5)

  assert.equal(result.ok, false)
  assert.equal(result.timedOut, true)
  assert.match(result.error ?? '', /redis readiness check timed out after 5ms/)
})

test('GET /health returns liveness 200 without dependency checks', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => { throw new Error('postgres should not be checked') },
    checkMongoDB: async () => { throw new Error('mongo should not be checked') },
    checkRedis: async () => { throw new Error('redis should not be checked') },
    getConfig: () => baseConfig,
  }))

  const response = await request(app, '/agronautas/health')
  assert.equal(response.status, 200)
  const body = await response.json() as { status: string }
  assert.equal(body.status, 'ok')
  assert.equal((body as { revision?: string | null }).revision, null)
  assert.doesNotMatch(JSON.stringify(body), /DATABASE_URL|postgres|secret|HYDROLOGY_INGEST_TOKEN|AGRONAUTAS_API_INTERNAL_URL/)
})

test('GET /ready keeps Mongo optional when active deps are healthy', async () => {
  let mongoChecks = 0
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => {
      mongoChecks += 1
      return false
    },
    checkRedis: async () => true,
    getConfig: () => ({ ...baseConfig, optionalReadinessServices: ['mongodb'] }),
  }))

  const response = await request(app, '/agronautas/ready')
  assert.equal(response.status, 200)
  const body = await response.json() as { optionalChecks: string[]; capabilities?: { mongodb?: { required: boolean } }; degraded: string[] }
  assert.equal(mongoChecks, 1)
  assert.ok(body.optionalChecks.includes('mongodb'))
  assert.ok(body.degraded.includes('mongodb'))
  assert.equal(body.capabilities?.mongodb?.required, false)
})

test('GET /ready does not check Mongo when it is not explicitly enabled', async () => {
  let mongoChecks = 0
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => {
      mongoChecks += 1
      throw new Error('MongoDB must not be checked when it is not configured')
    },
    checkRedis: async () => true,
    getConfig: () => baseConfig,
  }))

  const response = await request(app, '/agronautas/ready')
  assert.equal(response.status, 200)
  const body = await response.json() as {
    optionalChecks: string[]
    degraded: string[]
    capabilities?: { mongodb?: { status: string; required: boolean; healthy: boolean } }
    checkDetails?: { mongodb?: { ok: boolean; error?: string } }
  }
  assert.equal(mongoChecks, 0)
  assert.deepEqual(body.optionalChecks, [])
  assert.deepEqual(body.degraded, [])
  assert.equal(body.capabilities?.mongodb?.status, 'not_configured')
  assert.equal(body.capabilities?.mongodb?.required, false)
  assert.equal(body.capabilities?.mongodb?.healthy, false)
  assert.equal(body.checkDetails?.mongodb?.ok, false)
  assert.equal(body.checkDetails?.mongodb?.error, 'mongodb readiness is not configured')
})

test('GET /ready uses the configured timeout and exposes only safe revision metadata', async () => {
  let observedTimeout = 0
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => true,
    checkRedis: async () => true,
    getConfig: () => ({ ...baseConfig, readinessDependencyTimeoutMs: 17, revision: 'abcdef0123456789' }),
    readinessTimeoutMs: 17,
  }))

  const response = await request(app, '/agronautas/ready')
  const body = await response.json() as { revision?: string | null; checkDetails?: { postgres?: { error?: string } } }
  observedTimeout = 17
  assert.equal(response.status, 200)
  assert.equal(body.revision, 'abcdef0123456789')
  assert.equal(observedTimeout, 17)
  assert.doesNotMatch(JSON.stringify(body), /DATABASE_URL|postgres:\/\/|secret|HYDROLOGY_INGEST_TOKEN|AGRONAUTAS_API_INTERNAL_URL/)
})

test('GET /ready exposes worker requirement when runtime is mandatory', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => false,
    checkRedis: async () => true,
    getConfig: () => ({ ...baseConfig, runtimeRequired: true, workerHeartbeatMaxAgeSeconds: 120 }),
    getWorkerReadiness: async () => ({
      workerHealthy: false,
      latestHeartbeatAt: null,
      latestLeaseExpiresAt: null,
      latestJobId: null,
      latestRunId: null,
    }),
  }))

  const response = await request(app, '/agronautas/ready')
  assert.equal(response.status, 503)
  const body = await response.json() as { worker?: { required: boolean; status: string; reason: string; heartbeatMaxAgeSeconds: number }; failedRequiredChecks: string[] }
  assert.equal(body.worker?.required, true)
  assert.equal(body.worker?.status, 'unavailable')
  assert.equal(body.worker?.reason, 'worker_heartbeat_not_available')
  assert.equal(body.worker?.heartbeatMaxAgeSeconds, 120)
  assert.deepEqual(body.failedRequiredChecks, ['worker'])
})

test('GET /ready reports an unavailable worker without claiming it is healthy when worker is optional', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => false,
    checkRedis: async () => true,
    getConfig: () => baseConfig,
    getWorkerReadiness: async () => {
      throw new Error('worker readiness must not be queried when worker is optional')
    },
  }))

  const response = await request(app, '/agronautas/ready')
  assert.equal(response.status, 200)
  const body = await response.json() as {
    ready: boolean
    checks: { worker: boolean }
    requiredChecks: Record<string, boolean>
    worker?: { required: boolean; healthy: boolean | null; status: string; reason: string }
  }

  assert.equal(body.ready, true)
  assert.equal(body.checks.worker, false)
  assert.equal('worker' in body.requiredChecks, false)
  assert.deepEqual(body.worker, {
    required: false,
    healthy: null,
    status: 'unavailable',
    durableCapability: 'not_configured',
    reason: 'worker_not_configured',
    latestHeartbeatAt: null,
    latestLeaseExpiresAt: null,
    latestJobId: null,
    latestRunId: null,
    heartbeatMaxAgeSeconds: 180,
  })
})

test('worker readiness query guards against expired leases and non-running jobs', async () => {
  let capturedSql = ''
  const repository = new PostgresAgronautasRuntimeReadinessRepository({
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  } as unknown as ConstructorParameters<typeof PostgresAgronautasRuntimeReadinessRepository>[0])

  await repository.getWorkerReadiness(120, new Date('2026-08-04T00:00:00.000Z'))

  assert.match(capturedSql, /status\s+IN\s*\('leased',\s*'running'\)/i)
  assert.match(capturedSql, /SELECT\s+"jobId",\s*"runId",\s*"heartbeatAt"/i)
  assert.match(capturedSql, /lease_expires_at\s*(IS NULL|>=)/i)
  assert.match(capturedSql, /ORDER BY\s+"heartbeatAt"/i)
})

test('GET /ready fails only on active dependencies and still reports Mongo as optional capability', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => false,
    checkRedis: async () => false,
    getConfig: () => baseConfig,
  }))

  const response = await request(app, '/agronautas/ready')
  assert.equal(response.status, 503)
  const body = await response.json() as {
    degraded: string[]
    failedRequiredChecks: string[]
    requiredChecks: { redis: boolean }
    capabilities: { mongodb: { status: string; required: boolean } }
  }
  assert.equal(body.requiredChecks.redis, false)
  assert.deepEqual(body.failedRequiredChecks, ['redis'])
  assert.deepEqual(body.degraded, [])
  assert.equal(body.capabilities.mongodb.status, 'not_configured')
  assert.equal(body.capabilities.mongodb.required, false)
})

test('GET /ready returns 503 when a required dependency times out', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(true), 50)
    }),
    checkMongoDB: async () => true,
    checkRedis: async () => true,
    getConfig: () => baseConfig,
    readinessTimeoutMs: 5,
  }))

  const response = await request(app, '/agronautas/ready')
  assert.equal(response.status, 503)
  const body = await response.json() as { failedRequiredChecks: string[]; checkDetails?: { postgres?: { timedOut: boolean } } }
  assert.deepEqual(body.failedRequiredChecks, ['postgres'])
  assert.equal(body.checkDetails?.postgres?.timedOut, true)
})

test('GET /ready stays a dependency-readiness boundary, not on-demand acquisition readiness', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => true,
    checkRedis: async () => true,
    getConfig: () => baseConfig,
  }))

  const response = await request(app, '/agronautas/ready')
  const body = await response.json() as {
    ready: boolean
    checks: { worker: boolean }
    requiredChecks: { postgres: boolean; redis: boolean; worker: boolean }
  }

  assert.equal(response.status, 200)
  assert.equal(body.ready, true)
  assert.deepEqual(body.requiredChecks, { postgres: true, redis: true })
  assert.equal(body.checks.worker, false)
  assert.equal('requestId' in body, false)
  assert.equal('runId' in body, false)
  assert.equal('source' in body, false)
  assert.equal('centroid' in body, false)
  assert.equal('persistence' in body, false)
})

test('GET /ready exposes the v2 durable worker capability separately from process liveness', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => true,
    checkRedis: async () => true,
    getConfig: () => ({ ...baseConfig, runtimeRequired: true }),
    getWorkerReadiness: async () => ({
      workerHealthy: true,
      latestHeartbeatAt: '2026-08-27T00:00:00.000Z',
      latestLeaseExpiresAt: '2026-08-27T00:05:00.000Z',
      latestJobId: 'job-1',
      latestRunId: 'run-1',
      durableCapability: 'available',
    }),
  }))

  const response = await request(app, '/agronautas/ready')
  const body = await response.json() as { worker?: { durableCapability?: string } }
  assert.equal(body.worker?.durableCapability, 'available')
})

async function request(app: express.Express, path: string) {
  const server = createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('address not available')

  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}
