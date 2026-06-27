# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agronautas-smoke.spec.js >> agronautas muestra snapshot stale con evidencia persistida
- Location: tests\e2e\agronautas-smoke.spec.js:3:5

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
  - text: Lote activo field-e2e-1 Última alta field-e2e-1 Alertas actuales 1 Runtime backend real
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
  - button "Registrar lote"
  - paragraph: Lote
  - paragraph: corrientes-lote-001
  - paragraph: Mercedes
  - paragraph: Score
  - paragraph: "81"
  - paragraph: high
  - paragraph: Confianza
  - paragraph: 72%
  - paragraph: stale
  - paragraph: Alertas
  - paragraph: "1"
  - paragraph: stale
  - paragraph: "Último dato obtenido: 02/06/2026, 21:00"
  - paragraph: La UI no promete actualidad falsa y permite solicitar recompute already_in_progress.
  - button "Refrescar vista"
  - button "Solicitar recompute"
  - heading "Iberá-Alerta · Tarjeta hidrológica Mercedes" [level=3]
  - paragraph: Monitoreo centralizado PNA + INA + INMET + SMN para decisiones agrícolas y logísticas.
  - text: Riesgo sin clasificar
  - paragraph: Altura actual
  - paragraph: Sin dato
  - paragraph: PNA
  - paragraph: Tendencia 24h
  - paragraph: Sin tendencia
  - paragraph: Sin variación
  - paragraph: Umbral de alerta
  - paragraph: 5,60 m
  - paragraph: Referencia local operativa
  - paragraph: Umbral evacuación
  - paragraph: 6,20 m
  - paragraph: Referencia para logística crítica
  - paragraph: "Último dato obtenido: Sin fecha disponible"
  - heading "Alertas locales · Mercedes" [level=3]
  - paragraph: Las alertas aparecen solo dentro de la tarjeta de su zona o estación de referencia.
  - paragraph: No hay alertas activas para esta zona.
  - heading "Pronóstico INA en tabla HTML" [level=3]
  - paragraph: Alturas a 7-30 días visibles en el panel para evitar descargar y revisar PDFs estáticos.
  - paragraph: Sin pronóstico INA disponible para esta estación.
  - text: Próximamente
  - paragraph: Sentinel-1 inline
  - paragraph: "Próximamente: capa radar integrada en el mapa de Iberá-Alerta. Fase 1 no muestra links externos ni redirecciones."
  - text: Próximamente
  - paragraph: Simulación interactiva
  - paragraph: "Próximamente: escenarios de inundación dentro del panel. Fase 1 evita controles hidráulicos personalizados."
  - heading "Copilot Hidrológico" [level=3]
  - paragraph: Seleccioná el lote activo y preguntá en español sobre riesgo de crecida, caminos, maquinaria o alertas locales. La respuesta se transmite en vivo con contexto oficial.
  - text: Pregunta hidrológica
  - textbox "Pregunta hidrológica":
    - /placeholder: ¿Qué riesgo de crecida tiene mi lote en los próximos 7 días?
  - button "Preguntar al Copilot Hidrológico"
  - heading "Estado monitoreo" [level=3]
  - paragraph: Fuente de verdad backend para frescura, alertas y última actualización.
  - text: Estado stale Riesgo stale Alertas stale Última actualización 2026-06-03T00:00:00.000Z
  - heading "Timeline de riesgo" [level=3]
  - paragraph: Snapshots persistidos para auditar score y vigencia.
  - paragraph: 2026-06-03T00:00:00.000Z
  - paragraph: Score 81 · high
  - heading "Timeline climático" [level=3]
  - paragraph: Contexto backend para revisar frescura y señal usada.
  - paragraph: weather-api
  - paragraph: 2026-06-03T00:00:00.000Z
  - paragraph: 30.5°C · lluvia 7d 82mm
  - heading "Drivers y evidencia" [level=3]
  - paragraph: Los drivers vienen del snapshot persistido, no del cliente.
  - paragraph: Carga de lluvia
  - paragraph: Peso 40%
  - text: "0.80"
  - paragraph: Evidencia persistida
  - list:
    - listitem: • signal_ingestion_runs:weather-api:climate:run-e2e-1
  - heading "Alertas actuales" [level=3]
  - paragraph: Se priorizan desde snapshots frescos o se etiquetan como stale si corresponde.
  - paragraph: Riesgo de anegamiento
  - text: stale
  - paragraph: Prioridad 1 · confianza 72%
  - paragraph: "Degradación: satellite_data_stale"
  - heading "Chat acotado con grounding backend" [level=3]
  - paragraph: Solo explica overview, riesgo, alertas o comparaciones aprobadas. Nunca reemplaza el dashboard.
  - text: Pregunta
  - textbox "Pregunta":
    - /placeholder: Explicá el riesgo actual del lote
  - button "Preguntar al chat"
