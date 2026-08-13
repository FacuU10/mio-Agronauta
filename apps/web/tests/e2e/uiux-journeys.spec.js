import { expect, test } from '@playwright/test'

const observedAt = '2026-06-23T13:40:00.000Z'
const validUntil = '2026-06-23T19:40:00.000Z'
const fieldId = 'field-uiux-1'
const snapshotId = 'snapshot-uiux-1'
const apiPort = process.env.PLAYWRIGHT_API_PORT ?? '3001'

const riskSnapshot = {
  contractVersion: '1.0.0',
  snapshotId,
  fieldId,
  score: 81,
  level: 'high',
  confidence: 0.72,
  computedAt: observedAt,
  validUntil,
  ruleVersion: 'risk-v0',
  degradationReasons: ['satellite_data_stale'],
  evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-uiux-1'],
  drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
}

const field = {
  fieldId,
  externalFieldId: 'corrientes-lote-uiux-1',
  crop: 'rice',
  hectares: 42.5,
  locality: 'Mercedes',
  provinceCode: 'AR-W',
  centroid: { lat: -29.1846, lng: -58.0759 },
}

const alert = {
  contractVersion: '1.0.0',
  alertId: 'alert-uiux-1',
  fieldId,
  basedOnSnapshotId: snapshotId,
  type: 'flood',
  priority: 1,
  confidence: 0.72,
  freshness: 'stale',
  degradationReasons: ['satellite_data_stale'],
}

const weatherTimeline = {
  fieldId,
  items: [{
    provider: 'weather-api',
    observedAt,
    freshnessHours: 12,
    confidence: 0.72,
    staleCause: 'satellite_data_stale',
    temperatureC: 30.5,
    rainfallMm7d: 82,
    humidityPct: 74,
  }],
}

const dashboard = {
  contractVersion: '1.0.0',
  snapshotId,
  field: { fieldId, cropCategory: 'cereal', crop: 'rice', provinceCode: 'AR-W', locality: 'Mercedes' },
  status: 'degraded',
  freshness: 'degraded',
  signals: [
    { signalType: 'weather', status: 'degraded', evidenceRefs: riskSnapshot.evidenceRefs, confidence: 0.72, degradationReasons: ['satellite_data_stale'] },
    { signalType: 'satellite_vegetation', status: 'missing', evidenceRefs: riskSnapshot.evidenceRefs, confidence: 0.2, degradationReasons: ['satellite_data_unavailable'] },
  ],
  risk: { score: 81, level: 'high', confidence: 0.72, drivers: riskSnapshot.drivers },
  alerts: [alert],
  provenance: [{
    evidenceId: 'weather-api-weather-uiux-1',
    provider: 'weather-api',
    signalType: 'weather',
    observedAt,
    ingestedAt: observedAt,
    sourceUrl: 'https://example.com/weather',
    rawHash: 'fixture-hash-uiux-1',
    confidence: 0.72,
    freshness: 'degraded',
    providerMode: 'seam',
    lastSuccessfulObservedAt: observedAt,
    nextDueAt: validUntil,
    failureReason: 'satellite_data_stale',
    degradationReasons: ['satellite_data_stale'],
  }],
  scheduler: { lastRunAt: observedAt, nextRunAt: validUntil, lockStatus: 'available', failures: [], nextDueBySource: [] },
  generatedAt: observedAt,
  lastDataFetchedAt: observedAt,
  presentation: {
    disclaimer: 'Los indicadores son soporte operativo y no reemplazan criterio agronómico local.',
    confidenceLabel: 'media',
    sourcesUnavailable: true,
    staleFlags: ['satellite_data_stale'],
  },
}

const hydrologyItem = {
  source: 'PNA',
  stationId: 'pna-uiux-1',
  observedAt,
  ingestedAt: observedAt,
  lastSuccessfulObservedAt: observedAt,
  value: 5.42,
  unit: 'm',
  metric: 'river_height_m',
  quality: 'observed',
  freshness: 'fresh',
  tendency: 'Crece',
  sourceUrl: 'https://example.com/pna',
}

