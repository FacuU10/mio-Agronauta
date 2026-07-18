import test from 'node:test'
import assert from 'node:assert'
import { RealProviderEvidencePort } from './provider-matrix'

test('ProviderEvidencePort detects environment overrides and tracks statuses correctly', async () => {
  // Test with environment overrides
  process.env['PROVIDER_MODE_OPEN_METEO'] = 'unavailable'
  const port = new RealProviderEvidencePort({
    async query() {
      return { rows: [] }
    }
  } as any)

  const evidence = await port.getEvidence('open-meteo', 'climate')
  assert.equal(evidence.provider, 'open-meteo')
  assert.equal(evidence.mode, 'unavailable')
  assert.deepEqual(evidence.degradationReasons, ['weather_data_unavailable'])

  // Clean up
  delete process.env['PROVIDER_MODE_OPEN_METEO']
})

test('ProviderEvidencePort returns mock state in demo mode', async () => {
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'demo'
  const port = new RealProviderEvidencePort({
    async query() {
      return { rows: [] }
    }
  } as any)

  const evidence = await port.getEvidence('open-meteo', 'climate')
  assert.equal(evidence.mode, 'mock')

  // Clean up
  delete process.env['AGRONAUTAS_RUNTIME_MODE']
})

test('ProviderEvidencePort returns seam or unavailable in real mode when DB is empty', async () => {
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'real'
  process.env['AGRONAUTAS_RUNTIME_REQUIRED'] = 'true'
  
  // NASA Firms lacks API key, should be unavailable
  delete process.env['NASA_FIRMS_API_KEY']
  delete process.env['FIRMS_API_KEY']

  const port = new RealProviderEvidencePort({
    async query() {
      return { rows: [] }
    }
  } as any)

  const evidence = await port.getEvidence('nasa-firms', 'fire')
  assert.equal(evidence.mode, 'unavailable')

  // Clean up
  delete process.env['AGRONAUTAS_RUNTIME_MODE']
  delete process.env['AGRONAUTAS_RUNTIME_REQUIRED']
})
