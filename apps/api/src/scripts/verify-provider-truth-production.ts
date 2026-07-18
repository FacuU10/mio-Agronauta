import { Client } from 'pg'
import Redis from 'ioredis'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { RealProviderEvidencePort } from '../infrastructure/config/provider-matrix'
import { closePostgresPool } from '../infrastructure/database/postgres/pool'
import { disconnectRedis } from '../infrastructure/database/redis/client'

async function main(): Promise<void> {
  const dbUrl = process.env['DATABASE_URL']
  const redisUrl = process.env['REDIS_URL']

  if (!dbUrl || !redisUrl) {
    console.error('DATABASE_URL and REDIS_URL are required')
    process.exit(1)
  }

  console.log('Starting Slice 3 Provider-Truth & Integration Verification...')

  // 1. Verify Postgres Connection
  const pgClient = new Client({ connectionString: dbUrl })
  let pgConnected = false
  let tableCount = 0

  try {
    await pgClient.connect()
    pgConnected = true
    console.log('Postgres connected to Neon database successfully!')

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
  } finally {
    await redis.quit()
  }

  // 3. Test ProviderEvidencePort on the Live DB (Mock-over-Live Prevention)
  const port = new RealProviderEvidencePort()
  
  // Test default mode (should resolve to seam or unavailable depending on DB runs, never live/mock without proof)
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'real'
  const defaultEvidence = await port.getEvidence('open-meteo', 'climate')
  console.log('Default Evidence:', defaultEvidence)

  // Test override injection (unreachable/slow provider tracking)
  process.env['PROVIDER_MODE_OPEN_METEO'] = 'unavailable'
  const injectedEvidence = await port.getEvidence('open-meteo', 'climate')
  console.log('Injected (degraded) Evidence:', injectedEvidence)

  // Clean up override before mock test
  delete process.env['PROVIDER_MODE_OPEN_METEO']

  // Test mock mode
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'demo'
  const demoEvidence = await port.getEvidence('open-meteo', 'climate')
  console.log('Demo/Mock Evidence:', demoEvidence)

  // Clean up env
  delete process.env['AGRONAUTAS_RUNTIME_MODE']

  // 4. Record verify receipt
  const receipt = {
    verifier: 'agronautas-slice3-verify-receipt-v1',
    timestamp: new Date().toISOString(),
    postgres: {
      connected: pgConnected,
      tableCount
    },
    redis: {
      connected: redisConnected,
      ping: redisPingResult
    },
    providerEvidencePortTest: {
      defaultEvidenceMode: defaultEvidence.mode,
      defaultProofRef: defaultEvidence.proofRef,
      injectedDegradedEvidenceMode: injectedEvidence.mode,
      injectedDegradedReasons: injectedEvidence.degradationReasons,
      demoEvidenceMode: demoEvidence.mode
    },
    mockOverLivePreventionVerified: defaultEvidence.mode !== 'mock' && demoEvidence.mode === 'mock',
    passed: pgConnected && redisConnected && defaultEvidence.mode !== 'mock' && injectedEvidence.mode === 'unavailable'
  }

  const outPath = resolve(__dirname, '../../../../artifacts/agronautas-slice3-verify-receipt.json')
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  console.log(`Saved verification evidence to ${outPath}`)

  await closePostgresPool()
  await disconnectRedis()

  if (!receipt.passed) {
    console.error('Verification failed!')
    process.exit(1)
  }
  console.log('Verification passed successfully!')
}

main().catch((error) => {
  console.error('Unhandled exception during verification:', error)
  process.exit(1)
})
