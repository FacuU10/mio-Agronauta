import { AGRONAUTAS_CONTRACT_VERSION, groundedChatResponseSchema, type GroundedChatAction, type GroundedChatRequest, type GroundedChatResponse } from '@repo/zod-schemas'
import type { AlertSnapshotRecord, AlertSnapshotRepository, FieldRepository, RiskSnapshotRepository } from '../../domain/repositories/agronautas'
import { type GroqChatProvider } from '../../infrastructure/integrations/groq/client'

interface GroundedChatUseCaseDeps {
  fieldRepository: FieldRepository
  riskSnapshotRepository: RiskSnapshotRepository
  alertSnapshotRepository: AlertSnapshotRepository
  groqProvider: GroqChatProvider
  copilotContextProvider?: GroundedCopilotContextProvider
}

const COPILOT_EVIDENCE_STATUS = {
  FRESH: 'fresh',
  STALE: 'stale',
  DEGRADED: 'degraded',
  MISSING: 'missing',
  UNAVAILABLE: 'unavailable',
} as const

type CopilotEvidenceStatus = (typeof COPILOT_EVIDENCE_STATUS)[keyof typeof COPILOT_EVIDENCE_STATUS]
type CopilotProviderMode = NonNullable<GroundedChatResponse['providerMode']>

export interface GroundedCopilotScope {
  actorId: string
  sessionId: string
  workspaceId: string
  fieldId: string
  locationId: string
}

export interface GroundedCopilotEvidence {
  evidenceId: string
  runId: string
  provider: string
  signalType: string
  providerMode: CopilotProviderMode
  status: CopilotEvidenceStatus
  sourceUrl?: string | null
  sourceKey?: string
  observedAt?: string | null
  acquiredAt?: string | null
  forecastAt?: string | null
  retrievedAt: string
  lastSuccessfulObservedAt?: string | null
  degradationReasons: string[]
}

export interface GroundedCopilotContext {
  actorId: string
  sessionId: string
  workspaceId: string
  fieldId: string
  locationId: string
  readiness: NonNullable<GroundedChatResponse['readiness']>
  evidence: GroundedCopilotEvidence[]
}

export interface GroundedCopilotContextProvider {
  load(scope: GroundedCopilotScope): Promise<GroundedCopilotContext>
  authorizeScope?(scope: GroundedCopilotScope): Promise<boolean>
}

const APPROVED_COPILOT_PROVIDERS = new Set(['open-meteo', 'smn', 'nasa-power-daily', 'risk-engine', 'agronautas'])
const APPROVED_COPILOT_SIGNALS = new Set(['climate', 'weather', 'weather_alert', 'risk', 'fire'])
const UNSUPPORTED_COPILOT_TERMS = /ibera|municipal|municipio|marketplace|mercado|auth|token|sesión|session|financ|legal|hidrául|hidraulic|evacuac|garantiz|certeza|precio|payout|checkout|escrow|custodia/i

export class GroundedChatUseCase {
  constructor(private readonly deps: GroundedChatUseCaseDeps) {}

