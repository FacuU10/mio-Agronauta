import { expect, test } from '@playwright/test'

const overviewPayload = {
  contractVersion: 'hydrology-government-municipalities-v1',
  province: { provinceCode: 'AR-W', name: 'Corrientes' },
  sourceFreshness: [
    { source: 'PNA', freshness: 'fresh', label: 'Último dato PNA', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z' },
    { source: 'INA', freshness: 'fresh', label: 'Último dato INA', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z' },
    { source: 'SMN', freshness: 'degraded', label: 'Último dato SMN', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z' },
    { source: 'INMET', freshness: 'degraded', label: 'Estación sin respuesta', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z' },
  ],
  provinceAlerts: [
    { zone: 'Vigilancia reforzada', source: 'SMN', stationId: 'SMN-NEA', observedAt: '2026-06-23T12:10:00.000Z', lastSuccessfulObservedAt: '2026-06-23T12:10:00.000Z', message: 'Tormentas aisladas con monitoreo activo.' },
  ],
  municipalities: [
    {
      id: 'ituzaingo', localityId: 'ituzaingo', name: 'Ituzaingó', provinceCode: 'AR-W', alertHeightM: 4.8, evacuationHeightM: 5.4,
      gaugeMappings: { primaryPnaPortId: 'PNA-ITU', secondaryPnaPortIds: [], inaStationIds: ['INA-ITU'], smnRegionIds: ['SMN-NEA'], inmetStationIds: ['INMET-URU'] },
      latestTelemetry: [
        { source: 'PNA', stationId: 'PNA-ITU', metric: 'river_height_m', value: 4.92, unit: 'm', observedAt: '2026-06-23T13:40:00.000Z', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z', sourceUrl: 'https://example.com/pna' },
        { source: 'INA', stationId: 'INA-ITU', metric: 'river_height_m', value: 4.8, unit: 'm', observedAt: '2026-06-23T13:40:00.000Z', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z', sourceUrl: 'https://example.com/ina' },
      ],
      officialAlerts: [],
    },
    {
      id: 'mercedes', localityId: 'mercedes', name: 'Mercedes', provinceCode: 'AR-W',
      gaugeMappings: { primaryPnaPortId: 'PNA-MER', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] },
      latestTelemetry: [{ source: 'PNA', stationId: 'PNA-MER', metric: 'river_height_m', value: 3.1, unit: 'm', observedAt: '2026-06-23T11:20:00.000Z', lastSuccessfulObservedAt: '2026-06-23T11:20:00.000Z' }],
      officialAlerts: [],
    },
  ],
}

const dashboardPayload = {
  contractVersion: 'hydrology-government-dashboard-v1',
  municipality: { id: 'ituzaingo', localityId: 'ituzaingo', name: 'Ituzaingó', alertHeightM: 4.8, evacuationHeightM: 5.4, officialAlerts: [] },
  telemetryCards: [
    { source: 'PNA', stationId: 'PNA-ITU', metric: 'river_height_m', value: 4.92, unit: 'm', observedAt: '2026-06-23T13:40:00.000Z', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z', label: 'Altura del río' },
    { source: 'INMET', stationId: 'INMET-URU', metric: 'rain_mm', value: null, unit: 'mm', observedAt: '2026-06-22T09:15:00.000Z', lastSuccessfulObservedAt: '2026-06-22T09:15:00.000Z', label: 'Lluvia fronteriza' },
    { source: 'SMN', stationId: 'SMN-NEA', metric: 'storm_alert', value: 2, unit: 'nivel', observedAt: '2026-06-23T12:10:00.000Z', lastSuccessfulObservedAt: '2026-06-23T12:10:00.000Z', label: 'Alerta de tormenta' },
  ],
  inaPredictions30d: [
    { source: 'INA', stationId: 'INA-ITU', metric: 'river_height_m', value: 4.8, unit: 'm', observedAt: '2026-06-23T13:40:00.000Z', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z', forecastHorizonDays: 1, confidence: 'normal' },
    { source: 'INA', stationId: 'INA-ITU', metric: 'river_height_m', value: 4.35, unit: 'm', observedAt: '2026-06-23T13:40:00.000Z', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z', forecastHorizonDays: 30, confidence: 'speculative' },
  ],
  alerts: [{ source: 'SMN', stationId: 'SMN-NEA', metric: 'storm_alert', value: 2, unit: 'nivel', observedAt: '2026-06-23T12:10:00.000Z', lastSuccessfulObservedAt: '2026-06-23T12:10:00.000Z', label: 'Alerta de tormenta' }],
  provenance: [
    { source: 'PNA', freshness: 'fresh', label: 'Último dato obtenido: 23/06/2026 13:40', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z' },
    { source: 'INMET', freshness: 'degraded', label: 'Estación sin respuesta', lastSuccessfulObservedAt: '2026-06-23T09:15:00.000Z' },
  ],
}

test('government hierarchy navigates from province overview to locality detail', async ({ page }) => {
  await mockGovernmentApi(page, overviewPayload, dashboardPayload)

  await page.goto('/municipalities')

  await expect(page.getByRole('heading', { name: /Centro de Monitoreo Hídrico/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Abrir tablero de Ituzaingó/i })).toBeVisible()
  await expect(page.getByText('Último dato obtenido: 23/06/2026 13:40').first()).toBeVisible()
  await expect(page.getByText('INMET')).toBeVisible()
  await expect(page.getByText('Estación sin respuesta')).toBeVisible()

  await Promise.all([
    page.waitForURL(/\/municipalities\/ituzaingo$/),
    page.getByRole('link', { name: /Abrir tablero de Ituzaingó/i }).click(),
  ])

  await expect(page).toHaveURL(/\/municipalities\/ituzaingo$/)
  await expect(page.getByRole('heading', { name: /Ituzaingó/i })).toBeVisible()
  await expect(page.getByText('Altura del río')).toBeVisible()
  await expect(page.getByText('Último dato obtenido: 23/06/2026 13:40').first()).toBeVisible()
  await expect(page.getByRole('table', { name: /Predicción INA a 30 días/i })).toContainText('Día 30')
  await expect(page.getByRole('heading', { name: /Copilot Advisor/i })).toBeVisible()
})

test('government detail keeps degraded partial-source states explicit', async ({ page }) => {
  const degradedDashboard = {
    ...dashboardPayload,
    telemetryCards: [
      ...dashboardPayload.telemetryCards,
      { source: 'INA', stationId: 'INA-ITU', metric: 'river_height_m', value: null, unit: 'm', observedAt: null, lastSuccessfulObservedAt: null, label: 'Pronóstico INA' },
    ],
    provenance: [
      ...dashboardPayload.provenance,
      { source: 'INA', freshness: 'degraded', label: 'Pronóstico no disponible', lastSuccessfulObservedAt: null },
    ],
  }
  await mockGovernmentApi(page, overviewPayload, degradedDashboard)

  await page.goto('/municipalities/ituzaingo')

  await expect(page.getByText('Pronóstico INA')).toBeVisible()
  await expect(page.getByText('Último dato obtenido: no disponible')).toBeVisible()
  await expect(page.getByText('Pronóstico no disponible')).toBeVisible()
  await expect(page.getByText('Tablero usable con fuentes degradadas')).toBeVisible()
})

async function mockGovernmentApi(page, overview, dashboard) {
  await page.route('**/api/hydrology/municipalities', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview) })
  })

  await page.route('**/api/hydrology/municipalities/ituzaingo/dashboard', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dashboard) })
  })

  await page.route('**/api/hydrology/municipalities/ituzaingo/copilot/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'event: metadata\ndata: {"municipalityId":"ituzaingo"}\n\nevent: token\ndata: {"text":"Monitoreo oficial activo."}\n\nevent: done\ndata: {}\n\n',
    })
  })
}
