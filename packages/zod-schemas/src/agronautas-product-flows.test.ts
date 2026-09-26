import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AGRONAUTAS_PRODUCT_FLOWS_CONTRACT_VERSION,
  AGRONAUTAS_EVIDENCE_V2_CONTRACT_VERSION,
  AGRONAUTAS_LOCATION_V2_CONTRACT_VERSION,
  AGRONAUTAS_READINESS_V2_CONTRACT_VERSION,
  agronautasBoundaryRequestSchema,
  agronautasCanonicalLocationSchema,
  agronautasLocationSelectionRequestSchema,
  agronautasEvidenceV2Schema,
  agronautasLocationResolutionSchema,
  agronautasReadinessV2Schema,
  agronautasManagementCreateOperationRequestSchema,
  agronautasManagementTransitionRequestSchema,
  agronautasManagementResponseSchema,
  isForbiddenFinancialAction,
  isScopeAuthorizedForLocation,
} from './agronautas-product-flows.js'

test('management contracts preserve scope, revision, idempotency, and assumption-only planning labels', () => {
  const request = agronautasManagementCreateOperationRequestSchema.parse({
    contractVersion: 'agronautas-management-v2',
    kind: 'operation',
    workspaceId: 'workspace-1',
    fieldId: 'field-1',
    name: 'Aplicar tratamiento',
    status: 'planned',
    responsibleActorId: 'operator-1',
    idempotencyKey: 'request-1',
    sourceLocationIds: ['location-1'],
  })
  assert.equal(request.workspaceId, 'workspace-1')
  assert.equal(agronautasManagementTransitionRequestSchema.safeParse({ contractVersion: 'agronautas-management-v2', expectedRevision: 1, status: 'active' }).success, true)
  const response = agronautasManagementResponseSchema.parse({
    contractVersion: 'agronautas-management-v2',
    items: [{
      id: 'operation-1', kind: 'operation', workspaceId: 'workspace-1', fieldId: 'field-1', parentId: null,
      name: 'Aplicar tratamiento', status: 'planned', revision: 1, responsibleActorId: 'operator-1',
      createdByActorId: 'operator-1', idempotencyKey: 'request-1', sourceLocationIds: ['location-1'],
      planningLabel: 'assumption_only', createdAt: '2026-09-21T10:00:00.000Z', updatedAt: '2026-09-21T10:00:00.000Z',
    }],
    audit: [{ auditId: 'audit-1', actorId: 'operator-1', action: 'create', targetId: 'operation-1', outcome: 'accepted', revisionBefore: null, revisionAfter: 1, occurredAt: '2026-09-21T10:00:00.000Z', requestId: 'request-1' }],
  })
  assert.equal(response.items[0]?.planningLabel, 'assumption_only')
  assert.equal(response.audit[0]?.outcome, 'accepted')
})

const scope = {
  actorId: 'actor-1',
  sessionId: 'session-1',
  workspaceId: 'workspace-1',
  fieldId: 'field-1',
}

const pointLocation = {
  contractVersion: AGRONAUTAS_LOCATION_V2_CONTRACT_VERSION,
  locationId: 'location-1',
  workspaceId: 'workspace-1',
  fieldId: 'field-1',
  actorScope: scope,
  geometry: {
    type: 'point' as const,
    coordinates: { latitude: -29.184, longitude: -58.075 },
  },
  coverage: { status: 'unverified' as const, reason: 'Provider coverage is not proven in B0.' },
  selectionLineage: {
    selectionId: 'selection-1',
    selectedAt: '2026-09-20T10:00:00.000Z',
    source: 'operator' as const,
  },
}

const evidence = {
  contractVersion: AGRONAUTAS_EVIDENCE_V2_CONTRACT_VERSION,
  evidenceId: 'evidence-1',
  locationId: 'location-1',
  workspaceId: 'workspace-1',
  fieldId: 'field-1',
  provider: 'provider-not-configured',
  signalType: 'climate',
  providerMode: 'unavailable' as const,
  status: 'unavailable' as const,
  sourceKey: 'provider-not-configured/climate',
  sourceUrl: null,
  observedAt: null,
  acquiredAt: null,
  forecastAt: null,
  retrievedAt: '2026-09-20T10:01:00.000Z',
  units: {},
  schemaVersion: 'unavailable',
  httpStatus: null,
  schemaStatus: 'unavailable' as const,
  runId: 'run-1',
  requestId: 'request-1',
  rawHash: null,
  freshnessPolicy: 'not-configured',
  degradationReasons: ['provider_unavailable'],
  retryable: true,
  value: undefined,
}

