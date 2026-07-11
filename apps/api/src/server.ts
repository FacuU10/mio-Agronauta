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
import { createGovernmentIngestionRunner, createHydrologyGovernmentRouter } from './presentation/routes/hydrology-government'
import { getAgronautasRuntimeConfig } from './infrastructure/config/agronautas-runtime'
import { HydrologyIngestionScheduler, type HydrologyIngestionRunner, type HydrologyIngestionSource } from './infrastructure/jobs/hydrology-ingestion-scheduler'
import type { HydrologySource } from '@repo/zod-schemas'

dotenv.config()

const PORT = process.env['API_PORT'] || 3001

interface HydrologySchedulerStartupDeps {
  ingestionRunner?: (input: { source?: HydrologySource; reason?: string }) => Promise<{ runId: string; status: 'queued' | 'started' | 'completed'; sources: HydrologySource[] }>
  schedulerFactory?: (runner: HydrologyIngestionRunner) => Pick<HydrologyIngestionScheduler, 'start'>
}

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

  startHydrologySchedulerFromEnv(process.env)
}

export function startHydrologySchedulerFromEnv(env: NodeJS.ProcessEnv, deps: HydrologySchedulerStartupDeps = {}): Pick<HydrologyIngestionScheduler, 'start'> | null {
  if (env['HYDROLOGY_SCHEDULER_ENABLED'] !== 'true') {
    logger.info({ enabled: false }, 'Hydrology ingestion scheduler disabled')
    return null
  }

  const ingestionRunner = deps.ingestionRunner ?? createGovernmentIngestionRunner()
  const schedulerRunner: HydrologyIngestionRunner = {
    async run(source, metadata) {
      await ingestionRunner({ source: toGovernmentHydrologySource(source), reason: `scheduler:${source}:attempt-${metadata.attempt}` })
      return { inserted: 0, unchanged: 0 }
    },
  }
  const scheduler = deps.schedulerFactory?.(schedulerRunner) ?? new HydrologyIngestionScheduler(schedulerRunner, {
    onBackgroundError: (error, metadata) => logger.error({ error, ...metadata }, 'Hydrology scheduler background ingestion failed'),
  })
  scheduler.start()
  logger.info({ enabled: true }, 'Hydrology ingestion scheduler started')
  return scheduler
}

function toGovernmentHydrologySource(source: HydrologyIngestionSource): HydrologySource {
  if (source === 'SMN_ALERTS' || source === 'SMN_RAINFALL') return 'SMN'
  return source
}