  async execute(fieldId: string, input: GroundedChatRequest, workspaceId: string, scope?: GroundedCopilotScope): Promise<GroundedChatResponse> {
    const primaryField = await this.deps.fieldRepository.findById(fieldId, workspaceId)
    if (!primaryField) {
      return groundedChatResponseSchema.parse({
        contractVersion: AGRONAUTAS_CONTRACT_VERSION,
        fieldId,
        answer: 'No encontré el lote solicitado para responder con contexto persistido.',
        executedAction: 'FINAL_RESPONSE',
        supportingFacts: [],
        citations: [],
        trace: [{ action: 'FINAL_RESPONSE', status: 'fallback' }],
        degraded: true,
        unavailableReason: 'field_not_found',
      })
    }

    if (this.deps.copilotContextProvider && input.locationId) {
      if (isUnsupportedCopilotQuestion(input.message)) return this.unavailable(fieldId, 'FINAL_RESPONSE', 'La consulta queda fuera del alcance Agronautas aprobado.', undefined, 'unsupported_question')
      if (!scope || scope.workspaceId !== workspaceId || scope.fieldId !== fieldId || scope.locationId !== input.locationId) {
        return this.unavailable(fieldId, 'FINAL_RESPONSE', 'La ubicación y el alcance autorizado no coinciden; no se comparte contexto.', undefined, 'scope_forbidden', input.locationId)
      }
      if (this.deps.copilotContextProvider.authorizeScope && !(await this.deps.copilotContextProvider.authorizeScope(scope))) {
        return this.unavailable(fieldId, 'FINAL_RESPONSE', 'La ubicación no pertenece al alcance autorizado; no se comparte contexto.', undefined, 'scope_forbidden', input.locationId)
      }

      let context: GroundedCopilotContext
      try {
        context = await this.deps.copilotContextProvider.load(scope)
      } catch {
        return this.unavailable(fieldId, 'FINAL_RESPONSE', 'La evidencia Agronautas no está disponible para esta ubicación.', undefined, 'provider_unavailable', input.locationId)
      }
      if (!scopeMatches(context, scope)) return this.unavailable(fieldId, 'FINAL_RESPONSE', 'La evidencia devuelta no pertenece al alcance autorizado.', undefined, 'scope_forbidden', input.locationId)
      return buildGroundedCopilotResponse(context)
    }

    const selectedAction = await this.selectAction(fieldId, input)
    const authorizedAction = await this.authorizeAction(selectedAction, fieldId, workspaceId)
    if (!authorizedAction) {
      const comparisonFieldId = selectedAction.action === 'COMPARE_FIELDS' ? selectedAction.comparisonFieldId : undefined
      return this.unavailable(fieldId, selectedAction.action, 'No encontré el lote solicitado dentro del workspace autorizado.', comparisonFieldId, 'field_not_found')
    }
    const result = await this.executeAction(authorizedAction, workspaceId)

    const trace = [
      { action: selectedAction.action, status: result.usedFallbackSelector ? 'fallback' : 'selected' as const },
      { action: result.response.executedAction, status: result.response.degraded ? 'fallback' : 'executed' as const },
    ]

    return groundedChatResponseSchema.parse({
      ...result.response,
      trace,
    })
  }

  private async selectAction(fieldId: string, input: GroundedChatRequest): Promise<GroundedChatAction & { usedFallbackSelector?: boolean }> {
    try {
      const action = await this.deps.groqProvider.selectAction({ fieldId, message: input.message, comparisonFieldId: input.comparisonFieldId })
      return action
    } catch {
      return {
        ...selectFallbackAction(fieldId, input.message, input.comparisonFieldId),
        usedFallbackSelector: true,
      }
    }
  }

  private async authorizeAction(action: GroundedChatAction & { usedFallbackSelector?: boolean }, requestedFieldId: string, workspaceId: string): Promise<(GroundedChatAction & { usedFallbackSelector?: boolean }) | null> {
    if (action.action !== 'COMPARE_FIELDS') {
      return { ...action, fieldId: requestedFieldId }
    }

    const comparisonField = await this.deps.fieldRepository.findById(action.comparisonFieldId, workspaceId)
    if (!comparisonField) return null

    return { ...action, fieldId: requestedFieldId }
  }

