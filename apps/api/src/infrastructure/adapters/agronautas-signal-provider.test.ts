import test from 'node:test'
import assert from 'node:assert/strict'
import { createClimateProvider, createSatelliteProvider, createSmnProvider, createWeatherProvider } from './agronautas-signal-provider'

const scope = { locationId: 'location-1', workspaceId: 'workspace-1', fieldId: 'field-1' }
const window = { start: '2026-09-20T00:00:00.000Z', end: '2026-09-21T00:00:00.000Z' }

test('provider ports normalize a typed seam without claiming live freshness', async () => {
  const provider = createClimateProvider({
    fetcher: async () => ({
      status: 200,
      payload: { daily: { time: ['2026-09-20'], temperature_2m_max: [31], precipitation_sum: [12] } },
    }),
  })

  const evidence = await provider.fetch({ scope, window, requestId: 'request-1' })

  assert.equal(evidence.contractVersion, 'agronautas-evidence-v2')
  assert.equal(evidence.providerMode, 'seam')
  assert.equal(evidence.status, 'degraded')
  assert.equal(evidence.locationId, scope.locationId)
  assert.equal(evidence.workspaceId, scope.workspaceId)
  assert.equal(evidence.fieldId, scope.fieldId)
  assert.deepEqual(evidence.value, { temperatureMaxC: 31, rainfallMm: 12, forecastHorizonDays: 0, model: 'best_match' })
})

test('provider ports distinguish timeout, schema drift, and license blocking', async () => {
  const timeout = await createWeatherProvider({ fetcher: async () => { throw new Error('provider timeout') } }).fetch({ scope, window, requestId: 'request-timeout' })
  const drift = await createClimateProvider({ fetcher: async () => ({ status: 200, payload: { unexpected: true } }) }).fetch({ scope, window, requestId: 'request-drift' })
  const blocked = await createClimateProvider({ commercialUseApproved: false, fetcher: async () => ({ status: 200, payload: {} }) }).fetch({ scope, window, requestId: 'request-license' })

  assert.equal(timeout.status, 'unavailable')
  assert.match(timeout.degradationReasons[0] ?? '', /timeout/i)
  assert.equal(drift.status, 'unavailable')
  assert.match(drift.degradationReasons[0] ?? '', /schema/i)
  assert.equal(blocked.providerMode, 'unavailable')
  assert.match(blocked.degradationReasons[0] ?? '', /license/i)
})

test('SMN normalizes alert outcomes and satellite refuses evidence without scene coverage and processing proof', async () => {
  const smn = await createSmnProvider({ fetcher: async () => ({ status: 200, payload: { alerts: [{ level: 'yellow' }] } }) }).fetch({ scope, window, requestId: 'request-smn' })
  const unproven = await createSatelliteProvider({ fetcher: async () => ({ status: 200, payload: { ndvi: 0.7 } }) }).fetch({ scope, window, requestId: 'request-satellite' })
  const proven = await createSatelliteProvider({ fetcher: async () => ({ status: 200, payload: { sceneId: 'scene-1', coverage: { percentage: 98 }, processing: { status: 'complete', proofRef: 'processing-1' }, ndvi: 0.7 } }) }).fetch({ scope, window, requestId: 'request-satellite-proof' })

  assert.equal(smn.signalType, 'weather_alert')
  assert.deepEqual(smn.value, { alertCount: 1 })
  assert.equal(unproven.status, 'unavailable')
  assert.match(unproven.degradationReasons[0] ?? '', /satellite.*proof/i)
  assert.equal(proven.providerMode, 'seam')
  assert.equal(proven.status, 'degraded')
  assert.deepEqual(proven.value, { sceneId: 'scene-1', coveragePercentage: 98, processingProof: 'processing-1', ndvi: 0.7 })
})
