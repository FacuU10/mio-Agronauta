import { AGRONAUTAS_CONTRACT_VERSION, groundedChatResponseSchema, type GroundedChatAction, type GroundedChatRequest, type GroundedChatResponse } from '@repo/zod-schemas'
import type { AlertSnapshotRecord, AlertSnapshotRepository, FieldRepository, RiskSnapshotRepository } from '../../domain/repositories/agronautas'
import { type GroqChatProvider } from '../../infrastructure/integrations/groq/client'

interface GroundedChatUseCaseDeps {
  fieldRepository: FieldRepository
  riskSnapshotRepository: RiskSnapshotRepository
  alertSnapshotRepository: AlertSnapshotRepository
  groqProvider: GroqChatProvider
}

export class GroundedChatUseCase {
  constructor(private readonly deps: GroundedChatUseCaseDeps) {}

  async execute(fieldId: string, input: GroundedChatRequest): Promise<GroundedChatResponse> {
    const primaryField = await this.deps.fieldRepository.findById(fieldId)
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

    const selectedAction = await this.selectAction(fieldId, input)
    const result = await this.executeAction(selectedAction)

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

  private async executeAction(action: GroundedChatAction & { usedFallbackSelector?: boolean }): Promise<{ response: GroundedChatResponse; usedFallbackSelector: boolean }> {
    switch (action.action) {
      case 'GET_FIELD_OVERVIEW':
        return { response: await this.buildOverviewResponse(action.fieldId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
      case 'GET_RISK_SUMMARY':
        return { response: await this.buildRiskResponse(action.fieldId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
      case 'GET_ALERTS':
        return { response: await this.buildAlertsResponse(action.fieldId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
      case 'COMPARE_FIELDS':
        return { response: await this.buildComparisonResponse(action.fieldId, action.comparisonFieldId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
      case 'FINAL_RESPONSE':
        return { response: await this.buildOverviewResponse(action.fieldId), usedFallbackSelector: Boolean(action.usedFallbackSelector) }
    }
  }

  private async buildOverviewResponse(fieldId: string): Promise<GroundedChatResponse> {
    const field = await this.deps.fieldRepository.findById(fieldId)
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

  private async buildComparisonResponse(fieldId: string, comparisonFieldId: string): Promise<GroundedChatResponse> {
    const [leftField, rightField, leftRisk, rightRisk] = await Promise.all([
      this.deps.fieldRepository.findById(fieldId),
      this.deps.fieldRepository.findById(comparisonFieldId),
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

  private unavailable(fieldId: string, action: GroundedChatAction['action'], reason: string, comparisonFieldId?: string): GroundedChatResponse {
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
      unavailableReason: 'missing_backend_data',
    })
  }
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
