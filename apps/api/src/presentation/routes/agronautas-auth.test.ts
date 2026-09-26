import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { AgronautasAuthService, createBffAssertion, InMemoryAgronautasAuthRepository } from '../../application/auth/agronautas-auth-service'
import { AUTH_SCOPES } from '../../domain/auth/contracts'
import { createAgronautasRouter } from './agronautas'
import { createHealthRouter } from './health'

const SECRETS = {
  accessSecret: 'access-secret-for-http-tests-1234567890',
  refreshSecret: 'refresh-secret-for-http-tests-1234567890',
  bootstrapSecret: 'bootstrap-secret-for-http-tests-1234567890',
  bffBearerToken: 'bff-secret-for-http-tests-1234567890',
}

test('auth HTTP contracts expose login/refresh/logout/status and trusted-principal boundaries', async () => {
  const service = new AgronautasAuthService(new InMemoryAgronautasAuthRepository({
    users: [{ id: 'member-a', email: 'member@example.test', displayName: 'Member', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  }), { secrets: SECRETS })
  const app = express()
  app.use(express.json())
  app.use('/agronautas', createAgronautasRouter({ authService: service }))

  const missing = await request(app, '/agronautas/fields/field-1')
  assert.equal(missing.status, 401)

  const login = await request(app, '/agronautas/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'member@example.test', password: 'password-123' }),
  })
  assert.equal(login.status, 200)
  const tokens = await login.json() as { accessToken: string; refreshToken: string; principal: { actorId: string } }
  assert.equal(tokens.principal.actorId, 'member-a')

  const status = await request(app, '/agronautas/auth/status', { headers: { authorization: `Bearer ${tokens.accessToken}` } })
  assert.equal(status.status, 200)

  const crossWorkspace = await request(app, '/agronautas/workspace/fields?workspaceId=workspace-b', { headers: { authorization: `Bearer ${tokens.accessToken}` } })
  assert.equal(crossWorkspace.status, 403)

  const logout = await request(app, '/agronautas/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${tokens.accessToken}` } })
  assert.equal(logout.status, 204)
})

test('an authenticated member propagated by the BFF receives 403 for a forbidden workspace', async () => {
  const service = new AgronautasAuthService(new InMemoryAgronautasAuthRepository({
    users: [{ id: 'member-bff', email: 'member-bff@example.test', displayName: 'Member', password: 'password-123', workspaceId: 'workspace-a', role: 'reader', scopes: [AUTH_SCOPES.READ] }],
  }), { secrets: SECRETS })
  const app = express()
  app.use(express.json())
  app.use('/agronautas', createAgronautasRouter({ authService: service }))

  const login = await service.login({ email: 'member-bff@example.test', password: 'password-123' })
  const assertion = createBffAssertion(login.accessToken, login.principal, SECRETS.bffBearerToken)
  const response = await request(app, '/agronautas/workspace/fields?workspaceId=workspace-b', {
    headers: {
      authorization: `Bearer ${login.accessToken}`,
      'x-agronautas-bff-assertion': assertion,
    },
  })

  const body = await response.json() as { code?: string }
  assert.equal(response.status, 403)
  assert.equal(body.code, 'FORBIDDEN')
})

test('protected rollback is health-only and maintenance is typed when auth cannot prove safety', async () => {
  const service = new AgronautasAuthService(new InMemoryAgronautasAuthRepository(), { secrets: SECRETS, protectedAccessEnabled: false })
  const app = express()
  app.use('/agronautas', createHealthRouter({ checkPostgres: async () => true, checkRedis: async () => true, checkMongoDB: async () => true, getWorkerReadiness: async () => null, getConfig: () => ({ runtimeRequired: false, optionalReadinessServices: [], workerHeartbeatMaxAgeSeconds: 180, readinessDependencyTimeoutMs: 20, schedulerEnabled: false, mode: 'real', routePrefix: '/agronautas', revision: 'test', trustProxy: false } as never) }))
  app.use('/agronautas', createAgronautasRouter({ authService: service }))

  const health = await request(app, '/agronautas/health')
  const protectedResponse = await request(app, '/agronautas/runtime')
  assert.equal(health.status, 200)
  assert.ok([401, 503].includes(protectedResponse.status))
  assert.notEqual(protectedResponse.status, 200)
})

test('protected login returns typed maintenance when access is explicitly disabled', async () => {
  const service = new AgronautasAuthService(new InMemoryAgronautasAuthRepository(), { secrets: SECRETS, protectedAccessEnabled: false })
  const app = express()
  app.use(express.json())
  app.use('/agronautas', createAgronautasRouter({ authService: service }))

  const response = await request(app, '/agronautas/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'member@example.test', password: 'password-123' }),
  })

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    contractVersion: '1.0.0',
    code: 'AUTH_MAINTENANCE',
    message: 'Authentication is temporarily in maintenance mode',
    retryable: true,
  })
})

function request(app: express.Express, path: string, init: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('server address unavailable'))
        return
      }
      fetch(`http://127.0.0.1:${address.port}${path}`, init).then(resolve, reject).finally(() => server.close())
    })
    server.on('error', reject)
  })
}
