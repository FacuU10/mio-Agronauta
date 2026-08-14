import test from 'node:test'
import assert from 'node:assert/strict'
import { Field } from '../../domain/entities/agronautas'
import { DEFAULT_AGRONAUTAS_WORKSPACE_ID, type AgronautasWorkspaceRepository, type FieldContextRepository, type RiskSnapshotRepository, type SignalSummaryRepository } from '../../domain/repositories/agronautas'
import { GetCampaignPlanningContext, UnsupportedPlanningFieldError } from './agronautas-planning'

const field = new Field({ id: 'field-1', externalFieldId: 'lot-1', crop: 'rice', hectares: 12, localityName: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29, lng: -58 }, boundaryMetadata: { sourceName: 'test', sourceUrl: 'https://example.com', sourceVersion: 'test', normalizationStatus: 'test' } })

function repository(): AgronautasWorkspaceRepository {
  const workspace = { workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, name: 'Agronautas', status: 'active' as const, fieldCount: 1, createdAt: new Date('2026-08-13T10:00:00.000Z'), updatedAt: new Date('2026-08-13T10:00:00.000Z') }
  return { async ensureDefaultWorkspace() { return workspace }, async getWorkspace(id) { return id === workspace.workspaceId ? workspace : null }, async listWorkspaceFields() { return { items: [{ field, createdAt: workspace.createdAt, updatedAt: workspace.updatedAt, geometryUpdatedAt: null }], nextCursor: null } }, async listFieldActivity() { return [] } }
}

test('planning context composes existing facts and evidence as a non-persistent read model', async () => {
  let saveCalls = 0
  const context = await new GetCampaignPlanningContext(repository(), { async save() { saveCalls += 1 }, async getLatest() { return null } }, { async getLatestClimateSummary() { return null }, async getLatestSatelliteSummary() { return null } }, { async getLatest() { return null } }).execute({ contractVersion: 'agronautas-campaign-planning-context-v1', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, campaignName: 'Campaña', season: '2026', fieldIds: ['field-1'] })
  assert.equal(context.persistent, false)
  assert.equal(context.fields[0]?.hectares, 12)
  assert.equal(context.availability.find((item) => item.domain === 'prices')?.state, 'unavailable')
  assert.equal(context.evidence[0]?.risk.engine?.selectionStatus, 'undecided')
  assert.equal(saveCalls, 0)
})

test('planning context rejects unsupported field IDs without saving relationships', async () => {
  const context = new GetCampaignPlanningContext(repository(), { async save() {}, async getLatest() { return null } }, { async getLatestClimateSummary() { return null }, async getLatestSatelliteSummary() { return null } }, { async getLatest() { return null } })
  await assert.rejects(() => context.execute({ contractVersion: 'agronautas-campaign-planning-context-v1', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, campaignName: 'Campaña', season: '2026', fieldIds: ['missing'] }), UnsupportedPlanningFieldError)
})
