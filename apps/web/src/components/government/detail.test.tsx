import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { fireEvent, render, cleanup, waitFor } from '@testing-library/react/pure'
import { GovernmentDetail, createMunicipalityOperatorSummary, parseSseData } from './detail'

const originalGlobals = {
  window: globalThis.window,
  self: globalThis.self,
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  HTMLFormElement: globalThis.HTMLFormElement,
  Event: globalThis.Event,
  navigator: globalThis.navigator,
}
const activeDoms: Array<InstanceType<typeof JSDOM>> = []

type DashboardPayload = NonNullable<Parameters<typeof GovernmentDetail>[0]['initialData']>

beforeEach(() => setupDom())
afterEach(async () => {
  try {
    cleanup()
    await new Promise<void>((resolve) => setImmediate(resolve))
  } finally {
    try {
      for (const dom of activeDoms.splice(0)) dom.window.close()
    } finally {
      globalThis.window = originalGlobals.window
      globalThis.self = originalGlobals.self
      globalThis.document = originalGlobals.document
      globalThis.HTMLElement = originalGlobals.HTMLElement
      globalThis.HTMLFormElement = originalGlobals.HTMLFormElement
      globalThis.Event = originalGlobals.Event
      Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: originalGlobals.navigator })
    }
  }
})

test('GovernmentDetail renders canonical dashboard and degraded provenance safely', async () => {
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={dashboardPayload()} />)
    assert.ok(await view.findByText('Corrientes Capital'))
    assert.match(view.container.textContent ?? '', /PNA\s*·\s*corrientes/)
    assert.match(view.container.textContent ?? '', /SMN\s*·\s*smn-corrientes/)
    assert.ok(await view.findByText('Tormentas fuertes'))
    assert.ok(view.getByText('Cobertura smn-corrientes'))
    assert.ok(view.getByText('Vigente'))
    assert.ok(view.getByRole('link', { name: 'Ver fuente oficial' }))
    assert.ok(view.getByText('Día 20'))
    assert.ok(view.getByText('Hay fuentes con estado degradado; se mantienen visibles los últimos datos oficiales.'))
    assert.match(view.container.textContent ?? '', /Estado:\s*degradada/)
})

test('GovernmentDetail renders governed coverage, unverified geometry and evidence timeline without incident actions', async () => {
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{ ...dashboardPayload(), municipality: { ...dashboardPayload().municipality, coverageStatus: 'partial', geometryStatus: 'unverified', sourceRegistry: [{ source: 'PNA', stationId: 'corrientes', coverageKey: 'pna-corrientes', sourceUrl: 'https://example.com/pna', freshnessPolicy: 'PT1H', registryVersion: 'v1', reviewStatus: 'reviewed', reviewedAt: '2026-08-13T10:00:00.000Z' }] }, timeline: { events: [{ id: 'event-1', kind: 'telemetry', occurredAt: '2026-08-13T10:00:00.000Z', source: 'PNA', title: 'Telemetría observada', detail: '3.2 m', evidenceState: 'observed' }], currentStatus: 'partial', nextCursor: null } }} />)
  assert.ok(await view.findByText(/Cobertura parcial/))
  assert.ok(view.getByText(/Geometría no verificada/))
  assert.ok(view.getAllByText(/PNA · corrientes/).length >= 2)
  assert.ok(view.getByText(/Cobertura: pna-corrientes · frescura: PT1H · versión: v1 · reviewed/))
  assert.ok(view.getAllByRole('link', { name: 'Ver fuente oficial' }).length >= 1)
  assert.ok(view.getByText('Línea de evidencia'))
  assert.ok(view.getByText('Telemetría observada'))
  assert.equal(view.queryByRole('button', { name: /incidente|asignar|escalar|resolver/i }), null)
})

