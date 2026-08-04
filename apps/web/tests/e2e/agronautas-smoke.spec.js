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

  await page.goto('/demo')
  await page.getByTestId('agronautas-submit-intake').click()

  await expect(page.getByText('Snapshot stale detectado')).toBeVisible()
  await expect(page.getByText('signal_ingestion_runs:weather-api:climate:run-e2e-1')).toBeVisible()
  await expect(page.getByText('Riesgo de anegamiento')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Estados de evidencia Agronautas' })).toContainText('stale')
})
