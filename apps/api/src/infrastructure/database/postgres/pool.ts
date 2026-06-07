import os from 'os'
import { Pool, PoolConfig } from 'pg'
import { logger } from '../../observability/logger'

let pool: Pool

export function resolveApiWorkerCount(env: NodeJS.ProcessEnv = process.env, cpuCount = os.cpus().length): number {
  if (env['NODE_ENV'] !== 'production') return 1
  return Number.isInteger(cpuCount) && cpuCount > 0 ? cpuCount : 1
}

export function computePostgresPoolMax(numWorkers: number, rawMax = process.env['DATABASE_POOL_MAX']): number {
  const workers = Number.isInteger(numWorkers) && numWorkers > 0 ? numWorkers : 1
  const configuredPoolBudget = rawMax ? parseInt(rawMax, 10) : 20
  const poolBudget = Number.isInteger(configuredPoolBudget) && configuredPoolBudget > 0 ? configuredPoolBudget : 20

  return Math.max(5, Math.floor(poolBudget / workers))
}

function createPool(): Pool {
  const config: PoolConfig = {
    connectionString: process.env['DATABASE_URL'],
    max: computePostgresPoolMax(resolveApiWorkerCount()),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }

  return new Pool(config)
}

export function getPostgresPool(): Pool {
  if (!pool) {
    pool = createPool()

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle PostgreSQL client')
    })
  }
  return pool
}

export async function checkPostgres(): Promise<boolean> {
  try {
    const pool = getPostgresPool()
    const result = await pool.query('SELECT 1')
    return result.rowCount === 1
  } catch (error) {
    logger.error({ err: error }, 'PostgreSQL health check failed')
    return false
  }
}

export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end()
  }
}