test('GovernmentDetail renders grounded explanation metadata without inventing impact', async () => {
   const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{ ...dashboardPayload(), explanation: { relationLabel: 'source mapping / threshold comparison', threshold: { alertHeightM: 6.5, evacuationHeightM: 7 }, observed: { value: 3.2, comparison: 'below_alert', source: 'PNA', sourceUrl: 'https://example.com/pna', observedAt: '2026-06-23T10:30:00.000Z', freshness: 'fresh' }, tendency: { value: 'creciente', window: 'últimas 3 observaciones de PNA' }, forecast: { horizonDays: 20, confidence: 'speculative', label: 'planning_only', source: 'INA', sourceUrl: 'https://example.com/ina', observedAt: '2026-07-13T10:30:00.000Z' } }, timeline: { events: [], currentStatus: 'unavailable', nextCursor: null } }} />)
  assert.ok(await view.findByText('Explicación verificable'))
  assert.match(view.container.textContent ?? '', /Umbral de evacuación\s*7\s*m/)
  assert.ok(view.getByText('creciente · últimas 3 observaciones de PNA'))
  assert.ok(view.getByText('20 días · planning_only'))
  assert.match(view.container.textContent ?? '', /Fuente del pronóstico: INA.*https:\/\/example\.com\/ina.*2026-07-13T10:30:00\.000Z/s)
  assert.doesNotMatch(view.container.textContent ?? '', /mapa de impacto|propagación|routing hidráulico|descarga/i)
})

test('GovernmentDetail renders empty telemetry and parses SSE string tokens', async () => {
    const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{ ...dashboardPayload(), municipality: { ...dashboardPayload().municipality, officialAlerts: [] }, telemetryCards: [], inaPredictions30d: [], alerts: [], provenance: [] }} />)
    assert.ok(await view.findByText('Sin telemetría oficial reciente para este municipio.'))
    assert.ok(view.getByText('Explicación no disponible sin evidencia oficial suficiente.'))
    assert.ok(view.getByText('Sin eventos municipales persistidos para mostrar.'))
    assert.equal(parseSseData('"Hola "'), 'Hola ')
    assert.equal(parseSseData('{"text":"oficial"}'), 'oficial')
})

test('GovernmentDetail renders mappings, observed/forecast/missing labels and Copilot metadata', async () => {
  const payload = dashboardPayload()
  const firstTelemetry = payload.telemetryCards[0]
  const firstForecast = payload.inaPredictions30d[0]
  if (!firstTelemetry || !firstForecast) throw new Error('Expected dashboard telemetry fixtures')

  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{
    ...payload,
    gaugeMappings: { primaryPnaPortId: 'corrientes', secondaryPnaPortIds: ['barranqueras'], inaStationIds: ['6764'], smnRegionIds: ['smn-corrientes'], inmetStationIds: ['inmet-corrientes'] },
    telemetryCards: [
       { ...firstTelemetry, freshness: 'fresh' },
       { source: 'INA', stationId: 'ina-6764', metric: 'river_height_m', value: 3.8, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', label: 'Pronóstico INA', freshness: 'degraded', forecastHorizonDays: 20 },
      { source: 'SMN', stationId: 'smn-corrientes', metric: 'rain_mm', value: null, unit: 'mm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', label: 'Lluvia no disponible', freshness: 'missing' },
    ],
    inaPredictions30d: [{ ...firstForecast, freshness: 'degraded' }],
  }} />)

  assert.ok(await view.findByText('Mapeos de estaciones'))
  assert.ok(view.getByText('PNA principal: corrientes'))
  assert.ok(view.getAllByText('Observado').length >= 1)
  assert.ok(view.getAllByText('Pronóstico').length >= 1)
  assert.ok(view.getByText('Sin datos'))
  assert.ok(view.getByText('Días 15–30: planificación especulativa o de baja confianza.'))
  const evidenceStates = view.getByRole('region', { name: 'Estados de evidencia municipal' })
  assert.match(evidenceStates.textContent ?? '', /observed/i)
  assert.match(evidenceStates.textContent ?? '', /forecast/i)
  assert.match(evidenceStates.textContent ?? '', /degraded/i)
  assert.match(evidenceStates.textContent ?? '', /missing/i)
})

test('GovernmentDetail puts status, freshness, threshold, confidence and safe action above details', async () => {
  const payload = dashboardPayload()
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{ ...payload, provenance: payload.provenance.map((item) => ({ ...item, freshness: 'fresh' as const })) }} />)
  const summary = view.getByRole('region', { name: 'Resumen operativo municipal' })
  assert.match(summary.textContent ?? '', /Estado:\s*Observado/)
  assert.match(summary.textContent ?? '', /Frescura:\s*Vigente/)
  assert.match(summary.textContent ?? '', /Umbral:\s*Por debajo del umbral de alerta/)
  assert.match(summary.textContent ?? '', /Confianza:\s*Evidencia observada/)
  assert.match(summary.textContent ?? '', /Próxima acción segura:\s*Continuar monitoreo/)
  assert.ok(Boolean(summary.compareDocumentPosition(view.getByRole('heading', { name: 'Telemetría oficial' })) & 4))
})

