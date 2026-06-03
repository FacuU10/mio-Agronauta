import { Router, type Request, type Response } from 'express'
import {
  agronautasContractErrorSchema,
  alertSnapshotSchema,
  copilotContextSchema,
  fieldIntakeSchema,
  riskSnapshotSchema,
} from '@repo/zod-schemas'
import { CreateFieldIntakeUseCase } from '../../application/usecases/create-field-intake-usecase'
import { GenerateAlertsUseCase, toAlertContracts, toStaleAlertContracts, toStoredAlertContracts } from '../../application/usecases/generate-alerts-usecase'
import { RequestRiskRecomputeUseCase } from '../../application/usecases/request-risk-recompute-usecase'
import type {
  AlertSnapshotRepository,
  FieldContextRepository,
  FieldRepository,
  RecomputeLockRepository,
  RiskSnapshotRepository,
  SignalSummaryRepository,
} from '../../domain/repositories/agronautas'
import { PostgresAlertSnapshotRepository } from '../../infrastructure/database/postgres/agronautas-alert-snapshot-repository'
import { PostgresFieldContextRepository, PostgresFieldRepository } from '../../infrastructure/database/postgres/agronautas-field-repository'
import { PostgresRiskSnapshotRepository } from '../../infrastructure/database/postgres/agronautas-risk-snapshot-repository'
import { PostgresSignalSummaryRepository } from '../../infrastructure/database/postgres/agronautas-signal-summary-repository'
import { RedisRecomputeLockRepository } from '../../infrastructure/database/redis/agronautas-recompute-lock-repository'

interface AgronautasRouterDeps {
  fieldRepository: FieldRepository
  fieldContextRepository: FieldContextRepository
  riskSnapshotRepository: RiskSnapshotRepository
  signalSummaryRepository: SignalSummaryRepository
  recomputeLockRepository: RecomputeLockRepository
  alertSnapshotRepository: AlertSnapshotRepository
}

