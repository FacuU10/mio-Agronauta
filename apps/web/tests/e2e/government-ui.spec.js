import { expect, test } from '@playwright/test'

const overviewPayload = {
  contractVersion: 'government-municipalities-v1',
  province: { code: 'AR-W', name: 'Corrientes' },
  lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z',
  sourceFreshness: [
    { source: 'PNA', status: 'fresh', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z' },
    { source: 'INA', status: 'fresh', lastSuccessfulObservedAt: '2026-06-23T18:30:00.000Z' },
    { source: 'SMN', status: 'stale', lastSuccessfulObservedAt: '2026-06-23T12:10:00.000Z' },
    { source: 'INMET', status: 'degraded', lastSuccessfulObservedAt: '2026-06-22T09:15:00.000Z', errorMessage: 'Estación sin respuesta' },
  ],
  provinceAlerts: [
    { severity: 'warning', title: 'Vigilancia reforzada', source: 'SMN', observedAt: '2026-06-23T12:10:00.000Z', localizedWarning: 'Tormentas aisladas con monitoreo activo.' },
  ],
  municipalities: [
    { id: 'ituzaingo', localityId: 'ituzaingo', name: 'Ituzaingó', riskLevel: 'high', localizedWarning: 'Altura en observación prioritaria.', alertHeightM: 4.8, evacuationHeightM: 5.4, latest: { pnaHeightM: 4.92, rainMm: 18, stormSeverity: 2, lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z' } },
    { id: 'mercedes', localityId: 'mercedes', name: 'Mercedes', riskLevel: 'moderate', localizedWarning: 'Lluvias persistentes sin alerta crítica.', latest: { rainMm: 9, lastSuccessfulObservedAt: '2026-06-23T11:20:00.000Z' } },
  ],
}

const dashboardPayload = {
  contractVersion: 'government-municipality-dashboard-v1',
  municipality: { id: 'ituzaingo', localityId: 'ituzaingo', name: 'Ituzaingó', alertHeightM: 4.8, evacuationHeightM: 5.4 },
  telemetryCards: [
    { source: 'PNA', stationId: 'PNA-ITU', metric: 'river_height', value: 4.92, unit: 'm', observedAt: '2026-06-23T13:40:00.000Z', lastSuccessfulObservedAt: '2026-06-23T13:40:00.000Z', label: 'Altura del río' },
    { source: 'INMET', stationId: 'INMET-URU', metric: 'rainfall', value: null, unit: 'mm', observedAt: '2026-06-22T09:15:00.000Z', lastSuccessfulObservedAt: '2026-06-22T09:15:00.000Z', label: 'Lluvia fronteriza' },
    { source: 'SMN', stationId: 'SMN-NEA', metric: 'storm_alert', value: 2, unit: 'nivel', observedAt: '2026-06-23T12:10:00.000Z', lastSuccessfulObservedAt: '2026-06-23T12:10:00.000Z', label: 'Alerta de tormenta' },
  ],
  inaForecast30Days: [
    { stationId: 'INA-ITU', horizonDays: 1, forecastHeightM: 4.8, observedAt: '2026-06-23T18:30:00.000Z', confidence: 'normal' },
    { stationId: 'INA-ITU', horizonDays: 30, forecastHeightM: 4.35, observedAt: '2026-06-23T18:30:00.000Z', confidence: 'speculative' },
  ],
  smn: { alerts: [{ title: 'Tormentas aisladas' }], rainfall: [{ value: 18, unit: 'mm' }], freshness: 'stale' },
  inmet: { stations: [{ id: 'INMET-URU' }], rainfall: [], freshness: 'degraded' },
  provenance: [
    { source: 'PNA', url: 'https://contenidosweb.prefecturanaval.gob.ar/alturas/', lastRunStatus: 'success' },
    { source: 'INMET', lastRunStatus: 'degraded', errorMessage: 'Estación sin respuesta' },
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
      { source: 'INA', stationId: 'INA-ITU', metric: 'forecast_height', value: null, unit: 'm', observedAt: null, lastSuccessfulObservedAt: null, label: 'Pronóstico INA' },
    ],
    provenance: [
      ...dashboardPayload.provenance,
      { source: 'INA', lastRunStatus: 'degraded', errorMessage: 'Pronóstico no disponible' },
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
