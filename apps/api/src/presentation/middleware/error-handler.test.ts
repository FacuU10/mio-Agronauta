import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer } from 'node:http'
import 'express-async-errors'
import { normalizeError, notFoundHandler, globalErrorHandler } from './error-handler'
import { httpLogger } from '../../infrastructure/observability/logger'

test('normalizeError hides unknown internal error messages', () => {
  const normalized = normalizeError(new Error('database password leaked'))

  assert.equal(normalized.statusCode, 500)
  assert.equal(normalized.code, 'INTERNAL_SERVER_ERROR')
  assert.equal(normalized.message, 'Internal server error')
})

test('global error handler returns safe JSON with requestId for async failures', async () => {
  const app = express()
  app.use(httpLogger)
  app.get('/boom', async () => {
    throw new Error('secret database failure')
  })
  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  const response = await request(app, '/boom')
  const body = await response.json() as { error: { code: string; message: string; requestId: string } }

  assert.equal(response.status, 500)
  assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR')
  assert.equal(body.error.message, 'Internal server error')
  assert.ok(body.error.requestId)
  assert.equal(response.headers.get('x-request-id'), body.error.requestId)
})

test('notFoundHandler returns structured 404 with requestId', async () => {
  const app = express()
  app.use(httpLogger)
  app.use(notFoundHandler)

  const response = await request(app, '/missing')
  const body = await response.json() as { error: { code: string; message: string; requestId: string } }

  assert.equal(response.status, 404)
  assert.equal(body.error.code, 'NOT_FOUND')
  assert.equal(body.error.message, 'Route not found')
  assert.ok(body.error.requestId)
})

async function request(app: express.Express, path: string, init?: RequestInit) {
  const server = createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('address not available')

  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}
