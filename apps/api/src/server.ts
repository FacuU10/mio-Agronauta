import 'express-async-errors'
import express, { Application } from 'express'
import dotenv from 'dotenv'
import { globalErrorHandler, notFoundHandler } from './presentation/middleware/error-handler'
import { httpLogger, logger } from './infrastructure/observability/logger'
import { helmetMiddleware } from './presentation/middleware/helmet'
import { createRateLimitMiddleware } from './presentation/middleware/rate-limit'
import { corsMiddleware } from './presentation/middleware/cors'
import { healthRouter } from './presentation/routes/health'
import { createAgronautasRouter } from './presentation/routes/agronautas'
import { createHydrologyGovernmentRouter } from './presentation/routes/hydrology-government'
import { getAgronautasRuntimeConfig } from './infrastructure/config/agronautas-runtime'
import { AgronautasSignalScheduler, createAgronautasSchedulerRuntime, type SourceWindow } from './infrastructure/jobs/agronautas-scheduler'
import { PostgresSignalIngestionRepository } from './infrastructure/database/postgres/agronautas-signal-ingestion-repository'
import { PostgresSourceCadenceRepository } from './infrastructure/database/postgres/agronautas-source-cadence-repository'
import type { SignalIngestionRepository, SourceCadenceRepository } from './domain/repositories/agronautas'

dotenv.config()

const PORT = process.env['API_PORT'] || 3001

export function createApp(): Application {
  const app = express()
  const runtimeConfig = getAgronautasRuntimeConfig()

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
  app.use('/api/hydrology', createHydrologyGovernmentRouter())
  app.use(runtimeConfig.routePrefix, healthRouter)
  app.use(runtimeConfig.routePrefix, createAgronautasRouter())
  app.use(`${runtimeConfig.routePrefix}/v1`, createAgronautasRouter({ isVersionedNamespace: true }))

  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

export function startServer(): void {
  const app = createApp()

  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'API server listening')
  })

  startAgronautasSchedulerFromEnv()
}

interface AgronautasSchedulerStartupDependencies {
  signalIngestionRepository?: Pick<SignalIngestionRepository, 'getLastSuccessfulObservedAtBySource'>
  sourceCadenceRepository?: Pick<SourceCadenceRepository, 'listEnabled'>
  scheduler?: Pick<AgronautasSignalScheduler, 'tick'>
  now?: () => Date
  setInterval?: typeof setInterval
  clearInterval?: typeof clearInterval
}

export function startAgronautasSchedulerFromEnv(env: NodeJS.ProcessEnv = process.env, dependencies: AgronautasSchedulerStartupDependencies = {}) {
  const enabled = env['AGRONAUTAS_SCHEDULER_ENABLED'] === 'true'
  const signalIngestionRepository = dependencies.signalIngestionRepository ?? new PostgresSignalIngestionRepository()
  const sourceCadenceRepository = dependencies.sourceCadenceRepository ?? new PostgresSourceCadenceRepository()
  return createAgronautasSchedulerRuntime({
    enabled,
    scheduler: dependencies.scheduler ?? new AgronautasSignalScheduler(
      { async acquireWindow() { return enabled } },
      { async enqueue(window: SourceWindow) { logger.info({ runId: window.runId, provider: window.provider, signalType: window.signalType }, 'Agronautas scheduler due window planned') }, async deadLetter(window: SourceWindow, error: Error) { logger.error({ runId: window.runId, error: error.message }, 'Agronautas scheduler enqueue failed') } },
    ),
    cadences: undefined,
    getLastSuccess: async () => signalIngestionRepository.getLastSuccessfulObservedAtBySource?.() ?? new Map(),
    getCadences: async () => sourceCadenceRepository.listEnabled(),
    now: dependencies.now,
    setInterval: dependencies.setInterval,
    clearInterval: dependencies.clearInterval,
  })
}