test('B0 contracts use additive, independently versioned v2 envelopes', () => {
  assert.equal(AGRONAUTAS_PRODUCT_FLOWS_CONTRACT_VERSION, 'agronautas-product-flows-v2')
  assert.equal(agronautasCanonicalLocationSchema.parse(pointLocation).contractVersion, 'agronautas-location-v2')
  assert.equal(agronautasEvidenceV2Schema.parse(evidence).contractVersion, 'agronautas-evidence-v2')
  assert.equal(agronautasReadinessV2Schema.parse({
    contractVersion: AGRONAUTAS_READINESS_V2_CONTRACT_VERSION,
    locationId: 'location-1',
    workspaceId: 'workspace-1',
    fieldId: 'field-1',
    productSlice: 'canonical-location-evidence',
    source: 'provider-not-configured',
    state: 'unavailable',
    evaluatedAt: '2026-09-20T10:01:00.000Z',
    evidenceRefs: [],
    runIds: [],
    retryable: true,
    reason: 'No provider is configured.',
  }).state, 'unavailable')
  assert.equal(agronautasCanonicalLocationSchema.safeParse({ ...pointLocation, contractVersion: '1.0.0' }).success, false)
})

test('B0 canonical locations bind actor, workspace, field, geometry, coverage, and selection lineage', () => {
  const parsed = agronautasCanonicalLocationSchema.parse(pointLocation)
  assert.equal(parsed.actorScope.workspaceId, parsed.workspaceId)
  assert.equal(parsed.actorScope.fieldId, parsed.fieldId)
  assert.equal(isScopeAuthorizedForLocation(scope, parsed), true)
  assert.equal(isScopeAuthorizedForLocation({ ...scope, workspaceId: 'other-workspace' }, parsed), false)

  const polygon = agronautasCanonicalLocationSchema.parse({
    ...pointLocation,
    locationId: 'location-2',
    geometry: {
      type: 'polygon',
      coordinates: [[[-58.1, -29.2], [-58.09, -29.2], [-58.09, -29.19], [-58.1, -29.2]]],
    },
  })
  assert.equal(polygon.geometry.type, 'polygon')
  assert.equal(agronautasCanonicalLocationSchema.safeParse({
    ...pointLocation,
    geometry: { type: 'point', coordinates: { latitude: -91, longitude: -58 } },
  }).success, false)
})

test('B0 location resolution distinguishes unauthorized, invalid, and unavailable outcomes', () => {
  const accepted = agronautasLocationResolutionSchema.parse({ status: 'accepted', location: pointLocation })
  const unauthorized = agronautasLocationResolutionSchema.parse({ status: 'unauthorized', reason: 'The actor is outside the workspace scope.' })
  const invalid = agronautasLocationResolutionSchema.parse({ status: 'invalid', reason: 'The geometry is invalid.' })
  const unavailable = agronautasLocationResolutionSchema.parse({ status: 'unavailable', reason: 'Coverage is not proven.', retryable: true })

  assert.equal(accepted.status, 'accepted')
  assert.equal(unauthorized.status, 'unauthorized')
  assert.equal(invalid.status, 'invalid')
  if (unavailable.status === 'unavailable') assert.equal(unavailable.retryable, true)
})

test('S1 selection requests are additive B0 envelopes and preserve point/polygon truth', () => {
  const point = agronautasLocationSelectionRequestSchema.parse({
    contractVersion: AGRONAUTAS_PRODUCT_FLOWS_CONTRACT_VERSION,
    workspaceId: 'workspace-1',
    fieldId: 'field-1',
    geometry: { type: 'point', coordinates: { latitude: -29.184, longitude: -58.075 } },
    selection: { source: 'locality-fallback', sourceReference: 'mercedes' },
  })
  assert.equal(point.geometry.type, 'point')
  assert.equal(point.selection.source, 'locality-fallback')

  const polygon = agronautasLocationSelectionRequestSchema.parse({
    contractVersion: AGRONAUTAS_PRODUCT_FLOWS_CONTRACT_VERSION,
    workspaceId: 'workspace-1',
    fieldId: 'field-1',
    geometry: { type: 'polygon', coordinates: [[[-58.1, -29.2], [-58.09, -29.2], [-58.09, -29.19], [-58.1, -29.2]]] },
    selection: { source: 'reviewed-polygon', sourceReference: 'operator-draft-1' },
  })
  assert.deepEqual(polygon.geometry.coordinates, [[[-58.1, -29.2], [-58.09, -29.2], [-58.09, -29.19], [-58.1, -29.2]]])
  assert.equal(agronautasLocationSelectionRequestSchema.safeParse({ ...point, geometry: { type: 'point', coordinates: { latitude: 91, longitude: -58 } } }).success, false)
})

