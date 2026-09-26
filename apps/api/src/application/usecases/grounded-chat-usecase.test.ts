import test from 'node:test'
import assert from 'node:assert/strict'
import { AGRONAUTAS_CONTRACT_VERSION, type GroundedChatAction, type GroundedChatRequest } from '@repo/zod-schemas'
import { Field, RiskSnapshotFoundation } from '../../domain/entities/agronautas'
import { GroundedChatUseCase, type GroundedCopilotContext } from './grounded-chat-usecase'

function createField(id: string): Field {
  return new Field({
    id,
    externalFieldId: id,
    crop: 'rice',
    hectares: 10,
    localityName: 'Mercedes',
    provinceCode: 'AR-W',
    centroid: { lat: -29.18, lng: -58.08 },
    boundaryMetadata: {
      sourceName: 'test',
      sourceUrl: 'https://example.test',
      sourceVersion: 'test',
      normalizationStatus: 'verified',
      notes: 'test fixture',
    },
  })
}

function createRiskSnapshot(fieldId: string): RiskSnapshotFoundation {
  const now = new Date('2026-09-15T12:00:00.000Z')
  return new RiskSnapshotFoundation({
    snapshotId: `snapshot-${fieldId}`,
    fieldId,
    runId: `run-${fieldId}`,
    score: 42,
    confidence: 0.8,
    computedAt: now,
    validUntil: new Date(now.getTime() + 3_600_000),
    ruleVersion: 'test',
    drivers: [{ key: 'rainfall', label: 'Rainfall', weight: 1, value: 0.42 }],
    evidenceRefs: [`evidence-${fieldId}`],
    degradationReasons: [],
  })
}

const request: GroundedChatRequest = {
  contractVersion: AGRONAUTAS_CONTRACT_VERSION,
  message: '¿Cuál es el riesgo?',
}

for (const action of ['GET_RISK_SUMMARY', 'GET_ALERTS'] as const) {
  test(`grounded chat constrains ${action} to the authorized requested field`, async () => {
    const riskFields: string[] = []
    const alertFields: string[] = []
    const selectedAction = { action, fieldId: 'field-from-another-workspace' } satisfies GroundedChatAction
    const useCase = new GroundedChatUseCase({
      fieldRepository: {
        async findById(fieldId: string, workspaceId: string) {
          assert.equal(workspaceId, 'workspace-a')
          return fieldId === 'field-authorized' ? createField(fieldId) : null
        },
        async findByExternalFieldId() { return null },
        async save() { return undefined },
        async resolveCoverage() { return { insideSupportedArea: true } },
      },
      riskSnapshotRepository: {
        async getLatest(fieldId: string) {
          riskFields.push(fieldId)
          return createRiskSnapshot('field-from-another-workspace')
        },
        async save() { return undefined },
      },
      alertSnapshotRepository: {
        async getLatestForField(fieldId: string) {
          alertFields.push(fieldId)
          return []
        },
        async listTimeline() { return [] },
        async saveMany() { return undefined },
      },
      groqProvider: {
        enabled: false,
        async selectAction() { return selectedAction },
        async finalizeResponse() { throw new Error('not called') },
      },
    })

    const response = await useCase.execute('field-authorized', request, 'workspace-a')

    assert.equal(response.fieldId, 'field-authorized')
    assert.equal(response.executedAction, action)
    assert.deepEqual(riskFields, action === 'GET_RISK_SUMMARY' ? ['field-authorized'] : [])
    assert.deepEqual(alertFields, action === 'GET_ALERTS' ? ['field-authorized'] : [])
  })
}

test('grounded chat rejects a cross-workspace comparison before reading snapshots', async () => {
  let riskCalls = 0
  const useCase = new GroundedChatUseCase({
    fieldRepository: {
      async findById(fieldId: string) { return fieldId === 'field-authorized' ? createField(fieldId) : null },
      async findByExternalFieldId() { return null },
      async save() { return undefined },
      async resolveCoverage() { return { insideSupportedArea: true } },
    },
    riskSnapshotRepository: {
      async getLatest() {
        riskCalls += 1
        return createRiskSnapshot('unexpected')
      },
      async save() { return undefined },
    },
    alertSnapshotRepository: {
      async getLatestForField() { return [] },
      async listTimeline() { return [] },
      async saveMany() { return undefined },
    },
    groqProvider: {
      enabled: false,
      async selectAction() { return { action: 'COMPARE_FIELDS', fieldId: 'foreign-left', comparisonFieldId: 'foreign-right' } },
      async finalizeResponse() { throw new Error('not called') },
    },
  })

  const response = await useCase.execute('field-authorized', { ...request, comparisonFieldId: 'foreign-right' }, 'workspace-a')

  assert.equal(response.unavailableReason, 'field_not_found')
  assert.equal(riskCalls, 0)
})

function scopedGrounding(overrides: Record<string, unknown> = {}) {
  return {
    actorId: 'actor-1',
    sessionId: 'session-1',
    workspaceId: 'workspace-a',
    fieldId: 'field-authorized',
    locationId: 'location-authorized',
    readiness: 'ready',
    evidence: [{
      evidenceId: 'evidence-weather-1',
      runId: 'run-weather-1',
      provider: 'open-meteo',
      signalType: 'weather',
      providerMode: 'live',
      status: 'fresh',
      sourceKey: 'open-meteo-weather',
      observedAt: '2026-09-15T10:00:00.000Z',
      retrievedAt: '2026-09-15T10:05:00.000Z',
      degradationReasons: [],
    }],
    ...overrides,
  }
}

