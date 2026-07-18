import { Client } from 'pg'
import Redis from 'ioredis'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { RedisSchedulerWindowLock } from '../infrastructure/database/redis/scheduler-lock'
import { SourceWindow } from '../infrastructure/jobs/agronautas-scheduler'
import { closePostgresPool } from '../infrastructure/database/postgres/pool'
import { disconnectRedis } from '../infrastructure/database/redis/client'

async function main(): Promise<void> {
  const dbUrl = process.env['DATABASE_URL']
  const redisUrl = process.env['REDIS_URL']

  if (!dbUrl || !redisUrl) {
    console.error('DATABASE_URL and REDIS_URL are required')
    process.exit(1)
  }

  console.log('Starting verification...')

  // 1. Verify Postgres Connection
  const pgClient = new Client({ connectionString: dbUrl })
  let pgConnected = false
  let migrationStatus: any[] = []
  let tableCount = 0

  try {
    await pgClient.connect()
    pgConnected = true
    console.log('Postgres connected successfully!')

    // Query migrations to verify schema matches
    const migrationRes = await pgClient.query("SELECT id, migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5")
    migrationStatus = migrationRes.rows
    console.log('Latest migrations:', migrationStatus)

    // Check tables
    const tablesRes = await pgClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    tableCount = tablesRes.rowCount || 0
    console.log(`Found ${tableCount} tables in public schema`)
  } catch (err: any) {
    console.error('Postgres connection/query failed:', err.message)
  } finally {
    await pgClient.end()
  }

  // 2. Verify Redis Connection
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 })
  let redisConnected = false
  let redisPingResult = ''

  try {
    redisPingResult = await redis.ping()
    redisConnected = redisPingResult === 'PONG'
    console.log('Redis connected successfully, ping:', redisPingResult)
  } catch (err: any) {
    console.error('Redis connection failed:', err.message)
  }

  // 3. Verify Scheduler Lock functioning
  let lockAcquired = false
  let lockReleased = false
  const uniqueId = `verify-${Date.now()}`
  const testWindow: SourceWindow = {
    provider: 'open-meteo',
    signalType: 'climate',
    windowStart: new Date(),
    windowEnd: new Date(Date.now() + 3600000),
    runId: `verify-window:${uniqueId}`
  }

  try {
    const lock = new RedisSchedulerWindowLock()
    lockAcquired = await lock.acquireWindow(testWindow, 120)
    console.log('Lock acquired:', lockAcquired)

    if (lockAcquired) {
      await lock.releaseWindow(testWindow)
      lockReleased = true
      console.log('Lock released successfully')
    }
  } catch (err: any) {
    console.error('Scheduler lock verification failed:', err.message)
  } finally {
    await redis.quit()
  }

  // 4. Save evidence to artifacts
  const receipt = {
    verifier: 'agronautas-slice2-verify-receipt-v1',
    timestamp: new Date().toISOString(),
    postgres: {
      connected: pgConnected,
      latestMigrations: migrationStatus,
      tableCount
    },
    redis: {
      connected: redisConnected,
      ping: redisPingResult
    },
    schedulerLock: {
      testRunId: testWindow.runId,
      acquired: lockAcquired,
      released: lockReleased
    },
    passed: pgConnected && redisConnected && lockAcquired && lockReleased
  }

  const outPath = resolve(process.cwd(), '../../artifacts/agronautas-slice2-verify-receipt.json')
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  console.log(`Saved verification evidence to ${outPath}`)

  await closePostgresPool()
  await disconnectRedis()

  if (!receipt.passed) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unhandled exception during verification:', error)
  process.exit(1)
})
