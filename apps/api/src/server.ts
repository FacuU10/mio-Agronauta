import './infrastructure/config/load-env'
import 'express-async-errors'
import express, { Application } from 'express'
import { globalErrorHandler, notFoundHandler } from './presentation/middleware/error-handler'
import { httpLogger, logger } from './infrastructure/observability/logger'
import { helmetMiddleware } from './presentation/middleware/helmet'
import { createRateLimitMiddleware } from './presentation/middleware/rate-limit'
import { corsMiddleware } from './presentation/middleware/cors'
import { healthRouter } from './presentation/routes/health'
import { createAgronautasRouter } from './presentation/routes/agronautas'
import { createGovernmentIngestionRunner, createHydrologyGovernmentRouter, createHydrologyIngestionCoordinator, type GovernmentIngestionResponse, type HydrologyIngestionCoordinator, type HydrologyIngestionInput } from './presentation/routes/hydrology-government'
import { AGRONAUTAS_SCHEDULER_UNAVAILABLE_REASON, getAgronautasRuntimeConfig } from './infrastructure/config/agronautas-runtime'
import { AgronautasSignalScheduler, createAgronautasSchedulerRuntime, type ScheduledWindowDispatcher, type SourceWindow, type ScheduledWindowLock } from './infrastructure/jobs/agronautas-scheduler'
import { PostgresSignalIngestionRepository } from './infrastructure/database/postgres/agronautas-signal-ingestion-repository'
import { HydrologyRepository } from '@repo/hydrology-engine'
import { getPostgresPool } from './infrastructure/database/postgres/pool'
import { PostgresSourceCadenceRepository } from './infrastructure/database/postgres/agronautas-source-cadence-repository'
import { RedisSchedulerWindowLock } from './infrastructure/database/redis/scheduler-lock'
import type { SignalIngestionRepository, SourceCadenceRepository } from './domain/repositories/agronautas'
import { HydrologyIngestionScheduler, type HydrologyIngestionRunner, type HydrologyIngestionSource } from './infrastructure/jobs/hydrology-ingestion-scheduler'
import type { HydrologySource } from '@repo/zod-schemas'
import { ProductionEnvValidatorPort } from './infrastructure/config/validator'
import type { AgronautasAuthServicePort } from './domain/auth/ports'
import { runAgronautasAuthBootstrapFromEnv, type AgronautasAuthBootstrapResult } from './infrastructure/bootstrap/agronautas-auth-bootstrap'


