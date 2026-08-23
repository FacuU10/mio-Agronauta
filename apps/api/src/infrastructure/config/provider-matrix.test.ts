import test from 'node:test'
import assert from 'node:assert'
import { createRealProviderEvidencePort, RealProviderEvidencePort } from './provider-matrix'

test('createRealProviderEvidencePort wires provider telemetry', async () => {
  let captured: { provider: string; providerMode: string } | undefined
  process.env['PROVIDER_MODE_OPEN_METEO'] = 'unavailable'

  try {
    const port = createRealProviderEvidencePort({
      onProviderEvidence(input) {
        captured = { provider: input.provider, providerMode: input.providerMode }
      },
    }, {
      async query() {
        return { rows: [] }
      },
    } as any)

    await port.getEvidence('open-meteo', 'climate')

    assert.deepEqual(captured, { provider: 'open-meteo', providerMode: 'unavailable' })
  } finally {
    delete process.env['PROVIDER_MODE_OPEN_METEO']
  }
})

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
  assert.equal(evidence.observedAt, null)
  assert.equal(evidence.lastSuccessfulObservedAt, null)

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
  assert.equal(evidence.observedAt, null)

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
  assert.equal(evidence.schemaStatus, 'unavailable')

  // Clean up
  delete process.env['AGRONAUTAS_RUNTIME_MODE']
  delete process.env['AGRONAUTAS_RUNTIME_REQUIRED']
})

test('ProviderEvidencePort preserves stale latest-good lineage without inventing observed time', async () => {
  process.env['AGRONAUTAS_RUNTIME_MODE'] = 'real'
  const port = new RealProviderEvidencePort(({
    async query() {
      return { rows: [{ status: 'degraded', observed_at: null, run_id: 'run-stale', stale_cause: 'timeout', degradation_reason: null, evidence_payload: { sourceUrl: 'https://api.open-meteo.com/v1/forecast' } }] }
    },
  }) as unknown as ConstructorParameters<typeof RealProviderEvidencePort>[0])

  const evidence = await port.getEvidence('open-meteo', 'climate')

  assert.equal(evidence.mode, 'seam')
  assert.equal(evidence.observedAt, null)
  assert.equal(evidence.lastSuccessfulObservedAt, null)
  assert.deepEqual(evidence.lineage, { sourceUrl: 'https://api.open-meteo.com/v1/forecast', rawHash: null, parentRunId: 'run-stale' })
  assert.deepEqual(evidence.degradationReasons, ['timeout'])
  delete process.env['AGRONAUTAS_RUNTIME_MODE']
})