test('GovernmentDetail resolves registered source plus missing telemetry as missing evidence', async () => {
  const payload = dashboardPayload()
  const firstTelemetry = payload.telemetryCards[0]
  if (!firstTelemetry) throw new Error('Expected dashboard telemetry fixture')

  const conflicting: DashboardPayload = {
    ...payload,
    telemetryCards: [{ ...firstTelemetry, value: null, observedAt: null, freshness: 'missing' as const }],
    provenance: [{ source: 'PNA', freshness: 'fresh', label: 'PNA vigente', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }],
    municipality: { ...payload.municipality, sourceRegistry: [{ source: 'PNA', stationId: 'corrientes', coverageKey: 'pna-corrientes', sourceUrl: 'https://example.com/pna', freshnessPolicy: 'PT1H', registryVersion: 'v1', reviewStatus: 'reviewed', reviewedAt: '2026-06-23T10:30:00.000Z' }] },
  }

  const summary = createMunicipalityOperatorSummary(conflicting)
  assert.equal(summary.status, 'Sin datos verificables')
  assert.equal(summary.freshness, 'Sin datos')
  assert.equal(summary.confidence, 'Insuficiente por conflicto de evidencia')
  assert.equal(summary.nextSafeAction, 'Confirmar la última lectura en la fuente oficial antes de decidir')

  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={conflicting} />)
  const evidenceStates = view.getByRole('region', { name: 'Estados de evidencia municipal' })
  assert.match(evidenceStates.textContent ?? '', /Source provenance.*missing/i)
})

test('GovernmentDetail makes an empty forecast prominently unavailable without planning guidance', async () => {
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{ ...dashboardPayload(), inaPredictions30d: [], explanation: undefined }} />)
  assert.ok(view.getByText('No hay pronóstico INA disponible'))
  assert.match(view.getByRole('region', { name: 'Predicción INA a 30 días' }).textContent ?? '', /No hay pronóstico INA disponible/)
  assert.doesNotMatch(view.container.textContent ?? '', /planificación especulativa|baja confianza/i)
})

test('GovernmentDetail preserves partial Copilot tokens, metadata and retry after stream error', async () => {
  const previousFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    return new Response([
      'event: metadata\ndata: {"sources":["PNA","INA"],"limits":["Sin routing hidráulico"],"observedAt":"2026-06-23T10:30:00.000Z"}\n\n',
      'event: token\ndata: {"token":"Altura oficial"}\n\n',
      'event: error\ndata: {"message":"stream interrumpido"}\n\n',
    ].join(''), { headers: { 'content-type': 'text/event-stream' } })
  }) as typeof fetch
  try {
    const view = render(<GovernmentDetail municipalityId="corrientes" initialData={dashboardPayload()} />)
    const input = view.getByLabelText('Consulta para Copilot Advisor')
    fireEvent.input(input, { target: { value: '¿Cuál es el estado?' } })
    fireEvent.click(view.getByRole('button', { name: 'Enviar Consulta' }))
    await waitFor(() => assert.equal(calls, 1))
    await waitFor(() => assert.ok(view.getByText('Altura oficial')))
    assert.ok(view.getByText('stream interrumpido'))
    assert.match(view.container.textContent ?? '', /Altura oficial/)
    assert.match(view.container.textContent ?? '', /PNA.*INA/s)
    assert.match(view.container.textContent ?? '', /Sin routing hidráulico/)
    assert.match(view.container.textContent ?? '', /23\/06\/2026 10:30/)
    assert.ok(view.getByRole('button', { name: 'Reintentar consulta' }))
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('GovernmentDetail exposes one landmark and announces an invalid keyboard submission', async () => {
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={dashboardPayload()} />)
  const input = view.getByLabelText('Consulta para Copilot Advisor') as HTMLInputElement
  const form = input.closest('form')

  assert.ok(form)
  assert.equal(view.container.querySelectorAll('main').length, 1)
  assert.equal(view.container.querySelectorAll('main main').length, 0)
  const skipLink = view.getByRole('link', { name: 'Saltar a telemetría' })
  assert.equal(skipLink.getAttribute('href'), '#telemetry')
  const skipTarget = view.container.querySelector('#telemetry')
  assert.ok(skipTarget)
  assert.equal(skipTarget?.getAttribute('tabindex'), '-1')
  assert.equal(view.getAllByRole('heading', { level: 1 }).length, 1)
  assert.ok(view.getByRole('heading', { level: 2, name: 'Telemetría oficial' }))
  assert.equal(input.getAttribute('name'), 'governmentMessage')
  assert.equal(input.getAttribute('autocomplete'), 'off')

  fireEvent.submit(form)

  const error = await view.findByRole('alert')
  assert.match(error.textContent ?? '', /Escribí una consulta antes de enviarla/)
  assert.equal(error.getAttribute('aria-live'), 'assertive')
  assert.equal(input.getAttribute('aria-invalid'), 'true')
  assert.equal(input.getAttribute('aria-describedby'), 'government-copilot-message-error')
  assert.equal(document.activeElement, input)
})

