import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import { createHealthRouter, READINESS_DEPENDENCY_TIMEOUT_MS, withReadinessTimeout } from './health'

const baseConfig = {
  mode: 'real' as const,
  routePrefix: '/agronautas',
  trustProxy: false,
  optionalReadinessServices: ['mongodb'],
  runtimeRequired: false,
  workerHeartbeatMaxAgeSeconds: 180,
}

test('READINESS_DEPENDENCY_TIMEOUT_MS is fixed at 2000ms', () => {
  assert.equal(READINESS_DEPENDENCY_TIMEOUT_MS, 2000)
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
})

test('GET /ready keeps Mongo optional when active deps are healthy', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => false,
    checkRedis: async () => true,
    getConfig: () => baseConfig,
  }))

  const response = await request(app, '/agronautas/ready')
  assert.equal(response.status, 200)
  const body = await response.json() as { optionalChecks: string[]; capabilities?: { mongodb?: { required: boolean } }; degraded: string[] }
  assert.ok(body.optionalChecks.includes('mongodb'))
  assert.ok(body.degraded.includes('mongodb'))
  assert.equal(body.capabilities?.mongodb?.required, false)
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
  const body = await response.json() as { worker?: { required: boolean; heartbeatMaxAgeSeconds: number } }
  assert.equal(body.worker?.required, true)
  assert.equal(body.worker?.heartbeatMaxAgeSeconds, 120)
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
  assert.ok(body.degraded.includes('mongodb'))
  assert.equal(body.capabilities.mongodb.status, 'optional_degraded')
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
