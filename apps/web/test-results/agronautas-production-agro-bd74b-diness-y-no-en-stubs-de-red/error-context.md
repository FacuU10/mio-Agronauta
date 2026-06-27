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
  - 'heading "Iberá-Alerta: monitoreo centralizado de inundaciones para arroz en Corrientes." [level=1]'
  - paragraph: "PNA, INA, INMET y SMN en tarjetas locales: altura actual, tendencia 24h, umbrales, alertas por zona y pronósticos HTML sin revisar PDFs estáticos."
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
  - alert: "API request failed: Failed to fetch"
  - button "Registrar lote"
  - heading "Dashboard listo para el primer lote" [level=3]
  - paragraph: Registrá un lote para ver score, frescura, drivers y alertas activas sin depender del copiloto.
- alert
```

# Test source

```ts
  25  |       body: JSON.stringify({ fieldId: 'field-prod-1', externalFieldId: 'corrientes-lote-prod-1', crop: 'rice', hectares: 42.5, locality: 'Mercedes', provinceCode: 'AR-W', centroid: { lat: -29.1846, lng: -58.0759 } }),
  26  |     })
  27  |   })
  28  | 
  29  |   await page.route('**/api/agronautas/**/fields/field-prod-1/risk/current', async (route) => {
  30  |     await route.fulfill({
  31  |       status: 200,
  32  |       contentType: 'application/json',
  33  |       body: JSON.stringify({
  34  |         status: 'stale',
  35  |         recompute: { status: 'enqueued' },
  36  |         snapshot: {
  37  |           contractVersion: '1.0.0', snapshotId: 'snap-prod-1', fieldId: 'field-prod-1', score: 81, level: 'high', confidence: 0.72,
  38  |           computedAt: '2026-06-03T00:00:00.000Z', validUntil: '2026-06-03T06:00:00.000Z', ruleVersion: 'risk-v0',
  39  |           degradationReasons: ['satellite_data_stale'], evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-prod-1'],
  40  |           drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
  41  |         },
  42  |       }),
  43  |     })
  44  |   })
  45  | 
  46  |   await page.route('**/api/agronautas/**/fields/field-prod-1/alerts/current', async (route) => {
  47  |     await route.fulfill({
  48  |       status: 202,
  49  |       contentType: 'application/json',
  50  |       body: JSON.stringify({
  51  |         status: 'stale',
  52  |         recompute: { status: 'already_in_progress' },
  53  |         snapshot: {
  54  |           contractVersion: '1.0.0', snapshotId: 'snap-prod-1', fieldId: 'field-prod-1', score: 81, level: 'high', confidence: 0.72,
  55  |           computedAt: '2026-06-03T00:00:00.000Z', validUntil: '2026-06-03T06:00:00.000Z', ruleVersion: 'risk-v0',
  56  |           degradationReasons: ['satellite_data_stale'], evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-prod-1'],
  57  |           drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
  58  |         },
  59  |         alerts: [{ contractVersion: '1.0.0', alertId: 'field-prod-1:snap-prod-1:flood', fieldId: 'field-prod-1', basedOnSnapshotId: 'snap-prod-1', type: 'flood', priority: 1, confidence: 0.72, freshness: 'stale', degradationReasons: ['satellite_data_stale'] }],
  60  |       }),
  61  |     })
  62  |   })
  63  | 
  64  |   await page.route('**/api/agronautas/**/fields/field-prod-1/status', async (route) => {
  65  |     await route.fulfill({
  66  |       status: 200,
  67  |       contentType: 'application/json',
  68  |       body: JSON.stringify({
  69  |         contractVersion: '1.0.0',
  70  |         fieldId: 'field-prod-1',
  71  |         fieldStatus: 'stale',
  72  |         riskStatus: 'stale',
  73  |         alertsStatus: 'stale',
  74  |         alertCount: 1,
  75  |         lastUpdatedAt: '2026-06-03T00:00:00.000Z',
  76  |         validUntil: '2026-06-03T06:00:00.000Z',
  77  |         degradationReasons: ['satellite_data_stale'],
  78  |       }),
  79  |     })
  80  |   })
  81  | 
  82  |   await page.route('**/api/agronautas/**/fields/field-prod-1/risk/timeline', async (route) => {
  83  |     await route.fulfill({
  84  |       status: 200,
  85  |       contentType: 'application/json',
  86  |       body: JSON.stringify({
  87  |         fieldId: 'field-prod-1',
  88  |         items: [
  89  |           {
  90  |             contractVersion: '1.0.0', snapshotId: 'snap-prod-1', fieldId: 'field-prod-1', score: 81, level: 'high', confidence: 0.72,
  91  |             computedAt: '2026-06-03T00:00:00.000Z', validUntil: '2026-06-03T06:00:00.000Z', ruleVersion: 'risk-v0',
  92  |             degradationReasons: ['satellite_data_stale'], evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-prod-1'],
  93  |             drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
  94  |           },
  95  |         ],
  96  |       }),
  97  |     })
  98  |   })
  99  | 
  100 |   await page.route('**/api/agronautas/**/fields/field-prod-1/weather/timeline', async (route) => {
  101 |     await route.fulfill({
  102 |       status: 200,
  103 |       contentType: 'application/json',
  104 |       body: JSON.stringify({
  105 |         fieldId: 'field-prod-1',
  106 |         items: [
  107 |           {
  108 |             provider: 'weather-api',
  109 |             observedAt: '2026-06-03T00:00:00.000Z',
  110 |             freshnessHours: 12,
  111 |             confidence: 0.72,
  112 |             staleCause: 'satellite_data_stale',
  113 |             temperatureC: 30.5,
  114 |             rainfallMm7d: 82,
  115 |             humidityPct: 74,
  116 |           },
  117 |         ],
  118 |       }),
  119 |     })
  120 |   })
  121 | 
  122 |   await page.goto('/demo')
  123 |   await page.getByTestId('agronautas-submit-intake').click()
  124 | 
> 125 |   await expect(page.getByText('Snapshot stale detectado')).toBeVisible()
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  126 |   await expect(page.getByText('field-prod-1:snap-prod-1:flood')).toBeHidden()
  127 |   await expect(page.getByText('signal_ingestion_runs:weather-api:climate:run-prod-1')).toBeVisible()
  128 |   await expect(page.getByText(/recompute already_in_progress/i)).toBeVisible()
  129 | })
  130 | 
```