import { NextRequest, NextResponse } from 'next/server'

const FORWARDED_HEADERS = ['accept', 'content-type', 'x-request-id'] as const
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const DEFAULT_UPSTREAM_TIMEOUT_MS = 12_000

type RouteContext = { params: Promise<{ path?: string[] }> }

export async function GET(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }
export async function POST(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }
export async function PUT(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }
export async function PATCH(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }
export async function DELETE(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }

async function proxyHydrologyRequest(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const upstream = buildUpstreamUrl(path, request.nextUrl.search)
  if (!upstream.ok) {
    console.error('[hydrology-bff] upstream configuration failure', { requestId, reason: upstream.reason, nodeEnv: process.env['NODE_ENV'] ?? 'unset' })
    return hydrologyProxyError(503, requestId, 'upstream_configuration', 'Hydrology upstream is not configured for production.')
  }
  const headers = buildUpstreamHeaders(request, requestId)
  console.info('[hydrology-bff] forwarding hydrology request', {
    requestId,
    method: request.method,
    upstreamOrigin: upstream.origin,
    upstreamPath: upstream.pathname,
    forwardedHeaders: [...headers.keys()].filter((name) => name !== 'authorization'),
  })
  let upstreamResponse: Response
  const controller = new AbortController()
  const timeoutMs = upstreamTimeoutMs()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    upstreamResponse = await fetch(upstream.url, {
      method: request.method,
      headers,
      body: METHODS_WITH_BODY.has(request.method) ? await request.text() : undefined,
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    console.error('[hydrology-bff] upstream fetch failure', { requestId, upstreamOrigin: upstream.origin, upstreamPath: upstream.pathname, errorName: error instanceof Error ? error.name : typeof error, timedOut, timeoutMs })
    return hydrologyProxyError(timedOut ? 503 : 502, requestId, timedOut ? 'upstream_timeout' : 'upstream_fetch', timedOut ? 'Hydrology upstream request timed out.' : 'Hydrology upstream request failed.', { upstreamOrigin: upstream.origin, upstreamPath: upstream.pathname, timeoutMs })
  } finally {
    clearTimeout(timeout)
  }

  const responseHeaders = new Headers()
  copyResponseHeader(upstreamResponse.headers, responseHeaders, 'content-type')
  responseHeaders.set('x-request-id', upstreamResponse.headers.get('x-request-id') || requestId)
  return new NextResponse(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders })
}

function buildUpstreamUrl(path: string[], search: string): { ok: true; url: string; origin: string; pathname: string } | { ok: false; reason: string } {
  const configuredUrl = process.env['AGRONAUTAS_API_INTERNAL_URL']?.trim()
  const isProduction = process.env['NODE_ENV'] === 'production'
  if (isProduction && !configuredUrl) return { ok: false, reason: 'missing_AGRONAUTAS_API_INTERNAL_URL' }
  const baseUrl = (configuredUrl || 'http://localhost:3001').replace(/\/+$/, '')
  let parsed: URL
  try {
    parsed = new URL(baseUrl)
  } catch {
    return { ok: false, reason: 'invalid_AGRONAUTAS_API_INTERNAL_URL' }
  }
  const hostname = parsed.hostname.toLowerCase()
  if (isProduction && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')) return { ok: false, reason: 'localhost_upstream_forbidden_in_production' }
  const joinedPath = path.length ? `/${path.map(encodeURIComponent).join('/')}` : ''
  const pathname = `/api/hydrology${joinedPath}`
  return { ok: true, url: `${baseUrl}${pathname}${search}`, origin: parsed.origin, pathname }
}

function buildUpstreamHeaders(request: NextRequest, requestId: string): Headers {
  const headers = new Headers()
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  headers.set('x-request-id', requestId)
  return headers
}

function hydrologyProxyError(status: 502 | 503, requestId: string, phase: 'upstream_configuration' | 'upstream_fetch' | 'upstream_timeout', message: string, details: Record<string, unknown> = {}) {
  return NextResponse.json({
    contractVersion: '1.0.0',
    code: 'HYDROLOGY_BFF_UPSTREAM_UNAVAILABLE',
    message,
    retryable: true,
    details: { requestId, phase, ...details },
  }, { status, headers: { 'x-request-id': requestId } })
}

function upstreamTimeoutMs(): number {
  const parsed = Number.parseInt(process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 60_000 ? parsed : DEFAULT_UPSTREAM_TIMEOUT_MS
}

function copyResponseHeader(source: Headers, target: Headers, name: string) {
  const value = source.get(name)
  if (value) target.set(name, value)
}
