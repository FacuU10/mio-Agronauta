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
