import assert from 'node:assert/strict'
import test from 'node:test'
import { validateProductionEnv, ProductionEnvValidatorPort } from './validator'

test('validateProductionEnv returns isValid=true for correct production environment variables', () => {
  const env = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://real_user:real_secure_password_123@prod-db.internal:5432/prod_db',
    REDIS_URL: 'redis://prod-redis.internal:6379/0',
    HYDROLOGY_INGEST_TOKEN: 'super-secret-ingest-token-abc',
    AGRONAUTAS_RUNTIME_REQUIRED: 'true',
    NASA_FIRMS_API_KEY: 'nasa-firms-real-key-456',
    SENTINEL_CLIENT_ID: 'sentinel-client-id-xyz',
    SENTINEL_CLIENT_SECRET: 'sentinel-client-secret-999',
  }

  const result = validateProductionEnv(env)
  assert.equal(result.isValid, true)
  assert.equal(result.errors.length, 0)
})

test('validateProductionEnv fails if DATABASE_URL is missing or contains placeholder', () => {
  const envMissing = {
    NODE_ENV: 'production',
    REDIS_URL: 'redis://prod-redis.internal:6379/0',
    HYDROLOGY_INGEST_TOKEN: 'super-secret-ingest-token-abc',
  }
  const resultMissing = validateProductionEnv(envMissing)
  assert.equal(resultMissing.isValid, false)
  assert.ok(resultMissing.errors.some(e => e.includes('DATABASE_URL') && e.includes('missing')))

  const envPlaceholder = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/appdb',
    REDIS_URL: 'redis://prod-redis.internal:6379/0',
    HYDROLOGY_INGEST_TOKEN: 'super-secret-ingest-token-abc',
  }
  const resultPlaceholder = validateProductionEnv(envPlaceholder)
  assert.equal(resultPlaceholder.isValid, false)
  assert.ok(resultPlaceholder.errors.some(e => e.includes('DATABASE_URL') && e.includes('placeholder')))
})

test('validateProductionEnv fails if REDIS_URL is missing', () => {
  const env = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://real_user:real_secure_password_123@prod-db.internal:5432/prod_db',
    HYDROLOGY_INGEST_TOKEN: 'super-secret-ingest-token-abc',
  }
  const result = validateProductionEnv(env)
  assert.equal(result.isValid, false)
  assert.ok(result.errors.some(e => e.includes('REDIS_URL') && e.includes('missing')))
})

test('validateProductionEnv fails if HYDROLOGY_INGEST_TOKEN is missing or contains placeholder', () => {
  const envMissing = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://real_user:real_secure_password_123@prod-db.internal:5432/prod_db',
    REDIS_URL: 'redis://prod-redis.internal:6379/0',
  }
  const resultMissing = validateProductionEnv(envMissing)
  assert.equal(resultMissing.isValid, false)
  assert.ok(resultMissing.errors.some(e => e.includes('HYDROLOGY_INGEST_TOKEN') && e.includes('missing')))

  const envPlaceholder = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://real_user:real_secure_password_123@prod-db.internal:5432/prod_db',
    REDIS_URL: 'redis://prod-redis.internal:6379/0',
    HYDROLOGY_INGEST_TOKEN: 'replace-with-secret-manager-reference',
  }
  const resultPlaceholder = validateProductionEnv(envPlaceholder)
  assert.equal(resultPlaceholder.isValid, false)
  assert.ok(resultPlaceholder.errors.some(e => e.includes('HYDROLOGY_INGEST_TOKEN') && e.includes('placeholder')))
})

test('validateProductionEnv fails if AGRONAUTAS_RUNTIME_REQUIRED is true and provider keys are missing or placeholders', () => {
  const envMissingKeys = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://real_user:real_secure_password_123@prod-db.internal:5432/prod_db',
    REDIS_URL: 'redis://prod-redis.internal:6379/0',
    HYDROLOGY_INGEST_TOKEN: 'super-secret-ingest-token-abc',
    AGRONAUTAS_RUNTIME_REQUIRED: 'true',
  }
  const resultMissing = validateProductionEnv(envMissingKeys)
  assert.equal(resultMissing.isValid, false)
  assert.ok(resultMissing.errors.some(e => e.includes('NASA_FIRMS_API_KEY') && e.includes('missing')))
  assert.ok(resultMissing.errors.some(e => e.includes('SENTINEL_CLIENT_ID') && e.includes('missing')))
  assert.ok(resultMissing.errors.some(e => e.includes('SENTINEL_CLIENT_SECRET') && e.includes('missing')))

  const envPlaceholderKeys = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://real_user:real_secure_password_123@prod-db.internal:5432/prod_db',
    REDIS_URL: 'redis://prod-redis.internal:6379/0',
    HYDROLOGY_INGEST_TOKEN: 'super-secret-ingest-token-abc',
    AGRONAUTAS_RUNTIME_REQUIRED: 'true',
    NASA_FIRMS_API_KEY: 'replace-with-secret-manager-reference',
    SENTINEL_CLIENT_ID: 'sentinel-client-id-xyz',
    SENTINEL_CLIENT_SECRET: 'replace-with-secret-manager-reference',
  }
  const resultPlaceholder = validateProductionEnv(envPlaceholderKeys)
  assert.equal(resultPlaceholder.isValid, false)
  assert.ok(resultPlaceholder.errors.some(e => e.includes('NASA_FIRMS_API_KEY') && e.includes('placeholder')))
  assert.ok(resultPlaceholder.errors.some(e => e.includes('SENTINEL_CLIENT_SECRET') && e.includes('placeholder')))
})

test('ProductionEnvValidatorPort.validate throws error when NODE_ENV is production and shouldExit is false', () => {
  const envInvalid = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://real_user:real_secure_password_123@prod-db.internal:5432/prod_db',
    // REDIS_URL missing
  }

  assert.throws(() => {
    ProductionEnvValidatorPort.validate(envInvalid, false)
  }, /Production environment validation failed/)
})
