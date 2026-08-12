import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import dotenv from 'dotenv'
import { HydrologyIngestionScheduler, type HydrologyIngestionRunner, type HydrologyIngestionSource } from '../infrastructure/jobs/hydrology-ingestion-scheduler.js'
import { createGovernmentIngestionRunner } from '../presentation/routes/hydrology-government.js'

const SOURCES: HydrologyIngestionSource[] = ['PNA', 'INA', 'INMET', 'SMN']
const DEFAULT_OUT = '../../artifacts/hydrology-scheduler-local-receipt.json'

interface ReceiptEvent {
  source: HydrologyIngestionSource
  scheduledFor: string
  attempt: number
  inserted: number
  unchanged: number
  skipped: boolean
  retry: null
}

export interface HydrologyCronConfig {
  token: string
  ownerId: string
}

export function getHydrologyCronConfig(env: NodeJS.ProcessEnv = process.env): HydrologyCronConfig {
  const token = env['HYDROLOGY_INGEST_TOKEN']?.trim()
  if (!token) throw new Error('HYDROLOGY_INGEST_TOKEN is required for the authenticated hydrology Cron')
  const ownerId = env['HYDROLOGY_CRON_OWNER_ID']?.trim()
  if (!ownerId) throw new Error('HYDROLOGY_CRON_OWNER_ID is required for the hydrology Cron owner')
  return { token, ownerId }
}

async function main(): Promise<void> {
  dotenv.config({ path: resolve(process.cwd(), '../../.env'), override: true })
  const cronConfig = getHydrologyCronConfig()
  const proofRunId = `scheduler-proof-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`
  const events: ReceiptEvent[] = []
  const ingestionRunner = createGovernmentIngestionRunner()
  const runner: HydrologyIngestionRunner = {
    async run(source, metadata) {
      const result = await ingestionRunner({ source, proofRunId: metadata.proofRunId, runId: `scheduled-${metadata.scheduledSlot}`, scheduledSlot: metadata.scheduledSlot, leaseOwner: metadata.ownerId })
      const sourceResult = result.results.find((item) => item.source === source)
      return { inserted: sourceResult?.recordsIngested ?? 0, unchanged: 0 }
    },
  }
  const scheduler = new HydrologyIngestionScheduler(runner, {
    ownerId: cronConfig.ownerId,
    onRunResult: ({ source, scheduledFor, attempt, result }) => events.push({ source, scheduledFor: scheduledFor.toISOString(), attempt, ...result }),
  })
  const scheduledFor = new Date()
  for (const source of SOURCES) await scheduler.runSource(source, { attempt: 0, scheduledFor, proofRunId })

  const receipt = {
    verifier: 'hydrology-scheduler-local-receipt-v1',
    proofRunId,
    scheduledFor: scheduledFor.toISOString(),
    oneShotPerSource: true,
    retries: 0,
    sources: SOURCES,
    events,
    passed: events.length === SOURCES.length && events.every((event) => !event.skipped),
    environment: { nodeEnv: process.env['NODE_ENV'] ?? 'unset', hasDatabaseUrl: Boolean(process.env['DATABASE_URL']) },
  }
  const out = parseOut(process.argv.slice(2))
  const outPath = resolve(process.cwd(), out)
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ outPath, proofRunId, passed: receipt.passed, sourceStatuses: Object.fromEntries(events.map((event) => [event.source, event.skipped ? 'skipped' : 'invoked'])) }, null, 2))
  if (!receipt.passed) process.exitCode = 1
}

function parseOut(args: string[]): string {
  const index = args.indexOf('--out')
  const out = index >= 0 ? args[index + 1] : DEFAULT_OUT
  if (!out) throw new Error('--out requires a file path')
  return out
}

if (process.argv[1] && /run-hydrology-scheduler-once\.(?:ts|js)$/.test(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
