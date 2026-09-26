import { expect, test } from '@playwright/test'

const municipalityId = 'route-context-ituzaingo'

const dashboardWithoutTelemetry = {
  contractVersion: 'hydrology-government-dashboard-v1',
  municipality: {
    id: municipalityId,
    localityId: 'ituzaingo',
    name: 'Ituzaingó',
    officialAlerts: [],
    sourceRegistry: [{
      source: 'PNA',
      stationId: 'PNA-ITU',
      coverageKey: 'pna-ituzaingo',
      sourceUrl: 'https://www.argentina.gob.ar/armada/pna',
      freshnessPolicy: 'PT1H',
      registryVersion: 'registry-v1',
      reviewStatus: 'reviewed',
      reviewedAt: '2026-09-20T10:00:00.000Z',
    }],
  },
  gaugeMappings: { primaryPnaPortId: 'PNA-ITU', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] },
  telemetryCards: [],
  inaPredictions30d: [],
  alerts: [],
  provenance: [{ source: 'PNA', freshness: 'fresh', label: 'Registro de fuente revisado', lastSuccessfulObservedAt: null }],
}

test('municipality route preserves identity and keeps source registration separate from telemetry and citations', async ({ page }) => {
  const dashboardPaths: string[] = []
  await page.route('**/api/hydrology/municipalities/*/dashboard', async (route) => {
    dashboardPaths.push(new URL(route.request().url()).pathname)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dashboardWithoutTelemetry) })
  })
  await page.route('**/api/hydrology/municipalities/*/copilot/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'event: metadata\ndata: {"citationMode":"none","citations":[],"citationUnavailable":true,"unverifiedClaims":true,"unavailableReason":"No hay una referencia oficial verificable para esta respuesta."}\n\nevent: token\ndata: {"token":"Respuesta sin referencias."}\n\nevent: done\ndata: {}\n\n',
    })
  })

  await page.goto(`/municipalities/${municipalityId}`)
  await expect(page.getByRole('heading', { name: 'Ituzaingó' })).toBeVisible()
  await expect(page.locator('#telemetry')).toContainText('Sin telemetría oficial reciente')
  await expect(page.getByRole('region', { name: 'Gobernanza de cobertura' })).toContainText('PNA-ITU')
  expect(dashboardPaths).toEqual([`/api/hydrology/municipalities/${municipalityId}/dashboard`])

  await page.getByRole('textbox', { name: 'Consulta para Copilot Advisor' }).fill('¿Qué estado se puede confirmar?')
  await page.getByRole('button', { name: 'Enviar Consulta' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'No hay una referencia oficial verificable' })).toBeVisible()
  await expect(page.getByText('Citación:', { exact: false })).toBeVisible()
  await expect(page.getByText('No disponible', { exact: true }).last()).toBeVisible()
})

test('HTTP 200 with no source records stays missing and maintenance is not retryable', async ({ page }) => {
  let ingestCalls = 0
  await page.route('**/api/hydrology/ingest/verify', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contractVersion: '1.0.0', authorized: true }) })
  })
  await page.route('**/api/hydrology/ingest', async (route) => {
    ingestCalls += 1
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'completed', runId: 'demo-empty-run', requestedSources: ['PNA'], results: [] }) })
  })

  await page.goto('/municipalities/ingest')
  await page.getByLabel('Token de ingesta').fill('demo-only-token')
  await page.getByRole('button', { name: 'Verificar acceso' }).click()
  await page.getByRole('button', { name: 'Iniciar ingesta' }).click()
  await expect(page.getByRole('status')).toContainText('Ingesta sin datos verificables')
  await expect(page.getByRole('region', { name: 'Diagnósticos de ingesta' })).toContainText('missing')
  await expect(page.getByRole('button', { name: 'Reintentar ingesta' })).toBeVisible()
  expect(ingestCalls).toBe(1)

  await page.unroute('**/api/hydrology/ingest')
  await page.route('**/api/hydrology/ingest', async (route) => {
    ingestCalls += 1
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'maintenance', runId: 'demo-maintenance-run', requestedSources: ['PNA'], results: [] }) })
  })
  await page.getByRole('button', { name: 'Reintentar ingesta' }).click()
  await expect(page.getByRole('status')).toContainText('Fuente en mantenimiento')
  await expect(page.getByRole('button', { name: 'Reintentar ingesta' })).toHaveCount(0)
  expect(ingestCalls).toBe(2)
})

test('forbidden municipality detail has no retry action', async ({ page }) => {
  await page.route('**/api/hydrology/municipalities/forbidden/dashboard', async (route) => {
    await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 'FORBIDDEN' }) })
  })

  await page.goto('/municipalities/forbidden')
  await expect(page.getByText('No tenés permisos para consultar este tablero.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar tablero' })).toHaveCount(0)
})

test('HTTP 200 without a dashboard contract remains missing instead of looking like a municipality', async ({ page }) => {
  await page.route('**/api/hydrology/municipalities/no-contract/dashboard', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await page.goto('/municipalities/no-contract')
  await expect(page.getByRole('heading', { name: 'Municipio no disponible' })).toBeVisible()
  await expect(page.getByText('El tablero respondió sin datos verificables ni un contrato válido.')).toBeVisible()
  await expect(page.getByText('No se recibió información verificable del municipio.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar tablero' })).toHaveCount(0)
})

test('retryable dashboard outage recovers once without losing municipality route context', async ({ page }) => {
  let attempts = 0
  await page.route(`**/api/hydrology/municipalities/${municipalityId}/dashboard`, async (route) => {
    attempts += 1
    await route.fulfill(attempts === 1
      ? { status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'UPSTREAM_UNAVAILABLE' }) }
      : { status: 200, contentType: 'application/json', body: JSON.stringify(dashboardWithoutTelemetry) })
  })

  await page.goto(`/municipalities/${municipalityId}`)
  await expect(page.getByRole('button', { name: 'Reintentar tablero' })).toBeVisible()
  await page.getByRole('button', { name: 'Reintentar tablero' }).click()
  await expect(page.getByRole('heading', { name: 'Ituzaingó' })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/municipalities/${municipalityId}$`))
  expect(attempts).toBe(2)
})
