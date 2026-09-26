import { agronautasAuthBootstrapInputSchema } from '@repo/zod-schemas'
import { AgronautasAuthService, resolveAuthSecrets, validateBootstrapInput } from '../../application/auth/agronautas-auth-service'
import { AuthFailure, AUTH_FAILURE_CODES, type AuthSecrets, type BootstrapInput, type BootstrapResult } from '../../domain/auth/contracts'
import { PostgresAgronautasAuthRepository } from '../database/postgres/agronautas-auth-repository'
import { RedisAgronautasAuthDenyStore } from '../database/redis/agronautas-auth-deny-store'
import { logger } from '../observability/logger'

export interface AgronautasAuthBootstrapResult {
  status: 'disabled' | 'completed'
  result?: BootstrapResult
}

interface BootstrapDependencies {
  service?: Pick<AgronautasAuthService, 'bootstrap'>
  serviceFactory?: (secrets: AuthSecrets) => Pick<AgronautasAuthService, 'bootstrap'>
}

export async function runAgronautasAuthBootstrapFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: BootstrapDependencies = {},
): Promise<AgronautasAuthBootstrapResult> {
  if (env['AGRONAUTAS_AUTH_BOOTSTRAP_ENABLED'] !== 'true') return { status: 'disabled' }

  const input = readBootstrapInput(env)
  const service = dependencies.service
    ?? dependencies.serviceFactory?.(resolveAuthSecrets(env))
    ?? createProductionBootstrapService(resolveAuthSecrets(env))
  const result = await service.bootstrap(input)

  logger.info({
    status: result.status,
    workspaceId: result.workspaceId,
    mappedFieldCount: result.mappedFieldIds.length,
    unmappedFieldCount: result.unmappedFieldIds.length,
  }, 'Agronautas auth bootstrap completed')
  return { status: 'completed', result }
}

function readBootstrapInput(env: NodeJS.ProcessEnv): BootstrapInput {
  const mappingsText = required(env, 'AGRONAUTAS_AUTH_BOOTSTRAP_FIELD_MAPPINGS')
  let fieldMappings: unknown
  try {
    fieldMappings = JSON.parse(mappingsText)
  } catch {
    throw new AuthFailure(AUTH_FAILURE_CODES.INVALID_INPUT, 'Bootstrap field mappings must be valid JSON')
  }

  const input: BootstrapInput = {
    idempotencyKey: required(env, 'AGRONAUTAS_AUTH_BOOTSTRAP_IDEMPOTENCY_KEY'),
    bootstrapSecret: required(env, 'AGRONAUTAS_AUTH_BOOTSTRAP_SECRET'),
    pilotWorkspace: { key: 'agronautas-pilot', name: required(env, 'AGRONAUTAS_AUTH_BOOTSTRAP_WORKSPACE_NAME') },
    admin: {
      email: required(env, 'AGRONAUTAS_AUTH_BOOTSTRAP_ADMIN_EMAIL'),
      password: required(env, 'AGRONAUTAS_AUTH_BOOTSTRAP_ADMIN_PASSWORD'),
      displayName: required(env, 'AGRONAUTAS_AUTH_BOOTSTRAP_ADMIN_DISPLAY_NAME'),
    },
    fieldMappings: fieldMappings as BootstrapInput['fieldMappings'],
  }
  if (!agronautasAuthBootstrapInputSchema.safeParse(input).success) throw new AuthFailure(AUTH_FAILURE_CODES.INVALID_INPUT, 'Bootstrap input does not match the internal contract')
  validateBootstrapInput(input)
  return input
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new AuthFailure(AUTH_FAILURE_CODES.INVALID_INPUT, `${name} is required when auth bootstrap is enabled`)
  return value
}

function createProductionBootstrapService(secrets: AuthSecrets): Pick<AgronautasAuthService, 'bootstrap'> {
  return new AgronautasAuthService(new PostgresAgronautasAuthRepository(), {
    secrets,
    redis: new RedisAgronautasAuthDenyStore(),
    redisRequired: true,
  })
}
