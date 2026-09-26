import assert from 'node:assert/strict'
import test from 'node:test'
import { buildProviderTruthManifest, classifyProviderTruth, type ProviderTruthSource } from './verify-provider-truth-production'

test('provider truth blocks a source when a required prerequisite is missing', () => {
  const source = classifyProviderTruth({
    provider: 'sentinel-stac',
    prerequisite: { category: 'licensing_or_token', available: false },
    providerMode: 'unavailable',
    freshness: 'missing',
    schemaStatus: 'unavailable',
    degradationReasons: ['sentinel_credentials_unavailable'],
  })

  assert.equal(source.status, 'blocked')
  assert.equal(source.prerequisiteCategory, 'licensing_or_token')
  assert.equal(source.productionProven, false)
})

test('provider truth rejects stale or blocked source responses', () => {
  const source = classifyProviderTruth({
    provider: 'smn-alerts',
    prerequisite: { category: 'endpoint', available: true },
    providerMode: 'live',
    freshness: 'stale',
    schemaStatus: 'valid',
    degradationReasons: ['stale_provider_run'],
  })

  assert.equal(source.status, 'blocked')
  assert.equal(source.productionProven, false)
})

test('production provider manifest keeps source outcomes separate and never emits aggregate readiness', () => {
  const sources: Record<ProviderTruthSource, ReturnType<typeof classifyProviderTruth>> = {
    'open-meteo': classifyProviderTruth({ provider: 'open-meteo', prerequisite: { category: 'licensing_or_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    'smn-alerts': classifyProviderTruth({ provider: 'smn-alerts', prerequisite: { category: 'endpoint', available: true }, providerMode: 'unavailable', freshness: 'missing', schemaStatus: 'unavailable', degradationReasons: ['upstream_unavailable'] }),
    'sentinel-stac': classifyProviderTruth({ provider: 'sentinel-stac', prerequisite: { category: 'licensing_or_token', available: false }, providerMode: 'unavailable', freshness: 'missing', schemaStatus: 'unavailable', degradationReasons: ['credentials_unavailable'] }),
    'nasa-firms': classifyProviderTruth({ provider: 'nasa-firms', prerequisite: { category: 'licensing_or_token', available: false }, providerMode: 'unavailable', freshness: 'missing', schemaStatus: 'unavailable', degradationReasons: ['credential_unavailable'] }),
    hydrology: classifyProviderTruth({ provider: 'hydrology', prerequisite: { category: 'cron_or_token', available: false }, providerMode: 'unavailable', freshness: 'missing', schemaStatus: 'unavailable', degradationReasons: ['cron_not_configured'] }),
    copilot: classifyProviderTruth({ provider: 'copilot', prerequisite: { category: 'model_token', available: false }, providerMode: 'unavailable', freshness: 'missing', schemaStatus: 'unavailable', degradationReasons: ['model_not_configured'] }),
  }
  const manifest = buildProviderTruthManifest({ sources })

  assert.equal(manifest.environment, 'production')
  assert.equal(manifest.productionReady, false)
  assert.equal(manifest.sources['open-meteo'].status, 'pass')
  assert.equal(manifest.sources['smn-alerts'].status, 'unavailable')
  assert.equal(manifest.sources['nasa-firms'].status, 'blocked')
  assert.doesNotMatch(JSON.stringify(manifest), /token-value|password|postgresql:\/\//i)
})

test('production provider manifest stays incomplete when a required durable dependency is not proven', () => {
  const sources: Record<ProviderTruthSource, ReturnType<typeof classifyProviderTruth>> = {
    'open-meteo': classifyProviderTruth({ provider: 'open-meteo', prerequisite: { category: 'licensing_or_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    'smn-alerts': classifyProviderTruth({ provider: 'smn-alerts', prerequisite: { category: 'endpoint', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    'sentinel-stac': classifyProviderTruth({ provider: 'sentinel-stac', prerequisite: { category: 'licensing_or_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    'nasa-firms': classifyProviderTruth({ provider: 'nasa-firms', prerequisite: { category: 'licensing_or_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    hydrology: classifyProviderTruth({ provider: 'hydrology', prerequisite: { category: 'cron_or_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    copilot: classifyProviderTruth({ provider: 'copilot', prerequisite: { category: 'model_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
  }
  const manifest = buildProviderTruthManifest({ sources, dependencies: { postgres: 'pass', redis: 'not_run' } })

  assert.equal(manifest.status, 'incomplete')
  assert.equal(manifest.productionReady, false)
})

test('production provider manifest blocks when a durable dependency is explicitly unavailable', () => {
  const sources: Record<ProviderTruthSource, ReturnType<typeof classifyProviderTruth>> = {
    'open-meteo': classifyProviderTruth({ provider: 'open-meteo', prerequisite: { category: 'licensing_or_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    'smn-alerts': classifyProviderTruth({ provider: 'smn-alerts', prerequisite: { category: 'endpoint', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    'sentinel-stac': classifyProviderTruth({ provider: 'sentinel-stac', prerequisite: { category: 'licensing_or_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    'nasa-firms': classifyProviderTruth({ provider: 'nasa-firms', prerequisite: { category: 'licensing_or_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    hydrology: classifyProviderTruth({ provider: 'hydrology', prerequisite: { category: 'cron_or_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
    copilot: classifyProviderTruth({ provider: 'copilot', prerequisite: { category: 'model_token', available: true }, providerMode: 'live', freshness: 'fresh', schemaStatus: 'valid', degradationReasons: [] }),
  }
  const manifest = buildProviderTruthManifest({ sources, dependencies: { postgres: 'blocked', redis: 'pass' } })

  assert.equal(manifest.status, 'blocked')
  assert.equal(manifest.productionReady, false)
})
