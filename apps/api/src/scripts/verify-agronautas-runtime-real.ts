import { Client } from 'pg'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import dotenv from 'dotenv'
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createGeorefAdapter, createNasaPowerDailyAdapter, createOpenMeteoAdapter, type ProviderEvidenceResult } from '../infrastructure/adapters/agronautas-provider-adapters'
import { RedisAgronautasRuntimeDispatcher } from '../infrastructure/queue/agronautas-runtime-dispatcher'
import type { SourceWindow } from '../infrastructure/jobs/agronautas-scheduler'

const EVIDENCE_STATUS = {
  PASS: 'pass',
  BLOCKED: 'blocked',
  NOT_RUN: 'not_run',
  UNAVAILABLE: 'unavailable',
} as const

type EvidenceStatus = (typeof EVIDENCE_STATUS)[keyof typeof EVIDENCE_STATUS]

const RUNTIME_CHECK = {
  API: 'api',
  WEB: 'web',
  POSTGRES: 'postgres',
  PRISMA: 'prisma',
  REDIS: 'redis',
  QUEUE: 'queue',
  WORKER: 'worker',
  PROVIDERS: 'providers',
  HYDROLOGY: 'hydrology',
  RENDER: 'render',
  WORKER_TESTS: 'worker_tests',
} as const

type RuntimeCheckName = (typeof RUNTIME_CHECK)[keyof typeof RUNTIME_CHECK]

export interface RuntimeEvidenceCell {
  status: EvidenceStatus
  detail: string
  evidence?: Record<string, unknown>
}

export interface RuntimeVerificationConfig {
  apiBaseUrl: string
  webBaseUrl: string
  artifactRoot: string
  fieldId: string | null
  bearerToken: string | null
  queueProofEnabled: boolean
  chatProofEnabled: boolean
  hydrologyWriteEnabled: boolean
  openMeteoCommercialUseApproved: boolean
  renderServiceId: string | null
  renderApiToken: string | null
}

export interface RuntimeVerificationManifest {
  verifier: 'agronautas-real-runtime-evidence-v1'
  contractVersion: '2.0.0'
  runId: string
  startedAt: string
  finishedAt: string
  status: 'complete' | 'blocked' | 'incomplete'
  productionProven: false
  providerLiveEvidence: boolean
  durableOutcomeBeforeAck: true
  blockedCapabilities: RuntimeCheckName[]
  notRunCapabilities: RuntimeCheckName[]
  unavailableCapabilities: RuntimeCheckName[]
  topology: {
    api: 'configured-api-runtime'
    browser: 'separate-playwright-evidence'
    fullDatabaseRedisWorkerCronRender: 'unproven'
  }
  checks: Partial<Record<RuntimeCheckName, RuntimeEvidenceCell>>
}

export interface WorkerReadinessEvidence {
  status: string
  reason?: string
}

interface ManifestInput {
  runId: string
  startedAt: string
  finishedAt: string
  checks: Partial<Record<RuntimeCheckName, RuntimeEvidenceCell>>
  providerLiveEvidence?: boolean
}

interface HttpObservation {
  url: string
  status: number | null
  ok: boolean
  body: unknown
  error?: string
}

export interface AuthEvidenceInput {
  tokenConfigured: boolean
  fieldId: string | null
  fieldLookupStatus: number | null
  unauthenticatedStatus: number | null
  unauthenticatedChat: number | null
  authenticatedRuntime: number | null
  authenticatedStatus: number | null
  authenticatedChat: number | null
  chatProofEnabled: boolean
}

export interface AuthEvidenceClassification {
  auth: 'available' | 'unavailable' | 'blocked'
  detail: string
  claims: {
    unauthenticatedStatus401: boolean
    unauthenticatedChat401: boolean
    authenticatedRuntime200: boolean
    authenticatedStatus200: boolean
    authenticatedChat200: boolean
  }
}

interface DatabaseObservation {
  connected: boolean
  tables: string[]
  counts: Record<string, number>
  prismaQuery: 'passed' | 'blocked'
  error?: string
}

interface QueueObservation {
  waitLength: number
  processingLength: number
  deadLetterLength: number
  completedLength: number
  resultCount: number
  statusCount: number
  proofRunId: string | null
  transition: string
}

