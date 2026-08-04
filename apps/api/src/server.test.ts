import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import { createHealthRouter } from './presentation/routes/health'
import { resolveApiPort, startAgronautasSchedulerFromEnv } from './server'

test('API port resolution trims blanks and prefers PORT over API_PORT and the local fallback', () => {
  assert.equal(resolveApiPort({ PORT: ' 4100 ', API_PORT: '4200' }), 4100)
  assert.equal(resolveApiPort({ PORT: '   ', API_PORT: ' 4200 ' }), 4200)
  assert.equal(resolveApiPort({ PORT: '   ', API_PORT: '   ' }), 3001)
  assert.equal(resolveApiPort({}), 3001)
})

test('API port resolution rejects malformed selected values deterministically', () => {
  for (const [env, variable] of [
    [{ PORT: '0', API_PORT: '4200' }, 'PORT'],
    [{ PORT: '4.2', API_PORT: '4200' }, 'PORT'],
    [{ PORT: 'not-a-port', API_PORT: '4200' }, 'PORT'],
    [{ PORT: '   ', API_PORT: '0' }, 'API_PORT'],
    [{ PORT: '   ', API_PORT: 'not-a-port' }, 'API_PORT'],
  ] as const) {
    assert.throws(
      () => resolveApiPort(env),
      new RegExp(`Invalid API port configured by ${variable}`),
    )
  }
})

test('health and readiness remain controlled boundaries without live acquisition', async () => {
  const calls = { postgres: 0, redis: 0, mongo: 0, worker: 0 }
  const app = express()
  app.use('/agronautas', createHealthRouter({
    checkPostgres: async () => {
      calls.postgres += 1
      return true
    },
    checkMongoDB: async () => {
      calls.mongo += 1
      throw new Error('MongoDB must not be acquired when it is not configured')
    },
    checkRedis: async () => {
      calls.redis += 1
      return false
    },
    getConfig: () => ({
      mode: 'real',
      routePrefix: '/agronautas',
      trustProxy: false,
      optionalReadinessServices: [],
      runtimeRequired: false,
      workerHeartbeatMaxAgeSeconds: 180,
      readinessDependencyTimeoutMs: 25,
      revision: 'abcdef0123456789',
    }),
    getWorkerReadiness: async () => {
      calls.worker += 1
      throw new Error('worker readiness must not acquire runtime data')
    },
  }))

  const health = await request(app, '/agronautas/health')
  assert.equal(health.status, 200)
  assert.equal((await health.json() as { status: string; revision: string }).status, 'ok')

  const readiness = await request(app, '/agronautas/ready')
  const body = await readiness.json() as {
    ready: boolean
    revision: string
    requiredChecks: { postgres: boolean; redis: boolean; worker: boolean }
  }
  assert.equal(readiness.status, 503)
  assert.equal(body.ready, false)
  assert.equal(body.revision, 'abcdef0123456789')
  assert.deepEqual(body.requiredChecks, { postgres: true, redis: false, worker: true })
  assert.equal(calls.postgres, 1)
  assert.equal(calls.redis, 1)
  assert.equal(calls.mongo, 0)
  assert.equal(calls.worker, 0)
})

test('Agronautas scheduler startup seam is disabled safely without feature flag', () => {
  const runtime = startAgronautasSchedulerFromEnv({})

  assert.equal(runtime.started, false)
  assert.equal(runtime.intervalMs, 60 * 60 * 1000)
})

test('Agronautas scheduler startup seam enables hourly runtime behind config flag', () => {
  const runtime = startAgronautasSchedulerFromEnv({ AGRONAUTAS_SCHEDULER_ENABLED: 'true' })

  assert.equal(runtime.started, true)
  runtime.stop()
})

test('Agronautas scheduler startup reads persisted source cadence and last success state', async () => {
  const ticked: string[][] = []
  const runtime = startAgronautasSchedulerFromEnv(
    { AGRONAUTAS_SCHEDULER_ENABLED: 'true' },
    {
      now: () => new Date('2026-07-04T20:00:00.000Z'),
      setInterval: (() => 1 as never) as typeof setInterval,
      clearInterval: (() => undefined) as typeof clearInterval,
      scheduler: {
        async tick(windows) {
          ticked.push(windows.map((window) => `${window.provider}:${window.signalType}`))
          return { enqueued: windows, skipped: [], deadLettered: [] }
        },
      },
      sourceCadenceRepository: {
        async listEnabled() {
          return [
            { provider: 'open-meteo', signalType: 'climate', updateCadenceMinutes: 60, freshnessSlaMinutes: 120, sourceRef: 'test', researchedAt: new Date('2026-07-04T00:00:00.000Z'), enabled: true },
          ]
        },
      },
      signalIngestionRepository: {
        async getLastSuccessfulObservedAtBySource() {
          return new Map([['open-meteo:climate', new Date('2026-07-04T19:30:00.000Z')]])
        },
      },
    },
  )

  assert.equal(runtime.started, true)
  await runtime.runOnce()
  assert.deepEqual(ticked, [[]])
  runtime.stop()
})

async function request(app: express.Express, path: string): Promise<Response> {
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
