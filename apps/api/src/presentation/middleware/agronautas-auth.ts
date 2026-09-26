import type { NextFunction, Request, Response } from 'express'
import { agronautasContractErrorSchema } from '@repo/zod-schemas'
import { AUTH_FAILURE_CODES, type AuthPrincipal, type AuthScope } from '../../domain/auth/contracts'
import type { AgronautasAuthServicePort } from '../../domain/auth/ports'

export type AgronautasScope = AuthScope

export interface AgronautasAuthenticatedRequest extends Request {
  agronautasPrincipal?: AuthPrincipal
}
export interface AgronautasAuthMiddlewareOptions {
  service: AgronautasAuthServicePort
  workspaceId?: (req: Request) => string | undefined
  fieldId?: (req: Request) => string | undefined
}

export function requireAgronautasScope(scope: AgronautasScope, config: AgronautasAuthMiddlewareOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    return requireServiceScope(scope, config, req as AgronautasAuthenticatedRequest, res, next)
  }
}
export function requireAgronautasPrincipal(options: AgronautasAuthMiddlewareOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    void requireServiceScope(undefined, options, req as AgronautasAuthenticatedRequest, res, next)
  }
}

async function requireServiceScope(scope: AuthScope | undefined, options: AgronautasAuthMiddlewareOptions, req: AgronautasAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  let token = parseBearerToken(req.header('authorization'))
  const testOnlyAnonymousWhenDisabled = (options.service as AgronautasAuthServicePort & { testOnlyAnonymousWhenDisabled?: boolean }).testOnlyAnonymousWhenDisabled === true
  if (!token) {
    if (!testOnlyAnonymousWhenDisabled) {
      respondAuthError(res, 401, AUTH_FAILURE_CODES.UNAUTHORIZED, 'Missing or invalid bearer token')
      return
    }
    token = '__test-anonymous-disabled-auth__'
  }

  try {
    const assertion = req.header('x-agronautas-bff-assertion')
    const principal = assertion
      ? await options.service.authenticateBffAssertion(token, assertion)
      : await options.service.authenticateAccessToken(token)
    req.agronautasPrincipal = principal
    if (scope) {
      const workspaceId = options.workspaceId?.(req)
      const fieldId = options.fieldId?.(req)
      await options.service.authorize(principal, workspaceId ?? principal.workspaceId, scope, fieldId)
    }
    next()
  } catch (error) {
    const failure = error as { code?: string; statusCode?: number; message?: string }
    const status = failure.statusCode === 503 ? 503 : failure.code === AUTH_FAILURE_CODES.FORBIDDEN ? 403 : failure.code === AUTH_FAILURE_CODES.UNMAPPED_RECORD ? 422 : 401
    const code = status === 503 ? AUTH_FAILURE_CODES.AUTH_MAINTENANCE : status === 403 ? AUTH_FAILURE_CODES.FORBIDDEN : status === 422 ? AUTH_FAILURE_CODES.UNMAPPED_RECORD : AUTH_FAILURE_CODES.UNAUTHORIZED
    respondAuthError(res, status, code, status === 503 ? 'Agronautas authentication maintenance is required' : failure.message ?? 'Authentication failed', status === 503)
  }
}

export function getAgronautasPrincipal(req: Request): AuthPrincipal | null {
  return (req as AgronautasAuthenticatedRequest).agronautasPrincipal ?? null
}

function parseBearerToken(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}

function respondAuthError(res: Response, status: 401 | 403 | 422 | 503, code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'UNMAPPED_RECORD' | 'AUTH_MAINTENANCE', message: string, retryable = false) {
  if (status === 401) {
    res.setHeader('WWW-Authenticate', 'Bearer')
  }

  return res.status(status).json(agronautasContractErrorSchema.parse({
    contractVersion: '1.0.0',
    code,
    message,
    retryable,
  }))
}
