import { randomUUID } from 'node:crypto'
import pino from 'pino'
import pinoHttp from 'pino-http'

type RequestLike = {
  id?: unknown
  headers?: Record<string, string | string[] | undefined>
}

const serviceName = process.env['API_SERVICE_NAME'] || 'agronautas-api'

export const logger = pino({
  name: serviceName,
  level: process.env['LOG_LEVEL'] || (process.env['NODE_ENV'] === 'test' ? 'silent' : 'info'),
  base: { service: serviceName },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'headers.authorization', 'headers.cookie'],
    remove: true,
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
})

export function getRequestId(request: RequestLike): string {
  const reqId = request.id
  if (typeof reqId === 'string' && reqId.length > 0) return reqId

  const header = request.headers?.['x-request-id'] ?? request.headers?.['x-correlation-id']
  if (typeof header === 'string' && header.length > 0) return header
  if (Array.isArray(header) && typeof header[0] === 'string' && header[0].length > 0) return header[0]

  return 'unknown'
}

export const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers['x-request-id'] ?? req.headers['x-correlation-id']
    const requestId = typeof incoming === 'string'
      ? incoming
      : Array.isArray(incoming) && typeof incoming[0] === 'string'
        ? incoming[0]
        : randomUUID()

    res.setHeader('x-request-id', requestId)
    return requestId
  },
  customProps(req) {
    return { requestId: getRequestId(req) }
  },
  serializers: {
    req(req) {
      return {
        id: getRequestId(req),
        method: req.method,
        url: req.url,
      }
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      }
    },
  },
})
