import { createServer } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createApp } from '../server'
import { hydrologyGovernmentIngestResponseSchema } from '@repo/zod-schemas'

interface VerifyOptions {
  out: string
}

const DEFAULT_OUT = '../../artifacts/hydrology-local-real.json'

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const app = createApp()
  const server = createServer(app)
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Local verifier server address unavailable')

  const url = `http://127.0.0.1:${address.port}/api/hydrology/ingest`
  try {
    const startedAt = new Date()
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders(),
      body: JSON.stringify({ contractVersion: '1.0.0', reason: 'local-real-one-shot-all-sources' }),
    })
    const body = await response.json() as unknown
    const parsed = hydrologyGovernmentIngestResponseSchema.safeParse(body)
    const payload = {
      verifier: 'hydrology-local-real-v1',
      mode: 'api',
      oneShot: true,
      repeatedCalls: false,
      request: {
        method: 'POST',
        path: '/api/hydrology/ingest',
        body: { contractVersion: '1.0.0', reason: 'local-real-one-shot-all-sources' },
        authorized: Boolean(process.env['HYDROLOGY_INGEST_TOKEN']),
      },
      environment: {
        nodeEnv: process.env['NODE_ENV'] ?? 'unset',
        hasDatabaseUrl: Boolean(process.env['DATABASE_URL']),
        providerOverrides: {
          PNA: Boolean(process.env['HYDROLOGY_PNA_URL']),
          INA: Boolean(process.env['HYDROLOGY_INA_URL']),
          INMET: Boolean(process.env['HYDROLOGY_INMET_URL']),
          SMN: Boolean(process.env['HYDROLOGY_SMN_URL']),
        },
      },
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      httpStatus: response.status,
      contractValid: parsed.success,
      response: parsed.success ? parsed.data : body,
      parseIssues: parsed.success ? undefined : parsed.error.flatten(),
    }

    const outPath = resolve(process.cwd(), options.out)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify({ outPath, httpStatus: response.status, contractValid: parsed.success, status: parsed.success ? parsed.data.status : 'invalid_contract' }, null, 2))
    if (response.status !== 202 && response.status !== 503) process.exitCode = 1
    if (!parsed.success) process.exitCode = 1
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())))
  }
}

function parseArgs(args: string[]): VerifyOptions {
  const outIndex = args.indexOf('--out')
  const out = outIndex >= 0 ? args[outIndex + 1] : DEFAULT_OUT
  if (!out) throw new Error('--out requires a file path')
  if (args.includes('--all-sources') === false) throw new Error('Use --all-sources to acknowledge the bounded all-source one-shot call')
  const modeIndex = args.indexOf('--mode')
  const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'api'
  if (mode !== 'api') throw new Error('Only --mode api is supported by this local-real verifier')
  return { out }
}

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const token = process.env['HYDROLOGY_INGEST_TOKEN']?.trim()
  if (token) headers['authorization'] = `Bearer ${token}`
  return headers
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(() => process.exit(process.exitCode ?? 0))
