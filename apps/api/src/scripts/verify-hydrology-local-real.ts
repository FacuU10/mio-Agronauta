import { createServer } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { Pool } from 'pg'
import { hydrologyGovernmentIngestResponseSchema, type HydrologyGovernmentHttpSummary, type HydrologySource } from '@repo/zod-schemas'

interface VerifyOptions { out: string; allowEmpty: boolean }
interface SourceMatrixRow {
  source: HydrologySource
  requestId: string
  revisionId: string | null
  proofRunId: string
  jobId: string | null
  localApi: EvidenceCell
  providerHttp: EvidenceCell
  localDb: EvidenceCell
  prodApi: EvidenceCell
  prodDb: EvidenceCell
  browser: EvidenceCell
  status: 'pass' | 'blocked'
}
interface EvidenceCell { status: 'pass' | 'blocked' | 'not_run'; detail: string; evidence?: Record<string, unknown> }
export interface ProofDbRow {
  id: string
  proofRunId: string
  source: HydrologySource
  recordsIngested: number
  status: string
  startedAt: string
  finishedAt: string | null
}

interface SourceResultForDbProof { status: 'success' | 'failed' | 'empty' | 'skipped'; recordsIngested: number }
interface CompletionObservationResult { source: HydrologySource; status: 'success' | 'failed' | 'empty' | 'skipped'; recordsIngested: number; httpSummary?: HydrologyGovernmentHttpSummary }
interface CompletionObservation {
  proofRunId?: string
  status: 'queued' | 'started' | 'completed' | 'partial' | 'failed' | 'unavailable' | 'maintenance'
  results?: CompletionObservationResult[]
  acknowledgementStatus?: number
  durableRowId?: string | null
}
interface ProofDbClient {
  query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }>
  end(): Promise<void>
}

const SOURCES: HydrologySource[] = ['PNA', 'INA', 'INMET', 'SMN']
const DEFAULT_OUT = '../../artifacts/hydrology-local-real-matrix.json'
const COMPLETION_OBSERVATION_WAIT_MS = 60_000

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const proofRunId = `proof-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`
  const { createApp } = await import('../server.js')
  const app = createApp()
  const server = createServer(app)
  const proofDb = createProofDbClient()
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Local verifier server address unavailable')
  const baseUrl = `http://127.0.0.1:${address.port}`
  try {
    const startedAt = new Date()
    const sourceMatrix: SourceMatrixRow[] = []
    for (const source of SOURCES) {
      sourceMatrix.push(await verifySource(baseUrl, proofRunId, source, options.allowEmpty, proofDb))
    }
    const payload = {
      verifier: 'hydrology-local-real-matrix-v1',
      runId: proofRunId,
      proofRunId,
      revisionId: resolveRevisionId(),
      oneShotPerSource: true,
      retries: 0,
      sources: SOURCES,
      environment: environmentEvidence(),
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      sourceMatrix,
      passed: sourceMatrix.every((row) => row.status === 'pass'),
    }
    const outPath = resolve(process.cwd(), options.out)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify({ outPath, proofRunId, passed: payload.passed, sourceStatuses: Object.fromEntries(sourceMatrix.map((row) => [row.source, row.status])) }, null, 2))
    if (!payload.passed) process.exitCode = 1
  } finally {
    await proofDb?.end()
    await new Promise<void>((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())))
  }
}

async function verifySource(baseUrl: string, proofRunId: string, source: HydrologySource, allowEmpty: boolean, proofDb: ProofDbClient | undefined): Promise<SourceMatrixRow> {
  const requestId = `${proofRunId}:${source}:request`
  const revisionId = resolveRevisionId()
  const response = await fetch(`${baseUrl}/api/hydrology/ingest`, {
    method: 'POST',
    headers: getHydrologyIngestHeaders(requestId),
    body: JSON.stringify({ contractVersion: '1.0.0', source, reason: 'local-real-one-shot-source', proofRunId }),
  })
  const body = await response.json() as unknown
  const parsed = hydrologyGovernmentIngestResponseSchema.safeParse(body)
  const observation = parsed.success ? await observeCompletion(baseUrl, parsed.data.statusPath, proofRunId) : undefined
  const result = observation?.results?.find((item) => item.source === source)
  const providerHttp = cell(Boolean(result?.httpSummary), result?.httpSummary ? `${result.httpSummary.host}${result.httpSummary.path} status=${result.httpSummary.status ?? 'n/a'} elapsedMs=${result.httpSummary.elapsedMs}` : 'missing provider http summary', result?.httpSummary)
  const localDb = await readDatabaseEvidence(proofDb, proofRunId, source, result, allowEmpty)
  const durableRowId = getSingleCorrelatedRowId(localDb)
  const completion = observation ? { ...observation, acknowledgementStatus: response.status, durableRowId } : undefined
  const localApi = cell(response.status === 202 && parsed.success && parsed.data.proofRunId === proofRunId && completionObservationPassesGate(completion, proofRunId, source), `ackHTTP=${response.status}; ackContract=${parsed.success}; completionStatus=${observation?.status ?? 'not_observed'}; proofRunId=${observation?.proofRunId ?? 'invalid'}`)
  const prodApi = notRun('Run after deployment with production base URL; local apply cannot mutate production without credentials')
  const prodDb = notRun('Requires read-only production DATABASE_URL; no secret is guessed or printed')
  const browser = notRun('Use Playwright/local browser step against /municipalities after local API has rows')
  return { source, requestId, revisionId, proofRunId, jobId: null, localApi, providerHttp, localDb, prodApi, prodDb, browser, status: [localApi, providerHttp, localDb].every((item) => item.status === 'pass') && sourceResultPassesGate(result, allowEmpty) ? 'pass' : 'blocked' }
}

