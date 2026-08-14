import 'dotenv/config'
import { basename } from 'node:path'
import { closePostgresPool, getPostgresPool } from './pool'
import { logger } from '../../observability/logger'

const ALERT_COVERAGE_SOURCE = {
  INMET: 'INMET',
  SMN: 'SMN',
} as const

type AlertCoverageSource = (typeof ALERT_COVERAGE_SOURCE)[keyof typeof ALERT_COVERAGE_SOURCE]

export interface MunicipalityAlertCoverageSeed {
  municipalityId: string
  source: AlertCoverageSource
  officialCoverageKey: string
  seedVersion: string
}

const SEED_VERSION = 'municipality-alert-coverage-v1'
const SMN_MUNICIPALITY_IDS = [
  'ituzaingo',
  'ita-ibate',
  'yahape',
  'itati',
  'paso-de-la-patria',
  'corrientes',
  'empedrado',
  'bella-vista',
  'goya',
  'esquina',
  'garruchos',
  'santo-tome',
  'alvear',
  'la-cruz',
  'yapeyu',
  'paso-de-los-libres',
  'monte-caseros',
] as const

const INMET_COVERAGE_BY_MUNICIPALITY: Readonly<Record<string, readonly string[]>> = {
  ituzaingo: ['A830', 'A809'],
  'ita-ibate': ['A830', 'A809'],
  yahape: ['A830', 'A809'],
  itati: ['A830', 'A809'],
  'paso-de-la-patria': ['A830', 'A809'],
  corrientes: ['A830', 'A809'],
  empedrado: ['A830', 'A809'],
  'bella-vista': ['A830', 'A809'],
  goya: ['A830', 'A809'],
  esquina: ['A830', 'A809'],
  garruchos: ['A846', 'A826'],
  'santo-tome': ['A846', 'A826'],
  alvear: ['A846', 'A826'],
  'la-cruz': ['A846', 'A826'],
  yapeyu: ['A846', 'A826'],
  'paso-de-los-libres': ['A846', 'A826'],
  'monte-caseros': ['A846', 'A826'],
}

export const MUNICIPALITY_ALERT_COVERAGE_SEED: readonly MunicipalityAlertCoverageSeed[] = [
  ...SMN_MUNICIPALITY_IDS.map((municipalityId) => ({
    municipalityId,
    source: ALERT_COVERAGE_SOURCE.SMN,
    officialCoverageKey: 'smn-corrientes',
    seedVersion: SEED_VERSION,
  })),
  ...SMN_MUNICIPALITY_IDS.flatMap((municipalityId) => (INMET_COVERAGE_BY_MUNICIPALITY[municipalityId] ?? []).map((officialCoverageKey) => ({
    municipalityId,
    source: ALERT_COVERAGE_SOURCE.INMET,
    officialCoverageKey,
    seedVersion: SEED_VERSION,
  }))),
]

interface CoverageDb {
  query(sql: string, params?: unknown[]): Promise<{ rowCount?: number | null }>
}

export function reviewedRegistryRowIsActivatable(input: { officialIdentifier?: string | null; sourceUrl?: string | null; freshnessPolicy?: string | null; registryVersion?: string | null; reviewStatus: 'reviewed' | 'pending' | 'blocked'; reviewedAt?: Date | null; stationId?: string | null; coverageKey?: string | null }): boolean {
  return input.reviewStatus === 'reviewed'
    && Boolean(input.officialIdentifier && input.sourceUrl?.startsWith('https://') && input.freshnessPolicy && input.registryVersion && input.reviewedAt)
    && Boolean(input.stationId || input.coverageKey)
}

export async function seedMunicipalityAlertCoverage(db: CoverageDb): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0
  await db.query('BEGIN')
  try {
    for (const coverage of MUNICIPALITY_ALERT_COVERAGE_SEED) {
      const update = await db.query(
        `UPDATE municipality_alert_coverage
            SET active = true, seed_version = $4, updated_at = now()
          WHERE municipality_id = $1
            AND source = $2
            AND official_coverage_key = $3`,
        [coverage.municipalityId, coverage.source, coverage.officialCoverageKey, coverage.seedVersion],
      )
      if ((update.rowCount ?? 0) > 0) {
        updated += 1
        continue
      }

      const insert = await db.query(
        `INSERT INTO municipality_alert_coverage (municipality_id, source, official_coverage_key, active, seed_version)
         SELECT $1, $2, $3, true, $4
          WHERE NOT EXISTS (
            SELECT 1
              FROM municipality_alert_coverage
             WHERE municipality_id = $1
               AND source = $2
               AND official_coverage_key = $3
          )`,
        [coverage.municipalityId, coverage.source, coverage.officialCoverageKey, coverage.seedVersion],
      )
      if ((insert.rowCount ?? 0) > 0) inserted += 1
    }
    await db.query('COMMIT')
    return { inserted, updated }
  } catch (error) {
    await db.query('ROLLBACK').catch(() => undefined)
    throw error
  }
}

export async function runMunicipalityAlertCoverageSeed() {
  return seedMunicipalityAlertCoverage(getPostgresPool())
}

async function main() {
  try {
    const result = await runMunicipalityAlertCoverageSeed()
    logger.info({ result, seedVersion: SEED_VERSION }, 'Municipality alert coverage seed completed')
  } finally {
    await closePostgresPool()
  }
}

const scriptPath = process.argv[1]
  ? basename(process.argv[1]) === 'seed-municipality-alert-coverage.ts' || basename(process.argv[1]) === 'seed-municipality-alert-coverage.js'
  : false

if (scriptPath) void main()
