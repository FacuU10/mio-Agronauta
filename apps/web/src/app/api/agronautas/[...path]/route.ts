import { NextRequest, NextResponse } from 'next/server'

const FORWARDED_HEADERS = ['accept', 'content-type', 'x-request-id'] as const
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

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
  const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.search)
  const headers = buildUpstreamHeaders(request)
  const body = METHODS_WITH_BODY.has(request.method) ? await request.text() : undefined

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
  })

  const responseHeaders = new Headers()
  copyResponseHeader(upstreamResponse.headers, responseHeaders, 'content-type')
  copyResponseHeader(upstreamResponse.headers, responseHeaders, 'x-agronautas-mode')
  copyResponseHeader(upstreamResponse.headers, responseHeaders, 'x-agronautas-route-compatibility')

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

function buildUpstreamHeaders(request: NextRequest): Headers {
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

  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  headers.set('x-request-id', requestId)
  return headers
}

function copyResponseHeader(source: Headers, target: Headers, name: string) {
  const value = source.get(name)
  if (value) {
    target.set(name, value)
  }
}