test('GovernmentDetail renders citation unavailable without inventing a source', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response([
    'event: metadata\ndata: {"citationMode":"none","citations":[],"unverifiedClaims":true,"citationUnavailable":true,"unavailableReason":"No hay una referencia oficial verificable para esta respuesta."}\n\n',
    'event: done\ndata: {"model":"test"}\n\n',
  ].join(''), { headers: { 'content-type': 'text/event-stream' } })) as typeof fetch
  try {
    const view = render(<GovernmentDetail municipalityId="corrientes" initialData={dashboardPayload()} />)
    fireEvent.input(view.getByLabelText('Consulta para Copilot Advisor'), { target: { value: '¿Qué ocurre?' } })
    fireEvent.click(view.getByRole('button', { name: 'Enviar Consulta' }))
    await waitFor(() => assert.ok(view.getByText('No hay una referencia oficial verificable para esta respuesta.')))
    assert.match(view.container.textContent ?? '', /No hay una referencia oficial verificable/)
    assert.match(view.container.textContent ?? '', /Citación:\s*No disponible/)
    assert.ok(view.getByRole('alert').textContent?.includes('Resultado no es accionable.'))
    assert.equal(view.queryByText('Copilot fundamentado'), null)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('GovernmentDetail provides a compact section index after the operator summary', async () => {
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={dashboardPayload()} />)

  const index = view.getByRole('navigation', { name: 'Índice del tablero municipal' })
  const links = Array.from(index.querySelectorAll('a')).map((link) => link.getAttribute('href'))
  assert.deepEqual(links, ['#telemetry', '#municipal-evidence', '#municipal-explanation', '#municipal-coverage', '#municipal-mappings', '#municipal-alerts', '#municipal-forecast', '#municipal-provenance'])

  for (const id of links.map((href) => href?.slice(1)).filter((value): value is string => Boolean(value))) {
    const target = view.container.querySelector(`#${id}`)
    assert.ok(target, `missing section target: ${id}`)
    assert.equal(target?.getAttribute('tabindex'), '-1')
  }

  const summary = view.getByRole('region', { name: 'Resumen operativo municipal' })
  assert.ok(Boolean(summary.compareDocumentPosition(index) & 4))
})

test('GovernmentDetail keeps the section index and focus targets on an empty forecast path', async () => {
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{ ...dashboardPayload(), telemetryCards: [], inaPredictions30d: [], alerts: [], provenance: [] }} />)

  assert.ok(view.getByText('No hay pronóstico INA disponible'))
  const stickySummary = view.getByRole('region', { name: 'Estado resumido municipal' })
  assert.match(stickySummary.textContent ?? '', /Estado:\s*Sin datos verificables/)
  assert.match(stickySummary.textContent ?? '', /Frescura:\s*Sin datos/)
  assert.match(stickySummary.textContent ?? '', /Próxima acción segura:\s*Confirmar la última lectura/)
  const index = view.getByRole('navigation', { name: 'Índice del tablero municipal' })
  assert.equal(index.querySelectorAll('a[href^="#"]').length, 8)
  assert.equal(view.container.querySelector('#municipal-forecast')?.getAttribute('tabindex'), '-1')
  assert.equal(view.container.querySelector('#municipal-evidence')?.getAttribute('tabindex'), '-1')
})

