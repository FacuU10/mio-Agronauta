import { Router, Request, Response } from 'express'
import { checkPostgres } from '../../infrastructure/database/postgres/pool'
import { checkMongoDB } from '../../infrastructure/database/mongodb/connection'
import { checkRedis } from '../../infrastructure/database/redis/client'
import { getAgronautasRuntimeConfig } from '../../infrastructure/config/agronautas-runtime'

export const healthRouter: Router = Router()

healthRouter.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

healthRouter.get('/ready', async (req: Request, res: Response) => {
  try {
    const [postgresOk, mongoOk, redisOk] = await Promise.all([
      checkPostgres(),
      checkMongoDB(),
      checkRedis(),
    ])

    const config = getAgronautasRuntimeConfig()
    const optionalServices = new Set(config.optionalReadinessServices)
    const requiredChecks = {
      postgres: postgresOk,
      mongodb: mongoOk,
      redis: redisOk,
    }

    const ready = Object.entries(requiredChecks).every(([service, ok]) => optionalServices.has(service) || ok)

    res.status(ready ? 200 : 503).json({
      ready,
      mode: config.mode,
      routePrefix: config.routePrefix,
      checks: {
        postgres: postgresOk,
        mongodb: mongoOk,
        redis: redisOk,
      },
      optionalChecks: [...optionalServices],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
})
