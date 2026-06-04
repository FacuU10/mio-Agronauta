# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agronautas-production.spec.js >> agronautas smoke documenta que la release gate real vive en API/readiness y no en stubs de red
- Location: tests\e2e\agronautas-production.spec.js:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Snapshot stale detectado')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Snapshot stale detectado')

```

```yaml
- main:
  - text: Web MVP · Modo real
  - heading "Intake guiado, riesgo auditable y alertas frescura-aware para arroz en Corrientes." [level=1]
  - paragraph: La UI usa contratos compartidos, mantiene la lógica pesada fuera del cliente y expone confianza, degradación y evidencia de cada snapshot.
  - heading "Estado operativo" [level=3]
  - paragraph: Contrato 1.0.0 · React Query + Zustand
  - text: Lote activo Ninguno Última alta Sin actividad Alertas actuales 0 Runtime backend real
  - heading "Alta guiada del lote" [level=3]
  - paragraph: "Validación contract-first para `FieldIntake`, con rechazo explícito fuera de Corrientes arrocera."
  - text: ID externo
  - textbox "ID externo":
    - /placeholder: corrientes-lote-001
    - text: corrientes-lote-001
  - text: Latitud
  - spinbutton "Latitud": "-29.1846"
  - text: Longitud
  - spinbutton "Longitud": "-58.0759"
  - text: Hectáreas
  - spinbutton "Hectáreas": "42.5"
  - text: Etapa
  - combobox "Etapa":
    - option "Emergencia"
    - option "Macollaje" [selected]
    - option "Iniciación de panoja"
    - option "Floración"
    - option "Madurez"
  - text: Localidad declarada
  - textbox "Localidad declarada": Mercedes
  - alert: HTTP 500
  - button "Registrar lote"
  - heading "Dashboard listo para el primer lote" [level=3]
  - paragraph: Registrá un lote para ver score, frescura, drivers y alertas activas sin depender del copiloto.
- alert
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | test('agronautas smoke documenta que la release gate real vive en API/readiness y no en stubs de red', async ({ page }) => {
  4  |   await page.route('**/api/agronautas/runtime', async (route) => {
  5  |     await route.fulfill({
  6  |       status: 200,
  7  |       contentType: 'application/json',
  8  |       body: JSON.stringify({ mode: 'real', routePrefix: '/agronautas', contractVersion: '1.0.0' }),
  9  |     })
  10 |   })
  11 | 
  12 |   await page.route('**/api/agronautas/fields', async (route) => {
  13 |     if (route.request().method() !== 'POST') return route.fallback()
  14 |     await route.fulfill({
  15 |       status: 201,
  16 |       contentType: 'application/json',
  17 |       body: JSON.stringify({ fieldId: 'field-prod-1', coverage: { locality: 'Mercedes', provinceCode: 'AR-W', boundaryVersion: 'corrientes-rice-zone-v1' } }),
  18 |     })
  19 |   })
  20 | 
  21 |   await page.route('**/api/agronautas/fields/field-prod-1', async (route) => {
  22 |     await route.fulfill({
  23 |       status: 200,
  24 |       contentType: 'application/json',
  25 |       body: JSON.stringify({ fieldId: 'field-prod-1', externalFieldId: 'corrientes-lote-prod-1', crop: 'rice', hectares: 42.5, locality: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.1846, lng: -58.0759 } }),
  26 |     })
  27 |   })
  28 | 
  29 |   await page.route('**/api/agronautas/fields/field-prod-1/risk/current', async (route) => {
  30 |     await route.fulfill({
  31 |       status: 200,
  32 |       contentType: 'application/json',
  33 |       body: JSON.stringify({
  34 |         status: 'stale',
  35 |         recompute: { status: 'enqueued' },
  36 |         snapshot: {
  37 |           contractVersion: '1.0.0', snapshotId: 'snap-prod-1', fieldId: 'field-prod-1', score: 81, level: 'high', confidence: 0.72,
  38 |           computedAt: '2026-06-03T00:00:00.000Z', validUntil: '2026-06-03T06:00:00.000Z', ruleVersion: 'risk-v0',
  39 |           degradationReasons: ['satellite_data_stale'], evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-prod-1'],
  40 |           drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
  41 |         },
  42 |       }),
  43 |     })
  44 |   })
  45 | 
  46 |   await page.route('**/api/agronautas/fields/field-prod-1/alerts/current', async (route) => {
  47 |     await route.fulfill({
  48 |       status: 202,
  49 |       contentType: 'application/json',
  50 |       body: JSON.stringify({
  51 |         status: 'stale',
  52 |         recompute: { status: 'already_in_progress' },
  53 |         snapshot: {
  54 |           contractVersion: '1.0.0', snapshotId: 'snap-prod-1', fieldId: 'field-prod-1', score: 81, level: 'high', confidence: 0.72,
  55 |           computedAt: '2026-06-03T00:00:00.000Z', validUntil: '2026-06-03T06:00:00.000Z', ruleVersion: 'risk-v0',
  56 |           degradationReasons: ['satellite_data_stale'], evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-prod-1'],
  57 |           drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
  58 |         },
  59 |         alerts: [{ contractVersion: '1.0.0', alertId: 'field-prod-1:snap-prod-1:flood', fieldId: 'field-prod-1', basedOnSnapshotId: 'snap-prod-1', type: 'flood', priority: 1, confidence: 0.72, freshness: 'stale', degradationReasons: ['satellite_data_stale'] }],
  60 |       }),
  61 |     })
  62 |   })
  63 | 
  64 |   await page.goto('/')
  65 |   await page.getByTestId('agronautas-submit-intake').click()
  66 | 
> 67 |   await expect(page.getByText('Snapshot stale detectado')).toBeVisible()
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  68 |   await expect(page.getByText('field-prod-1:snap-prod-1:flood')).toBeHidden()
  69 |   await expect(page.getByText('signal_ingestion_runs:weather-api:climate:run-prod-1')).toBeVisible()
  70 |   await expect(page.getByText(/recompute already_in_progress/i)).toBeVisible()
  71 | })
  72 | 
```