export function createAgronautasRouter(deps: Partial<AgronautasRouterDeps> = {}): Router {
  const resolved: AgronautasRouterDeps = {
    fieldRepository: deps.fieldRepository ?? new PostgresFieldRepository(),
    fieldContextRepository: deps.fieldContextRepository ?? new PostgresFieldContextRepository(),
    riskSnapshotRepository: deps.riskSnapshotRepository ?? new PostgresRiskSnapshotRepository(),
    signalSummaryRepository: deps.signalSummaryRepository ?? new PostgresSignalSummaryRepository(),
    recomputeLockRepository: deps.recomputeLockRepository ?? new RedisRecomputeLockRepository(),
    alertSnapshotRepository: deps.alertSnapshotRepository ?? new PostgresAlertSnapshotRepository(),
  }

  const router = Router()
  const createFieldIntake = new CreateFieldIntakeUseCase(resolved.fieldRepository, resolved.fieldContextRepository)
  const generateAlerts = new GenerateAlertsUseCase(resolved.riskSnapshotRepository, resolved.alertSnapshotRepository)
  const requestRecompute = new RequestRiskRecomputeUseCase(resolved.recomputeLockRepository)

  router.post('/fields', async (req, res) => {
    const parsed = fieldIntakeSchema.safeParse(req.body)
    if (!parsed.success) return respondContractError(res, 400, 'INVALID_CONTRACT', 'Payload inválido', { issues: parsed.error.flatten() })

    try {
      const result = await createFieldIntake.execute(parsed.data)
      return res.status(201).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error'
      if (message.includes('outside') || message.includes('coverage')) {
        return respondContractError(res, 422, 'OUT_OF_SUPPORTED_AREA', 'El lote queda fuera del alcance Corrientes arroz', { reason: message })
      }

      return respondContractError(res, 500, 'INVALID_CONTRACT', 'No se pudo crear el lote', { reason: message })
    }
  })

  router.get('/fields/:fieldId', async (req, res) => {
    const field = await resolved.fieldRepository.findById(req.params.fieldId)
    if (!field) return res.status(404).json({ error: 'Field not found' })

    return res.json({
      fieldId: field.props.id,
      externalFieldId: field.props.externalFieldId,
      crop: field.props.crop,
      hectares: field.props.hectares,
      locality: field.props.localityName,
      provinceCode: field.props.provinceCode,
      centroid: field.props.centroid,
    })
  })

  router.get('/fields/:fieldId/risk/current', async (req, res) => {
    const snapshot = await resolved.riskSnapshotRepository.getLatest(req.params.fieldId)
    if (!snapshot) return res.status(404).json({ error: 'Risk snapshot not found' })

    const stale = snapshot.isExpired()
    const recompute = stale ? await requestRecompute.execute(req.params.fieldId, 'api') : null
    return res.json({
      status: stale ? 'stale' : snapshot.freshness,
      snapshot: riskSnapshotSchema.parse(snapshot.toContract()),
      recompute,
    })
  })

  router.get('/fields/:fieldId/risk/timeline', async (req, res) => {
    const limit = parseLimit(req)
    const snapshots = await resolved.riskSnapshotRepository.listTimeline?.(req.params.fieldId, limit) ?? []
    return res.json({ fieldId: req.params.fieldId, items: snapshots.map((snapshot) => riskSnapshotSchema.parse(snapshot.toContract())) })
  })

  router.get('/fields/:fieldId/weather/timeline', async (req, res) => {
    const limit = parseLimit(req)
    const timeline = await resolved.signalSummaryRepository.listClimateTimeline?.(req.params.fieldId, limit) ?? []
    return res.json({
      fieldId: req.params.fieldId,
      items: timeline.map((item) => ({
        provider: item.provider,
        observedAt: item.observedAt.toISOString(),
        freshnessHours: item.freshnessHours,
        confidence: item.confidence,
        staleCause: item.staleCause,
        temperatureC: item.temperatureC,
        rainfallMm7d: item.rainfallMm7d,
        humidityPct: item.humidityPct,
      })),
    })
  })

  router.get('/fields/:fieldId/alerts/current', async (req, res) => {
    const result = await generateAlerts.execute({ fieldId: req.params.fieldId, triggeredBy: 'api' })
    if (result.status === 'missing-snapshot') return res.status(404).json({ error: 'Risk snapshot not found' })

    if (result.status === 'stale-snapshot') {
      const recompute = await requestRecompute.execute(req.params.fieldId, 'alert-refresh')
      const latestAlerts = await resolved.alertSnapshotRepository.getLatestForField(req.params.fieldId)
      return res.status(202).json({
        status: 'stale',
        snapshot: result.snapshot ? riskSnapshotSchema.parse(result.snapshot.toContract()) : null,
        alerts: toStaleAlertContracts(latestAlerts),
        recompute,
      })
    }

    return res.json({
      status: result.snapshot?.freshness ?? 'fresh',
      snapshot: result.snapshot ? riskSnapshotSchema.parse(result.snapshot.toContract()) : null,
      alerts: toAlertContracts(result.alerts),
    })
  })

  router.get('/fields/:fieldId/alerts/timeline', async (req, res) => {
    const limit = parseLimit(req)
    const alerts = await resolved.alertSnapshotRepository.listTimeline(req.params.fieldId, limit)
    return res.json({ fieldId: req.params.fieldId, items: toStoredAlertContracts(alerts) })
  })

  router.post('/fields/:fieldId/recompute', async (req, res) => {
    const result = await requestRecompute.execute(req.params.fieldId, 'api')
    return res.status(result.status === 'enqueued' ? 202 : 200).json(result)
  })

  router.get('/fields/:fieldId/copilot/context', async (req, res) => {
    const [field, context, snapshot, alerts] = await Promise.all([
      resolved.fieldRepository.findById(req.params.fieldId),
      resolved.fieldContextRepository.getLatest(req.params.fieldId),
      resolved.riskSnapshotRepository.getLatest(req.params.fieldId),
      resolved.alertSnapshotRepository.getLatestForField(req.params.fieldId),
    ])

    if (!field) return res.status(404).json({ error: 'Field not found' })

    const requestedWindow = parseRequestedWindow(req)
    const snapshotContract = snapshot ? riskSnapshotSchema.parse(snapshot.toContract()) : undefined
    const alertContracts = alerts.map((alert) => alertSnapshotSchema.parse(toStoredAlertContracts([alert])[0]))

    const payload = copilotContextSchema.parse({
      contractVersion: '1.0.0',
      fieldId: field.props.id,
      crop: field.props.crop,
      growthStage: context?.props.growthStage,
      requestedWindow,
      latestSnapshotId: snapshot?.props.snapshotId,
      alertIds: alerts.map((alert) => alert.alertId),
      degradationReasons: snapshot?.props.degradationReasons ?? [],
      snapshot: snapshotContract && snapshot
        ? {
            snapshotId: snapshotContract.snapshotId,
            score: snapshotContract.score,
            level: snapshotContract.level,
            confidence: snapshotContract.confidence,
            freshness: snapshot.freshness,
            computedAt: snapshotContract.computedAt,
            validUntil: snapshotContract.validUntil,
            ruleVersion: snapshotContract.ruleVersion,
            degradationReasons: snapshotContract.degradationReasons,
            evidenceRefs: snapshotContract.evidenceRefs,
          }
        : undefined,
      alerts: alertContracts.map((alert) => ({
        alertId: alert.alertId,
        basedOnSnapshotId: alert.basedOnSnapshotId,
        type: alert.type,
        priority: alert.priority,
        confidence: alert.confidence,
        freshness: alert.freshness,
        degradationReasons: alert.degradationReasons,
      })),
    })

    return res.json(payload)
  })

  return router
}

function respondContractError(res: Response, status: number, code: 'INVALID_CONTRACT' | 'OUT_OF_SUPPORTED_AREA', message: string, details?: Record<string, unknown>) {
  return res.status(status).json(
    agronautasContractErrorSchema.parse({
      contractVersion: '1.0.0',
      code,
      message,
      retryable: false,
      details,
    }),
  )
}

function parseLimit(req: Request): number {
  const raw = typeof req.query['limit'] === 'string' ? Number(req.query['limit']) : 10
  return Number.isFinite(raw) ? Math.min(50, Math.max(1, raw)) : 10
}

function parseRequestedWindow(req: Request): { from: string; to: string } | undefined {
  const from = typeof req.query['from'] === 'string' ? req.query['from'] : undefined
  const to = typeof req.query['to'] === 'string' ? req.query['to'] : undefined
  return from && to ? { from, to } : undefined
}

export type { AgronautasRouterDeps }
