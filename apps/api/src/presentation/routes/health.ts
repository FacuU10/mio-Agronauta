import { Router, Request, Response } from 'express'
import { checkPostgres, getPostgresPool } from '../../infrastructure/database/postgres/pool'
import { checkMongoDB } from '../../infrastructure/database/mongodb/connection'
import { checkRedis } from '../../infrastructure/database/redis/client'
import { getAgronautasRuntimeConfig } from '../../infrastructure/config/agronautas-runtime'
import { PostgresAgronautasRuntimeReadinessRepository } from '../../infrastructure/database/postgres/agronautas-runtime-readiness-repository'

export const READINESS_DEPENDENCY_TIMEOUT_MS = 2000
const WORKER_STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  NOT_CONFIGURED: 'not_configured',
} as const

type WorkerStatus = (typeof WORKER_STATUS)[keyof typeof WORKER_STATUS]

export interface ReadinessDependencyResult {
  service: string
  ok: boolean
  timedOut: boolean
  error?: string
}

interface HealthRouterDeps {
  checkPostgres: () => Promise<boolean>
  checkPostGIS: () => Promise<boolean>
  checkMigrations: () => Promise<boolean>
  checkMongoDB: () => Promise<boolean>
  checkRedis: () => Promise<boolean>
  getConfig: typeof getAgronautasRuntimeConfig
  getWorkerReadiness: (maxHeartbeatAgeSeconds: number) => Promise<Awaited<ReturnType<PostgresAgronautasRuntimeReadinessRepository['getWorkerReadiness']>> | null>
  readinessTimeoutMs: number
}

type WorkerReadiness = Awaited<ReturnType<PostgresAgronautasRuntimeReadinessRepository['getWorkerReadiness']>>

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

async function checkPostGIS(): Promise<boolean> {
  try {
    const result = await getPostgresPool().query('SELECT PostGIS_Version()')
    return result.rowCount === 1
  } catch {
    return false
  }
}

async function checkMigrations(): Promise<boolean> {
  try {
    const result = await getPostgresPool().query(
      `SELECT COUNT(*)::int AS pending
         FROM _prisma_migrations
        WHERE finished_at IS NULL
          AND rolled_back_at IS NULL`,
    )
    return result.rowCount === 1 && Number(result.rows[0]?.pending ?? 1) === 0
  } catch {
    return false
  }
}