const DEFAULT_ARTIFACT_ROOT = 'artifacts/agronautas-runtime'
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001'
const DEFAULT_WEB_BASE_URL = 'http://127.0.0.1:3000'
const REQUEST_TIMEOUT_MS = 15_000
const QUEUE_OBSERVATION_TIMEOUT_MS = 20_000
const WORKER_TEST_TIMEOUT_MS = 120_000
const execFileAsync = promisify(execFile)

export function resolveRuntimeVerificationConfig(env: NodeJS.ProcessEnv = process.env): RuntimeVerificationConfig {
  return {
    apiBaseUrl: normalizeUrl(env['PLAYWRIGHT_API_BASE_URL'] ?? env['AGRONAUTAS_RUNTIME_API_URL'] ?? DEFAULT_API_BASE_URL),
    webBaseUrl: normalizeUrl(env['PLAYWRIGHT_BASE_URL'] ?? env['AGRONAUTAS_RUNTIME_WEB_URL'] ?? DEFAULT_WEB_BASE_URL),
    artifactRoot: normalizeValue(env['AGRONAUTAS_RUNTIME_ARTIFACT_ROOT']) ?? DEFAULT_ARTIFACT_ROOT,
    fieldId: normalizeValue(env['AGRONAUTAS_RUNTIME_FIELD_ID']) ?? null,
    bearerToken: normalizeValue(env['AGRONAUTAS_BFF_BEARER_TOKEN'] ?? env['AGRONAUTAS_AUTH_TOKEN_OPERATOR'] ?? env['AGRONAUTAS_AUTH_TOKEN_READER']) ?? null,
    queueProofEnabled: parseBoolean(env['AGRONAUTAS_RUNTIME_QUEUE_PROOF']),
    chatProofEnabled: parseBoolean(env['AGRONAUTAS_RUNTIME_CHAT_PROOF']),
    hydrologyWriteEnabled: parseBoolean(env['AGRONAUTAS_RUNTIME_HYDROLOGY_WRITE']),
    openMeteoCommercialUseApproved: parseBoolean(env['AGRONAUTAS_OPEN_METEO_COMMERCIAL_APPROVED']),
    renderServiceId: normalizeValue(env['RENDER_SERVICE_ID']) ?? null,
    renderApiToken: normalizeValue(env['RENDER_API_TOKEN']) ?? null,
  }
}

export function evaluateHydrologyWriteGate(env: NodeJS.ProcessEnv = process.env, enabled = false): RuntimeEvidenceCell {
  const token = normalizeValue(env['HYDROLOGY_INGEST_TOKEN'])
  const ownerId = normalizeValue(env['HYDROLOGY_CRON_OWNER_ID'])
  if (!token) return cell(EVIDENCE_STATUS.BLOCKED, 'HYDROLOGY_INGEST_TOKEN is unavailable; owner-authorized writes were not attempted')
  if (!ownerId) return cell(EVIDENCE_STATUS.BLOCKED, 'HYDROLOGY_CRON_OWNER_ID is unavailable; owner-authorized writes were not attempted')
  if (!enabled) return cell(EVIDENCE_STATUS.NOT_RUN, 'Hydrology cron credentials are present; a real write was not attempted')
  return cell(EVIDENCE_STATUS.PASS, 'Hydrology cron credentials are present; a real one-shot write was explicitly requested', { ownerId })
}

export function buildRuntimeManifest(input: ManifestInput): RuntimeVerificationManifest {
  const entries = Object.entries(input.checks) as Array<[RuntimeCheckName, RuntimeEvidenceCell]>
  const blockedCapabilities = entries.filter(([, item]) => item.status === EVIDENCE_STATUS.BLOCKED).map(([name]) => name)
  const notRunCapabilities = entries.filter(([, item]) => item.status === EVIDENCE_STATUS.NOT_RUN).map(([name]) => name)
  const unavailableCapabilities = entries.filter(([, item]) => item.status === EVIDENCE_STATUS.UNAVAILABLE).map(([name]) => name)
  const status = blockedCapabilities.length > 0
    ? 'blocked'
    : notRunCapabilities.length > 0 || unavailableCapabilities.length > 0
      ? 'incomplete'
      : 'complete'

  return {
    verifier: 'agronautas-real-runtime-evidence-v1',
    contractVersion: '2.0.0',
    runId: input.runId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    status,
    productionProven: false,
    providerLiveEvidence: input.providerLiveEvidence ?? false,
    // This records the local contract boundary; it is not production proof.
    durableOutcomeBeforeAck: true,
    blockedCapabilities,
    notRunCapabilities,
    unavailableCapabilities,
    topology: {
      api: 'configured-api-runtime',
      browser: 'separate-playwright-evidence',
      fullDatabaseRedisWorkerCronRender: 'unproven',
    },
    checks: input.checks,
  }
}