function parseApiPort(name: 'PORT' | 'API_PORT', value: string | undefined): number | undefined {
  const normalized = value?.trim()
  if (!normalized) return undefined

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid API port configured by ${name}: ${JSON.stringify(value)}`)
  }

  const port = Number(normalized)
  if (!Number.isSafeInteger(port) || port <= 0) {
    throw new Error(`Invalid API port configured by ${name}: ${JSON.stringify(value)}`)
  }

  return port
}

export function resolveApiPort(env: NodeJS.ProcessEnv = process.env): number {
  return parseApiPort('PORT', env['PORT']) ?? parseApiPort('API_PORT', env['API_PORT']) ?? 3001
}

interface HydrologySchedulerStartupDeps {
  ingestionRunner?: (input: HydrologyIngestionInput) => Promise<GovernmentIngestionResponse>
  ingestionCoordinator?: HydrologyIngestionCoordinator
  schedulerFactory?: (runner: HydrologyIngestionRunner) => Pick<HydrologyIngestionScheduler, 'start'>
  ownerId?: string
}

interface ApiStartupDependencies {
  authBootstrap?: () => Promise<AgronautasAuthBootstrapResult>
}

export function createApp(deps: { hydrologyIngestionCoordinator?: HydrologyIngestionCoordinator; authService?: AgronautasAuthServicePort } = {}): Application {
  const app = express()
  const runtimeConfig = getAgronautasRuntimeConfig()
  const hydrologyRepository = new HydrologyRepository(getPostgresPool())
  const hydrologyIngestionCoordinator = deps.hydrologyIngestionCoordinator ?? createHydrologyIngestionCoordinator(createGovernmentIngestionRunner({ repository: hydrologyRepository }), hydrologyRepository)

  app.set('trust proxy', runtimeConfig.trustProxy)

  app.use(httpLogger)

  // Security middleware
  app.use(helmetMiddleware)
  app.use(corsMiddleware)
  app.use(createRateLimitMiddleware())

  // Body parsing
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Routes
  app.use(healthRouter)
  app.use('/api/hydrology', createHydrologyGovernmentRouter({ ingestionCoordinator: hydrologyIngestionCoordinator }))
  app.use(runtimeConfig.routePrefix, healthRouter)
  app.use(runtimeConfig.routePrefix, createAgronautasRouter({ authService: deps.authService ?? undefined }))
  app.use(`${runtimeConfig.routePrefix}/v1`, createAgronautasRouter({ authService: deps.authService ?? undefined, isVersionedNamespace: true }))

  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

export async function startServer(dependencies: ApiStartupDependencies = {}): Promise<void> {
  ProductionEnvValidatorPort.validate()
  await (dependencies.authBootstrap ?? startAgronautasAuthBootstrapFromEnv)()
  const port = resolveApiPort()

  const hydrologyRepository = new HydrologyRepository(getPostgresPool())
  const hydrologyIngestionCoordinator = createHydrologyIngestionCoordinator(createGovernmentIngestionRunner({ repository: hydrologyRepository }), hydrologyRepository)
  const app = createApp({ hydrologyIngestionCoordinator })

  app.listen(port, () => {
    logger.info({ port }, 'API server listening')
  })

  startAgronautasSchedulerFromEnv()
  startHydrologySchedulerFromEnv(process.env, { ingestionCoordinator: hydrologyIngestionCoordinator })
}

interface AgronautasSchedulerStartupDependencies {
  signalIngestionRepository?: Pick<SignalIngestionRepository, 'getLastSuccessfulObservedAtBySource'>
  sourceCadenceRepository?: Pick<SourceCadenceRepository, 'listEnabled'>
  scheduler?: Pick<AgronautasSignalScheduler, 'tick'>
  dispatchCapability?: {
    dispatcher: ScheduledWindowDispatcher
    workerCapabilityProven: boolean
  }
  schedulerLock?: ScheduledWindowLock
  now?: () => Date
  setInterval?: typeof setInterval
  clearInterval?: typeof clearInterval
}

export function startAgronautasSchedulerFromEnv(env: NodeJS.ProcessEnv = process.env, dependencies: AgronautasSchedulerStartupDependencies = {}) {
  const requested = getAgronautasRuntimeConfig(env).schedulerEnabled
  const capability = dependencies.dispatchCapability
  const enabled = requested && Boolean(capability?.workerCapabilityProven && capability.dispatcher)
  const signalIngestionRepository = dependencies.signalIngestionRepository ?? new PostgresSignalIngestionRepository()
  const sourceCadenceRepository = dependencies.sourceCadenceRepository ?? new PostgresSourceCadenceRepository()
  const lock = dependencies.schedulerLock ?? new RedisSchedulerWindowLock()
  const runtime = createAgronautasSchedulerRuntime({
    enabled,
    scheduler: dependencies.scheduler ?? new AgronautasSignalScheduler(
      lock,
      capability?.dispatcher ?? {
        async enqueue(window: SourceWindow) {
          logger.info({ runId: window.runId, provider: window.provider, signalType: window.signalType }, 'Agronautas scheduler due window planned')
        },
        async deadLetter(window: SourceWindow, error: Error) {
          logger.error({ runId: window.runId, error: error.message }, 'Agronautas scheduler enqueue failed')
        },
      },
    ),
    cadences: undefined,
    getLastSuccess: async () => signalIngestionRepository.getLastSuccessfulObservedAtBySource?.() ?? new Map(),
    getCadences: async () => sourceCadenceRepository.listEnabled(),
    now: dependencies.now,
    setInterval: dependencies.setInterval,
    clearInterval: dependencies.clearInterval,
  })
  if (requested && !enabled) {
    logger.warn({ reason: AGRONAUTAS_SCHEDULER_UNAVAILABLE_REASON }, 'Agronautas scheduler disabled because queue/worker dispatch capability is unavailable')
  }
  return Object.assign(runtime, {
    status: enabled ? 'enabled' as const : requested ? 'unavailable' as const : 'disabled' as const,
    reason: enabled ? null : requested ? AGRONAUTAS_SCHEDULER_UNAVAILABLE_REASON : 'scheduler_disabled',
  })
}

export function startAgronautasAuthBootstrapFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<AgronautasAuthBootstrapResult> {
  return runAgronautasAuthBootstrapFromEnv(env)
}

export function startHydrologySchedulerFromEnv(env: NodeJS.ProcessEnv, deps: HydrologySchedulerStartupDeps = {}): Pick<HydrologyIngestionScheduler, 'start'> | null {
  if (env['HYDROLOGY_SCHEDULER_ENABLED'] !== 'true' || env['RENDER'] === 'true') {
    logger.info({ enabled: false }, 'Hydrology ingestion scheduler disabled')
    return null
  }

  const ingestionCoordinator = deps.ingestionCoordinator ?? createHydrologyIngestionCoordinator(deps.ingestionRunner ?? createGovernmentIngestionRunner())
  const schedulerRunner: HydrologyIngestionRunner = {
    async run(source, metadata) {
      const result = await ingestionCoordinator.run({ source: toGovernmentHydrologySource(source), reason: `scheduler:${source}:attempt-${metadata.attempt}`, proofRunId: metadata.proofRunId, runId: `scheduled-${metadata.scheduledSlot}`, scheduledSlot: metadata.scheduledSlot, leaseOwner: metadata.ownerId }, `scheduler:${metadata.scheduledSlot}`)
      const sourceResult = result.results?.find((item) => item.source === source)
      return { inserted: sourceResult?.recordsIngested ?? 0, unchanged: 0 }
    },
  }
  const scheduler = deps.schedulerFactory?.(schedulerRunner) ?? new HydrologyIngestionScheduler(schedulerRunner, {
    ownerId: deps.ownerId,
    onBackgroundError: (error, metadata) => logger.error({ error, ...metadata }, 'Hydrology scheduler background ingestion failed'),
    onRunResult: ({ source, attempt, scheduledFor, result }) => logger.info({ source, attempt, scheduledFor, ...result }, 'Hydrology scheduler ingestion result'),
  })
  scheduler.start()
  logger.info({ enabled: true }, 'Hydrology ingestion scheduler started')
  return scheduler
}

function toGovernmentHydrologySource(source: HydrologyIngestionSource): HydrologySource {
  return source
}