const hydrologyDashboard = {
  contractVersion: 'hydrology-dashboard-v1',
  fieldId,
  zone: 'Mercedes',
  sources: ['PNA', 'INA', 'INMET', 'SMN'],
  stations: [{ id: 'pna-uiux-1', source: 'PNA', stationName: 'Estación UIUX', riverName: 'Paraná', zone: 'Mercedes', sourceUrl: 'https://example.com/pna' }],
  status: { riskLevel: 'high', freshness: 'fresh', quality: 'observed', recommendation: 'Revisar caminos bajos antes de nuevas lluvias.', lastSuccessfulObservedAt: observedAt },
  heights: [hydrologyItem],
  trends: [hydrologyItem],
  forecasts: [{ ...hydrologyItem, source: 'INA', stationId: 'ina-uiux-1', forecastHorizonDays: 30, confidence: 'speculative', quality: 'forecast', value: 5.1 }],
  rain: [{ ...hydrologyItem, source: 'SMN', stationId: 'smn-uiux-1', metric: 'rain_mm', unit: 'mm/24h', value: 46 }],
  alerts: [{ ...hydrologyItem, source: 'SMN', stationId: 'smn-uiux-1', metric: 'storm_alert', unit: 'nivel', value: 1 }],
}

async function mockAgronautas(page, { partialCopilot = true } = {}) {
  const registerApiRoute = async (suffix, handler) => {
    await page.route(`**/api/agronautas/**${suffix}`, handler)
    await page.route(`**:${apiPort}${suffix}`, handler)
  }

  await registerApiRoute('/runtime', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ mode: 'real', routePrefix: '/agronautas', compatibilityPrefix: '/agronautas/v1', contractVersion: '1.0.0' }),
  }))
  await registerApiRoute('/fields', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ fieldId, coverage: { locality: 'Mercedes', provinceCode: 'AR-W', boundaryVersion: 'uiux-v1' } }) })
  })

  const fulfillJson = (payload, status = 200) => async (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) })
  await registerApiRoute(`/fields/${fieldId}`, fulfillJson(field))
  await registerApiRoute(`/fields/${fieldId}/risk/current`, fulfillJson({ status: 'stale', snapshot: riskSnapshot, recompute: { status: 'enqueued' } }))
  await registerApiRoute(`/fields/${fieldId}/alerts/current`, fulfillJson({ status: 'stale', snapshot: riskSnapshot, alerts: [alert], recompute: { status: 'already_in_progress' } }))
  await registerApiRoute(`/fields/${fieldId}/alerts/timeline`, fulfillJson({ fieldId, items: [alert] }))
  await registerApiRoute(`/fields/${fieldId}/status`, fulfillJson({ contractVersion: '1.0.0', fieldId, fieldStatus: 'stale', riskStatus: 'stale', alertsStatus: 'stale', alertCount: 1, lastUpdatedAt: observedAt, validUntil, degradationReasons: ['satellite_data_stale'] }))
  await registerApiRoute(`/fields/${fieldId}/risk/timeline`, fulfillJson({ fieldId, items: [riskSnapshot] }))
  await registerApiRoute(`/fields/${fieldId}/weather/timeline`, fulfillJson(weatherTimeline))
  await registerApiRoute(`/fields/${fieldId}/dashboard`, fulfillJson(dashboard))
  await registerApiRoute(`/fields/${fieldId}/hydrology/dashboard`, fulfillJson(hydrologyDashboard))
  await registerApiRoute(`/fields/${fieldId}/recompute`, fulfillJson({ status: 'already_in_progress', runId: 'recompute-uiux-1' }))
  await registerApiRoute(`/fields/${fieldId}/chat`, fulfillJson({
    contractVersion: '1.0.0',
    fieldId,
    answer: 'El lote conserva riesgo alto con evidencia persistida.',
    executedAction: 'GET_RISK_SUMMARY',
    supportingFacts: [{ label: 'Score', value: '81' }],
    citations: riskSnapshot.evidenceRefs,
    trace: [{ action: 'GET_RISK_SUMMARY', status: 'executed' }],
    degraded: false,
  }))
  await registerApiRoute(`/fields/${fieldId}/copilot/chat`, async (route) => {
    const body = partialCopilot
      ? 'event: metadata\ndata: {"sources":["PNA","INA"],"limits":["No reemplaza criterio local"],"observedAt":"2026-06-23T13:40:00.000Z"}\n\nevent: token\ndata: {"token":"Token conservado "}\n\nevent: error\ndata: {"message":"El stream terminó antes de completar la respuesta."}\n\n'
      : 'event: metadata\ndata: {"sources":["PNA"]}\n\nevent: token\ndata: {"token":"Respuesta completa"}\n\nevent: done\ndata: {}\n\n'
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
  })
}

