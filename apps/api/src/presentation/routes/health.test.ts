import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import { createHealthRouter } from './health'

test('GET /ready keeps Mongo optional when active deps are healthy', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => false,
    checkRedis: async () => true,
    getConfig: () => ({
      mode: 'real',
      routePrefix: '/agronautas',
      trustProxy: false,
      optionalReadinessServices: ['mongodb'],
      runtimeRequired: false,
      workerHeartbeatMaxAgeSeconds: 180,
    }),
  }))

  const response = await request(app, '/agronautas/ready')
  assert.equal(response.status, 200)
  const body = await response.json() as { optionalChecks: string[]; capabilities?: { mongodb?: { required: boolean } } }
  assert.ok(body.optionalChecks.includes('mongodb'))
  assert.equal(body.capabilities?.mongodb?.required, false)
})

test('GET /ready exposes worker requirement when runtime is mandatory', async () => {
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => true,
    checkMongoDB: async () => false,
    checkRedis: async () => true,
    getConfig: () => ({
      mode: 'real',
      routePrefix: '/agronautas',
      trustProxy: false,
      optionalReadinessServices: ['mongodb'],
      runtimeRequired: true,
      workerHeartbeatMaxAgeSeconds: 120,
    }),
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
