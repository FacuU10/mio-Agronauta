import { Router, Request, Response } from 'express'
import { checkPostgres } from '../../infrastructure/database/postgres/pool'
import { checkMongoDB } from '../../infrastructure/database/mongodb/connection'
import { checkRedis } from '../../infrastructure/database/redis/client'
import { getAgronautasRuntimeConfig } from '../../infrastructure/config/agronautas-runtime'
import { PostgresAgronautasRuntimeReadinessRepository } from '../../infrastructure/database/postgres/agronautas-runtime-readiness-repository'

interface HealthRouterDeps {
  checkPostgres: () => Promise<boolean>
  checkMongoDB: () => Promise<boolean>
  checkRedis: () => Promise<boolean>
  getConfig: typeof getAgronautasRuntimeConfig
  getWorkerReadiness: (maxHeartbeatAgeSeconds: number) => Promise<Awaited<ReturnType<PostgresAgronautasRuntimeReadinessRepository['getWorkerReadiness']>> | null>
}

export function createHealthRouter(deps: Partial<HealthRouterDeps> = {}): Router {
  const router = Router()
  const workerReadinessRepository = new PostgresAgronautasRuntimeReadinessRepository()
  const resolved: HealthRouterDeps = {
    checkPostgres,
    checkMongoDB,
    checkRedis,
    getConfig: getAgronautasRuntimeConfig,
    getWorkerReadiness: async (maxHeartbeatAgeSeconds) => workerReadinessRepository.getWorkerReadiness(maxHeartbeatAgeSeconds),
    ...deps,
  }

  router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  router.get('/ready', async (req: Request, res: Response) => {
    try {
      const config = resolved.getConfig()
      const [postgresOk, mongoOk, redisOk, worker] = await Promise.all([
        resolved.checkPostgres(),
        resolved.checkMongoDB(),
        resolved.checkRedis(),
        config.runtimeRequired
          ? resolved.getWorkerReadiness(config.workerHeartbeatMaxAgeSeconds)
          : Promise.resolve(null),
      ])

      const optionalServices = new Set(config.optionalReadinessServices)
      const dependencyChecks = {
        postgres: postgresOk,
        redis: redisOk,
        mongodb: mongoOk,
        worker: config.runtimeRequired ? worker?.workerHealthy ?? false : true,
      }

      const requiredChecks = {
        postgres: dependencyChecks.postgres,
        redis: dependencyChecks.redis,
        worker: dependencyChecks.worker,
      }

      const ready = Object.values(requiredChecks).every(Boolean)
      const degraded = Object.entries(dependencyChecks)
        .filter(([service, ok]) => optionalServices.has(service) && !ok)
        .map(([service]) => service)

      res.status(ready ? 200 : 503).json({
        ready,
        mode: config.mode,
        routePrefix: config.routePrefix,
        checks: dependencyChecks,
        requiredChecks,
        optionalChecks: [...optionalServices],
        degraded,
        worker: config.runtimeRequired
          ? {
              required: true,
              healthy: worker?.workerHealthy ?? false,
              latestHeartbeatAt: worker?.latestHeartbeatAt ?? null,
              latestLeaseExpiresAt: worker?.latestLeaseExpiresAt ?? null,
              latestJobId: worker?.latestJobId ?? null,
              latestRunId: worker?.latestRunId ?? null,
              heartbeatMaxAgeSeconds: config.workerHeartbeatMaxAgeSeconds,
            }
          : {
              required: false,
              healthy: worker?.workerHealthy ?? null,
              latestHeartbeatAt: worker?.latestHeartbeatAt ?? null,
              latestLeaseExpiresAt: worker?.latestLeaseExpiresAt ?? null,
              latestJobId: worker?.latestJobId ?? null,
              latestRunId: worker?.latestRunId ?? null,
              heartbeatMaxAgeSeconds: config.workerHeartbeatMaxAgeSeconds,
            },
        capabilities: {
          mongodb: {
            required: !optionalServices.has('mongodb'),
            healthy: mongoOk,
            status: mongoOk ? 'available' : 'optional_degraded',
            note: 'Mongo se preserva como capacidad futura y no bloquea el MVP Agronautas por defecto.',
          },
        },
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

  return router
}

export const healthRouter: Router = createHealthRouter()