export function getHydrologyIngestHeaders(requestId?: string): Record<string, string> {
  const token = process.env['HYDROLOGY_INGEST_TOKEN']?.trim()
  if (!token) throw new Error('HYDROLOGY_INGEST_TOKEN is required for local hydrology verification')
  if (requestId && !isBoundedCorrelationId(requestId)) throw new Error('requestId exceeds the safe correlation bound')
  return {
    'content-type': 'application/json',
    'x-hydrology-ingest-token': token,
    ...(requestId ? { 'x-request-id': requestId } : {}),
  }
}

export function completionObservationPassesGate(response: CompletionObservation | undefined, proofRunId: string, source: HydrologySource): boolean {
  const hasTerminalSourceResult = response?.proofRunId === proofRunId
    && ['completed', 'partial', 'failed'].includes(response.status)
    && Boolean(response.results?.some((item) => item.source === source))
  if (!hasTerminalSourceResult) return false
  const durableRowIdIsSafe = response.durableRowId === undefined || response.durableRowId === null || isBoundedCorrelationId(response.durableRowId)
  return durableRowIdIsSafe && (response.acknowledgementStatus !== 202 || Boolean(response.durableRowId))
}

async function observeCompletion(baseUrl: string, statusPath: string | undefined, proofRunId: string): Promise<CompletionObservation | undefined> {
  if (!statusPath) return undefined
  const response = await fetch(`${baseUrl}${statusPath}?waitMs=${COMPLETION_OBSERVATION_WAIT_MS}`, { headers: { accept: 'application/json' } })
  const body = await response.json() as unknown
  const parsed = hydrologyGovernmentIngestResponseSchema.safeParse(body)
  if (!response.ok || !parsed.success || parsed.data.proofRunId !== proofRunId) return undefined
  return parsed.data
}

async function readDatabaseEvidence(proofDb: ProofDbClient | undefined, proofRunId: string, source: HydrologySource, result: SourceResultForDbProof | undefined, allowEmpty: boolean): Promise<EvidenceCell> {
  if (!proofDb) return cell(false, 'DATABASE_URL is not configured; production DB correlation was not attempted')
  if (!result) return cell(false, `local API did not return a result for ${source}`)
  try {
    const rows = await readProofRows(proofDb, proofRunId, source)
    return evaluateDatabaseProof(proofRunId, source, result, rows, allowEmpty)
  } catch {
    return cell(false, `read-only production DB proof query failed for ${source}; correlation is unavailable`)
  }
}

export function evaluateDatabaseProof(proofRunId: string, source: HydrologySource, result: SourceResultForDbProof, rows: ProofDbRow[], allowEmpty: boolean): EvidenceCell {
  if (!isBoundedCorrelationId(proofRunId)) return cell(false, 'database proof correlation identifier is missing or unsafe')
  const correlatedRows = rows.filter((row) => row.proofRunId === proofRunId && row.source === source)
  if (correlatedRows.length === 0) return cell(false, `no correlated production DB row for ${source} proofRunId`)
  if (correlatedRows.some((row) => !isBoundedCorrelationId(row.id))) return cell(false, `${source} DB row identifier is missing or unsafe; no row identifier was retained`)
  if (correlatedRows.length !== 1) return cell(false, `${source} has duplicate DB rows for one proofRunId; exactly one row is required`, { rowCount: correlatedRows.length })
  const row = correlatedRows[0]
  const recordsMatch = row?.recordsIngested === result.recordsIngested
  const recordsAllowed = allowEmpty || result.recordsIngested > 0
  if (!row || !recordsMatch || (!recordsAllowed && result.status === 'success')) {
    return cell(false, `${source} DB row is not a successful records correlation`, { rowCount: correlatedRows.length, recordsIngested: row?.recordsIngested ?? 0, resultRecordsIngested: result.recordsIngested })
  }
  return cell(true, `${source} DB row correlated to proofRunId=${proofRunId} status=${row.status}`, { rowCount: correlatedRows.length, recordsIngested: row.recordsIngested, rowIds: correlatedRows.map((item) => item.id) })
}