const iberaOverview = {
  contractVersion: 'hydrology-government-municipalities-v1',
  province: { provinceCode: 'AR-W', name: 'Corrientes' },
  sourceFreshness: [
    { source: 'PNA', freshness: 'fresh', label: 'Último dato PNA', lastSuccessfulObservedAt: observedAt },
    { source: 'INA', freshness: 'fresh', label: 'Último dato INA', lastSuccessfulObservedAt: observedAt },
    { source: 'INMET', freshness: 'degraded', label: 'Estación sin respuesta', lastSuccessfulObservedAt: observedAt },
    { source: 'SMN', freshness: 'degraded', label: 'Pronóstico degradado', lastSuccessfulObservedAt: observedAt },
  ],
  provinceAlerts: [{ zone: 'Vigilancia reforzada', source: 'SMN', stationId: 'SMN-NEA', observedAt, lastSuccessfulObservedAt: observedAt, message: 'Tormentas aisladas con monitoreo activo.' }],
  municipalities: [
    {
      id: 'ituzaingo', localityId: 'ituzaingo', name: 'Ituzaingó', provinceCode: 'AR-W', alertHeightM: 4.8, evacuationHeightM: 5.4,
      gaugeMappings: { primaryPnaPortId: 'PNA-ITU', secondaryPnaPortIds: [], inaStationIds: ['INA-ITU'], smnRegionIds: ['SMN-NEA'], inmetStationIds: ['INMET-URU'] },
      latestTelemetry: [{ source: 'PNA', stationId: 'PNA-ITU', metric: 'river_height_m', value: 4.92, unit: 'm', observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, quality: 'observed', freshness: 'fresh' }],
      officialAlerts: [{ source: 'SMN', coverageKey: 'SMN-NEA', message: 'Tormentas fuertes', observedAt, lastSuccessfulObservedAt: observedAt, freshness: 'fresh', sourceUrl: 'https://example.com/smn' }],
    },
    {
      id: 'goya', localityId: 'goya-corrientes', name: 'Goya', provinceCode: 'AR-W',
      gaugeMappings: { primaryPnaPortId: 'PNA-GOYA', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] },
      latestTelemetry: [], officialAlerts: [],
    },
  ],
}

const iberaDashboard = {
  contractVersion: 'hydrology-government-dashboard-v1',
  municipality: { id: 'ituzaingo', localityId: 'ituzaingo', name: 'Ituzaingó', alertHeightM: 4.8, evacuationHeightM: 5.4, officialAlerts: iberaOverview.municipalities[0].officialAlerts },
  gaugeMappings: iberaOverview.municipalities[0].gaugeMappings,
  telemetryCards: [
    { source: 'PNA', stationId: 'PNA-ITU', metric: 'river_height_m', value: 4.92, unit: 'm', observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, quality: 'observed', freshness: 'fresh', label: 'Altura del río' },
    { source: 'INMET', stationId: 'INMET-URU', metric: 'rain_mm', value: null, unit: 'mm', observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, quality: 'missing', freshness: 'degraded', label: 'Lluvia fronteriza' },
    { source: 'SMN', stationId: 'SMN-NEA', metric: 'storm_alert', value: 2, unit: 'nivel', observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, quality: 'observed', freshness: 'degraded', label: 'Alerta de tormenta' },
  ],
  inaPredictions30d: [
    { source: 'INA', stationId: 'INA-ITU', metric: 'river_height_m', value: 4.8, unit: 'm', observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, quality: 'forecast', freshness: 'fresh', forecastHorizonDays: 7, confidence: 'normal' },
    { source: 'INA', stationId: 'INA-ITU', metric: 'river_height_m', value: 4.35, unit: 'm', observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, quality: 'forecast', freshness: 'fresh', forecastHorizonDays: 30, confidence: 'speculative' },
  ],
  alerts: [{ source: 'SMN', stationId: 'SMN-NEA', metric: 'storm_alert', value: 2, unit: 'nivel', observedAt, ingestedAt: observedAt, lastSuccessfulObservedAt: observedAt, quality: 'observed', freshness: 'fresh', label: 'Alerta de tormenta' }],
  provenance: [
    { source: 'PNA', freshness: 'fresh', label: 'Último dato obtenido: 23/06/2026 13:40', lastSuccessfulObservedAt: observedAt },
    { source: 'INMET', freshness: 'degraded', label: 'Estación sin respuesta', lastSuccessfulObservedAt: observedAt },
  ],
}

async function mockIbera(page, { copilotError = true } = {}) {
  await page.route('**/api/hydrology/municipalities', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(iberaOverview) }))
  await page.route('**/api/hydrology/municipalities/ituzaingo/dashboard', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(iberaDashboard) }))
  await page.route('**/api/hydrology/municipalities/ituzaingo/copilot/chat', async (route) => {
    const body = copilotError
      ? 'event: metadata\ndata: {"sources":["PNA","INA"],"limits":["No reemplaza fuentes oficiales"],"observedAt":"2026-06-23T13:40:00.000Z"}\n\nevent: token\ndata: {"text":"Último dato conservado. "}\n\nevent: error\ndata: {"message":"El stream quedó incompleto."}\n\n'
      : 'event: metadata\ndata: {"sources":["PNA"]}\n\nevent: token\ndata: {"text":"Estado oficial"}\n\nevent: done\ndata: {}\n\n'
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
  })
}