async function main(): Promise<void> {
  loadLocalEnv()
  const config = resolveRuntimeVerificationConfig()
  const runId = `runtime-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`
  const startedAt = new Date().toISOString()
  const checks: Partial<Record<RuntimeCheckName, RuntimeEvidenceCell>> = {}

  checks[RUNTIME_CHECK.API] = await checkApi(config)
  checks[RUNTIME_CHECK.WEB] = await checkWeb(config)

  const database = await checkDatabase()
  checks[RUNTIME_CHECK.POSTGRES] = database.postgres
  checks[RUNTIME_CHECK.PRISMA] = database.prisma

  const redis = await checkRedis(config, runId)
  checks[RUNTIME_CHECK.REDIS] = redis.redis
  checks[RUNTIME_CHECK.QUEUE] = redis.queue

  checks[RUNTIME_CHECK.WORKER] = await checkWorker(config, checks[RUNTIME_CHECK.API])
  checks[RUNTIME_CHECK.WORKER_TESTS] = await checkWorkerPytest()
  const providers = await checkProviders(config, runId)
  checks[RUNTIME_CHECK.PROVIDERS] = providers.cell
  checks[RUNTIME_CHECK.HYDROLOGY] = await checkHydrology(config, runId)
  checks[RUNTIME_CHECK.RENDER] = await checkRenderWiring(config)

  const manifest = buildRuntimeManifest({
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    checks,
    providerLiveEvidence: providers.liveEvidence,
  })
  const outPath = resolve(process.cwd(), config.artifactRoot, runId, 'runtime-evidence.json')
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify({ ...manifest, configuration: safeConfiguration(config) }, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ outPath, runId, status: manifest.status, blockedCapabilities: manifest.blockedCapabilities, notRunCapabilities: manifest.notRunCapabilities, unavailableCapabilities: manifest.unavailableCapabilities, productionProven: false }, null, 2))
}

async function checkApi(config: RuntimeVerificationConfig): Promise<RuntimeEvidenceCell> {
  const health = await requestJson(`${config.apiBaseUrl}/health`)
  const readiness = await requestJson(`${config.apiBaseUrl}/ready`)
  const unauthenticatedRuntime = await requestJson(`${config.apiBaseUrl}/agronautas/runtime`)
  const authenticatedRuntime = config.bearerToken
    ? await requestJson(`${config.apiBaseUrl}/agronautas/runtime`, { authorization: `Bearer ${config.bearerToken}` })
    : null
  const fields = config.bearerToken
    ? await requestJson(`${config.apiBaseUrl}/agronautas/fields`, { authorization: `Bearer ${config.bearerToken}` })
    : null
  const candidateFieldId = config.fieldId ?? readFirstFieldId(fields?.body)
  const authenticatedField = config.bearerToken && candidateFieldId
    ? await requestJson(`${config.apiBaseUrl}/agronautas/fields/${encodeURIComponent(candidateFieldId)}`, { authorization: `Bearer ${config.bearerToken}` })
    : null
  const realFieldId = authenticatedField?.status === 200 ? candidateFieldId : null
  const probeFieldId = realFieldId ?? candidateFieldId ?? 'runtime-verification'
  const unauthenticatedStatus = await requestJson(`${config.apiBaseUrl}/agronautas/fields/${encodeURIComponent(probeFieldId)}/status`)
  const unauthenticatedChat = await requestJson(`${config.apiBaseUrl}/agronautas/fields/${encodeURIComponent(probeFieldId)}/chat`, { 'content-type': 'application/json' }, 'POST', JSON.stringify({ message: 'runtime verification auth boundary' }))
  const authenticatedStatus = config.bearerToken && realFieldId
    ? await requestJson(`${config.apiBaseUrl}/agronautas/fields/${encodeURIComponent(realFieldId)}/status`, { authorization: `Bearer ${config.bearerToken}` })
    : null
  const authenticatedChat = config.chatProofEnabled && config.bearerToken && realFieldId
    ? await requestJson(`${config.apiBaseUrl}/agronautas/fields/${encodeURIComponent(realFieldId)}/chat`, { authorization: `Bearer ${config.bearerToken}`, 'content-type': 'application/json' }, 'POST', JSON.stringify({ message: 'runtime verification chat proof' }))
    : null
  const healthOk = health.status === 200
  const auth = classifyAuthEvidence({
    tokenConfigured: Boolean(config.bearerToken),
    fieldId: candidateFieldId,
    fieldLookupStatus: authenticatedField?.status ?? null,
    unauthenticatedStatus: unauthenticatedStatus.status,
    unauthenticatedChat: unauthenticatedChat.status,
    authenticatedRuntime: authenticatedRuntime?.status ?? null,
    authenticatedStatus: authenticatedStatus?.status ?? null,
    authenticatedChat: authenticatedChat?.status ?? null,
    chatProofEnabled: config.chatProofEnabled,
  })
  const unauthenticatedContract = {
    runtime: unauthenticatedRuntime.status === 200 || unauthenticatedRuntime.status === 401 ? 'observed' : 'blocked',
    status: realFieldId ? (unauthenticatedStatus.status === 401 ? '401' : 'unexpected') : 'not_proven_without_real_field',
    chat: realFieldId ? (unauthenticatedChat.status === 401 ? '401' : 'unexpected') : 'not_proven_without_real_field',
  } as const
  const apiEvidence = { health, readiness, unauthenticatedRuntime, authenticatedRuntime, unauthenticatedStatus, unauthenticatedChat, fields, authenticatedField, authenticatedStatus, authenticatedChat, auth: auth.auth, authDetail: auth.detail, authClaims: auth.claims, unauthenticatedContract }
  if (!healthOk) return cell(EVIDENCE_STATUS.BLOCKED, 'Local API health endpoint did not return HTTP 200', apiEvidence)
  return auth.auth === 'available'
    ? cell(EVIDENCE_STATUS.PASS, 'Real API health/readiness plus authenticated status/chat auth-boundary requests completed', apiEvidence)
    : cell(EVIDENCE_STATUS.BLOCKED, `API auth evidence ${auth.auth}: ${auth.detail}; public unauthenticated contract checks remain explicit`, apiEvidence)
}