- alert
```

# Test source

```ts
  76  |           contractVersion: '1.0.0',
  77  |           snapshotId: 'snap-e2e-1',
  78  |           fieldId: 'field-e2e-1',
  79  |           score: 81,
  80  |           level: 'high',
  81  |           confidence: 0.72,
  82  |           computedAt: '2026-06-03T00:00:00.000Z',
  83  |           validUntil: '2026-06-03T06:00:00.000Z',
  84  |           ruleVersion: 'risk-v0',
  85  |           degradationReasons: ['satellite_data_stale'],
  86  |           evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-e2e-1'],
  87  |           drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
  88  |         },
  89  |         recompute: { status: 'already_in_progress' },
  90  |         alerts: [
  91  |           {
  92  |             contractVersion: '1.0.0',
  93  |             alertId: 'alert-e2e-1',
  94  |             fieldId: 'field-e2e-1',
  95  |             basedOnSnapshotId: 'snap-e2e-1',
  96  |             type: 'flood',
  97  |             priority: 1,
  98  |             confidence: 0.72,
  99  |             freshness: 'stale',
  100 |             degradationReasons: ['satellite_data_stale'],
  101 |           },
  102 |         ],
  103 |       }),
  104 |     })
  105 |   })
  106 | 
  107 |   await page.route('**/fields/field-e2e-1/status', async (route) => {
  108 |     await route.fulfill({
  109 |       status: 200,
  110 |       contentType: 'application/json',
  111 |       body: JSON.stringify({
  112 |         contractVersion: '1.0.0',
  113 |         fieldId: 'field-e2e-1',
  114 |         fieldStatus: 'stale',
  115 |         riskStatus: 'stale',
  116 |         alertsStatus: 'stale',
  117 |         alertCount: 1,
  118 |         lastUpdatedAt: '2026-06-03T00:00:00.000Z',
  119 |         validUntil: '2026-06-03T06:00:00.000Z',
  120 |         degradationReasons: ['satellite_data_stale'],
  121 |       }),
  122 |     })
  123 |   })
  124 | 
  125 |   await page.route('**/fields/field-e2e-1/risk/timeline', async (route) => {
  126 |     await route.fulfill({
  127 |       status: 200,
  128 |       contentType: 'application/json',
  129 |       body: JSON.stringify({
  130 |         fieldId: 'field-e2e-1',
  131 |         items: [
  132 |           {
  133 |             contractVersion: '1.0.0',
  134 |             snapshotId: 'snap-e2e-1',
  135 |             fieldId: 'field-e2e-1',
  136 |             score: 81,
  137 |             level: 'high',
  138 |             confidence: 0.72,
  139 |             computedAt: '2026-06-03T00:00:00.000Z',
  140 |             validUntil: '2026-06-03T06:00:00.000Z',
  141 |             ruleVersion: 'risk-v0',
  142 |             degradationReasons: ['satellite_data_stale'],
  143 |             evidenceRefs: ['signal_ingestion_runs:weather-api:climate:run-e2e-1'],
  144 |             drivers: [{ key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.4, value: 0.8 }],
  145 |           },
  146 |         ],
  147 |       }),
  148 |     })
  149 |   })
  150 | 
  151 |   await page.route('**/fields/field-e2e-1/weather/timeline', async (route) => {
  152 |     await route.fulfill({
  153 |       status: 200,
  154 |       contentType: 'application/json',
  155 |       body: JSON.stringify({
  156 |         fieldId: 'field-e2e-1',
  157 |         items: [
  158 |           {
  159 |             provider: 'weather-api',
  160 |             observedAt: '2026-06-03T00:00:00.000Z',
  161 |             freshnessHours: 12,
  162 |             confidence: 0.72,
  163 |             staleCause: 'satellite_data_stale',
  164 |             temperatureC: 30.5,
  165 |             rainfallMm7d: 82,
  166 |             humidityPct: 74,
  167 |           },
  168 |         ],
  169 |       }),
  170 |     })
  171 |   })
  172 | 
  173 |   await page.goto('/demo')
  174 |   await page.getByTestId('agronautas-submit-intake').click()
  175 | 
> 176 |   await expect(page.getByText('Snapshot stale detectado')).toBeVisible()
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  177 |   await expect(page.getByText('signal_ingestion_runs:weather-api:climate:run-e2e-1')).toBeVisible()
  178 |   await expect(page.getByText('Riesgo de anegamiento')).toBeVisible()
  179 | })
  180 | 
```