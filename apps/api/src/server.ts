import express, { Application } from 'express'
import dotenv from 'dotenv'
import { helmetMiddleware } from './presentation/middleware/helmet'
import { rateLimitMiddleware } from './presentation/middleware/rate-limit'
import { corsMiddleware } from './presentation/middleware/cors'
import { healthRouter } from './presentation/routes/health'
import { createAgronautasRouter } from './presentation/routes/agronautas'
import { getAgronautasRuntimeConfig } from './infrastructure/config/agronautas-runtime'

dotenv.config()

const PORT = process.env['API_PORT'] || 3001

export function createApp(): Application {
  const app = express()
  const runtimeConfig = getAgronautasRuntimeConfig()

  app.set('trust proxy', runtimeConfig.trustProxy)

  // Security middleware
  app.use(helmetMiddleware)
  app.use(corsMiddleware)
  app.use(rateLimitMiddleware)

  // Body parsing
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Routes
  app.use(healthRouter)
  app.use(runtimeConfig.routePrefix, healthRouter)
  app.use(runtimeConfig.routePrefix, createAgronautasRouter())
  app.use(`${runtimeConfig.routePrefix}/v1`, createAgronautasRouter({ isVersionedNamespace: true }))

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' })
  })

  return app
}

export function startServer(): void {
  const app = createApp()

  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`)
  })
}
