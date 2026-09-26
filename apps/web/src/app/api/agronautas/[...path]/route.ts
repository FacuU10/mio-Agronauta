import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac } from 'node:crypto'

const FORWARDED_HEADERS = ['accept', 'content-type', 'x-request-id', 'x-revision-id'] as const
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const DEFAULT_UPSTREAM_TIMEOUT_MS = 120_000
const MAX_UPSTREAM_TIMEOUT_MS = 150_000
const BFF_SESSION_COOKIE = 'agronautas_session'
const PUBLIC_OPERATION_PATHS = new Set(['health', 'ready'])

interface BffSession {
  accessToken: string
  refreshToken: string
  accessExpiresAt: string
  refreshExpiresAt: string
  principal: {
    actorId: string
    sessionId: string
    membershipId: string
    workspaceId: string
    workspaceKey: string
    role: string
    scopes: string[]
    expiresAt: string
  }
}

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
  const session = readSession(request)
  const pathKey = path.join('/')
  const bffSecret = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']?.trim()
  if (!bffSecret) return bffCredentialUnavailable(requestId)
  const isPublicOperation = PUBLIC_OPERATION_PATHS.has(pathKey)
  if (!session && pathKey === 'auth/logout') return clearLoggedOutSession(requestId, request)
  if (!session && pathKey !== 'auth/login' && !isPublicOperation) return bffUnauthorized(requestId)
  const headers = buildUpstreamHeaders(request, requestId, path, session)
  if (!headers) return bffCredentialUnavailable(requestId)
  const body = await buildUpstreamBody(request, path, session)

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

  if (isAuthSessionResponse(path, upstreamResponse.status)) {
    return buildAuthSessionResponse(upstreamResponse, requestId, request)
  }

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  })
  if (pathKey === 'auth/logout' && upstreamResponse.ok) {
    clearSessionCookie(response, request)
  }
  if (pathKey === 'auth/refresh' && (upstreamResponse.status === 401 || upstreamResponse.status === 409)) clearSessionCookie(response, request)

  return response
}

function buildUpstreamUrl(path: string[], search: string): string {
  const baseUrl = (process.env['AGRONAUTAS_API_INTERNAL_URL'] || 'http://localhost:3001').replace(/\/+$/, '')
  const joinedPath = path.length ? `/${path.join('/')}` : ''
  return `${baseUrl}/agronautas${joinedPath}${search}`
}

function buildUpstreamHeaders(request: NextRequest, requestId: string, path: string[], session: BffSession | null): Headers | null {
  const headers = new Headers()

  for (const headerName of FORWARDED_HEADERS) {
    const value = request.headers.get(headerName)
    if (value) {
      headers.set(headerName, value)
    }
  }

  const bffSecret = process.env['AGRONAUTAS_BFF_BEARER_TOKEN']?.trim()
  if (!bffSecret) return null
  const pathKey = path.join('/')
  if (pathKey === 'auth/refresh') headers.set('content-type', 'application/json')
  if (pathKey === 'auth/login' || PUBLIC_OPERATION_PATHS.has(pathKey)) {
    headers.set('authorization', `Bearer ${bffSecret}`)
    headers.set('x-agronautas-bff-assertion', signOperationAssertion(pathKey, bffSecret))
  } else {
    if (!session) return null
    headers.set('authorization', `Bearer ${session.accessToken}`)
    headers.set('x-agronautas-bff-assertion', signSessionAssertion(session.accessToken, session.principal, bffSecret))
  }

  headers.set('x-request-id', requestId)
  return headers
}

async function buildUpstreamBody(request: NextRequest, path: string[], session: BffSession | null): Promise<string | undefined> {
  if (!METHODS_WITH_BODY.has(request.method)) return undefined
  if (path.join('/') === 'auth/refresh') {
    return session ? JSON.stringify({ refreshToken: session.refreshToken }) : undefined
  }
  return request.text()
}

function readSession(request: NextRequest): BffSession | null {
  const encoded = request.cookies.get(BFF_SESSION_COOKIE)?.value
  if (!encoded) return null
  try {
    const candidate = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as BffSession
    if (!candidate.accessToken || !candidate.refreshToken || !candidate.principal?.actorId || !candidate.principal.workspaceId) return null
    return candidate
  } catch {
    return null
  }
}

function signOperationAssertion(operation: string, secret: string): string {
  return signAssertion({ kind: 'operation', operation }, secret)
}

function signSessionAssertion(accessToken: string, principal: BffSession['principal'], secret: string): string {
  return signAssertion({ kind: 'session', accessTokenHash: createHash('sha256').update(accessToken).digest('hex'), principal }, secret)
}

function signAssertion(payload: Record<string, unknown>, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('base64url')}`
}

function isAuthSessionResponse(path: string[], status: number): boolean {
  return (path.join('/') === 'auth/login' || path.join('/') === 'auth/refresh') && status >= 200 && status < 300
}

async function buildAuthSessionResponse(upstreamResponse: Response, requestId: string, request: NextRequest): Promise<NextResponse> {
  const payload = await upstreamResponse.json() as BffSession
  if (!payload.accessToken || !payload.refreshToken || !payload.principal) {
    return NextResponse.json({
      contractVersion: '1.0.0', code: 'AUTH_MAINTENANCE', message: 'Agronautas authentication response is invalid.', retryable: true,
      details: { requestId, phase: 'bff_auth_contract' },
    }, { status: 503, headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' } })
  }

  const sessionValue = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const publicPayload = { ...payload }
  delete (publicPayload as Partial<BffSession>).accessToken
  delete (publicPayload as Partial<BffSession>).refreshToken
  const response = NextResponse.json(publicPayload, { status: upstreamResponse.status, headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' } })
  setSessionCookie(response, sessionValue, payload.refreshExpiresAt, request)
  return response
}

function setSessionCookie(response: NextResponse, value: string, expiresAt: string, request: NextRequest): void {
  const maxAge = Math.max(1, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  response.cookies.set(BFF_SESSION_COOKIE, value, {
    path: '/',
    maxAge,
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
  })
}

function clearSessionCookie(response: NextResponse, request: NextRequest): void {
  response.cookies.set(BFF_SESSION_COOKIE, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
  })
}

function clearLoggedOutSession(requestId: string, request: NextRequest): NextResponse {
  const headers = new Headers({ 'x-request-id': requestId, 'Cache-Control': 'no-store' })
  const response = new NextResponse(null, { status: 204, headers })
  clearSessionCookie(response, request)
  return response
}

function bffUnauthorized(requestId: string): NextResponse {
  return NextResponse.json({
    contractVersion: '1.0.0',
    code: 'UNAUTHORIZED',
    message: 'Agronautas session is required for this request.',
    retryable: false,
    details: { requestId, phase: 'bff_session' },
  }, { status: 401, headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store', 'WWW-Authenticate': 'Bearer' } })
}

function bffCredentialUnavailable(requestId: string) {
  return NextResponse.json({
    contractVersion: '1.0.0',
    code: 'AUTH_MAINTENANCE',
    message: 'Agronautas server authentication is unavailable for this request.',
    retryable: true,
    details: { requestId, phase: 'bff_credential' },
  }, { status: 503, headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' } })
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
