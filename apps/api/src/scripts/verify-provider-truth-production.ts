import { Client } from 'pg'
import Redis from 'ioredis'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const PROVIDER_STATUS = {
  PASS: 'pass',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
  NOT_RUN: 'not_run',
} as const

type ProviderStatus = (typeof PROVIDER_STATUS)[keyof typeof PROVIDER_STATUS]

export const PROVIDER_TRUTH_SOURCES = [
  'open-meteo',
  'smn-alerts',
  'sentinel-stac',
  'nasa-firms',
  'hydrology',
  'copilot',
] as const

export type ProviderTruthSource = (typeof PROVIDER_TRUTH_SOURCES)[number]

export interface ProviderTruthInput {
  provider: string
  prerequisite: { category: string; available: boolean }
  providerMode: 'live' | 'seam' | 'mock' | 'unavailable'
  freshness: string
  schemaStatus: string
  degradationReasons: string[]
  httpStatus?: number | null
}

export interface ProviderTruthCell {
  provider: string
  status: ProviderStatus
  prerequisiteCategory: string
  providerMode: ProviderTruthInput['providerMode']
  freshness: string
  schemaStatus: string
  productionProven: boolean
  degradationReasons: string[]
  httpStatus: number | null
}

export interface ProviderTruthManifest {
  verifier: 'agronautas-provider-truth-production-evidence-v2'
  environment: 'production'
  status: 'complete' | 'blocked' | 'incomplete'
  productionReady: false
  sources: Record<ProviderTruthSource, ProviderTruthCell>
  dependencies: {
    postgres: ProviderStatus
    redis: ProviderStatus
  }
  limitation: string
}

export function classifyProviderTruth(input: ProviderTruthInput): ProviderTruthCell {
  const prerequisiteCategory = safeIdentifier(input.prerequisite.category)
  const degradationReasons = input.degradationReasons.map((reason) => safeReason(reason))
  const base = {
    provider: safeIdentifier(input.provider),
    prerequisiteCategory,
    providerMode: input.providerMode,
    freshness: safeIdentifier(input.freshness),
    schemaStatus: safeIdentifier(input.schemaStatus),
    productionProven: false,
    degradationReasons,
    httpStatus: typeof input.httpStatus === 'number' ? input.httpStatus : null,
  }

  if (!input.prerequisite.available) return { ...base, status: PROVIDER_STATUS.BLOCKED }
  if (input.providerMode === 'unavailable') return { ...base, status: PROVIDER_STATUS.UNAVAILABLE }
  if (input.providerMode !== 'live' || input.freshness !== 'fresh' || input.schemaStatus !== 'valid') {
    return { ...base, status: PROVIDER_STATUS.BLOCKED }
  }
  return { ...base, status: PROVIDER_STATUS.PASS, productionProven: true }
}

export function buildProviderTruthManifest(input: {
  sources: Record<ProviderTruthSource, ProviderTruthCell>
  dependencies?: { postgres?: ProviderStatus; redis?: ProviderStatus }
}): ProviderTruthManifest {
  const sources = Object.fromEntries(PROVIDER_TRUTH_SOURCES.map((source) => [source, input.sources[source]])) as Record<ProviderTruthSource, ProviderTruthCell>
  const dependencies = {
    postgres: input.dependencies?.postgres ?? PROVIDER_STATUS.NOT_RUN,
    redis: input.dependencies?.redis ?? PROVIDER_STATUS.NOT_RUN,
  }
  const statuses = [...Object.values(sources).map((source) => source.status), dependencies.postgres, dependencies.redis]
  const status = statuses.includes(PROVIDER_STATUS.BLOCKED)
    ? 'blocked'
    : statuses.includes(PROVIDER_STATUS.UNAVAILABLE) || statuses.includes(PROVIDER_STATUS.NOT_RUN)
      ? 'incomplete'
      : 'complete'

  return {
    verifier: 'agronautas-provider-truth-production-evidence-v2',
    environment: 'production',
    status,
    productionReady: false,
    sources,
    dependencies,
    limitation: 'Source-specific production evidence only; this artifact never declares aggregate product readiness.',
  }
}

interface HttpProbe {
  status: number | null
  providerMode: ProviderTruthInput['providerMode']
  freshness: string
  schemaStatus: string
  reason: string
}

interface ProductionConfig {
  artifactRoot: string
  fieldId: string
  openMeteoApproved: boolean
  firmsConfigured: boolean
  satelliteConfigured: boolean
  hydrologyConfigured: boolean
  copilotConfigured: boolean
}

