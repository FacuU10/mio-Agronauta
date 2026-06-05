import type { NextFunction, Request, Response } from 'express'
import { getRequestId, logger } from '../../infrastructure/observability/logger'

interface SafeErrorShape {
  statusCode: number
  code: string
  message: string
}

export function normalizeError(error: unknown): SafeErrorShape {
  const candidate = error as Partial<Error> & { status?: unknown; statusCode?: unknown; code?: unknown; expose?: unknown; publicMessage?: unknown }
  const statusCode = readStatusCode(candidate)
  const code = typeof candidate?.code === 'string' && candidate.code.length > 0
    ? candidate.code
    : statusCode === 404
      ? 'NOT_FOUND'
      : statusCode >= 500
        ? 'INTERNAL_SERVER_ERROR'
        : 'REQUEST_FAILED'

  const canExpose = candidate?.expose === true || typeof candidate?.publicMessage === 'string'
  const message = canExpose
    ? String(candidate.publicMessage ?? candidate.message)
    : statusCode === 404
      ? 'Route not found'
      : statusCode >= 500
        ? 'Internal server error'
        : 'Request failed'

  return { statusCode, code, message }
}

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = getRequestId(req)
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      requestId,
    },
  })
}

export function globalErrorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err)
    return
  }

  const requestId = getRequestId(req)
  const normalized = normalizeError(err)

  logger.error({
    err,
    requestId,
    method: req.method,
    path: req.originalUrl,
  }, 'Unhandled request error')

  res.status(normalized.statusCode).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      requestId,
    },
  })
}

function readStatusCode(error: { status?: unknown; statusCode?: unknown } | undefined): number {
  const candidate = typeof error?.statusCode === 'number'
    ? error.statusCode
    : typeof error?.status === 'number'
      ? error.status
      : 500

  return candidate >= 400 && candidate <= 599 ? candidate : 500
}
