import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createAgronautasRouter } from './agronautas'
import { DEFAULT_AGRONAUTAS_WORKSPACE_ID } from '../../domain/repositories/agronautas'
import type { AgronautasWorkspaceRepository } from '../../domain/repositories/agronautas'

const workspaceRepository: AgronautasWorkspaceRepository = {
  async ensureDefaultWorkspace() { return { workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, name: 'Agronautas', status: 'active', fieldCount: 0, createdAt: new Date('2026-08-13T10:00:00.000Z'), updatedAt: new Date('2026-08-13T10:00:00.000Z') } },
  async getWorkspace(workspaceId) { return workspaceId === DEFAULT_AGRONAUTAS_WORKSPACE_ID ? { workspaceId, name: 'Agronautas', status: 'active', fieldCount: 0, createdAt: new Date('2026-08-13T10:00:00.000Z'), updatedAt: new Date('2026-08-13T10:00:00.000Z') } : null },
  async listWorkspaceFields() { return { items: [], nextCursor: null } },
  async listFieldActivity() { return [] },
}

test('planning routes expose typed read-only context, simulator outputs, and unsupported selections', async () => {
  const app = express()
  app.use(express.json())
  app.use('/agronautas', createAgronautasRouter({ workspaceRepository }))
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
