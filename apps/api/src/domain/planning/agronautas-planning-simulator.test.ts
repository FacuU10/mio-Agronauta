import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAssumptionSimulation } from './agronautas-planning-simulator'

const input = {
  contractVersion: 'agronautas-assumption-simulation-v1' as const,
  areaHa: 10,
  expectedYieldKgPerHa: 4000,
  pricePerKg: 0.4,
  variableCostPerHa: 500,
  fixedCost: 200,
  currency: 'ARS',
  precision: 2,
  units: { area: 'ha' as const, expectedYield: 'kg/ha' as const, price: 'currency/kg' as const, variableCost: 'currency/ha' as const, fixedCost: 'currency' as const },
  assumptions: ['Manual user assumption'],
}

test('assumption simulator is deterministic, labeled, and uses only submitted assumptions', () => {
  const first = calculateAssumptionSimulation(input)
  const second = calculateAssumptionSimulation(input)
  assert.deepEqual(first, second)
  assert.equal(first.status, 'complete')
  if (first.status !== 'complete') return
  assert.equal(first.result.label, 'user_assumption_simulation')
  assert.deepEqual(first.result.outputs, { productionKg: 40000, grossValue: 16000, totalCost: 5200, scenarioDifference: 10800 })
  assert.equal(first.result.currency, 'ARS')
})

test('assumption simulator rounds to requested precision and never returns values for missing or incompatible input', () => {
  const rounded = calculateAssumptionSimulation({ ...input, areaHa: 1.234, expectedYieldKgPerHa: 2.5, pricePerKg: 0.333, variableCostPerHa: 0.1, fixedCost: 0.1, precision: 2 })
  assert.equal(rounded.status, 'complete')
  if (rounded.status === 'complete') assert.deepEqual(rounded.result.outputs, { productionKg: 3.09, grossValue: 1.03, totalCost: 0.22, scenarioDifference: 0.8 })

  const missing = calculateAssumptionSimulation({ ...input, pricePerKg: undefined })
  assert.equal(missing.status, 'insufficient_evidence')
  assert.equal('result' in missing, false)
  assert.match(missing.reason, /pricePerKg/i)

  const incompatible = calculateAssumptionSimulation({ ...input, units: { ...input.units, price: 'currency/ha' } as unknown as typeof input.units })
  assert.equal(incompatible.status, 'insufficient_evidence')
  assert.equal('result' in incompatible, false)
})