test('B0 evidence preserves freshness, provenance, lineage, and unavailable semantics', () => {
  const unavailable = agronautasEvidenceV2Schema.parse(evidence)
  assert.equal(unavailable.status, 'unavailable')
  assert.equal(unavailable.providerMode, 'unavailable')
  assert.equal(unavailable.value, undefined)

  const fresh = agronautasEvidenceV2Schema.parse({
    ...evidence,
    evidenceId: 'evidence-2',
    provider: 'proven-provider',
    providerMode: 'live',
    status: 'fresh',
    sourceKey: undefined,
    sourceUrl: 'https://provider.example/evidence/2',
    observedAt: '2026-09-20T09:55:00.000Z',
    retrievedAt: '2026-09-20T10:00:00.000Z',
    units: { temperature: 'C' },
    schemaVersion: 'provider-v1',
    httpStatus: 200,
    schemaStatus: 'valid',
    freshnessPolicy: 'provider-defined',
    degradationReasons: [],
    retryable: false,
    value: { temperature: 22 },
  })
  assert.equal(fresh.status, 'fresh')
  assert.equal(fresh.sourceUrl, 'https://provider.example/evidence/2')
  assert.deepEqual(fresh.value, { temperature: 22 })

  assert.equal(agronautasEvidenceV2Schema.safeParse({
    ...fresh,
    status: 'stale',
    lastSuccessfulObservedAt: undefined,
  }).success, false)
  assert.equal(agronautasEvidenceV2Schema.safeParse({
    ...fresh,
    status: 'stale',
    lastSuccessfulObservedAt: '2026-09-19T10:00:00.000Z',
    degradationReasons: ['stale_provider_data'],
  }).success, true)
})

test('B0 readiness cannot claim ready without scoped evidence lineage', () => {
  const base = {
    contractVersion: AGRONAUTAS_READINESS_V2_CONTRACT_VERSION,
    locationId: 'location-1',
    workspaceId: 'workspace-1',
    fieldId: 'field-1',
    productSlice: 'canonical-location-evidence',
    source: 'provider-not-configured',
    evaluatedAt: '2026-09-20T10:01:00.000Z',
    retryable: false,
  }

  assert.equal(agronautasReadinessV2Schema.safeParse({ ...base, state: 'ready', evidenceRefs: [], runIds: [] }).success, false)
  const degraded = agronautasReadinessV2Schema.parse({ ...base, state: 'degraded', evidenceRefs: ['evidence-1'], runIds: ['run-1'], reason: 'Last-known evidence is retained.' })
  const ready = agronautasReadinessV2Schema.parse({ ...base, state: 'ready', evidenceRefs: ['evidence-2'], runIds: ['run-2'] })
  assert.equal(degraded.state, 'degraded')
  assert.equal(ready.evidenceRefs[0], 'evidence-2')
})

test('B0 boundary requests require matching scope and reject financial behavior', () => {
  const request = agronautasBoundaryRequestSchema.parse({
    contractVersion: AGRONAUTAS_PRODUCT_FLOWS_CONTRACT_VERSION,
    action: 'evidence_read',
    scope,
    locationId: 'location-1',
    workspaceId: 'workspace-1',
    fieldId: 'field-1',
  })
  assert.equal(request.action, 'evidence_read')
  assert.equal(isForbiddenFinancialAction('payment'), true)
  assert.equal(isForbiddenFinancialAction('evidence_read'), false)
  assert.equal(agronautasBoundaryRequestSchema.safeParse({ ...request, action: 'payment' }).success, false)
  assert.equal(agronautasBoundaryRequestSchema.safeParse({ ...request, fieldId: 'other-field' }).success, false)
})
