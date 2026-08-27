import assert from 'node:assert/strict'
import test from 'node:test'
import { getAgronautasRuntimeConfig } from './agronautas-runtime'

test('trust proxy defaults to false outside managed proxy environments', () => {
  const config = getAgronautasRuntimeConfig({})

  assert.equal(
    config.trustProxy,
    false,
    'local and unknown environments should not trust forwarded headers by default',
  )
})

test('trust proxy defaults to one hop on Render when TRUST_PROXY is not set', () => {
  const config = getAgronautasRuntimeConfig({ RENDER: 'true' })

  assert.equal(
    config.trustProxy,
    1,
    'Render terminates TLS behind one managed proxy, so Express should trust only the nearest proxy hop',
  )
})

test('explicit TRUST_PROXY value overrides Render default', () => {
  assert.equal(getAgronautasRuntimeConfig({ RENDER: 'true', TRUST_PROXY: 'false' }).trustProxy, false)
  assert.equal(getAgronautasRuntimeConfig({ RENDER: 'true', TRUST_PROXY: 'true' }).trustProxy, true)
  assert.equal(getAgronautasRuntimeConfig({ RENDER: 'true', TRUST_PROXY: '2' }).trustProxy, 2)
})

test('MongoDB readiness is disabled by default and supports explicit sentinel values', () => {
  assert.deepEqual(getAgronautasRuntimeConfig({}).optionalReadinessServices, [])
  assert.deepEqual(getAgronautasRuntimeConfig({ READINESS_OPTIONAL_SERVICES: 'none' }).optionalReadinessServices, [])
  assert.deepEqual(getAgronautasRuntimeConfig({ READINESS_OPTIONAL_SERVICES: 'DISABLED' }).optionalReadinessServices, [])
  assert.deepEqual(getAgronautasRuntimeConfig({ READINESS_OPTIONAL_SERVICES: ' off ' }).optionalReadinessServices, [])
})

test('MongoDB readiness can be explicitly enabled', () => {
  assert.deepEqual(
    getAgronautasRuntimeConfig({
      READINESS_OPTIONAL_SERVICES: 'mongodb',
      MONGODB_URL: 'mongodb+srv://configured.example/appdb',
    }).optionalReadinessServices,
    ['mongodb'],
  )
})

test('scheduler is disabled by default and only reports explicit configuration', () => {
  assert.equal(getAgronautasRuntimeConfig({}).schedulerEnabled, false)
  assert.equal(getAgronautasRuntimeConfig({ AGRONAUTAS_SCHEDULER_ENABLED: 'true' }).schedulerEnabled, true)
  assert.equal(getAgronautasRuntimeConfig({ AGRONAUTAS_SCHEDULER_ENABLED: 'TRUE' }).schedulerEnabled, true)
})

test('canonical runtime v2 admission is disabled by default and requires its capability flag', () => {
  assert.equal(getAgronautasRuntimeConfig({}).runtimeV2Enabled, false)
  const enabled = getAgronautasRuntimeConfig({ AGRONAUTAS_RUNTIME_V2_ENABLED: 'true' })
  assert.equal(enabled.runtimeV2Enabled, true)
  assert.equal(getAgronautasRuntimeConfig({ AGRONAUTAS_RUNTIME_V2_ENABLED: 'TRUE' }).runtimeV2Enabled, true)
  assert.equal(getAgronautasRuntimeConfig({ AGRONAUTAS_RUNTIME_V2_ENABLED: 'false' }).runtimeV2Enabled, false)
  assert.equal(enabled.schedulerEnabled, false, 'v2 admission must not implicitly enable the scheduler')
})