async function checkWeb(config: RuntimeVerificationConfig): Promise<RuntimeEvidenceCell> {
  const home = await requestJson(`${config.webBaseUrl}/demo`)
  const bffRuntime = await requestJson(`${config.webBaseUrl}/api/agronautas/v1/runtime`)
  if (home.status === null) return cell(EVIDENCE_STATUS.BLOCKED, 'Web runtime was unreachable; browser suite must preserve this blocked state', { home, bffRuntime })
  if (!home.ok) return cell(EVIDENCE_STATUS.BLOCKED, 'Web runtime returned a non-success response', { home, bffRuntime })
  return cell(EVIDENCE_STATUS.PASS, 'Real web and same-origin Agronautas BFF requests completed', { home, bffRuntime })
}

async function checkDatabase(): Promise<{ postgres: RuntimeEvidenceCell; prisma: RuntimeEvidenceCell }> {
  const connectionString = normalizeValue(process.env['DATABASE_URL'])
  if (!connectionString) {
    const blocked = cell(EVIDENCE_STATUS.BLOCKED, 'DATABASE_URL is unavailable; Postgres and Prisma checks were not attempted')
    return { postgres: blocked, prisma: blocked }
  }

  const observation: DatabaseObservation = { connected: false, tables: [], counts: {}, prismaQuery: 'blocked' }
  const client = new Client({ connectionString, connectionTimeoutMillis: REQUEST_TIMEOUT_MS, statement_timeout: REQUEST_TIMEOUT_MS })
  try {
    await client.connect()
    observation.connected = true
    const tables = await client.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
    observation.tables = tables.rows.map((row) => row.table_name)
    for (const table of ['fields', 'signal_ingestion_runs', 'agronautas_job_runs', '_prisma_migrations']) {
      if (!observation.tables.includes(table)) continue
      const count = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM "${table}"`)
      observation.counts[table] = Number(count.rows[0]?.count ?? 0)
    }
  } catch (error) {
    observation.error = describeError(error)
  } finally {
    await client.end().catch(() => undefined)
  }

  const postgres = observation.connected
    ? cell(EVIDENCE_STATUS.PASS, 'Postgres connection and read-only field/evidence/job/migration inspection completed', observation as unknown as Record<string, unknown>)
    : cell(EVIDENCE_STATUS.BLOCKED, 'Postgres connection or read-only inspection failed', observation as unknown as Record<string, unknown>)
  const prisma = await checkPrisma(connectionString)
  return { postgres, prisma }
}

async function checkPrisma(connectionString: string): Promise<RuntimeEvidenceCell> {
  const prisma = new PrismaClient({ datasources: { db: { url: connectionString } } })
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ result: number }>>('SELECT 1 AS result')
    return cell(result[0]?.result === 1 ? EVIDENCE_STATUS.PASS : EVIDENCE_STATUS.BLOCKED, 'Prisma client executed a real read-only query', { result: result[0]?.result ?? null })
  } catch (error) {
    return cell(EVIDENCE_STATUS.BLOCKED, 'Prisma client could not execute a real read-only query', { error: describeError(error) })
  } finally {
    await prisma.$disconnect().catch(() => undefined)
  }
}

async function checkRedis(config: RuntimeVerificationConfig, runId: string): Promise<{ redis: RuntimeEvidenceCell; queue: RuntimeEvidenceCell }> {
  const redisUrl = normalizeValue(process.env['REDIS_URL'])
  if (!redisUrl) {
    const blocked = cell(EVIDENCE_STATUS.BLOCKED, 'REDIS_URL is unavailable; Redis and queue checks were not attempted')
    return { redis: blocked, queue: blocked }
  }

  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: REQUEST_TIMEOUT_MS })
  try {
    await redis.connect()
    const ping = await redis.ping()
    const queue = await inspectQueue(redis, runId, config.queueProofEnabled)
    const redisCell = ping === 'PONG'
      ? cell(EVIDENCE_STATUS.PASS, 'Redis PING and runtime key inspection completed', { ping })
      : cell(EVIDENCE_STATUS.BLOCKED, 'Redis did not return PONG', { ping })
    return { redis: redisCell, queue: queue.cell }
  } catch (error) {
    const blocked = cell(EVIDENCE_STATUS.BLOCKED, 'Redis connection or queue inspection failed', { error: describeError(error) })
    return { redis: blocked, queue: blocked }
  } finally {
    redis.disconnect()
  }
}

async function inspectQueue(redis: Redis, runId: string, proofEnabled: boolean): Promise<{ cell: RuntimeEvidenceCell; observation: QueueObservation }> {
  const queueKey = 'bull:agronautas-runtime:wait'
  const processingKey = 'bull:agronautas-runtime:processing'
  const deadLetterKey = 'bull:agronautas-runtime:dead-letter'
  const completedKey = 'bull:agronautas-runtime:completed'
  const resultsKey = 'bull:agronautas-runtime:results'
  const statusKey = 'bull:agronautas-runtime:status'
  let observation = await readQueueObservation(redis, queueKey, processingKey, deadLetterKey, completedKey, resultsKey, statusKey)
  if (!proofEnabled) {
    return {
      observation,
      cell: cell(EVIDENCE_STATUS.NOT_RUN, 'Queue lengths and durable hashes were read; enqueue/worker proof is disabled to avoid an unapproved write', observation as unknown as Record<string, unknown>),
    }
  }

  const windowStart = new Date()
  const window: SourceWindow = { provider: 'open-meteo', signalType: 'climate', windowStart, windowEnd: new Date(windowStart.getTime() + 3_600_000), runId: `${runId}:queue-proof` }
  await new RedisAgronautasRuntimeDispatcher(redis).enqueue(window)
  const deadline = Date.now() + QUEUE_OBSERVATION_TIMEOUT_MS
  let transition = 'waiting'
  while (Date.now() < deadline) {
    observation = await readQueueObservation(redis, queueKey, processingKey, deadLetterKey, completedKey, resultsKey, statusKey)
    const status = await redis.hget(statusKey, `agronautas-window:${window.runId}`)
    const result = await redis.hget(resultsKey, `agronautas-window:${window.runId}`)
    if (status) transition = status
    if (result) {
      transition = result
      break
    }
    await delay(500)
  }
  observation = { ...observation, proofRunId: window.runId, transition }
  const terminal = transition.includes('succeeded') || transition.includes('unavailable') || transition.includes('dlq')
  return {
    observation,
    cell: terminal
      ? cell(EVIDENCE_STATUS.PASS, 'Real queue proof observed a terminal worker/result or unavailable transition', observation as unknown as Record<string, unknown>)
      : cell(EVIDENCE_STATUS.BLOCKED, 'Queue enqueue succeeded but no bounded worker terminal transition was observed', observation as unknown as Record<string, unknown>),
  }
}

async function readQueueObservation(redis: Redis, queueKey: string, processingKey: string, deadLetterKey: string, completedKey: string, resultsKey: string, statusKey: string): Promise<QueueObservation> {
  const [waitLength, processingLength, deadLetterLength, completedLength, resultCount, statusCount] = await Promise.all([
    redis.llen(queueKey),
    redis.llen(processingKey),
    redis.llen(deadLetterKey),
    redis.llen(completedKey),
    redis.hlen(resultsKey),
    redis.hlen(statusKey),
  ])
  return { waitLength, processingLength, deadLetterLength, completedLength, resultCount, statusCount, proofRunId: null, transition: 'observed_without_write' }
}

async function checkWorker(config: RuntimeVerificationConfig, apiCell: RuntimeEvidenceCell | undefined): Promise<RuntimeEvidenceCell> {
  const worker = extractWorkerReadiness(apiCell?.evidence?.['readiness'])
  if (worker?.status === 'available') return cell(EVIDENCE_STATUS.PASS, 'API readiness observed a live worker heartbeat', { worker })
  return cell(EVIDENCE_STATUS.BLOCKED, 'Worker readiness is unavailable; no worker completion is claimed', { worker, configuredRuntime: config.apiBaseUrl })
}

async function checkWorkerPytest(): Promise<RuntimeEvidenceCell> {
  const workerRoot = resolve(process.cwd(), '../../apps/workflow-runtime-python')
  const python = normalizeValue(process.env['AGRONAUTAS_PYTHON_BIN']) ?? 'python'
  const args = ['-m', 'pytest', 'tests', '-q']
  const command = `${python} ${args.join(' ')}`
  try {
    const result = await execFileAsync(python, args, { cwd: workerRoot, timeout: WORKER_TEST_TIMEOUT_MS, windowsHide: true })
    return cell(EVIDENCE_STATUS.PASS, 'Worker pytest verification executed from the documented package directory', { command, cwd: workerRoot, output: summarizeCommandOutput(result.stdout) })
  } catch (error) {
    const commandError = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: string | number }
    const output = `${commandError.stdout ?? ''}\n${commandError.stderr ?? ''}`.trim()
    if (commandError.code === 'ENOENT' || /No module named pytest/i.test(output)) {
      return cell(EVIDENCE_STATUS.UNAVAILABLE, 'Worker pytest is unavailable; no historical pass is claimed', { command, cwd: workerRoot, output: summarizeCommandOutput(output) })
    }
    return cell(EVIDENCE_STATUS.BLOCKED, 'Worker pytest command failed; no pass is claimed', { command, cwd: workerRoot, output: summarizeCommandOutput(output), exitCode: commandError.code ?? null })
  }
}

export function classifyAuthEvidence(input: AuthEvidenceInput): AuthEvidenceClassification {
  const claims = {
    unauthenticatedStatus401: Boolean(input.fieldId && input.fieldLookupStatus === 200 && input.unauthenticatedStatus === 401),
    unauthenticatedChat401: Boolean(input.fieldId && input.fieldLookupStatus === 200 && input.unauthenticatedChat === 401),
    authenticatedRuntime200: Boolean(input.fieldId && input.fieldLookupStatus === 200 && input.authenticatedRuntime === 200),
    authenticatedStatus200: Boolean(input.fieldId && input.fieldLookupStatus === 200 && input.authenticatedStatus === 200),
    authenticatedChat200: Boolean(input.fieldId && input.fieldLookupStatus === 200 && input.authenticatedChat === 200),
  }

  if (!input.tokenConfigured) {
    return { auth: 'unavailable', detail: 'bearer token is unavailable; authenticated API evidence was not claimed', claims }
  }
  if (!input.fieldId) {
    return { auth: 'unavailable', detail: 'a real field ID could not be established with the configured bearer token', claims }
  }
  if (input.fieldLookupStatus !== 200) {
    return { auth: 'blocked', detail: `configured field ID lookup returned HTTP ${input.fieldLookupStatus ?? 'no response'}; it is not a proven real field`, claims }
  }
  if (input.unauthenticatedStatus === 404 || input.unauthenticatedChat === 404) {
    return { auth: 'blocked', detail: 'status or chat returned HTTP 404 for the field probe; invalid/missing field evidence cannot prove authentication', claims }
  }
  if (!claims.unauthenticatedStatus401 || !claims.unauthenticatedChat401) {
    return { auth: 'blocked', detail: 'unauthenticated status/chat did not both return the explicit HTTP 401 contract', claims }
  }
  if (!claims.authenticatedRuntime200 || !claims.authenticatedStatus200) {
    return { auth: 'blocked', detail: 'authenticated runtime/status did not both return the expected HTTP 200 behavior', claims }
  }
  if (input.chatProofEnabled && !claims.authenticatedChat200) {
    return { auth: 'blocked', detail: 'authenticated chat proof was enabled but did not return the expected HTTP 200 behavior', claims }
  }
  return { auth: 'available', detail: 'configured bearer token and real field produced explicit unauthenticated 401 and authenticated 200 observations', claims }
}

export function extractWorkerReadiness(value: unknown): WorkerReadinessEvidence | null {
  if (!isRecord(value) || !isRecord(value['body']) || !isRecord(value['body']['worker'])) return null
  const worker = value['body']['worker']
  if (typeof worker['status'] !== 'string') return null
  return {
    status: worker['status'],
    ...(typeof worker['reason'] === 'string' ? { reason: worker['reason'] } : {}),
  }
}

async function checkProviders(config: RuntimeVerificationConfig, runId: string): Promise<{ cell: RuntimeEvidenceCell; liveEvidence: boolean }> {
  const fieldId = config.fieldId ?? 'Mercedes'
  const adapters = [
    createGeorefAdapter(),
    createNasaPowerDailyAdapter({ timeStandard: 'UTC' }),
    createOpenMeteoAdapter({ commercialUseApproved: config.openMeteoCommercialUseApproved }),
  ]
  const results: ProviderEvidenceResult[] = []
  for (const adapter of adapters) results.push(await adapter.fetch(fieldId))
  const liveEvidence = results.some((result) => result.providerMode === 'live' && result.schemaStatus === 'valid')
  const semanticallyRecorded = results.every((result) => Boolean(result.providerMode && result.runId && result.retrievedAt && result.schemaStatus))
  return {
    liveEvidence,
    cell: semanticallyRecorded
      ? cell(EVIDENCE_STATUS.PASS, 'Real provider requests completed with explicit mode, timestamp, schema, HTTP, lineage, and run metadata', { runId, results: results.map(summarizeProviderResult) })
      : cell(EVIDENCE_STATUS.BLOCKED, 'Provider response metadata was incomplete; no live claim was emitted', { runId, results: results.map(summarizeProviderResult) }),
  }
}

async function checkHydrology(config: RuntimeVerificationConfig, runId: string): Promise<RuntimeEvidenceCell> {
  const gate = evaluateHydrologyWriteGate(process.env, config.hydrologyWriteEnabled)
  if (gate.status !== EVIDENCE_STATUS.PASS) return gate
  const token = normalizeValue(process.env['HYDROLOGY_INGEST_TOKEN'])
  if (!token) return gate
  const proofRunId = `${runId}:hydrology`
  const response = await requestJson(`${config.apiBaseUrl}/api/hydrology/ingest`, {
    'content-type': 'application/json',
    'x-hydrology-ingest-token': token,
  }, 'POST', JSON.stringify({ contractVersion: '1.0.0', source: 'PNA', reason: 'explicit-runtime-verification', proofRunId }))
  return response.status === 202
    ? cell(EVIDENCE_STATUS.PASS, 'Owner-authorized hydrology write was explicitly requested and accepted by the real API', { response, proofRunId })
    : cell(EVIDENCE_STATUS.BLOCKED, 'Owner-authorized hydrology write was requested but not accepted', { response, proofRunId })
}

async function checkRenderWiring(config: RuntimeVerificationConfig): Promise<RuntimeEvidenceCell> {
  const manifestPath = resolve(process.cwd(), '../../render.yaml')
  try {
    const manifest = await readFile(manifestPath, 'utf8')
    const staticChecks = {
      api: /name: agronautas-api/.test(manifest),
      worker: /name: agronautas-runtime-worker/.test(manifest),
      cron: /name: ibera-hydrology-cron/.test(manifest) && /startCommand: pnpm --dir apps\/api scheduler:once/.test(manifest),
      schedulerDisabled: /AGRONAUTAS_SCHEDULER_ENABLED\s+\n\s+value: false/.test(manifest),
    }
    const live = config.renderServiceId && config.renderApiToken
      ? await requestJson(`https://api.render.com/v1/services/${encodeURIComponent(config.renderServiceId)}`, { authorization: `Bearer ${config.renderApiToken}` })
      : null
    const wiringOk = Object.values(staticChecks).every(Boolean)
    return live
      ? live.ok && wiringOk
        ? cell(EVIDENCE_STATUS.PASS, 'Render manifest and authenticated Render service inspection completed; this is not deployment proof', { staticChecks, live: redactHttpObservation(live) })
        : cell(EVIDENCE_STATUS.BLOCKED, 'Render service inspection or static wiring is incomplete; production remains unproven', { staticChecks, live: redactHttpObservation(live) })
      : wiringOk
        ? cell(EVIDENCE_STATUS.NOT_RUN, 'Render wiring is present in render.yaml; live service/deploy/log access is unavailable', { staticChecks })
        : cell(EVIDENCE_STATUS.BLOCKED, 'Render manifest does not contain the required API/worker/cron wiring', { staticChecks })
  } catch (error) {
    return cell(EVIDENCE_STATUS.BLOCKED, 'render.yaml could not be inspected', { error: describeError(error) })
  }
}

async function requestJson(url: string, headers: Record<string, string> = {}, method = 'GET', body?: string): Promise<HttpObservation> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { method, headers, body, signal: controller.signal })
    const text = await response.text()
    let parsed: unknown = text
    try { parsed = text ? JSON.parse(text) as unknown : null } catch { /* preserve non-JSON evidence */ }
    return { url: redactUrl(url), status: response.status, ok: response.ok, body: parsed }
  } catch (error) {
    return { url: redactUrl(url), status: null, ok: false, body: null, error: describeError(error) }
  } finally {
    clearTimeout(timer)
  }
}

