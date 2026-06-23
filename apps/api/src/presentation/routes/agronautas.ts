import { createHash, randomUUID } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import {
  agronautasContractErrorSchema,
  alertSnapshotSchema,
  copilotContextSchema,
  demoContactSubmissionResponseSchema,
  demoContactSubmissionSchema,
  fieldIntakeSchema,
  groundedChatRequestSchema,
  monitoringStatusSchema,
  riskSnapshotSchema,
} from '@repo/zod-schemas'
import { HydrologyCopilotService, HydrologyRepository } from '@repo/hydrology-engine'
import { CreateFieldIntakeUseCase } from '../../application/usecases/create-field-intake-usecase'
import { GenerateAlertsUseCase, toAlertContracts, toStaleAlertContracts, toStoredAlertContracts } from '../../application/usecases/generate-alerts-usecase'
import { RequestRiskRecomputeUseCase } from '../../application/usecases/request-risk-recompute-usecase'
import { GroundedChatUseCase } from '../../application/usecases/grounded-chat-usecase'
import type {
  AgronautasJobRunRepository,
  AgronautasRuntimeDispatcher,
  AlertSnapshotRepository,
  DemoContactSubmissionRepository,
  FieldContextRepository,
  FieldRepository,
  RecomputeLockRepository,
  RiskSnapshotRepository,
  SignalSummaryRepository,
} from '../../domain/repositories/agronautas'
import { PostgresAlertSnapshotRepository } from '../../infrastructure/database/postgres/agronautas-alert-snapshot-repository'
import { PostgresDemoContactSubmissionRepository } from '../../infrastructure/database/postgres/demo-contact-submission-repository'
import { PostgresFieldContextRepository, PostgresFieldRepository } from '../../infrastructure/database/postgres/agronautas-field-repository'
import { PostgresAgronautasJobRunRepository } from '../../infrastructure/database/postgres/agronautas-job-run-repository'
import { PostgresRiskSnapshotRepository } from '../../infrastructure/database/postgres/agronautas-risk-snapshot-repository'
import { PostgresSignalSummaryRepository } from '../../infrastructure/database/postgres/agronautas-signal-summary-repository'
import { RedisRecomputeLockRepository } from '../../infrastructure/database/redis/agronautas-recompute-lock-repository'
import { getAgronautasRuntimeConfig } from '../../infrastructure/config/agronautas-runtime'
import { createGroqChatProvider } from '../../infrastructure/integrations/groq/client'
import { RedisAgronautasRuntimeDispatcher } from '../../infrastructure/queue/agronautas-runtime-dispatcher'
import { createDemoAlerts, createDemoCopilotContext, createDemoFieldCreated, createDemoFieldOverview, createDemoRiskSnapshot, isSupportedDemoFieldIntake } from './agronautas-demo'
import { getAgronautasAuthConfig, requireAgronautasScope } from '../middleware/agronautas-auth'
import { createChatRateLimitMiddleware } from '../middleware/rate-limit'
import { WorkerUnavailableError } from '../../application/usecases/request-risk-recompute-usecase'
import { getPostgresPool } from '../../infrastructure/database/postgres/pool'
import type { Field } from '../../domain/entities/agronautas'

type HydrologyDenseContextV1 = Awaited<ReturnType<HydrologyRepository['getDenseContextForField']>>
type RequestWithField = Request & { field?: Field }

interface AgronautasRouterDeps {
  fieldRepository: FieldRepository
  fieldContextRepository: FieldContextRepository
  riskSnapshotRepository: RiskSnapshotRepository
  signalSummaryRepository: SignalSummaryRepository
  recomputeLockRepository: RecomputeLockRepository
  runtimeDispatcher: AgronautasRuntimeDispatcher
  jobRunRepository: AgronautasJobRunRepository
  alertSnapshotRepository: AlertSnapshotRepository
  demoContactSubmissionRepository: DemoContactSubmissionRepository
  hydrologyRepository: Pick<HydrologyRepository, 'getDenseContextForField'>
  hydrologyCopilotService: Pick<HydrologyCopilotService, 'streamChat'>
  isVersionedNamespace: boolean
}

