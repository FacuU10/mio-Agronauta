type RuntimeMode = 'real' | 'demo'

const DEFAULT_ROUTE_PREFIX = '/agronautas'
const DEFAULT_OPTIONAL_READINESS_SERVICES: string[] = []
const DISABLED_OPTIONAL_READINESS_SERVICES = new Set(['none', 'disabled', 'off'])
export const DEFAULT_READINESS_DEPENDENCY_TIMEOUT_MS = 2000
export const MAX_READINESS_DEPENDENCY_TIMEOUT_MS = 60_000
export const AGRONAUTAS_SCHEDULER_UNAVAILABLE_REASON = 'scheduler_dispatch_capability_not_configured'

export interface AgronautasRuntimeConfig {
  mode: RuntimeMode
  routePrefix: string
  trustProxy: boolean | number | string
  runtimeV2Enabled?: boolean
  maintenanceMode?: boolean
  schedulerEnabled: boolean
  optionalReadinessServices: string[]
  runtimeRequired: boolean
  workerHeartbeatMaxAgeSeconds: number
  readinessDependencyTimeoutMs: number
  revision: string | null
}

export function getAgronautasRuntimeConfig(env: NodeJS.ProcessEnv = process.env): AgronautasRuntimeConfig {
  return {
    mode: parseRuntimeMode(env['AGRONAUTAS_RUNTIME_MODE']),
    routePrefix: normalizeRoutePrefix(env['AGRONAUTAS_ROUTE_PREFIX']),
    trustProxy: parseTrustProxy(env['TRUST_PROXY'], env['RENDER']),
    runtimeV2Enabled: parseBoolean(env['AGRONAUTAS_RUNTIME_V2_ENABLED'], false),
    maintenanceMode: parseBoolean(env['AGRONAUTAS_MAINTENANCE_MODE'], false),
    schedulerEnabled: parseBoolean(env['AGRONAUTAS_SCHEDULER_ENABLED'], false),
    optionalReadinessServices: parseOptionalReadinessServices(env['READINESS_OPTIONAL_SERVICES']),
    runtimeRequired: parseBoolean(env['AGRONAUTAS_RUNTIME_REQUIRED'], false),
    workerHeartbeatMaxAgeSeconds: parsePositiveInteger(env['AGRONAUTAS_WORKER_HEARTBEAT_MAX_AGE_SECONDS'], 180),
    readinessDependencyTimeoutMs: parseBoundedPositiveInteger(env['AGRONAUTAS_READINESS_DEPENDENCY_TIMEOUT_MS'], DEFAULT_READINESS_DEPENDENCY_TIMEOUT_MS, MAX_READINESS_DEPENDENCY_TIMEOUT_MS),
    revision: parseRevision(env['RENDER_GIT_COMMIT']),
  }
}

export function parseAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  return parseCsv(env['CORS_ORIGINS'], ['http://localhost:3000'])
}

function parseRuntimeMode(value: string | undefined): RuntimeMode {
  return value === 'demo' ? 'demo' : 'real'
}

function normalizeRoutePrefix(value: string | undefined): string {
  const trimmed = (value ?? DEFAULT_ROUTE_PREFIX).trim()
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const normalized = withLeadingSlash.replace(/\/+$/, '')
  return normalized.length ? normalized : DEFAULT_ROUTE_PREFIX
}

function parseTrustProxy(value: string | undefined, renderEnvironment: string | undefined): boolean | number | string {
  if (!value) return renderEnvironment ? 1 : false
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  const numeric = Number(trimmed)
  if (Number.isInteger(numeric) && numeric >= 0) {
    return numeric
  }

  return trimmed
}

function parseCsv(value: string | undefined, fallback: string[]): string[] {
  const items = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return items?.length ? items : fallback
}

function parseOptionalReadinessServices(value: string | undefined): string[] {
  const normalized = value?.trim().toLowerCase()
  if (!normalized || DISABLED_OPTIONAL_READINESS_SERVICES.has(normalized)) {
    return DEFAULT_OPTIONAL_READINESS_SERVICES
  }

  return parseCsv(value, DEFAULT_OPTIONAL_READINESS_SERVICES)
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return fallback
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseBoundedPositiveInteger(value: string | undefined, fallback: number, cap: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, cap)
}

function parseRevision(value: string | undefined): string | null {
  const revision = value?.trim()
  return revision && /^[0-9a-f]{7,64}$/i.test(revision) ? revision : null
}