function summarizeProviderResult(result: ProviderEvidenceResult): Record<string, unknown> {
  return {
    provider: result.provider,
    signalType: result.signalType,
    mode: result.providerMode,
    freshness: result.freshness,
    sourceUrl: redactUrl(result.sourceUrl),
    retrievedAt: result.retrievedAt,
    observedAt: result.observedAt,
    forecastAt: result.forecastAt,
    timeStandard: result.timeStandard,
    units: result.units,
    httpStatus: result.httpStatus,
    schemaStatus: result.schemaStatus,
    runId: result.runId,
    requestId: result.requestId,
    rawHash: result.rawHash,
    degradationReasons: result.degradationReasons,
  }
}

function safeConfiguration(config: RuntimeVerificationConfig): Record<string, unknown> {
  return {
    apiBaseUrl: config.apiBaseUrl,
    webBaseUrl: config.webBaseUrl,
    artifactRoot: config.artifactRoot,
    fieldId: config.fieldId,
    queueProofEnabled: config.queueProofEnabled,
    chatProofEnabled: config.chatProofEnabled,
    hydrologyWriteEnabled: config.hydrologyWriteEnabled,
    openMeteoCommercialUseApproved: config.openMeteoCommercialUseApproved,
    renderServiceConfigured: Boolean(config.renderServiceId && config.renderApiToken),
    bearerTokenConfigured: Boolean(config.bearerToken),
    databaseConfigured: Boolean(process.env['DATABASE_URL']),
    redisConfigured: Boolean(process.env['REDIS_URL']),
  }
}

