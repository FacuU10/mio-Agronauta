import type { NextFunction, Request, Response } from 'express'
import { agronautasContractErrorSchema } from '@repo/zod-schemas'

export type AgronautasRole = 'reader' | 'operator' | 'admin'
export type AgronautasScope = 'read' | 'write' | 'recompute' | 'admin'

const roleScopes: Record<AgronautasRole, readonly AgronautasScope[]> = {
  reader: ['read'],
  operator: ['read', 'write', 'recompute'],
  admin: ['read', 'write', 'recompute', 'admin'],
}

export interface AgronautasAuthConfig {
  enabled: boolean
  tokens: Partial<Record<AgronautasRole, string>>
}

export function getAgronautasAuthConfig(env: NodeJS.ProcessEnv = process.env): AgronautasAuthConfig {
  return {
    enabled: parseBoolean(env['AGRONAUTAS_AUTH_ENABLED'], false),
    tokens: {
      reader: normalizeToken(env['AGRONAUTAS_AUTH_TOKEN_READER']),
      operator: normalizeToken(env['AGRONAUTAS_AUTH_TOKEN_OPERATOR']),
      admin: normalizeToken(env['AGRONAUTAS_AUTH_TOKEN_ADMIN']),
    },
  }
}

export function requireAgronautasScope(scope: AgronautasScope, config?: AgronautasAuthConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const effectiveConfig = config ?? getAgronautasAuthConfig()
    if (!effectiveConfig.enabled) {
      return next()
    }

    const token = parseBearerToken(req.header('authorization'))
    if (!token) {
      return respondAuthError(res, 401, 'UNAUTHORIZED', 'Missing or invalid bearer token')
    }

    const identity = resolveIdentity(token, effectiveConfig.tokens)
    if (!identity) {
      return respondAuthError(res, 401, 'UNAUTHORIZED', 'Missing or invalid bearer token')
    }

    if (!roleScopes[identity.role].includes(scope)) {
      return respondAuthError(res, 403, 'FORBIDDEN', `Role ${identity.role} cannot access this operation`)
    }

    return next()
  }
}

function resolveIdentity(token: string, tokens: AgronautasAuthConfig['tokens']): { role: AgronautasRole; tokenId: string } | null {
  for (const role of Object.keys(roleScopes) as AgronautasRole[]) {
    const expected = tokens[role]
    if (expected && expected === token) {
      return { role, tokenId: role }
    }
  }

  return null
}

function parseBearerToken(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}

function respondAuthError(res: Response, status: 401 | 403, code: 'UNAUTHORIZED' | 'FORBIDDEN', message: string) {
  if (status === 401) {
    res.setHeader('WWW-Authenticate', 'Bearer')
  }

  return res.status(status).json(agronautasContractErrorSchema.parse({
    contractVersion: '1.0.0',
    code,
    message,
    retryable: false,
  }))
}

function normalizeToken(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return fallback
}
