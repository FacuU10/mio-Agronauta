const DEFAULT_UPSTREAM_TIMEOUT_MS = 120_000
const MAX_UPSTREAM_TIMEOUT_MS = 150_000

export function upstreamTimeoutMs(): number {
  const parsed = Number.parseInt(process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_UPSTREAM_TIMEOUT_MS) : DEFAULT_UPSTREAM_TIMEOUT_MS
}