function createGroundedUseCase(context: unknown, onLoad?: () => void) {
  return new GroundedChatUseCase({
    fieldRepository: {
      async findById(fieldId: string, workspaceId: string) {
        return fieldId === 'field-authorized' && workspaceId === 'workspace-a' ? createField(fieldId) : null
      },
      async findByExternalFieldId() { return null },
      async save() { return undefined },
      async resolveCoverage() { return { insideSupportedArea: true } },
    },
    riskSnapshotRepository: { async getLatest() { return null }, async save() {} },
    alertSnapshotRepository: { async getLatestForField() { return [] }, async listTimeline() { return [] }, async saveMany() {} },
    groqProvider: { enabled: false, async selectAction() { return { action: 'GET_FIELD_OVERVIEW', fieldId: 'field-authorized' } }, async finalizeResponse() { throw new Error('not called') } },
    copilotContextProvider: {
      async authorizeScope(scope) {
        return scope.locationId === 'location-authorized'
      },
      async load(): Promise<GroundedCopilotContext> {
        onLoad?.()
        return context as GroundedCopilotContext
      },
    },
  })
}

test('grounded copilot is non-actionable when approved evidence is missing or stale', async () => {
  const missing = await createGroundedUseCase(scopedGrounding({ evidence: [], readiness: 'unavailable' })).execute('field-authorized', { ...request, locationId: 'location-authorized' }, 'workspace-a', { actorId: 'actor-1', sessionId: 'session-1', workspaceId: 'workspace-a', fieldId: 'field-authorized', locationId: 'location-authorized' })
  assert.equal(missing.unavailableReason, 'missing_grounding')
  assert.deepEqual(missing.citations, [])
  assert.equal(missing.actionable, false)

  const stale = await createGroundedUseCase(scopedGrounding({ readiness: 'stale', evidence: [{ ...scopedGrounding().evidence[0], status: 'stale', lastSuccessfulObservedAt: '2026-09-14T10:00:00.000Z', degradationReasons: ['evidence_stale'] }] })).execute('field-authorized', { ...request, locationId: 'location-authorized' }, 'workspace-a', { actorId: 'actor-1', sessionId: 'session-1', workspaceId: 'workspace-a', fieldId: 'field-authorized', locationId: 'location-authorized' })
  assert.equal(stale.unavailableReason, 'stale_evidence')
  assert.equal(stale.actionable, false)
})

test('grounded copilot preserves citation lineage and filters mixed sources', async () => {
  const context = scopedGrounding({
    evidence: [
      ...scopedGrounding().evidence,
      { evidenceId: 'evidence-smn-1', runId: 'run-smn-1', provider: 'smn', signalType: 'weather_alert', providerMode: 'seam', status: 'degraded', sourceKey: 'smn-alerts', observedAt: '2026-09-15T09:00:00.000Z', retrievedAt: '2026-09-15T09:05:00.000Z', degradationReasons: ['provider_degraded'] },
      { evidenceId: 'foreign-evidence', runId: 'foreign-run', provider: 'marketplace', signalType: 'listing', providerMode: 'live', status: 'fresh', sourceKey: 'marketplace', observedAt: '2026-09-15T09:00:00.000Z', retrievedAt: '2026-09-15T09:05:00.000Z', degradationReasons: [] },
    ],
  })
  const response = await createGroundedUseCase(context).execute('field-authorized', { ...request, locationId: 'location-authorized' }, 'workspace-a', { actorId: 'actor-1', sessionId: 'session-1', workspaceId: 'workspace-a', fieldId: 'field-authorized', locationId: 'location-authorized' })

  assert.equal(response.actionable, false)
  assert.deepEqual(response.citationLineage?.map((citation) => citation.provider), ['open-meteo', 'smn'])
  assert.deepEqual(response.sourceRunIds, ['run-weather-1', 'run-smn-1'])
  assert.deepEqual(response.citations, ['evidence:evidence-weather-1', 'evidence:evidence-smn-1'])
  assert.equal(response.citationLineage?.[0]?.provider, 'open-meteo')
  assert.equal(response.citationLineage?.some((citation) => citation.provider === 'marketplace'), false)
})

test('grounded copilot denies mismatched location and unsafe questions before loading evidence', async () => {
  let loads = 0
  const useCase = createGroundedUseCase(scopedGrounding(), () => { loads += 1 })
  const boundary = await useCase.execute('field-authorized', { ...request, locationId: 'location-other-field' }, 'workspace-a', { actorId: 'actor-1', sessionId: 'session-1', workspaceId: 'workspace-a', fieldId: 'field-authorized', locationId: 'location-other-field' })
  assert.equal(boundary.unavailableReason, 'scope_forbidden')
  assert.equal(loads, 0)

  const unsafe = await useCase.execute('field-authorized', { ...request, message: '¿Cuál es la evacuación hidráulica garantizada y el precio de mercado?', locationId: 'location-authorized' }, 'workspace-a', { actorId: 'actor-1', sessionId: 'session-1', workspaceId: 'workspace-a', fieldId: 'field-authorized', locationId: 'location-authorized' })
  assert.equal(unsafe.unavailableReason, 'unsupported_question')
  assert.equal(loads, 0)
})