async function withWorkerReadinessTimeout(
  check: () => Promise<WorkerReadiness | null>,
  timeoutMs: number,
): Promise<WorkerReadiness | null> {
  let timeout: NodeJS.Timeout | undefined

  try {
    const timeoutResult = new Promise<null>((resolve) => {
      timeout = setTimeout(() => resolve(null), timeoutMs)
    })
    return await Promise.race([check(), timeoutResult])
  } catch {
    return null
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function isWorkerHeartbeatFresh(worker: WorkerReadiness | null, maxHeartbeatAgeSeconds: number): boolean {
  if (!worker?.workerHealthy || !worker.latestHeartbeatAt) return false

  const heartbeatAt = Date.parse(worker.latestHeartbeatAt)
  if (!Number.isFinite(heartbeatAt)) return false

  const ageMs = Date.now() - heartbeatAt
  if (ageMs <= maxHeartbeatAgeSeconds * 1000) return true

  const leaseExpiresAt = worker.latestLeaseExpiresAt ? Date.parse(worker.latestLeaseExpiresAt) : Number.NaN
  if (Number.isFinite(leaseExpiresAt) && leaseExpiresAt >= heartbeatAt) {
    const leaseWindowMs = leaseExpiresAt - heartbeatAt
    if (leaseWindowMs > Math.max(maxHeartbeatAgeSeconds * 2 * 1000, 300_000)) return false
  }

  return true
}

export function createHealthRouter(deps: Partial<HealthRouterDeps> = {}): Router {
  const router = Router()
  const workerReadinessRepository = new PostgresAgronautasRuntimeReadinessRepository()
  const resolved: HealthRouterDeps = {
    checkPostgres,
    checkPostGIS,
    checkMigrations,
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
      const topologyChecksRequired = config.runtimeRequired
        && (deps.checkPostGIS !== undefined || deps.checkMigrations !== undefined || process.env['NODE_ENV'] === 'production')
      const dependencyResults = await Promise.all([
        withReadinessTimeout('postgres', resolved.checkPostgres, resolved.readinessTimeoutMs),
        config.runtimeRequired
          ? withReadinessTimeout('postgis', resolved.checkPostGIS, resolved.readinessTimeoutMs)
          : Promise.resolve({ service: 'postgis', ok: false, timedOut: false, error: 'postgis readiness is not configured' }),
        config.runtimeRequired
          ? withReadinessTimeout('migrations', resolved.checkMigrations, resolved.readinessTimeoutMs)
          : Promise.resolve({ service: 'migrations', ok: false, timedOut: false, error: 'migrations readiness is not configured' }),
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
          ? withWorkerReadinessTimeout(() => resolved.getWorkerReadiness(config.workerHeartbeatMaxAgeSeconds), resolved.readinessTimeoutMs)
          : Promise.resolve(null),
      ])

      const [postgres, postgis, migrations, mongo, redis, worker] = dependencyResults

      const heartbeatFresh = config.runtimeRequired
        ? isWorkerHeartbeatFresh(worker, config.workerHeartbeatMaxAgeSeconds)
        : false
      const workerHealthy = config.runtimeRequired
        ? Boolean(worker?.workerHealthy && heartbeatFresh)
        : false

      const dependencyChecks = {
        postgres: postgres.ok,
        redis: redis.ok,
        postgis: postgis.ok,
        migrations: migrations.ok,
        mongodb: mongo.ok,
        worker: workerHealthy,
      }

      const requiredChecks = {
        ...(config.maintenanceMode ? { maintenance: false } : {}),
        postgres: dependencyChecks.postgres,
        redis: dependencyChecks.redis,
        ...(topologyChecksRequired
          ? { postgis: dependencyChecks.postgis, migrations: dependencyChecks.migrations }
          : {}),
        ...(config.runtimeRequired ? { worker: dependencyChecks.worker } : {}),
      }

      const ready = Object.values(requiredChecks).every(Boolean)
      const failedRequiredChecks = Object.entries(requiredChecks)
        .filter(([, ok]) => !ok)
        .map(([service]) => service)
      const degraded = Object.entries(dependencyChecks)
        .filter(([service, ok]) => optionalServices.has(service) && !ok)
        .map(([service]) => service)

      const workerStatus: WorkerStatus = !config.runtimeRequired
        ? WORKER_STATUS.NOT_CONFIGURED
        : workerHealthy ? WORKER_STATUS.AVAILABLE : WORKER_STATUS.UNAVAILABLE
      const workerDetails = {
        required: config.runtimeRequired,
        healthy: config.runtimeRequired ? workerHealthy : null,
        status: workerStatus,
        durableCapability: config.runtimeRequired
          ? worker?.durableCapability ?? (workerHealthy ? 'available' : 'unavailable')
          : 'not_configured',
        reason: workerHealthy
          ? undefined
          : config.runtimeRequired
            ? worker?.workerHealthy && !heartbeatFresh ? 'worker_heartbeat_stale' : 'worker_heartbeat_not_available'
            : 'worker_not_configured',
        latestHeartbeatAt: worker?.latestHeartbeatAt ?? null,
        latestLeaseExpiresAt: worker?.latestLeaseExpiresAt ?? null,
        latestJobId: worker?.latestJobId ?? null,
        latestRunId: worker?.latestRunId ?? null,
        heartbeatMaxAgeSeconds: config.workerHeartbeatMaxAgeSeconds,
        ...(config.runtimeRequired ? { heartbeatFresh } : {}),
      }

      res.status(ready ? 200 : 503).json({
        ready,
        maintenance: config.maintenanceMode
          ? { enabled: true, reason: 'maintenance_mode' }
          : { enabled: false },
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
          postgis,
          migrations,
          redis,
          mongodb: mongo,
        },
        worker: workerDetails,
        scheduler: config.schedulerEnabled
          ? { enabled: true, status: 'unverified' as const }
          : { enabled: false, status: 'disabled' as const, reason: 'scheduler-disabled' },
        processor: { status: 'not_configured' as const, reason: 'processor_not_configured' },
        capabilities: {
          mongodb: {
            required: false,
            healthy: mongo.ok,
            status: mongo.ok ? 'available' : mongoEnabled ? 'optional_degraded' : 'not_configured',
            note: mongoEnabled
              ? 'MongoDB está habilitado explícitamente para readiness.'
              : 'MongoDB no está habilitado para readiness; no se intentó conexión.',
          },
          scheduler: config.schedulerEnabled
            ? { enabled: true, status: 'unverified' as const }
            : { enabled: false, status: 'disabled' as const, reason: 'scheduler-disabled' },
          processor: { status: 'not_configured' as const, reason: 'processor_not_configured' },
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
