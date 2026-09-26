import test from 'node:test'
import assert from 'node:assert/strict'
import { Field } from '../../domain/entities/agronautas'
import type { AgronautasLocationRepository } from '../../domain/repositories/agronautas-product-flows'
import { ResolveAgronautasLocationUseCase } from './agronautas-location'

const principal = {
  actorId: 'actor-1',
  sessionId: 'session-1',
  membershipId: 'membership-1',
  workspaceId: 'workspace-1',
  workspaceKey: 'pilot',
  role: 'operator' as const,
  scopes: ['read' as const, 'write' as const],
  expiresAt: '2026-09-20T12:00:00.000Z',
}

const field = new Field({
  id: 'field-1',
  externalFieldId: 'external-1',
  crop: 'rice',
  hectares: 12,
  localityName: 'Mercedes',
  provinceCode: 'AR-W',
  centroid: { lat: -29.2, lng: -58.1 },
  boundaryMetadata: { sourceName: 'corrientes-boundary', sourceUrl: 'https://example.test/boundary', sourceVersion: 'boundary-v1', normalizationStatus: 'reviewed' },
})

function repository(): AgronautasLocationRepository {
  return {
    async findAuthorizedField(fieldId, workspaceId) {
      return fieldId === field.props.id && workspaceId === principal.workspaceId ? field : null
    },
    async resolveCoverage() {
      return { insideSupportedArea: true, locality: 'Mercedes', provinceCode: 'AR-W', boundaryVersion: 'boundary-v1' }
    },
  }
}

test('S1 location use case composes authorized point lineage without inventing provider coverage', async () => {
  const result = await new ResolveAgronautasLocationUseCase(repository(), { now: () => new Date('2026-09-20T10:00:00.000Z'), idGenerator: () => 'location-1', selectionIdGenerator: () => 'selection-1' }).execute(principal, {
    contractVersion: 'agronautas-product-flows-v2',
    workspaceId: 'workspace-1',
    fieldId: 'field-1',
    geometry: { type: 'point', coordinates: { latitude: -29.184, longitude: -58.075 } },
    selection: { source: 'locality-fallback', sourceReference: 'mercedes' },
  })

  assert.equal(result.status, 'accepted')
  if (result.status !== 'accepted') return
  assert.equal(result.location.locationId, 'location-1')
  assert.deepEqual(result.location.geometry, { type: 'point', coordinates: { latitude: -29.184, longitude: -58.075 } })
  assert.equal(result.location.coverage.status, 'supported')
  assert.equal(result.location.coverage.evidenceRef, 'boundary-v1')
  assert.deepEqual(result.location.actorScope, { actorId: 'actor-1', sessionId: 'session-1', workspaceId: 'workspace-1', fieldId: 'field-1', scopes: ['read', 'write'] })
  assert.equal(result.location.selectionLineage.source, 'locality-fallback')
})

test('S1 location use case preserves polygon lineage and returns typed invalid outcome', async () => {
  const useCase = new ResolveAgronautasLocationUseCase(repository(), { now: () => new Date('2026-09-20T10:00:00.000Z'), idGenerator: () => 'location-2', selectionIdGenerator: () => 'selection-2' })
  const polygon = await useCase.execute(principal, {
    contractVersion: 'agronautas-product-flows-v2',
    workspaceId: 'workspace-1',
    fieldId: 'field-1',
    geometry: { type: 'polygon', coordinates: [[[-58.1, -29.2], [-58.09, -29.2], [-58.09, -29.19], [-58.1, -29.2]]] },
    selection: { source: 'reviewed-polygon', sourceReference: 'operator-draft-2' },
  })
  assert.equal(polygon.status, 'accepted')
  if (polygon.status === 'accepted') {
    assert.equal(polygon.location.geometry.type, 'polygon')
    assert.equal(polygon.location.selectionLineage.source, 'reviewed-polygon')
  }

  const invalid = await useCase.execute(principal, {
    contractVersion: 'agronautas-product-flows-v2',
    workspaceId: 'workspace-1',
    fieldId: 'field-1',
    geometry: { type: 'point', coordinates: { latitude: 91, longitude: -58 } },
    selection: { source: 'operator' },
  })
  assert.equal(invalid.status, 'invalid')
})
