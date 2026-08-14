import { expect, test } from '@playwright/test'
import { AgronautasPlanningPage } from './agronautas-planning-page'

test.describe('Agronautas planning', () => {
  test('keyboard-accessible assumptions show a labeled deterministic simulation and unavailable domains', async ({ page }) => {
    await page.route('**/api/agronautas/**/planning/context', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        contractVersion: 'agronautas-campaign-planning-context-v1', persistent: false,
        workspace: { workspaceId: 'agronautas-default-workspace', name: 'Agronautas', status: 'active' },
        campaignName: 'Campaña demostrativa', season: '2026',
        fields: [{ fieldId: 'field-demo-1', externalFieldId: 'field-demo-1', crop: 'rice', hectares: 42.5, locality: 'Mercedes', geometryStatus: 'point_only' }],
        evidence: [{ fieldId: 'field-demo-1', climate: { state: 'available', source: 'open-meteo', observedAt: '2026-08-13T10:00:00.000Z', freshness: 'fresh', provenance: ['demo'] }, risk: { state: 'unavailable', reason: 'No risk snapshot.', engine: { selectionStatus: 'undecided' } } }],
        availability: [
          { domain: 'soil', state: 'unavailable', reason: 'No hay una observación de suelo verificada.', dependency: 'fuente de suelo verificada' },
          { domain: 'prices', state: 'unavailable', reason: 'No hay una observación de precios verificada.', dependency: 'fuente de precios aprobada' },
          { domain: 'fx', state: 'unavailable', reason: 'No hay una observación de FX verificada.', dependency: 'fuente de FX aprobada' },
          { domain: 'external_economics', state: 'unavailable', reason: 'No hay una fuente económica externa configurada.', dependency: 'política de evidencia económica' },
        ],
      }) })
    })
    await page.route('**/api/agronautas/**/planning/simulate', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        contractVersion: 'agronautas-assumption-simulation-v1', status: 'complete', result: {
          label: 'user_assumption_simulation', currency: 'ARS',
          units: { area: 'ha', expectedYield: 'kg/ha', price: 'currency/kg', variableCost: 'currency/ha', fixedCost: 'currency' },
          assumptions: ['manual'],
          inputs: { areaHa: 10, expectedYieldKgPerHa: 4000, pricePerKg: 0.4, variableCostPerHa: 500, fixedCost: 200 },
          outputs: { productionKg: 40000, grossValue: 16000, totalCost: 5200, scenarioDifference: 10800 },
        },
      }) })
    })
    const planning = new AgronautasPlanningPage(page)
    await planning.goto()
    await planning.verifyAccessibleSurface()
    const area = page.getByLabel('Área (ha)')
    await area.focus()
    await expect(area).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Rendimiento supuesto (kg/ha)')).toBeFocused()
    await planning.calculate()
    await expect(page.getByText(/Simulación basada en supuestos de usuario/i)).toBeVisible()
    await area.fill('')
    await expect(area).toHaveValue('')
    await planning.calculate()
    const simulationError = page.locator('#simulation-error')
    await expect(simulationError).toHaveAttribute('id', 'simulation-error')
    await expect(area).toHaveAttribute('aria-describedby', 'simulation-error')
    await page.getByRole('button', { name: 'Ver contexto de lectura' }).click()
    await expect(page.getByText(/No hay una observación de suelo verificada/i)).toBeVisible()
    await expect(page.locator('[aria-label="Datos de lotes seleccionados"]').getByText('field-demo-1')).toBeVisible()
    await expect(page.getByText(/open-meteo/i)).toBeVisible()
    await expect(page.getByText(/Proveniencia: demo/i)).toBeVisible()
    await expect(page.getByText(/No hay una observación de precios verificada/i)).toBeVisible()
    await expect(page.getByText(/Iberá-Alerta/i)).toHaveCount(0)
  })
})