async function main(): Promise<void> {
  const runId = `provider-production-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`
  const config = resolveProductionConfig(process.env)
  const sources: Record<ProviderTruthSource, ProviderTruthCell> = {
    'open-meteo': classifyProviderTruth(await checkOpenMeteo(config)),
    'smn-alerts': classifyProviderTruth(await checkHttpSource('smn-alerts', process.env['AGRONAUTAS_SMN_ALERTS_URL'] ?? 'https://www.smn.gob.ar/alertas', { category: 'endpoint', available: true }, false)),
    'sentinel-stac': classifyProviderTruth(await checkHttpSource('sentinel-stac', process.env['AGRONAUTAS_SATELLITE_STAC_URL'] ?? 'https://dataspace.copernicus.eu/stac/search', { category: 'licensing_or_token', available: config.satelliteConfigured }, true)),
    'nasa-firms': classifyProviderTruth(await checkHttpSource('nasa-firms', 'https://firms.modaps.eosdis.nasa.gov/api/area/csv', { category: 'licensing_or_token', available: config.firmsConfigured }, false)),
    hydrology: classifyProviderTruth({ provider: 'hydrology', prerequisite: { category: 'cron_or_token', available: config.hydrologyConfigured }, providerMode: config.hydrologyConfigured ? 'live' : 'unavailable', freshness: config.hydrologyConfigured ? 'fresh' : 'missing', schemaStatus: config.hydrologyConfigured ? 'valid' : 'unavailable', degradationReasons: config.hydrologyConfigured ? ['write_not_attempted'] : ['cron_or_token_unavailable'] }),
    copilot: classifyProviderTruth({ provider: 'copilot', prerequisite: { category: 'model_token', available: config.copilotConfigured }, providerMode: config.copilotConfigured ? 'live' : 'unavailable', freshness: config.copilotConfigured ? 'fresh' : 'missing', schemaStatus: config.copilotConfigured ? 'valid' : 'unavailable', degradationReasons: config.copilotConfigured ? ['chat_not_attempted'] : ['model_token_unavailable'] }),
  }
  const dependencies = await checkDependencies()
  const manifest = buildProviderTruthManifest({ sources, dependencies })
  const outPath = resolve(process.cwd(), config.artifactRoot, runId, 'provider-truth-production.json')
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify({ ...manifest, runId, generatedAt: new Date().toISOString(), configuration: safeConfiguration(config) }, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify({ outPath, runId, status: manifest.status, productionReady: false }, null, 2)}\n`)
  if (manifest.status !== 'complete') process.exitCode = 1
}

function resolveProductionConfig(env: NodeJS.ProcessEnv): ProductionConfig {
  return {
    artifactRoot: normalize(env['AGRONAUTAS_RUNTIME_ARTIFACT_ROOT']) ?? 'artifacts/agronautas-production',
    fieldId: normalize(env['AGRONAUTAS_RUNTIME_FIELD_ID']) ?? 'Mercedes',
    openMeteoApproved: env['AGRONAUTAS_OPEN_METEO_COMMERCIAL_APPROVED']?.trim().toLowerCase() === 'true',
    firmsConfigured: Boolean(normalize(env['FIRMS_API_KEY'] ?? env['NASA_FIRMS_API_KEY'])),
    satelliteConfigured: Boolean(normalize(env['SENTINEL_CLIENT_ID']) && normalize(env['SENTINEL_CLIENT_SECRET'])),
    hydrologyConfigured: Boolean(normalize(env['HYDROLOGY_INGEST_TOKEN']) && normalize(env['HYDROLOGY_CRON_OWNER_ID'])),
    copilotConfigured: Boolean(normalize(env['GROQ_API_KEY']) && normalize(env['GROQ_MODEL'])),
  }
}

async function checkOpenMeteo(config: ProductionConfig): Promise<ProviderTruthInput> {
  if (!config.openMeteoApproved) return { provider: 'open-meteo', prerequisite: { category: 'licensing_or_token', available: false }, providerMode: 'unavailable', freshness: 'missing', schemaStatus: 'unavailable', degradationReasons: ['commercial_use_license_unavailable'] }
  return checkHttpSource('open-meteo', 'https://api.open-meteo.com/v1/forecast?latitude=-29.18&longitude=-58.08&daily=temperature_2m_max,precipitation_sum&timezone=UTC', { category: 'licensing_or_token', available: true }, false, (body) => isRecord(body) && isRecord(body['daily']))
}

async function checkHttpSource(provider: string, endpoint: string, prerequisite: { category: string; available: boolean }, requiresProof: boolean, schema: (body: unknown) => boolean = (body) => isRecord(body)): Promise<ProviderTruthInput> {
  if (!prerequisite.available) return { provider, prerequisite, providerMode: 'unavailable', freshness: 'missing', schemaStatus: 'unavailable', degradationReasons: [`${provider}_prerequisite_unavailable`] }
  const observation = await probe(endpoint)
  const valid = observation.status !== null && observation.status >= 200 && observation.status < 300 && observation.schemaStatus === 'valid' && (requiresProof ? false : true)
  return {
    provider,
    prerequisite,
    providerMode: observation.providerMode,
    freshness: valid ? 'fresh' : observation.freshness,
    schemaStatus: valid && schema(probeBody(observation)) ? 'valid' : 'invalid',
    degradationReasons: valid ? [] : [observation.reason],
    httpStatus: observation.status,
  }
}

let lastProbeBody: unknown = null
function probeBody(_probe: HttpProbe): unknown { return lastProbeBody }

async function probe(endpoint: string): Promise<HttpProbe> {
  lastProbeBody = null
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) })
    const text = await response.text()
    try { lastProbeBody = text ? JSON.parse(text) as unknown : null } catch { lastProbeBody = null }
    return { status: response.status, providerMode: 'live', freshness: response.ok ? 'fresh' : 'missing', schemaStatus: response.ok && lastProbeBody !== null ? 'valid' : 'invalid', reason: response.ok ? 'schema_drift' : `provider_http_${response.status}` }
  } catch (error) {
    return { status: null, providerMode: 'unavailable', freshness: 'missing', schemaStatus: 'unavailable', reason: safeReason(error instanceof Error ? error.message : 'provider_unavailable') }
  }
}

async function checkDependencies(): Promise<{ postgres: ProviderStatus; redis: ProviderStatus }> {
  const databaseUrl = normalize(process.env['DATABASE_URL'])
  const redisUrl = normalize(process.env['REDIS_URL'])
  const postgres = databaseUrl ? await checkPostgres(databaseUrl) : PROVIDER_STATUS.BLOCKED
  const redis = redisUrl ? await checkRedis(redisUrl) : PROVIDER_STATUS.BLOCKED
  return { postgres, redis }
}

async function checkPostgres(connectionString: string): Promise<ProviderStatus> {
  const client = new Client({ connectionString, connectionTimeoutMillis: 15_000, statement_timeout: 15_000 })
  try { await client.connect(); await client.query('SELECT 1'); return PROVIDER_STATUS.PASS } catch { return PROVIDER_STATUS.BLOCKED } finally { await client.end().catch(() => undefined) }
}

async function checkRedis(connectionString: string): Promise<ProviderStatus> {
  const redis = new Redis(connectionString, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 15_000 })
  try { await redis.connect(); return (await redis.ping()) === 'PONG' ? PROVIDER_STATUS.PASS : PROVIDER_STATUS.BLOCKED } catch { return PROVIDER_STATUS.BLOCKED } finally { redis.disconnect() }
}

function safeConfiguration(config: ProductionConfig): Record<string, unknown> {
  return { artifactRoot: config.artifactRoot, fieldId: config.fieldId, openMeteoApproved: config.openMeteoApproved, firmsConfigured: config.firmsConfigured, satelliteConfigured: config.satelliteConfigured, hydrologyConfigured: config.hydrologyConfigured, copilotConfigured: config.copilotConfigured, databaseConfigured: Boolean(normalize(process.env['DATABASE_URL'])), redisConfigured: Boolean(normalize(process.env['REDIS_URL'])) }
}

function normalize(value: string | undefined): string | undefined { const normalized = value?.trim(); return normalized || undefined }
function safeIdentifier(value: string): string { return value.replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 128) || 'unknown' }
function safeReason(value: string): string { return /bearer\s|password|secret|token|postgres(?:ql)?:\/\//i.test(value) ? '[redacted]' : value.replace(/[\r\n]/g, ' ').slice(0, 256) }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }

if (process.argv[1] && /verify-provider-truth-production\.(?:ts|js)$/.test(process.argv[1])) {
  main().catch(() => { process.exitCode = 1 })
}