export function createAgronautasRouter(deps: Partial<AgronautasRouterDeps> = {}): Router {
  const resolved: AgronautasRouterDeps = {
    fieldRepository: deps.fieldRepository ?? new PostgresFieldRepository(),
    fieldContextRepository: deps.fieldContextRepository ?? new PostgresFieldContextRepository(),
    riskSnapshotRepository: deps.riskSnapshotRepository ?? new PostgresRiskSnapshotRepository(),
    signalSummaryRepository: deps.signalSummaryRepository ?? new PostgresSignalSummaryRepository(),
    recomputeLockRepository: deps.recomputeLockRepository ?? new RedisRecomputeLockRepository(),
    runtimeDispatcher: deps.runtimeDispatcher ?? new RedisAgronautasRuntimeDispatcher(),
    jobRunRepository: deps.jobRunRepository ?? new PostgresAgronautasJobRunRepository(),
    alertSnapshotRepository: deps.alertSnapshotRepository ?? new PostgresAlertSnapshotRepository(),
    demoContactSubmissionRepository: deps.demoContactSubmissionRepository ?? new PostgresDemoContactSubmissionRepository(),
    hydrologyRepository: deps.hydrologyRepository ?? new HydrologyRepository(getPostgresPool()),
    hydrologyCopilotService: deps.hydrologyCopilotService ?? new HydrologyCopilotService(),
    isVersionedNamespace: deps.isVersionedNamespace ?? false,
  }

  const router = Router()
  const createFieldIntake = new CreateFieldIntakeUseCase(resolved.fieldRepository, resolved.fieldContextRepository)
  const generateAlerts = new GenerateAlertsUseCase(resolved.riskSnapshotRepository, resolved.alertSnapshotRepository)
  const requestRecompute = new RequestRiskRecomputeUseCase(resolved.recomputeLockRepository, resolved.runtimeDispatcher, resolved.jobRunRepository)
  const groundedChat = new GroundedChatUseCase({
    fieldRepository: resolved.fieldRepository,
    riskSnapshotRepository: resolved.riskSnapshotRepository,
    alertSnapshotRepository: resolved.alertSnapshotRepository,
    groqProvider: createGroqChatProvider(),
  })
  const runtimeConfig = getAgronautasRuntimeConfig()
  const authConfig = getAgronautasAuthConfig()
  const chatRateLimitMiddleware = createChatRateLimitMiddleware()
  const requireRead = requireAgronautasScope('read', authConfig)
  const requireWrite = requireAgronautasScope('write', authConfig)
  const requireRecompute = requireAgronautasScope('recompute', authConfig)

  router.use((req, res, next) => {
    res.setHeader('X-Agronautas-Mode', runtimeConfig.mode)
    if (!resolved.isVersionedNamespace) {
      res.setHeader('X-Agronautas-Route-Compatibility', `${runtimeConfig.routePrefix}/v1`)
    }
    next()
  })

  router.get('/runtime', requireRead, (req, res) => {
    return res.json({
      mode: runtimeConfig.mode,
      routePrefix: resolved.isVersionedNamespace ? `${runtimeConfig.routePrefix}/v1` : runtimeConfig.routePrefix,
      compatibilityPrefix: resolved.isVersionedNamespace ? runtimeConfig.routePrefix : `${runtimeConfig.routePrefix}/v1`,
      contractVersion: '1.0.0',
    })
  })

  router.post('/contact/demo', async (req, res) => {
    const parsed = demoContactSubmissionSchema.safeParse(req.body)
    if (!parsed.success) return respondContractError(res, 400, 'INVALID_CONTRACT', 'Payload inválido', { issues: parsed.error.flatten() })

    const submission = parsed.data
    if (submission.website.trim().length > 0) {
      return res.status(201).json(receivedResponse('ignored-honeypot'))
    }

    try {
      const { submissionId } = await resolved.demoContactSubmissionRepository.save({
        ...submission,
        sourcePath: readSourcePath(req),
        userAgent: readHeader(req, 'user-agent'),
        ipHash: hashIp(req.ip),
      })
      return res.status(201).json(receivedResponse(submissionId))
    } catch {
      return respondContractError(res, 500, 'INVALID_CONTRACT', 'No pudimos recibir tu solicitud. Intentá nuevamente en unos minutos.')
    }
  })

  router.post('/fields', requireWrite, async (req, res) => {
    const parsed = fieldIntakeSchema.safeParse(req.body)
    if (!parsed.success) return respondContractError(res, 400, 'INVALID_CONTRACT', 'Payload inválido', { issues: parsed.error.flatten() })

    if (runtimeConfig.mode === 'demo') {
      const demoParsed = isSupportedDemoFieldIntake(req.body)
      if (!demoParsed.success) {
        return respondContractError(res, 422, 'OUT_OF_SUPPORTED_AREA', 'El lote queda fuera del alcance Corrientes arroz', { reason: 'outside_corrientes_rice_zone' })
      }

      return res.status(201).json(createDemoFieldCreated(demoParsed.data))
    }

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

  router.get('/fields/:fieldId', requireRead, async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    if (runtimeConfig.mode === 'demo') {
      return res.json(createDemoFieldOverview(fieldId))
    }

    const field = await resolved.fieldRepository.findById(fieldId)
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

  router.get('/fields/:fieldId/risk/current', requireRead, async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    if (runtimeConfig.mode === 'demo') {
      return res.json({ status: 'stale', snapshot: createDemoRiskSnapshot(fieldId), recompute: { status: 'enqueued' } })
    }

    const snapshot = await resolved.riskSnapshotRepository.getLatest(fieldId)
    if (!snapshot) return res.status(404).json({ error: 'Risk snapshot not found' })

    const stale = snapshot.isExpired()
    const recompute = stale ? await safeRequestRecompute(fieldId, 'api', req, res) : null
    if (stale && recompute === null) return
    return res.json({
      status: stale ? 'stale' : snapshot.freshness,
      snapshot: riskSnapshotSchema.parse(snapshot.toContract()),
      recompute,
    })
  })

  router.get('/fields/:fieldId/hydrology/dashboard', requireRead, requireFieldAccess(resolved.fieldRepository), async (req: RequestWithField, res: Response) => {
    const field = req.field
    if (!field) return respondContractError(res, 404, 'INVALID_CONTRACT', 'Field not found')

    const context = await resolved.hydrologyRepository.getDenseContextForField(field.props.id, fieldBoundaryWkt(field))
    return res.json(toHydrologyDashboardResponse(context))
  })

  router.get('/fields/:fieldId/hydrology/alerts', requireRead, requireFieldAccess(resolved.fieldRepository), async (req: RequestWithField, res: Response) => {
    const field = req.field
    if (!field) return respondContractError(res, 404, 'INVALID_CONTRACT', 'Field not found')

    const context = await resolved.hydrologyRepository.getDenseContextForField(field.props.id, fieldBoundaryWkt(field))
    return res.json({
      contractVersion: 'hydrology-alerts-v1',
      fieldId: context.fieldId,
      zone: context.zone,
      lastSuccessfulObservedAt: context.snapshot.lastSuccessfulObservedAt,
      alerts: context.telemetry.filter((item: HydrologyDenseContextV1['telemetry'][number]) => item.metric === 'storm_alert').map(toHydrologyItem),
    })
  })

  router.get('/fields/:fieldId/risk/timeline', requireRead, async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    if (runtimeConfig.mode === 'demo') {
      return res.json({ fieldId, items: [createDemoRiskSnapshot(fieldId)] })
    }

    const limit = parseLimit(req)
    const snapshots = await resolved.riskSnapshotRepository.listTimeline?.(fieldId, limit) ?? []
    return res.json({ fieldId, items: snapshots.map((snapshot) => riskSnapshotSchema.parse(snapshot.toContract())) })
  })

  router.get('/fields/:fieldId/status', async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    if (runtimeConfig.mode === 'demo') {
      const snapshot = createDemoRiskSnapshot(fieldId)
      const alerts = createDemoAlerts(fieldId)

      return res.json(monitoringStatusSchema.parse({
        contractVersion: '1.0.0',
        fieldId,
        fieldStatus: 'stale',
        riskStatus: 'stale',
        alertsStatus: 'stale',
        alertCount: alerts.length,
        lastUpdatedAt: snapshot.computedAt,
        validUntil: snapshot.validUntil,
        degradationReasons: snapshot.degradationReasons,
      }))
    }

    const [field, snapshot, alerts] = await Promise.all([
      resolved.fieldRepository.findById(fieldId),
      resolved.riskSnapshotRepository.getLatest(fieldId),
      resolved.alertSnapshotRepository.getLatestForField(fieldId),
    ])

    if (!field) return res.status(404).json({ error: 'Field not found' })

    const riskStatus = snapshot ? snapshot.freshness : 'missing'
    const alertsStatus = alerts.length > 0 ? deriveAlertStatus(alerts) : snapshot ? snapshot.freshness : 'missing'
    const degradationReasons = snapshot?.props.degradationReasons ?? []

    return res.json(monitoringStatusSchema.parse({
      contractVersion: '1.0.0',
      fieldId,
      fieldStatus: !snapshot ? 'missing_data' : snapshot.freshness === 'fresh' && alertsStatus === 'fresh' ? 'ready' : 'stale',
      riskStatus,
      alertsStatus,
      alertCount: alerts.length,
      lastUpdatedAt: snapshot?.props.computedAt.toISOString() ?? null,
      validUntil: snapshot?.props.validUntil.toISOString() ?? null,
      degradationReasons,
    }))
  })

  router.get('/fields/:fieldId/weather/timeline', requireRead, async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    if (runtimeConfig.mode === 'demo') {
      return res.json({
        fieldId,
        items: [{
          provider: 'open-meteo',
          observedAt: '2026-06-03T00:00:00.000Z',
          freshnessHours: 12,
          confidence: 0.64,
          staleCause: 'demo_mode',
          temperatureC: 31.5,
          rainfallMm7d: 82,
          humidityPct: 74,
        }],
      })
    }

    const limit = parseLimit(req)
    const timeline = await resolved.signalSummaryRepository.listClimateTimeline?.(fieldId, limit) ?? []
    return res.json({
      fieldId,
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

  router.get('/fields/:fieldId/alerts/current', requireRead, async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    if (runtimeConfig.mode === 'demo') {
      return res.status(202).json({
        status: 'stale',
        snapshot: createDemoRiskSnapshot(fieldId),
        alerts: createDemoAlerts(fieldId),
        recompute: { status: 'already_in_progress' },
      })
    }

    const result = await generateAlerts.execute({ fieldId, triggeredBy: 'api' })
    if (result.status === 'missing-snapshot') return res.status(404).json({ error: 'Risk snapshot not found' })

    if (result.status === 'stale-snapshot') {
      const recompute = await safeRequestRecompute(fieldId, 'alert-refresh', req, res)
      if (!recompute) return
      const latestAlerts = await resolved.alertSnapshotRepository.getLatestForField(fieldId)
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

  router.get('/fields/:fieldId/alerts/timeline', requireRead, async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    if (runtimeConfig.mode === 'demo') {
      return res.json({ fieldId, items: createDemoAlerts(fieldId) })
    }

    const limit = parseLimit(req)
    const alerts = await resolved.alertSnapshotRepository.listTimeline(fieldId, limit)
    return res.json({ fieldId, items: toStoredAlertContracts(alerts) })
  })

  router.post('/fields/:fieldId/recompute', requireRecompute, async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    if (runtimeConfig.mode === 'demo') {
      return res.status(202).json({ status: 'enqueued', mode: 'demo' })
    }

    const result = await safeRequestRecompute(fieldId, 'api', req, res)
    if (!result) return
    return res.status(result.status === 'enqueued' ? 202 : 200).json(result)
  })

  router.get('/fields/:fieldId/copilot/context', requireRead, async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    if (runtimeConfig.mode === 'demo') {
      return res.json(createDemoCopilotContext(fieldId))
    }

    const [field, context, snapshot, alerts] = await Promise.all([
      resolved.fieldRepository.findById(fieldId),
      resolved.fieldContextRepository.getLatest(fieldId),
      resolved.riskSnapshotRepository.getLatest(fieldId),
      resolved.alertSnapshotRepository.getLatestForField(fieldId),
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

  router.post('/fields/:fieldId/copilot/chat', requireRead, requireFieldAccess(resolved.fieldRepository), chatRateLimitMiddleware, async (req: RequestWithField, res: Response) => {
    const field = req.field
    if (!field) return respondContractError(res, 404, 'INVALID_CONTRACT', 'Field not found')

    const parsed = groundedChatRequestSchema.safeParse(req.body)
    if (!parsed.success) return respondContractError(res, 400, 'INVALID_CONTRACT', 'Payload inválido', { issues: parsed.error.flatten() })

    const context = await resolved.hydrologyRepository.getDenseContextForField(field.props.id, fieldBoundaryWkt(field))
    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    try {
      for await (const event of resolved.hydrologyCopilotService.streamChat({ message: parsed.data.message, context })) {
        res.write(`event: ${event.type}\n`)
        res.write(`data: ${JSON.stringify(event.data)}\n\n`)
      }
      return res.end()
    } catch (error) {
      res.write('event: error\n')
      res.write(`data: ${JSON.stringify({ message: 'El copiloto hidrológico no está disponible.', reason: error instanceof Error ? error.message : 'unknown_error' })}\n\n`)
      return res.end()
    }
  })

  router.post('/fields/:fieldId/chat', chatRateLimitMiddleware, async (req, res) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    const parsed = groundedChatRequestSchema.safeParse(req.body)
    if (!parsed.success) return respondContractError(res, 400, 'INVALID_CONTRACT', 'Payload inválido', { issues: parsed.error.flatten() })

    const message = parsed.data.message.toLowerCase()
    if (/(clima futuro exacto|rendimiento garantizado|especul)/i.test(message)) {
      return res.status(422).json({
        contractVersion: '1.0.0',
        fieldId,
        answer: 'Esa pregunta queda fuera del alcance del MVP porque no está respaldada por los datasets aprobados.',
        executedAction: 'FINAL_RESPONSE',
        supportingFacts: [],
        citations: [],
        trace: [{ action: 'FINAL_RESPONSE', status: 'fallback' }],
        degraded: true,
        unavailableReason: 'unsupported_question',
      })
    }

    const response = await groundedChat.execute(fieldId, parsed.data)
    return res.json(response)
  })

  return router

  async function safeRequestRecompute(fieldId: string, triggeredBy: 'api' | 'alert-refresh', req: Request, res: Response) {
    try {
      return await requestRecompute.execute(fieldId, triggeredBy, { requestId: readRequestId(req) })
    } catch (error) {
      if (error instanceof WorkerUnavailableError) {
        respondContractError(res, 503, 'WORKER_UNAVAILABLE', error.message, { ...error.details, fieldId }, true)
        return null
      }

      throw error
    }
  }
}

function receivedResponse(submissionId: string) {
  return demoContactSubmissionResponseSchema.parse({
    contractVersion: '1.0.0',
    submissionId,
    status: 'received',
  })
}

function respondContractError(
  res: Response,
  status: number,
  code: 'INVALID_CONTRACT' | 'OUT_OF_SUPPORTED_AREA' | 'WORKER_UNAVAILABLE',
  message: string,
  details?: Record<string, unknown>,
  retryable = false,
) {
  return res.status(status).json(
    agronautasContractErrorSchema.parse({
      contractVersion: '1.0.0',
      code,
      message,
      retryable,
      details,
    }),
  )
}

function readRequestId(req: Request): string {
  const header = req.header('x-request-id')?.trim()
  return header && header.length > 0 ? header : randomUUID()
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

function deriveAlertStatus(alerts: Array<{ freshness: 'fresh' | 'stale' | 'degraded' }>): 'fresh' | 'stale' | 'degraded' {
  if (alerts.some((alert) => alert.freshness === 'stale')) return 'stale'
  if (alerts.some((alert) => alert.freshness === 'degraded')) return 'degraded'
  return 'fresh'
}

function requireFieldAccess(fieldRepository: FieldRepository) {
  return async (req: RequestWithField, res: Response, next: NextFunction) => {
    const fieldId = requireFieldId(req, res)
    if (!fieldId) return

    const field = await fieldRepository.findById(fieldId)
    if (!field) return res.status(404).json({ error: 'Field not found' })

    req.field = field
    return next()
  }
}

function fieldBoundaryWkt(field: Field): string {
  return field.props.polygonWkt ?? `POINT(${field.props.centroid.lng} ${field.props.centroid.lat})`
}

function toHydrologyDashboardResponse(context: HydrologyDenseContextV1) {
  const parsed = context
  const telemetry = parsed.telemetry.map(toHydrologyItem)
  return {
    contractVersion: 'hydrology-dashboard-v1',
    fieldId: parsed.fieldId,
    zone: parsed.zone,
    sources: parsed.sources,
    stations: parsed.stations,
    status: {
      riskLevel: parsed.snapshot.riskLevel,
      freshness: parsed.snapshot.freshness,
      quality: parsed.snapshot.quality,
      recommendation: parsed.snapshot.recommendation,
      lastSuccessfulObservedAt: parsed.snapshot.lastSuccessfulObservedAt,
    },
    heights: telemetry.filter((item: ReturnType<typeof toHydrologyItem>) => item.metric === 'river_height_m' && item.forecastHorizonDays === undefined),
    trends: telemetry.filter((item: ReturnType<typeof toHydrologyItem>) => item.tendency !== undefined),
    forecasts: telemetry.filter((item: ReturnType<typeof toHydrologyItem>) => item.source === 'INA' && item.forecastHorizonDays !== undefined),
    rain: telemetry.filter((item: ReturnType<typeof toHydrologyItem>) => item.metric === 'rain_mm'),
    alerts: telemetry.filter((item: ReturnType<typeof toHydrologyItem>) => item.metric === 'storm_alert'),
  }
}

function toHydrologyItem(item: HydrologyDenseContextV1['telemetry'][number]) {
  return {
    source: item.source,
    stationId: item.stationId,
    observedAt: item.observedAt,
    ingestedAt: item.ingestedAt,
    lastSuccessfulObservedAt: item.lastSuccessfulObservedAt,
    value: item.value,
    unit: item.unit,
    metric: item.metric,
    quality: item.quality,
    freshness: item.freshness,
    tendency: item.tendency,
    forecastHorizonDays: item.forecastHorizonDays,
    confidence: item.confidence,
    sourceUrl: item.sourceUrl,
  }
}

function readSourcePath(req: Request): string {
  const fromHeader = readHeader(req, 'x-source-path')
  if (fromHeader) return fromHeader

  const referer = readHeader(req, 'referer')
  if (!referer) return '/probar-demo'

  try {
    return new URL(referer).pathname || '/probar-demo'
  } catch {
    return '/probar-demo'
  }
}

function readHeader(req: Request, name: string): string | undefined {
  const value = req.header(name)?.trim()
  return value && value.length > 0 ? value : undefined
}

function hashIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined
  return createHash('sha256').update(ip).digest('hex')
}

function requireFieldId(req: Request, res: Response): string | undefined {
  const fieldId = req.params['fieldId']
  if (typeof fieldId === 'string' && fieldId.length > 0) {
    return fieldId
  }

  respondContractError(res, 400, 'INVALID_CONTRACT', 'Field id is required')
  return undefined
}

export type { AgronautasRouterDeps }
