import 'dotenv/config'
import { basename } from 'node:path'
import { getPostgresPool, closePostgresPool } from '../infrastructure/database/postgres/pool'
import { logger } from '../infrastructure/observability/logger'
import { seedGovernmentMunicipalitiesIfEmpty } from '../presentation/routes/hydrology-government'

export async function runGovernmentHydrologySeed() {
  return seedGovernmentMunicipalitiesIfEmpty(getPostgresPool())
}

async function main() {
  try {
    const result = await runGovernmentHydrologySeed()
    logger.info({ result }, 'Government hydrology municipality seed completed')
  } finally {
    await closePostgresPool()
  }
}

const scriptPath = process.argv[1]
  ? basename(process.argv[1]) === 'seed-government-hydrology.ts' || basename(process.argv[1]) === 'seed-government-hydrology.js'
  : false

if (scriptPath) {
  void main()
}
