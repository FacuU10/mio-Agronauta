import { expect, test } from '@playwright/test'

test('agronautas smoke documenta que la release gate real vive en API/readiness y no en stubs de red', async ({ page }) => {
  await page.route('**/api/agronautas/**/runtime', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mode: 'real', routePrefix: '/agronautas', contractVersion: '1.0.0' }),
    })
  })

  await page.route('**/api/agronautas/**/fields', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ fieldId: 'field-prod-1', coverage: { locality: 'Mercedes', provinceCode: 'AR-W', boundaryVersion: 'corrientes-rice-zone-v1' } }),
    })
  })

  await page.route('**/api/agronautas/**/fields/field-prod-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fieldId: 'field-prod-1', externalFieldId: 'corrientes-lote-prod-1', crop: 'rice', hectares: 42.5, locality: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.1846, lng: -58.0759 } }),
    })
  })

  await page.route('**/api/agronautas/**/fields/field-prod-1/risk/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'stale',
        recompute: { status: 'enqueued' },
        snapshot: {
          contractVersion: '1.0.0', snapshotId: 'snap-prod-1', fieldId: 'field-prod-1', score: 81, level: 'high', confidence: 0.72,
          computedAt: '2026-06-03T00:00:00.000Z', validUntil: '2026-06-03T06:00:00.000Z', ruleVersion: 'risk-v0',
          degradationReasons: ['satellite_data_stale'], evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-prod-1'],
          drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
        },
      }),
    })
  })

  await page.route('**/api/agronautas/**/fields/field-prod-1/alerts/current', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'stale',
        recompute: { status: 'already_in_progress' },
        snapshot: {
          contractVersion: '1.0.0', snapshotId: 'snap-prod-1', fieldId: 'field-prod-1', score: 81, level: 'high', confidence: 0.72,
          computedAt: '2026-06-03T00:00:00.000Z', validUntil: '2026-06-03T06:00:00.000Z', ruleVersion: 'risk-v0',
          degradationReasons: ['satellite_data_stale'], evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-prod-1'],
          drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
        },
        alerts: [{ contractVersion: '1.0.0', alertId: 'field-prod-1:snap-prod-1:flood', fieldId: 'field-prod-1', basedOnSnapshotId: 'snap-prod-1', type: 'flood', priority: 1, confidence: 0.72, freshness: 'stale', degradationReasons: ['satellite_data_stale'] }],
      }),
    })
  })

  await page.route('**/api/agronautas/**/fields/field-prod-1/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        contractVersion: '1.0.0',
        fieldId: 'field-prod-1',
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

  await page.route('**/api/agronautas/**/fields/field-prod-1/risk/timeline', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fieldId: 'field-prod-1',
        items: [
          {
            contractVersion: '1.0.0', snapshotId: 'snap-prod-1', fieldId: 'field-prod-1', score: 81, level: 'high', confidence: 0.72,
            computedAt: '2026-06-03T00:00:00.000Z', validUntil: '2026-06-03T06:00:00.000Z', ruleVersion: 'risk-v0',
            degradationReasons: ['satellite_data_stale'], evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-prod-1'],
            drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
          },
        ],
      }),
    })
  })

  await page.route('**/api/agronautas/**/fields/field-prod-1/weather/timeline', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fieldId: 'field-prod-1',
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
  await expect(page.getByText('field-prod-1:snap-prod-1:flood')).toBeHidden()
  await expect(page.getByText('signal_ingestion_runs:weather-api:climate:run-prod-1')).toBeVisible()
  await expect(page.getByText(/recompute already_in_progress/i)).toBeVisible()
})