async function expectVisibleFocus(page) {
  await page.locator('body').press('Tab')
  const skip = page.getByRole('link', { name: /Saltar al contenido|Saltar al listado|Saltar a telemetría/i })
  await expect(skip).toBeFocused()
  const focusStyle = await skip.evaluate((element) => {
    const style = getComputedStyle(element)
    return { position: style.position, background: style.backgroundColor, visibility: style.visibility }
  })
  expect(focusStyle.position).toBe('fixed')
  expect(focusStyle.visibility).toBe('visible')
  expect(focusStyle.background).not.toBe('rgba(0, 0, 0, 0)')
}

async function expectKeyboardFocus(page, fieldLabel, buttonName) {
  const field = page.getByLabel(fieldLabel)
  const button = page.getByRole('button', { name: buttonName })
  await field.fill('focus-test-token')
  await field.focus()
  await page.keyboard.press('Tab')
  await expect(button).toBeFocused()
}

async function expectTextStatus(page, name) {
  const status = page.locator('[role="status"]').filter({ hasText: name }).first()
  await expect(status).toBeVisible()
  await expect(status).not.toHaveText('')
  const text = await status.innerText()
  expect(text.toLocaleLowerCase()).toContain(name.toLocaleLowerCase())
}

test.describe('Agronautas first journey', () => {
  test.setTimeout(90_000)
  test.use({ viewport: { width: 1440, height: 900 } })

  test('recorre workspace, decisión, detalle, evidencia, chat existente y reporte', async ({ page }) => {
    await mockAgronautas(page)
    await page.goto('/demo')

    await expect(page.getByRole('heading', { name: 'Workspace Agronautas' })).toBeVisible()
    await expectVisibleFocus(page)
    await page.getByLabel('Buscar localidad').fill('Mer')
    await expect(page.getByRole('option', { name: /Mercedes/ })).toBeVisible()
    await page.getByRole('option', { name: /Mercedes/ }).click()
    await page.getByTestId('agronautas-submit-intake').click()

    await expect(page.getByRole('heading', { name: 'Decisión del lote' })).toBeVisible()
    await expect(page.getByText('Snapshot stale detectado')).toBeVisible()
    await expect(page.getByText('Frescura degradada')).toBeVisible()
    await expectTextStatus(page, 'Stale')

    const roadmap = page.getByTestId('agronautas-future-capabilities')
    await expect(roadmap.locator('[role="status"]')).toHaveCount(6)
    await expect(roadmap.locator('a, button, input, form')).toHaveCount(0)

    await page.getByRole('textbox', { name: 'Pregunta', exact: true }).fill('¿Cuál es el riesgo actual?')
    await page.getByRole('button', { name: 'Preguntar al chat' }).click()
    await expect(page.getByText('El lote conserva riesgo alto con evidencia persistida.')).toBeVisible()
    await expect(page.getByText('Facts inyectados')).toBeVisible()

    await page.getByLabel('Pregunta hidrológica').fill('¿Qué riesgo de crecida tiene el lote?')
    await page.getByRole('button', { name: 'Preguntar al Copilot Hidrológico' }).click()
    await expect(page.getByText('Respuesta parcial conservada')).toBeVisible()
    await expect(page.getByText('Token conservado')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reintentar chat' })).toBeVisible()

    await page.getByRole('link', { name: 'Abrir detalle' }).click()
    await expect(page).toHaveURL(/\/demo\/fields\/field-uiux-1$/)
    await expect(page.getByRole('heading', { name: 'Detalle del lote', exact: true })).toBeVisible()
    await expect(page.getByText('Evidencia y citas')).toBeVisible()
    await expect(page.getByText('Riesgo de anegamiento').first()).toBeVisible()
    await page.getByText('Evidencia y citas').click()
    await expect(page.getByText('signal_ingestion_runs:weather-api:climate:run-uiux-1')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Alternativa no cartográfica' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Descargar reporte PDF' })).toHaveAttribute('href', /dashboard\.pdf$/)
    await page.getByRole('button', { name: 'Solicitar recompute' }).click()
    await expect(page.getByText('recompute already_in_progress')).toBeVisible()
  })

  test('mantiene estados no-color y placeholders honestos en mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockAgronautas(page)
    await page.goto('/demo')
    const roadmap = page.getByTestId('agronautas-future-capabilities')
    await expect(roadmap.getByText('Contrato pendiente').first()).toBeVisible()
    await expect(roadmap.locator('a, button, input, form')).toHaveCount(0)
    await page.getByLabel('Latitud').fill('-20')
    await expect(page.getByText('Cobertura por punto · fuera del alcance previsualizado')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Falta información' }).first()).toBeVisible()
    await page.getByTestId('agronautas-submit-intake').click()
    await expect(page.getByText('Snapshot stale detectado')).toBeVisible()
    await expectTextStatus(page, 'Stale')
  })
})

