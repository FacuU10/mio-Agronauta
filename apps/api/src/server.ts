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
}