  private async executeAction(action: GroundedChatAction & { usedFallbackSelector?: boolean }, workspaceId: string): Promise<{ response: GroundedChatResponse; usedFallbackSelector: boolean }> {
    switch (action.action) {
      case 'GET_FIELD_OVERVIEW':
        return { response: await this.buildOverviewResponse(action.fieldId, workspaceId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
      case 'GET_RISK_SUMMARY':
        return { response: await this.buildRiskResponse(action.fieldId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
      case 'GET_ALERTS':
        return { response: await this.buildAlertsResponse(action.fieldId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
      case 'COMPARE_FIELDS':
        return { response: await this.buildComparisonResponse(action.fieldId, action.comparisonFieldId, workspaceId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
      case 'FINAL_RESPONSE':
        return { response: await this.buildOverviewResponse(action.fieldId, workspaceId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
    }
  }

  private async buildOverviewResponse(fieldId: string, workspaceId: string): Promise<GroundedChatResponse> {
    const field = await this.deps.fieldRepository.findById(fieldId, workspaceId)
    const snapshot = await this.deps.riskSnapshotRepository.getLatest(fieldId)
    const facts = [
      { label: 'Localidad', value: field?.props.localityName ?? 'Sin localidad' },
      { label: 'Hectáreas', value: field ? String(field.props.hectares) : 'N/D' },
      { label: 'Score actual', value: snapshot ? String(snapshot.props.score) : 'Sin snapshot' },
    ]
    return this.finalize(fieldId, 'GET_FIELD_OVERVIEW', facts, snapshot?.props.evidenceRefs ?? [], !this.deps.groqProvider.enabled, 'Resumen de lote basado en metadata y snapshot persistidos.')
  }

  private async buildRiskResponse(fieldId: string): Promise<GroundedChatResponse> {
    const snapshot = await this.deps.riskSnapshotRepository.getLatest(fieldId)
    if (!snapshot) {
      return this.unavailable(fieldId, 'GET_RISK_SUMMARY', 'No hay snapshot de riesgo persistido para este lote.')
    }

    const facts = [
      { label: 'Score', value: String(snapshot.props.score) },
      { label: 'Nivel', value: snapshot.level },
      { label: 'Frescura', value: snapshot.freshness },
      { label: 'Drivers', value: snapshot.props.drivers.map((driver) => `${driver.label}: ${driver.value.toFixed(2)}`).join('; ') },
    ]

    return this.finalize(fieldId, 'GET_RISK_SUMMARY', facts, snapshot.props.evidenceRefs, !this.deps.groqProvider.enabled || snapshot.freshness !== 'fresh', 'Resumen de riesgo basado en el último snapshot persistido.')
  }

  private async buildAlertsResponse(fieldId: string): Promise<GroundedChatResponse> {
    const alerts = await this.deps.alertSnapshotRepository.getLatestForField(fieldId)
    const facts = [
      { label: 'Alertas activas', value: String(alerts.length) },
      { label: 'Tipos', value: alerts.length ? alerts.map((alert) => alert.type).join(', ') : 'Sin alertas activas' },
      { label: 'Frescura', value: summarizeFreshness(alerts) },
    ]
    const citations = alerts.map((alert) => alert.basedOnSnapshotId).slice(0, 4)
    return this.finalize(fieldId, 'GET_ALERTS', facts, citations, !this.deps.groqProvider.enabled, 'Resumen de alertas basado en snapshots persistidos.')
  }

  private async buildComparisonResponse(fieldId: string, comparisonFieldId: string, workspaceId: string): Promise<GroundedChatResponse> {
    const [leftField, rightField, leftRisk, rightRisk] = await Promise.all([
      this.deps.fieldRepository.findById(fieldId, workspaceId),
      this.deps.fieldRepository.findById(comparisonFieldId, workspaceId),
      this.deps.riskSnapshotRepository.getLatest(fieldId),
      this.deps.riskSnapshotRepository.getLatest(comparisonFieldId),
    ])

    if (!leftField || !rightField || !leftRisk || !rightRisk) {
      return this.unavailable(fieldId, 'COMPARE_FIELDS', 'Falta contexto persistido para comparar ambos lotes.', comparisonFieldId)
    }

    const facts = [
      { label: leftField.props.externalFieldId, value: `score ${leftRisk.props.score} (${leftRisk.level})` },
      { label: rightField.props.externalFieldId, value: `score ${rightRisk.props.score} (${rightRisk.level})` },
      { label: 'Diferencia', value: String(leftRisk.props.score - rightRisk.props.score) },
    ]
    return this.finalize(fieldId, 'COMPARE_FIELDS', facts, [...leftRisk.props.evidenceRefs, ...rightRisk.props.evidenceRefs].slice(0, 6), !this.deps.groqProvider.enabled, 'Comparación determinística entre lotes basada en snapshots persistidos.', comparisonFieldId)
  }

  private async finalize(fieldId: string, action: GroundedChatAction['action'], supportingFacts: Array<{ label: string; value: string }>, citations: string[], degraded: boolean, fallbackAnswer: string, comparisonFieldId?: string): Promise<GroundedChatResponse> {
    if (this.deps.groqProvider.enabled) {
      try {
        const final = await this.deps.groqProvider.finalizeResponse({ fieldId, message: fallbackAnswer, action, supportingFacts, citations, comparisonFieldId })
        return groundedChatResponseSchema.parse({
          contractVersion: AGRONAUTAS_CONTRACT_VERSION,
          fieldId,
          answer: final.answer,
          executedAction: action,
          comparisonFieldId,
          supportingFacts,
          citations: final.citations,
          trace: [{ action, status: 'executed' }],
          degraded,
        })
      } catch {
        // deterministic fallback below
      }
    }

    return groundedChatResponseSchema.parse({
      contractVersion: AGRONAUTAS_CONTRACT_VERSION,
      fieldId,
      answer: toDeterministicAnswer(action, supportingFacts, fallbackAnswer),
      executedAction: action,
      comparisonFieldId,
      supportingFacts,
      citations,
      trace: [{ action, status: 'fallback' }],
      degraded: true,
      unavailableReason: 'groq_unavailable',
    })
  }

  private unavailable(fieldId: string, action: GroundedChatAction['action'], reason: string, comparisonFieldId?: string, unavailableReason = 'missing_backend_data', locationId?: string): GroundedChatResponse {
    return groundedChatResponseSchema.parse({
      contractVersion: AGRONAUTAS_CONTRACT_VERSION,
      fieldId,
      answer: reason,
      executedAction: action,
      comparisonFieldId,
      supportingFacts: [],
      citations: [],
      trace: [{ action, status: 'fallback' }],
      degraded: true,
      unavailableReason,
      actionable: false,
      ...(locationId ? { locationId } : {}),
    })
  }
}

function isUnsupportedCopilotQuestion(message: string): boolean {
  return UNSUPPORTED_COPILOT_TERMS.test(message)
}

function scopeMatches(context: GroundedCopilotContext, scope: GroundedCopilotScope): boolean {
  return context.actorId === scope.actorId
    && context.sessionId === scope.sessionId
    && context.workspaceId === scope.workspaceId
    && context.fieldId === scope.fieldId
    && context.locationId === scope.locationId
}

function buildGroundedCopilotResponse(context: GroundedCopilotContext): GroundedChatResponse {
  const evidence = context.evidence.filter((item) => APPROVED_COPILOT_PROVIDERS.has(item.provider) && APPROVED_COPILOT_SIGNALS.has(item.signalType))
  const fresh = evidence.filter((item) => item.status === COPILOT_EVIDENCE_STATUS.FRESH && item.providerMode !== 'unavailable')
  const evidenceStatus = summarizeEvidenceStatus(evidence)
  const sourceRunIds = unique(evidence.map((item) => item.runId))
  const providerModes = unique(evidence.map((item) => item.providerMode))
  const citationLineage = evidence.map((item) => ({
    citationId: `evidence:${item.evidenceId}`,
    evidenceId: item.evidenceId,
    runId: item.runId,
    provider: item.provider,
    signalType: item.signalType,
    providerMode: item.providerMode,
    status: item.status,
    ...(item.sourceUrl !== undefined ? { sourceUrl: item.sourceUrl } : {}),
    ...(item.sourceKey ? { sourceKey: item.sourceKey } : {}),
    ...(item.observedAt !== undefined ? { observedAt: item.observedAt } : {}),
    ...(item.acquiredAt !== undefined ? { acquiredAt: item.acquiredAt } : {}),
    ...(item.forecastAt !== undefined ? { forecastAt: item.forecastAt } : {}),
    retrievedAt: item.retrievedAt,
    ...(item.lastSuccessfulObservedAt !== undefined ? { lastSuccessfulObservedAt: item.lastSuccessfulObservedAt } : {}),
    degradationReasons: item.degradationReasons,
  }))

  if (!evidence.length) return groundedResponseUnavailable(context, 'missing_grounding', 'No hay evidencia Agronautas aprobada para responder sin inventar datos.', evidenceStatus, [], [], [])
  if (context.readiness !== 'ready' || evidence.length !== fresh.length) {
    const reason = evidenceStatus === COPILOT_EVIDENCE_STATUS.STALE ? 'stale_evidence' : evidenceStatus === COPILOT_EVIDENCE_STATUS.DEGRADED ? 'degraded_evidence' : 'missing_grounding'
    return groundedResponseUnavailable(context, reason, 'La evidencia disponible no está fresca o la readiness no está verificada; no emito una recomendación accionable.', evidenceStatus, sourceRunIds, providerModes, citationLineage)
  }

  const citations = evidence.map((item) => `evidence:${item.evidenceId}`)
  return groundedChatResponseSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    fieldId: context.fieldId,
    locationId: context.locationId,
    answer: `Respuesta limitada al lote ${context.fieldId} y su ubicación autorizada. Se utilizaron ${evidence.length} fuentes Agronautas frescas; no se incorporó contexto municipal, marketplace, auth ni hidráulico.`,
    executedAction: 'FINAL_RESPONSE',
    supportingFacts: [{ label: 'Readiness', value: context.readiness }, { label: 'Evidencia', value: `${evidence.length} fuentes aprobadas` }],
    citations,
    trace: [{ action: 'FINAL_RESPONSE', status: 'executed' }],
    degraded: false,
    actionable: true,
    modelMode: 'deterministic',
    providerMode: providerModes.length === 1 ? providerModes[0] : undefined,
    providerModes,
    evidenceStatus,
    readiness: context.readiness,
    sourceRunIds,
    citationLineage,
  })
}

function groundedResponseUnavailable(context: GroundedCopilotContext, unavailableReason: string, answer: string, evidenceStatus: CopilotEvidenceStatus, sourceRunIds: string[], providerModes: CopilotProviderMode[], citationLineage: GroundedChatResponse['citationLineage']): GroundedChatResponse {
  return groundedChatResponseSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    fieldId: context.fieldId,
    locationId: context.locationId,
    answer,
    executedAction: 'FINAL_RESPONSE',
    supportingFacts: [],
    citations: citationLineage.map((item) => item.citationId),
    trace: [{ action: 'FINAL_RESPONSE', status: 'fallback' }],
    degraded: true,
    actionable: false,
    unavailableReason,
    modelMode: 'unavailable',
    providerMode: providerModes.length === 1 ? providerModes[0] : undefined,
    providerModes,
    evidenceStatus,
    readiness: context.readiness,
    sourceRunIds,
    citationLineage,
  })
}

function summarizeEvidenceStatus(evidence: GroundedCopilotEvidence[]): CopilotEvidenceStatus {
  if (!evidence.length) return COPILOT_EVIDENCE_STATUS.MISSING
  if (evidence.some((item) => item.status === COPILOT_EVIDENCE_STATUS.STALE)) return COPILOT_EVIDENCE_STATUS.STALE
  if (evidence.some((item) => item.status === COPILOT_EVIDENCE_STATUS.DEGRADED)) return COPILOT_EVIDENCE_STATUS.DEGRADED
  if (evidence.some((item) => item.status === COPILOT_EVIDENCE_STATUS.FRESH)) return COPILOT_EVIDENCE_STATUS.FRESH
  return COPILOT_EVIDENCE_STATUS.UNAVAILABLE
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function selectFallbackAction(fieldId: string, message: string, comparisonFieldId?: string): GroundedChatAction {
  const lowered = message.toLowerCase()
  if (comparisonFieldId && /(compar|versus|vs|otro lote)/i.test(lowered)) {
    return { action: 'COMPARE_FIELDS', fieldId, comparisonFieldId }
  }
  if (/(alert|alarma|prioridad)/i.test(lowered)) {
    return { action: 'GET_ALERTS', fieldId }
  }
  if (/(riesgo|score|driver|confianza)/i.test(lowered)) {
    return { action: 'GET_RISK_SUMMARY', fieldId }
  }
  return { action: 'GET_FIELD_OVERVIEW', fieldId }
}

function summarizeFreshness(alerts: AlertSnapshotRecord[]): string {
  if (alerts.some((alert) => alert.freshness === 'stale')) return 'stale'
  if (alerts.some((alert) => alert.freshness === 'degraded')) return 'degraded'
  return alerts.length ? 'fresh' : 'without_alerts'
}

function toDeterministicAnswer(action: GroundedChatAction['action'], facts: Array<{ label: string; value: string }>, fallback: string): string {
  const renderedFacts = facts.map((fact) => `${fact.label}: ${fact.value}`).join(' · ')
  return `${fallback} ${action === 'COMPARE_FIELDS' ? 'Comparación' : 'Detalle'}: ${renderedFacts}`.trim()
}