test('GovernmentDetail keeps a keyboard-readable sticky status summary before the section index', async () => {
  const payload = dashboardPayload()
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{ ...payload, provenance: payload.provenance.map((item) => ({ ...item, freshness: 'fresh' as const })) }} />)

  const stickySummary = view.getByRole('region', { name: 'Estado resumido municipal' })
  assert.match(stickySummary.textContent ?? '', /Estado:\s*Observado/)
  assert.match(stickySummary.textContent ?? '', /Frescura:\s*Vigente/)
  assert.match(stickySummary.textContent ?? '', /Umbral:\s*Por debajo del umbral de alerta/)
  assert.match(stickySummary.textContent ?? '', /Confianza:\s*Evidencia observada/)
  assert.match(stickySummary.textContent ?? '', /Próxima acción segura:\s*Continuar monitoreo/)
  assert.equal(stickySummary.querySelectorAll('a, button, input, select').length, 0)

  const index = view.getByRole('navigation', { name: 'Índice del tablero municipal' })
  assert.ok(Boolean(stickySummary.compareDocumentPosition(index) & 4))
  assert.equal(index.querySelectorAll('a[href^="#"]').length, 8)
})

test('GovernmentDetail preserves an authorization boundary without offering an unsafe retry', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({ code: 'FORBIDDEN' }), { status: 403 })) as typeof fetch

  try {
    const view = render(<GovernmentDetail municipalityId="restricted" />)
    const error = await view.findByText('No tenés permisos para consultar este tablero.')
    const alert = error.closest('[role="alert"]')
    assert.ok(alert)
    assert.match(alert?.textContent ?? '', /permisos|acceso/i)
    assert.equal(alert?.getAttribute('aria-live'), 'assertive')
    assert.equal(view.queryByRole('button', { name: 'Reintentar tablero' }), null)
    assert.doesNotMatch(view.container.textContent ?? '', /Corrientes Capital|Altura PNA/)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('GovernmentDetail retries a failed dashboard request and restores the meaningful result focus boundary', async () => {
  const previousFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    return calls === 1
      ? new Response(JSON.stringify({ code: 'UPSTREAM_UNAVAILABLE' }), { status: 503 })
      : new Response(JSON.stringify(dashboardPayload()), { headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const view = render(<GovernmentDetail municipalityId="corrientes" />)
    await view.findByText('El tablero municipal no está disponible. Intentá nuevamente más tarde.')
    const retry = view.getByRole('button', { name: 'Reintentar tablero' })
    assert.equal(document.activeElement, retry)
    fireEvent.click(retry)

    await waitFor(() => assert.equal(calls, 2))
    assert.ok(await view.findByText('Corrientes Capital'))
    assert.equal(view.queryByRole('button', { name: 'Reintentar tablero' }), null)
  } finally {
    globalThis.fetch = previousFetch
  }
})

function dashboardPayload(): DashboardPayload {
  return {
    municipality: { id: 'corrientes', localityId: 'corrientes-capital', name: 'Corrientes Capital', alertHeightM: 6.5, evacuationHeightM: 7, officialAlerts: [{ source: 'SMN', coverageKey: 'smn-corrientes', message: 'Tormentas fuertes', observedAt: '2026-06-23T09:00:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z', freshness: 'fresh', sourceUrl: 'https://example.com/smn' }] },
    gaugeMappings: { primaryPnaPortId: 'corrientes', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] },
    telemetryCards: [{ source: 'PNA', stationId: 'corrientes', metric: 'river_height_m', value: 3.2, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', label: 'Altura PNA' }],
    inaPredictions30d: [{ source: 'INA', stationId: 'ina-corrientes', metric: 'river_height_m', value: 3.8, unit: 'm', observedAt: '2026-07-13T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', label: 'Pronóstico INA', forecastHorizonDays: 20, confidence: 'speculative' }],
    alerts: [{ source: 'SMN', stationId: 'smn-corrientes', metric: 'storm_alert', value: null, unit: 'alerta', observedAt: '2026-06-23T09:00:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z', label: 'Alerta SMN' }],
     provenance: [{ source: 'PNA', freshness: 'fresh', label: 'PNA vigente', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }, { source: 'SMN', freshness: 'degraded', label: 'SMN degradado', lastSuccessfulObservedAt: null }],
     coverageGaps: ['INA: sin estación asociada'],
  }
}

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  activeDoms.push(dom)
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.self = dom.window as unknown as typeof globalThis.self
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.Event = dom.window.Event
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
}