export function sourceResultPassesGate(result: SourceResultForDbProof | undefined, allowEmpty: boolean): boolean {
  return result?.status === 'success' && (allowEmpty || result.recordsIngested > 0)
}

async function readProofRows(proofDb: ProofDbClient, proofRunId: string, source: HydrologySource): Promise<ProofDbRow[]> {
  const result = await proofDb.query(
    `SELECT id::text AS "id", proof_run_id AS "proofRunId", source, records_ingested AS "recordsIngested", status, started_at AS "startedAt", finished_at AS "finishedAt"
       FROM hydrology_ingestion_runs
      WHERE proof_run_id = $1
        AND source = $2
      ORDER BY started_at DESC`,
    [proofRunId, source],
  )
  return result.rows.map(toProofDbRow)
}

function toProofDbRow(value: unknown): ProofDbRow {
  if (!isRecord(value)) throw new Error('invalid proof DB row')
  const id = requiredString(value['id'])
  const proofRunId = requiredString(value['proofRunId'])
  const source = value['source']
  const status = requiredString(value['status'])
  const startedAt = requiredDateString(value['startedAt'])
  const recordsIngested = Number(value['recordsIngested'])
  if (!isHydrologySource(source) || !isBoundedCorrelationId(id) || !isBoundedCorrelationId(proofRunId) || !Number.isInteger(recordsIngested) || recordsIngested < 0) throw new Error('invalid proof DB row')
  const finishedAt = value['finishedAt'] === null || value['finishedAt'] === undefined ? null : requiredDateString(value['finishedAt'])
  return { id, proofRunId, source, recordsIngested, status, startedAt, finishedAt }
}

function createProofDbClient(): ProofDbClient | undefined {
  const connectionString = process.env['DATABASE_URL']?.trim()
  if (!connectionString) return undefined
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 15_000, statement_timeout: 15_000, max: 1 })
  return {
    async query(sql, params) {
      const result = await pool.query(sql, params)
      return { rows: result.rows as unknown[] }
    },
    end: () => pool.end(),
  }
}

function parseArgs(args: string[]): VerifyOptions {
  const outIndex = args.indexOf('--out')
  const out = outIndex >= 0 ? args[outIndex + 1] : DEFAULT_OUT
  if (!out) throw new Error('--out requires a file path')
  if (!args.includes('--all-sources')) throw new Error('Use --all-sources to acknowledge one bounded call per source')
  return { out, allowEmpty: args.includes('--allow-empty') }
}

function cell(ok: boolean, detail: string, evidence?: Record<string, unknown>): EvidenceCell { return { status: ok ? 'pass' : 'blocked', detail, evidence } }
function notRun(detail: string): EvidenceCell { return { status: 'not_run', detail } }

function environmentEvidence() {
  return {
    nodeEnv: process.env['NODE_ENV'] ?? 'unset',
    hasDatabaseUrl: Boolean(process.env['DATABASE_URL']),
    databaseTarget: databaseTargetClass(process.env['DATABASE_URL']),
    providerOverrides: Object.fromEntries(SOURCES.map((source) => [source, Boolean(process.env[`HYDROLOGY_${source}_URL`])])),
  }
}

function databaseTargetClass(value: string | undefined): 'unset' | 'local' | 'remote' | 'invalid' {
  if (!value) return 'unset'
  try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(value).hostname) ? 'local' : 'remote' } catch { return 'invalid' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('invalid proof DB row')
  return value
}

function requiredDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return requiredString(value)
}

function isHydrologySource(value: unknown): value is HydrologySource {
  return typeof value === 'string' && SOURCES.includes(value as HydrologySource)
}

function resolveRevisionId(): string | null {
  const revision = process.env['RENDER_GIT_COMMIT']?.trim()
    ?? process.env['VERCEL_GIT_COMMIT_SHA']?.trim()
    ?? process.env['GIT_COMMIT_SHA']?.trim()
  return revision && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(revision) ? revision : null
}

function isBoundedCorrelationId(value: string): boolean {
  return value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
}

function getSingleCorrelatedRowId(evidence: EvidenceCell): string | null {
  const rowIds = evidence.evidence?.['rowIds']
  return Array.isArray(rowIds) && rowIds.length === 1 && typeof rowIds[0] === 'string' && isBoundedCorrelationId(rowIds[0]) ? rowIds[0] : null
}

if (process.argv[1] && /verify-hydrology-local-real\.(?:ts|js)$/.test(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }).finally(() => process.exit(process.exitCode ?? 0))
}
