import { assumptionSimulationRequestSchema, assumptionSimulationResponseSchema, type AssumptionSimulationRequest } from '@repo/zod-schemas'

export function calculateAssumptionSimulation(input: AssumptionSimulationRequest | Omit<AssumptionSimulationRequest, 'pricePerKg'> & { pricePerKg?: number }) {
  const parsed = assumptionSimulationRequestSchema.safeParse(input)
  if (!parsed.success) {
    const missingInputs = parsed.error.issues.map((issue) => issue.path.join('.') || 'request')
    return assumptionSimulationResponseSchema.parse({ contractVersion: 'agronautas-assumption-simulation-v1', status: 'insufficient_evidence', missingInputs, reason: `Required assumptions are missing or invalid: ${missingInputs.join(', ')}.` })
  }

  const value = parsed.data
  const round = (number: number) => Number((number + 1e-9).toFixed(value.precision))
  const productionKg = value.areaHa * value.expectedYieldKgPerHa
  const grossValue = productionKg * value.pricePerKg
  const totalCost = value.areaHa * value.variableCostPerHa + value.fixedCost
  return assumptionSimulationResponseSchema.parse({
    contractVersion: 'agronautas-assumption-simulation-v1',
    status: 'complete',
    result: {
      label: 'user_assumption_simulation', currency: value.currency, units: value.units, assumptions: value.assumptions,
      inputs: { areaHa: value.areaHa, expectedYieldKgPerHa: value.expectedYieldKgPerHa, pricePerKg: value.pricePerKg, variableCostPerHa: value.variableCostPerHa, fixedCost: value.fixedCost },
      outputs: { productionKg: round(productionKg), grossValue: round(grossValue), totalCost: round(totalCost), scenarioDifference: round(grossValue - totalCost) },
    },
  })
}
