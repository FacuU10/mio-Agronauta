import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createAgronautasRouter } from './agronautas'
import { DEFAULT_AGRONAUTAS_WORKSPACE_ID } from '../../domain/repositories/agronautas'
import type { AgronautasWorkspaceRepository } from '../../domain/repositories/agronautas'
import type { AgronautasAuthServicePort } from '../../domain/auth/ports'
import { AuthFailure, AUTH_FAILURE_CODES } from '../../domain/auth/contracts'
import { Field } from '../../domain/entities/agronautas'

const workspaceRepository: AgronautasWorkspaceRepository = {
  async ensureDefaultWorkspace() { return { workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, name: 'Agronautas', status: 'active', fieldCount: 0, createdAt: new Date('2026-08-13T10:00:00.000Z'), updatedAt: new Date('2026-08-13T10:00:00.000Z') } },
  async getWorkspace(workspaceId) { return workspaceId === DEFAULT_AGRONAUTAS_WORKSPACE_ID ? { workspaceId, name: 'Agronautas', status: 'active', fieldCount: 0, createdAt: new Date('2026-08-13T10:00:00.000Z'), updatedAt: new Date('2026-08-13T10:00:00.000Z') } : null },
  async listWorkspaceFields() { return { items: [], nextCursor: null } },
  async listFieldActivity() { return [] },
}

const testAuthService: AgronautasAuthServicePort = {
  testOnlyAnonymousWhenDisabled: true,
  async authenticateAccessToken(_token?: string) { return { actorId: 'test-actor', sessionId: 'test-session', membershipId: 'test-membership', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, workspaceKey: 'agronautas-default', role: 'admin', scopes: ['read', 'write', 'recompute', 'admin'], expiresAt: new Date(Date.now() + 60_000).toISOString() } },
  async authenticateBffAssertion(token: string) { return this.authenticateAccessToken(token) },
  async authorize() {},
  async login() { throw new Error('not used') },
  async refresh() { throw new Error('not used') },
  async logout() { throw new Error('not used') },
  async status() { throw new Error('not used') },
} as AgronautasAuthServicePort

test('planning routes expose typed read-only context, simulator outputs, and unsupported selections', async () => {
  const app = express()
  app.use(express.json())
  app.use('/agronautas', createAgronautasRouter({ workspaceRepository, authService: testAuthService }))
  const server = app.listen(0)
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('address unavailable')
    const base = `http://127.0.0.1:${address.port}/agronautas`
    const contextResponse = await fetch(`${base}/planning/context`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: 'agronautas-campaign-planning-context-v1', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, campaignName: 'Campaña', season: '2026', fieldIds: ['missing'] }) })
    assert.equal(contextResponse.status, 422)
    const simulationResponse = await fetch(`${base}/planning/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: 'agronautas-assumption-simulation-v1', areaHa: 1, expectedYieldKgPerHa: 1, pricePerKg: 1, variableCostPerHa: 1, fixedCost: 1, currency: 'ARS', precision: 2, units: { area: 'ha', expectedYield: 'kg/ha', price: 'currency/kg', variableCost: 'currency/ha', fixedCost: 'currency' }, assumptions: ['manual'] }) })
    assert.equal(simulationResponse.status, 200)
    const body = await simulationResponse.json() as { status: string; result?: { label: string } }
    assert.equal(body.status, 'complete')
    assert.equal(body.result?.label, 'user_assumption_simulation')
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test('planning rejects a selected field outside the principal mapping before reading workspace fields', async () => {
  let listCalls = 0
  const foreignField = new Field({
    id: 'foreign-field', externalFieldId: 'foreign-field', crop: 'rice', hectares: 12,
    localityName: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.2, lng: -58.1 },
    boundaryMetadata: { sourceName: 'test', sourceUrl: 'https://example.test', sourceVersion: 'v1', normalizationStatus: 'test' },
  })
  const planningWorkspaceRepository: AgronautasWorkspaceRepository = {
    ...workspaceRepository,
    async getWorkspace(workspaceId) {
      return workspaceId === DEFAULT_AGRONAUTAS_WORKSPACE_ID ? { workspaceId, name: 'Agronautas', status: 'active', fieldCount: 1, createdAt: new Date('2026-08-13T10:00:00.000Z'), updatedAt: new Date('2026-08-13T10:00:00.000Z') } : null
    },
    async listWorkspaceFields() {
      listCalls += 1
      return { items: [{ field: foreignField, createdAt: new Date('2026-08-13T10:00:00.000Z'), updatedAt: new Date('2026-08-13T10:00:00.000Z'), geometryUpdatedAt: null }], nextCursor: null }
    },
  }
  const scopedAuthService: AgronautasAuthServicePort = {
    ...testAuthService,
    async authorize(_principal, _workspaceId, _scope, fieldId) {
      if (fieldId === 'foreign-field') throw new AuthFailure(AUTH_FAILURE_CODES.FORBIDDEN, 'Workspace membership does not permit this field')
    },
  }
  const app = express()
  app.use(express.json())
  app.use('/agronautas', createAgronautasRouter({
    workspaceRepository: planningWorkspaceRepository,
    authService: scopedAuthService,
    fieldContextRepository: { async save() {}, async getLatest() { return null } },
    signalSummaryRepository: { async getLatestClimateSummary() { return null }, async getLatestSatelliteSummary() { return null } },
    riskSnapshotRepository: { async save() {}, async getLatest() { return null } },
  }))
  const server = app.listen(0)
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('address unavailable')
    const response = await fetch(`http://127.0.0.1:${address.port}/agronautas/planning/context`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contractVersion: 'agronautas-campaign-planning-context-v1', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, campaignName: 'Campaña', season: '2026', fieldIds: ['foreign-field'] }),
    })
    assert.equal(response.status, 403)
    assert.equal(listCalls, 0)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
