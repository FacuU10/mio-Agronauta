import { expect, test } from '@playwright/test'

test('agronautas muestra snapshot stale con evidencia persistida', async ({ page }) => {
  await page.route('**/api/agronautas/**/runtime', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mode: 'real', routePrefix: '/agronautas', compatibilityPrefix: '/agronautas/v1', contractVersion: '1.0.0' }),
    })
  })

  await page.route('**/fields', async (route) => {
    if (route.request().method() !== 'POST' || !route.request().url().endsWith('/fields')) {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        fieldId: 'field-e2e-1',
        coverage: { locality: 'Mercedes', provinceCode: 'AR-W', boundaryVersion: 'v1' },
      }),
    })
  })

  await page.route('**/fields/field-e2e-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fieldId: 'field-e2e-1',
        externalFieldId: 'corrientes-lote-001',
        crop: 'rice',
        hectares: 42.5,
        locality: 'Mercedes',
        provinceCode: 'AR-W',
        centroid: { lat: -29.1846, lng: -58.0759 },
      }),
    })
  })

  await page.route('**/fields/field-e2e-1/risk/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'stale',
        recompute: { status: 'enqueued' },
        snapshot: {
          contractVersion: '1.0.0',
          snapshotId: 'snap-e2e-1',
          fieldId: 'field-e2e-1',
          score: 81,
          level: 'high',
          confidence: 0.72,
          computedAt: '2026-06-03T00:00:00.000Z',
          validUntil: '2026-06-03T06:00:00.000Z',
          ruleVersion: 'risk-v0',
          degradationReasons: ['satellite_data_stale'],
          evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-e2e-1'],
          drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
        },
      }),
    })
  })

  await page.route('**/fields/field-e2e-1/alerts/current', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'stale',
        snapshot: {
          contractVersion: '1.0.0',
          snapshotId: 'snap-e2e-1',
          fieldId: 'field-e2e-1',
          score: 81,
          level: 'high',
          confidence: 0.72,
          computedAt: '2026-06-03T00:00:00.000Z',
          validUntil: '2026-06-03T06:00:00.000Z',
          ruleVersion: 'risk-v0',
          degradationReasons: ['satellite_data_stale'],
          evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-e2e-1'],
          drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
        },
        recompute: { status: 'already_in_progress' },
        alerts: [
          {
            contractVersion: '1.0.0',
            alertId: 'alert-e2e-1',
            fieldId: 'field-e2e-1',
            basedOnSnapshotId: 'snap-e2e-1',
            type: 'flood',
            priority: 1,
            confidence: 0.72,
            freshness: 'stale',
            degradationReasons: ['satellite_data_stale'],
          },
        ],
      }),
    })
  })

  await page.route('**/fields/field-e2e-1/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        contractVersion: '1.0.0',
        fieldId: 'field-e2e-1',
        fieldStatus: 'stale',
        riskStatus: 'stale',
        alertsStatus: 'stale',
        alertCount: 1,
        lastUpdatedAt: '2026-06-03T00:00:00.000Z',
        validUntil: '2026-06-03T06:00:00.000Z',
        degradationReasons: ['satellite_data_stale'],
      }),
    })
  })

  await page.route('**/fields/field-e2e-1/risk/timeline', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fieldId: 'field-e2e-1',
        items: [
          {
            contractVersion: '1.0.0',
            snapshotId: 'snap-e2e-1',
            fieldId: 'field-e2e-1',
            score: 81,
            level: 'high',
            confidence: 0.72,
            computedAt: '2026-06-03T00:00:00.000Z',
            validUntil: '2026-06-03T06:00:00.000Z',
            ruleVersion: 'risk-v0',
            degradationReasons: ['satellite_data_stale'],
            evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-e2e-1'],
            drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
          },
        ],
      }),
    })
  })

  await page.route('**/fields/field-e2e-1/weather/timeline', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fieldId: 'field-e2e-1',
        items: [
          {
            provider: 'weather-api',
            observedAt: '2026-06-03T00:00:00.000Z',
            freshnessHours: 12,
            confidence: 0.72,
            staleCause: 'satellite_data_stale',
            temperatureC: 30.5,
            rainfallMm7d: 82,
            humidityPct: 74,
          },
        ],
      }),
    })
  })

  await page.route('**/fields/field-e2e-1/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        contractVersion: '1.0.0',
        snapshotId: 'snap-e2e-1',
        field: { fieldId: 'field-e2e-1', cropCategory: 'cereal', crop: 'rice', provinceCode: 'AR-W', locality: 'Mercedes' },
        status: 'degraded',
        freshness: 'degraded',
        signals: [
          { signalType: 'weather', status: 'degraded', evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-e2e-1'], confidence: 0.72, degradationReasons: ['satellite_data_stale'] },
          { signalType: 'satellite_vegetation', status: 'missing', evidenceRefs: ['satellite:sentinel:e2e-1'], confidence: 0.2, degradationReasons: ['satellite_data_unavailable'] },
        ],
        risk: { score: 81, level: 'high', confidence: 0.72, drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }] },
        alerts: [],
        provenance: [{
          evidenceId: 'weather-api-weather-e2e-1', provider: 'weather-api', signalType: 'weather', observedAt: '2026-06-03T00:00:00.000Z', ingestedAt: '2026-06-03T00:05:00.000Z', sourceUrl: 'https://example.com/weather', rawHash: 'fixture-hash-e2e-1', confidence: 0.72, freshness: 'degraded', providerMode: 'seam', lastSuccessfulObservedAt: '2026-06-03T00:00:00.000Z', nextDueAt: '2026-06-03T06:00:00.000Z', failureReason: 'satellite_data_stale', degradationReasons: ['satellite_data_stale'],
        }],
        scheduler: { lastRunAt: '2026-06-03T00:00:00.000Z', nextRunAt: '2026-06-03T06:00:00.000Z', lockStatus: 'available', failures: [], nextDueBySource: [] },
        generatedAt: '2026-06-03T00:05:00.000Z',
        lastDataFetchedAt: '2026-06-03T00:00:00.000Z',
        presentation: { disclaimer: 'Los indicadores son soporte operativo y no reemplazan criterio agronómico local.', confidenceLabel: 'media', sourcesUnavailable: true, staleFlags: ['satellite_data_stale'] },
      }),
    })
  })

  await page.route('**/fields/field-e2e-1/hydrology/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        contractVersion: 'hydrology-dashboard-v1',
        fieldId: 'field-e2e-1',
        zone: 'Mercedes',
        sources: ['PNA', 'INA', 'INMET', 'SMN'],
        stations: [{ id: 'pna-e2e-1', source: 'PNA', stationName: 'Estación E2E', riverName: 'Paraná', zone: 'Mercedes', sourceUrl: 'https://example.com/pna' }],
        status: { riskLevel: 'high', freshness: 'stale', quality: 'observed', recommendation: 'Revisar caminos bajos antes de nuevas lluvias.', lastSuccessfulObservedAt: '2026-06-03T00:00:00.000Z' },
        heights: [{ source: 'PNA', stationId: 'pna-e2e-1', observedAt: '2026-06-03T00:00:00.000Z', ingestedAt: '2026-06-03T00:05:00.000Z', lastSuccessfulObservedAt: '2026-06-03T00:00:00.000Z', value: 5.42, unit: 'm', metric: 'river_height_m', quality: 'observed', freshness: 'stale', tendency: 'Crece', sourceUrl: 'https://example.com/pna' }],
        trends: [],
        forecasts: [],
        rain: [],
        alerts: [],
      }),
    })
  })

  await page.route('**/fields/field-e2e-1/geometry', async (route) => {
    const saved = route.request().method() === 'PATCH'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fieldId: 'field-e2e-1',
        polygonWkt: saved ? 'POLYGON((-58.08 -29.18,-58.07 -29.18,-58.07 -29.19,-58.08 -29.18))' : 'POLYGON((-58.08 -29.18,-58.07 -29.18,-58.07 -29.19,-58.08 -29.18))',
        centroid: { lat: -29.1833, lng: -58.0767 },
        areaM2: 10000,
        hectares: 1,
        perimeterM: 400,
        status: saved ? 'saved' : 'point_only',
        source: saved ? 'operator' : 'fallback',
        updatedAt: saved ? '2026-08-12T12:00:00.000Z' : null,
      }),
    })
  })

  await page.goto('/demo')
  await page.getByTestId('agronautas-submit-intake').click()

  await expect(page.getByText('Snapshot stale detectado')).toBeVisible()
  await expect(page.getByText('signal_ingestion_runs:weather-api:climate:run-e2e-1')).toBeVisible()
  await expect(page.getByText('Riesgo de anegamiento')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Estados de evidencia Agronautas' })).toContainText('stale')
  await expect(page.getByRole('region', { name: 'Editor de perímetro' })).toBeVisible()
  await page.getByRole('button', { name: /Agregar vértice/i }).click()
  await page.getByRole('button', { name: /Guardar perímetro/i }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado por el backend' })).toBeVisible()
})

test('agronautas workspace mantiene la navegación usable en móvil con fallback explícito', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo')

  await expect(page.getByRole('heading', { level: 1, name: 'Workspace Agronautas' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nuevo lote' })).toBeVisible()
  await expect(page.getByText(/Google Maps no está disponible/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registrar lote' })).toBeEnabled()
})
