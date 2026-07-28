import { Router, Request, Response } from 'express'
import { checkPostgres } from '../../infrastructure/database/postgres/pool'
import { checkMongoDB } from '../../infrastructure/database/mongodb/connection'
import { checkRedis } from '../../infrastructure/database/redis/client'
import { getAgronautasRuntimeConfig } from '../../infrastructure/config/agronautas-runtime'
import { PostgresAgronautasRuntimeReadinessRepository } from '../../infrastructure/database/postgres/agronautas-runtime-readiness-repository'

export const READINESS_DEPENDENCY_TIMEOUT_MS = 2000

export interface ReadinessDependencyResult {
  service: string
  ok: boolean
  timedOut: boolean
  error?: string
}

interface HealthRouterDeps {
  checkPostgres: () => Promise<boolean>
  checkMongoDB: () => Promise<boolean>
  checkRedis: () => Promise<boolean>
  getConfig: typeof getAgronautasRuntimeConfig
  getWorkerReadiness: (maxHeartbeatAgeSeconds: number) => Promise<Awaited<ReturnType<PostgresAgronautasRuntimeReadinessRepository['getWorkerReadiness']>> | null>
  readinessTimeoutMs: number
}

export async function withReadinessTimeout(
  service: string,
  check: () => Promise<boolean>,
  timeoutMs = READINESS_DEPENDENCY_TIMEOUT_MS,
): Promise<ReadinessDependencyResult> {
  let timeout: NodeJS.Timeout | undefined

  try {
    const timeoutResult = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`${service} readiness check timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    const ok = await Promise.race([check(), timeoutResult])
    return { service, ok: ok === true, timedOut: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown readiness check error'
    return {
      service,
      ok: false,
      timedOut: message.includes('timed out'),
      error: message.includes('timed out') ? message : `${service} readiness check failed`,
    }
  } finally {
    if (timeout) clearTimeout(timeout)
  }
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
    readinessTimeoutMs: getAgronautasRuntimeConfig().readinessDependencyTimeoutMs,
    ...deps,
  }

  router.get('/health', (req: Request, res: Response) => {
    const config = resolved.getConfig()
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), revision: config.revision })
  })

  router.get('/ready', async (req: Request, res: Response) => {
    try {
      const config = resolved.getConfig()
      const optionalServices = new Set(config.optionalReadinessServices)
      const mongoEnabled = optionalServices.has('mongodb')
      const [postgres, mongo, redis, worker] = await Promise.all([
        withReadinessTimeout('postgres', resolved.checkPostgres, resolved.readinessTimeoutMs),
        mongoEnabled
          ? withReadinessTimeout('mongodb', resolved.checkMongoDB, resolved.readinessTimeoutMs)
          : Promise.resolve({
              service: 'mongodb',
              ok: false,
              timedOut: false,
              error: 'mongodb readiness is not configured',
            }),
        withReadinessTimeout('redis', resolved.checkRedis, resolved.readinessTimeoutMs),
        config.runtimeRequired
          ? resolved.getWorkerReadiness(config.workerHeartbeatMaxAgeSeconds)
          : Promise.resolve(null),
      ])

      const dependencyChecks = {
        postgres: postgres.ok,
        redis: redis.ok,
        mongodb: mongo.ok,
        worker: config.runtimeRequired ? worker?.workerHealthy ?? false : true,
      }

      const requiredChecks = {
        postgres: dependencyChecks.postgres,
        redis: dependencyChecks.redis,
        worker: dependencyChecks.worker,
      }

      const ready = Object.values(requiredChecks).every(Boolean)
      const failedRequiredChecks = Object.entries(requiredChecks)
        .filter(([, ok]) => !ok)
        .map(([service]) => service)
      const degraded = Object.entries(dependencyChecks)
        .filter(([service, ok]) => optionalServices.has(service) && !ok)
        .map(([service]) => service)

      res.status(ready ? 200 : 503).json({
        ready,
        revision: config.revision,
        mode: config.mode,
        routePrefix: config.routePrefix,
        checks: dependencyChecks,
        requiredChecks,
        failedRequiredChecks,
        optionalChecks: [...optionalServices],
        degraded,
        checkDetails: {
          postgres,
          redis,
          mongodb: mongo,
        },
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
            required: false,
            healthy: mongo.ok,
            status: mongo.ok ? 'available' : mongoEnabled ? 'optional_degraded' : 'not_configured',
            note: mongoEnabled
              ? 'MongoDB está habilitado explícitamente para readiness.'
              : 'MongoDB no está habilitado para readiness; no se intentó conexión.',
          },
        },
        timestamp: new Date().toISOString(),
      })
    } catch {
      res.status(503).json({
        ready: false,
        revision: null,
        error: 'Readiness check failed',
        timestamp: new Date().toISOString(),
      })
    }
  })

  return router
}

export const healthRouter: Router = createHealthRouter()
