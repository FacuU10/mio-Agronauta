import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createBffAssertion, InMemoryAgronautasAuthRepository, AgronautasAuthService } from '../../application/auth/agronautas-auth-service'
import { AUTH_SCOPES } from '../../domain/auth/contracts'
import { requireAgronautasScope } from './agronautas-auth'

const SECRETS = {
  accessSecret: 'access-secret-for-middleware-tests-1234567890',
  refreshSecret: 'refresh-secret-for-middleware-tests-1234567890',
  bootstrapSecret: 'bootstrap-secret-for-middleware-tests-1234567890',
  bffBearerToken: 'bff-secret-for-middleware-tests-1234567890',
}

test('BFF middleware requires the explicit authenticateBffAssertion port contract', async () => {
  const service = new AgronautasAuthService(new InMemoryAgronautasAuthRepository({
    users: [{ id: 'operator-1', email: 'operator@example.test', displayName: 'Operator', password: 'operator-password', workspaceId: 'workspace-1', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  }), { secrets: SECRETS })
  const login = await service.login({ email: 'operator@example.test', password: 'operator-password' })
  const assertion = createBffAssertion(login.accessToken, login.principal, SECRETS.bffBearerToken)
  const app = express()
  app.get('/protected', requireAgronautasScope('read', { service }), (_req, res) => res.json({ authorized: true }))

  const response = await request(app, '/protected', {
    headers: {
      authorization: `Bearer ${login.accessToken}`,
      'x-agronautas-bff-assertion': assertion,
    },
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { authorized: true })
})

async function request(app: express.Express, path: string, init: RequestInit = {}): Promise<Response> {
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
