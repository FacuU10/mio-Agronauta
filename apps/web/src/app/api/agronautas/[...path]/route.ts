import { NextRequest, NextResponse } from 'next/server'

const FORWARDED_HEADERS = ['accept', 'content-type', 'x-request-id', 'x-revision-id'] as const
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const DEFAULT_UPSTREAM_TIMEOUT_MS = 120_000
const MAX_UPSTREAM_TIMEOUT_MS = 150_000

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAgronautasRequest(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAgronautasRequest(request, context)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyAgronautasRequest(request, context)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyAgronautasRequest(request, context)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyAgronautasRequest(request, context)
}

type RouteContext = { params: Promise<{ path?: string[] }> }

async function proxyAgronautasRequest(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.search)
  const headers = buildUpstreamHeaders(request, requestId)
  const body = METHODS_WITH_BODY.has(request.method) ? await request.text() : undefined

  let upstreamResponse: Response
  const controller = new AbortController()
  const timeoutMs = upstreamTimeoutMs()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return agronautasProxyError(requestId, timedOut)
  } finally {
    clearTimeout(timeout)
  }

  const responseHeaders = new Headers()
  copyResponseHeader(upstreamResponse.headers, responseHeaders, 'content-type')
  copyResponseHeader(upstreamResponse.headers, responseHeaders, 'retry-after')
  copyResponseHeader(upstreamResponse.headers, responseHeaders, 'x-agronautas-mode')
  copyResponseHeader(upstreamResponse.headers, responseHeaders, 'x-agronautas-route-compatibility')
  copyResponseHeader(upstreamResponse.headers, responseHeaders, 'x-revision-id')
  responseHeaders.set('x-request-id', upstreamResponse.headers.get('x-request-id') || requestId)
  responseHeaders.set('Cache-Control', 'no-store')

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  })
}

function buildUpstreamUrl(path: string[], search: string): string {
  const baseUrl = (process.env['AGRONAUTAS_API_INTERNAL_URL'] || 'http://localhost:3001').replace(/\/+$/, '')
  const joinedPath = path.length ? `/${path.join('/')}` : ''
  return `${baseUrl}/agronautas${joinedPath}${search}`
}

function buildUpstreamHeaders(request: NextRequest, requestId: string): Headers {
  const headers = new Headers()

  for (const headerName of FORWARDED_HEADERS) {
    const value = request.headers.get(headerName)
    if (value) {
      headers.set(headerName, value)
    }
  }

  const bearerToken = (process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] || process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR'])?.trim()
  if (bearerToken) {
    headers.set('authorization', `Bearer ${bearerToken}`)
  }

  headers.set('x-request-id', requestId)
  return headers
}

function upstreamTimeoutMs(): number {
  const parsed = Number.parseInt(process.env['AGRONAUTAS_BFF_TIMEOUT_MS'] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_UPSTREAM_TIMEOUT_MS) : DEFAULT_UPSTREAM_TIMEOUT_MS
}

function agronautasProxyError(requestId: string, timedOut: boolean) {
  return NextResponse.json({
    contractVersion: '1.0.0',
    code: 'AGRONAUTAS_BFF_UPSTREAM_UNAVAILABLE',
    message: timedOut ? 'Agronautas upstream request timed out.' : 'Agronautas upstream request failed.',
    retryable: true,
    details: { requestId, phase: timedOut ? 'upstream_timeout' : 'upstream_fetch' },
  }, { status: timedOut ? 503 : 502, headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' } })
}

function copyResponseHeader(source: Headers, target: Headers, name: string) {
  const value = source.get(name)
  if (value) {
    target.set(name, value)
  }
}