function redactHttpObservation(observation: HttpObservation): Record<string, unknown> {
  return { ...observation, body: isRecord(observation.body) ? { keys: Object.keys(observation.body) } : observation.body }
}

function readFirstFieldId(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value['items'])) return null
  const first = value['items'][0]
  if (!isRecord(first) || typeof first['fieldId'] !== 'string') return null
  return first['fieldId']
}

function loadLocalEnv(): void {
  dotenv.config({ path: resolve(process.cwd(), '.env'), override: false })
  dotenv.config({ path: resolve(process.cwd(), '../../.env'), override: false })
}

function cell(status: EvidenceStatus, detail: string, evidence?: Record<string, unknown>): RuntimeEvidenceCell {
  return { status, detail, ...(evidence ? { evidence } : {}) }
}

function normalizeValue(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true'
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value)
    for (const key of [...url.searchParams.keys()]) {
      if (/token|key|secret|password|auth/i.test(key)) url.searchParams.set(key, '[redacted]')
    }
    return url.toString()
  } catch {
    return value
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function summarizeCommandOutput(output: string): string {
  const normalized = output.trim()
  return normalized.length > 4_000 ? normalized.slice(-4_000) : normalized
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms))
}

if (process.argv[1] && /verify-agronautas-runtime-real\.(?:ts|js)$/.test(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