test.describe('Iberá second journey', () => {
  test('recorre overview, fallback de mapa, localidad, fuentes, INA y Copilot parcial en mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockIbera(page)
    await page.goto('/municipalities')

    await expect(page.getByRole('heading', { name: 'Centro de Monitoreo Hídrico Provincial' })).toBeVisible()
    await expectVisibleFocus(page)
    await expect(page.getByRole('region', { name: 'Alternativa no cartográfica' })).toBeVisible()
    await expect(page.getByText('Estación sin respuesta')).toBeVisible()
    await expect(page.getByTestId('ibera-alerta-future-capabilities').locator('[role="status"]')).toHaveCount(3)
    await expect(page.getByTestId('ibera-alerta-future-capabilities').locator('a, button, input, form')).toHaveCount(0)

    await Promise.all([
      page.waitForURL(/\/municipalities\/ituzaingo$/),
      page.getByRole('link', { name: /Abrir tablero de Ituzaingó/ }).click(),
    ])
    await expect(page.getByRole('heading', { name: 'Ituzaingó' })).toBeVisible()
    await expect(page.locator('#telemetry').getByText('Observado')).toBeVisible()
    await expect(page.getByText('Sin datos')).toBeVisible()
    await expect(page.getByText('Degradado', { exact: true })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Predicción INA a 30 días' })).toContainText('Día 30')
    await expect(page.getByText('Días 15–30: planificación especulativa o de baja confianza.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Copilot Advisor' })).toBeVisible()

    await page.getByLabel('Consulta para Copilot Advisor').fill('¿Cuál es el estado oficial?')
    await page.getByRole('button', { name: 'Enviar Consulta' }).click()
    await expect(page.getByText('Parcial · tokens conservados')).toBeVisible()
    await expect(page.getByText('Último dato conservado.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reintentar consulta' })).toBeVisible()
  })

  test('expone loading, error y empty sin ocultar el estado operativo', async ({ page }) => {
    let requestCount = 0
    await page.route('**/api/hydrology/municipalities', async (route) => {
      requestCount += 1
      if (requestCount === 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'offline' }) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...iberaOverview, sourceFreshness: [], provinceAlerts: [], municipalities: [] }) })
    })
    await page.goto('/municipalities')
    await expect(page.getByText('Cargando…')).toBeVisible()
    await expect(page.locator('main [role="alert"]')).toContainText('Reintentá desde la red oficial')

    await page.reload()
    await expect(page.getByText('No hay localidades que coincidan con estos filtros.')).toBeVisible()
  })

  test('muestra ingesta parcial, retry y estados por fuente sin datos sensibles', async ({ page }) => {
    const secret = 'secret-uiux-token'
    await page.route('**/api/hydrology/ingest/verify', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contractVersion: '1.0.0', authorized: true }) }))
    await page.route('**/api/hydrology/ingest', (route) => route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ contractVersion: 'hydrology-government-ingest-v1', status: 'partial', runId: 'run-uiux-1', requestedSources: ['PNA', 'SMN'], results: [{ source: 'PNA', status: 'success', recordsIngested: 2 }, { source: 'SMN', status: 'failed', recordsIngested: 0, diagnostic: { failureKind: 'timeout', attempts: 1, providerHost: 'smn.gob.ar', upstreamStatus: 504 } }] }),
    }))
    await page.goto('/municipalities/ingest')
    await expectKeyboardFocus(page, 'Token de ingesta', 'Verificar acceso')
    await page.getByLabel('Token de ingesta').fill(secret)
    await page.getByRole('button', { name: 'Verificar acceso' }).press('Enter')
    await page.getByRole('button', { name: 'Iniciar ingesta' }).click()
    await expect(page.getByRole('status')).toHaveText('Ingesta parcial')
    await expect(page.getByText('Completó')).toBeVisible()
    await expect(page.getByText('Falló')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reintentar ingesta' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText(secret)
    await expect(page.locator('body')).not.toContainText('tokenEcho')
  })
})
