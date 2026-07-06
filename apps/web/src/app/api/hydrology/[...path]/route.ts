import { NextRequest, NextResponse } from 'next/server'

const FORWARDED_HEADERS = ['accept', 'content-type', 'x-request-id'] as const
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

type RouteContext = { params: Promise<{ path?: string[] }> }

export async function GET(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }
export async function POST(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }
export async function PUT(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }
export async function PATCH(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }
export async function DELETE(request: NextRequest, context: RouteContext) { return proxyHydrologyRequest(request, context) }

async function proxyHydrologyRequest(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params
  const upstreamResponse = await fetch(buildUpstreamUrl(path, request.nextUrl.search), {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    body: METHODS_WITH_BODY.has(request.method) ? await request.text() : undefined,
    cache: 'no-store',
  })

  const headers = new Headers()
  copyResponseHeader(upstreamResponse.headers, headers, 'content-type')
  copyResponseHeader(upstreamResponse.headers, headers, 'x-request-id')
  return new NextResponse(upstreamResponse.body, { status: upstreamResponse.status, headers })
}

function buildUpstreamUrl(path: string[], search: string): string {
  const baseUrl = (process.env['AGRONAUTAS_API_INTERNAL_URL'] || 'http://localhost:3001').replace(/\/+$/, '')
  const joinedPath = path.length ? `/${path.map(encodeURIComponent).join('/')}` : ''
  return `${baseUrl}/api/hydrology${joinedPath}${search}`
}

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers()
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  const bearerToken = (process.env['AGRONAUTAS_BFF_BEARER_TOKEN'] || process.env['AGRONAUTAS_AUTH_TOKEN_OPERATOR'])?.trim()
  if (bearerToken) headers.set('authorization', `Bearer ${bearerToken}`)
  headers.set('x-request-id', request.headers.get('x-request-id') || crypto.randomUUID())
  return headers
}

function copyResponseHeader(source: Headers, target: Headers, name: string) {
  const value = source.get(name)
  if (value) target.set(name, value)
}
