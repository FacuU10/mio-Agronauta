import { expect, test } from '@playwright/test'

const overviewPayload = {
  contractVersion: 'hydrology-government-municipalities-v1',
  province: { provinceCode: 'AR-W', name: 'Corrientes' },
  sourceFreshness: [],
  provinceAlerts: [],
  municipalities: [
    {
      id: 'corrientes', localityId: 'corrientes-capital', name: 'Corrientes Capital', provinceCode: 'AR-W',
      gaugeMappings: { primaryPnaPortId: 'corrientes', secondaryPnaPortIds: [], inaStationIds: ['6764'], smnRegionIds: ['smn-corrientes'], inmetStationIds: [] },
      latestTelemetry: [
        { source: 'PNA', stationId: 'corrientes', metric: 'river_height_m', value: 3.2, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' },
        { source: 'INA', stationId: '6764', metric: 'river_height_m', value: 3.11, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' },
      ],
      officialAlerts: [{ source: 'SMN', coverageKey: 'smn-corrientes', message: 'Tormentas fuertes', observedAt: '2026-06-23T09:00:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z', freshness: 'fresh', sourceUrl: 'https://example.com/smn' }],
    },
    {
      id: 'goya', localityId: 'goya-corrientes', name: 'Goya', provinceCode: 'AR-W',
      gaugeMappings: { primaryPnaPortId: 'goya', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] },
      latestTelemetry: [], officialAlerts: [],
    },
  ],
}

test('municipalities overview renders matched official alerts without leaking them to unrelated municipalities', async ({ page }) => {
  await page.route('**/api/hydrology/municipalities', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overviewPayload) }))

  await page.goto('/municipalities')

  const corrientes = page.locator('#municipalities-list article').filter({ hasText: 'Corrientes Capital' })
  const goya = page.locator('#municipalities-list article').filter({ hasText: 'Goya' })
  await expect(corrientes).toContainText('Tormentas fuertes')
  await expect(corrientes).toContainText('Cobertura smn-corrientes')
  await expect(corrientes).toContainText('Vigente')
  await expect(corrientes).toContainText('3.2 m')
  await expect(goya).not.toContainText('Tormentas fuertes')
})

test('municipality detail keeps telemetry and renders the explicit empty official-alert state', async ({ page }) => {
  const goya = overviewPayload.municipalities.find((municipality) => municipality.id === 'goya')
  if (!goya) throw new Error('Expected Goya fixture')

  await page.route('**/api/hydrology/municipalities/goya/dashboard', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      contractVersion: 'hydrology-government-dashboard-v1',
      municipality: { id: 'goya', localityId: 'goya-corrientes', name: 'Goya', officialAlerts: [] },
     gaugeMappings: goya.gaugeMappings,
      telemetryCards: [{ source: 'PNA', stationId: 'goya', metric: 'river_height_m', value: 2.8, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', label: 'Altura PNA' }],
      inaPredictions30d: [], alerts: [], provenance: [],
    }),
  }))

  await page.goto('/municipalities/goya')

  await expect(page.getByRole('heading', { name: 'Goya' })).toBeVisible()
  await expect(page.getByText('Sin alertas oficiales recientes.')).toBeVisible()
  await expect(page.getByText('2.8 m')).toBeVisible()
})
