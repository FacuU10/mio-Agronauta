import { logger } from '../observability/logger'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

const PLACEHOLDERS = [
  'replace-with-secret-manager-reference',
  'your-secret-key-change-in-production',
  'replace-with-operator-token',
  'reader-token',
  'operator-token',
  'admin-token',
  'replace-me-if-required',
  'user:password',
]

export function validateProductionEnv(env: NodeJS.ProcessEnv = process.env): ValidationResult {
  const errors: string[] = []

  const checkRequired = (key: string, _name: string) => {
    const val = env[key]?.trim()
    if (!val) {
      errors.push(`${key} is missing`)
      return
    }
    const lowerVal = val.toLowerCase()
    for (const placeholder of PLACEHOLDERS) {
      if (lowerVal.includes(placeholder.toLowerCase())) {
        errors.push(`${key} contains a placeholder value and is invalid for production`)
        return
      }
    }
  }

  // 1. Database URLs & Redis
  checkRequired('DATABASE_URL', 'Database URL')
  checkRequired('REDIS_URL', 'Redis URL')

  // 2. Hydrology Ingest Token
  checkRequired('HYDROLOGY_INGEST_TOKEN', 'Hydrology Ingest Token')

  // 3. Runtime & Provider Keys (Only if AGRONAUTAS_RUNTIME_REQUIRED=true)
  const runtimeRequired = env['AGRONAUTAS_RUNTIME_REQUIRED'] === 'true'
  if (runtimeRequired) {
    checkRequired('NASA_FIRMS_API_KEY', 'NASA FIRMS API Key')
    checkRequired('SENTINEL_CLIENT_ID', 'Sentinel Client ID')
    checkRequired('SENTINEL_CLIENT_SECRET', 'Sentinel Client Secret')
  }

  validateProductionOrigin(env, errors)
  validateProductionProxy(env, errors)

  return {
    isValid: errors.length === 0,
    errors,
  }
}

function validateProductionOrigin(env: NodeJS.ProcessEnv, errors: string[]): void {
  const configuredOrigin = env['AGRONAUTAS_API_INTERNAL_URL']?.trim()
  if (!configuredOrigin) return

  try {
    const origin = new URL(configuredOrigin)
    if (isLocalHostname(origin.hostname)) {
      errors.push('AGRONAUTAS_API_INTERNAL_URL must not resolve to a local origin in production')
    }
  } catch {
    errors.push('AGRONAUTAS_API_INTERNAL_URL is invalid for production')
  }
}

function validateProductionProxy(env: NodeJS.ProcessEnv, errors: string[]): void {
  const trustProxy = env['TRUST_PROXY']?.trim().toLowerCase()
  if (trustProxy === 'false' || trustProxy === '0') {
    errors.push('TRUST_PROXY must not disable proxy trust in production')
  }
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '0.0.0.0'
    || normalized === '::1'
}

export const ProductionEnvValidatorPort = {
  validate(env: NodeJS.ProcessEnv = process.env, shouldExit: boolean = env['NODE_ENV'] === 'production'): void {
    // Only validate if NODE_ENV is production, or if forced
    if (env['NODE_ENV'] !== 'production' && env['AGRONAUTAS_FORCE_ENV_VALIDATION'] !== 'true') {
      return
    }

    const result = validateProductionEnv(env)
    if (!result.isValid) {
      logger.error({ errors: result.errors }, 'Production environment validation failed')
      if (shouldExit) {
        process.exit(1)
      } else {
        throw new Error(`Production environment validation failed: ${result.errors.join(', ')}`)
      }
    }
  }
}
