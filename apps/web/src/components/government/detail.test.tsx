import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { fireEvent, render, cleanup, waitFor } from '@testing-library/react'
import { GovernmentDetail, parseSseData } from './detail'

beforeEach(() => setupDom())
afterEach(() => cleanup())

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
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{ ...dashboardPayload(), explanation: { contractVersion: 'ibera-municipality-explanation-v1', municipalityId: 'corrientes', evidenceState: 'observed', relationLabel: 'source mapping / threshold comparison', threshold: { alertHeightM: 6.5, evacuationHeightM: 7 }, observed: { value: 3.2, comparison: 'below_alert', source: 'PNA', sourceUrl: 'https://example.com/pna', observedAt: '2026-06-23T10:30:00.000Z', freshness: 'fresh' }, tendency: { value: 'creciente', window: 'últimas 3 observaciones de PNA' }, forecast: { horizonDays: 20, confidence: 'speculative', label: 'planning_only', source: 'INA', sourceUrl: 'https://example.com/ina', observedAt: '2026-07-13T10:30:00.000Z' }, lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', runId: null }, timeline: { events: [], currentStatus: 'unavailable', nextCursor: null } }} />)
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
  const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{
    ...dashboardPayload(),
    gaugeMappings: { primaryPnaPortId: 'corrientes', secondaryPnaPortIds: ['barranqueras'], inaStationIds: ['6764'], smnRegionIds: ['smn-corrientes'], inmetStationIds: ['inmet-corrientes'] },
    telemetryCards: [
      { ...dashboardPayload().telemetryCards[0], freshness: 'fresh' },
      { source: 'INA', stationId: 'ina-6764', metric: 'river_height_m', value: 3.8, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', label: 'Pronóstico INA', freshness: 'degraded', forecastHorizonDays: 20, confidence: 'speculative' },
      { source: 'SMN', stationId: 'smn-corrientes', metric: 'rain_mm', value: null, unit: 'mm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', label: 'Lluvia no disponible', freshness: 'missing' },
    ],
    inaPredictions30d: [{ ...dashboardPayload().inaPredictions30d[0], freshness: 'degraded' }],
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
  } finally {
    globalThis.fetch = previousFetch
  }
})

function dashboardPayload() {
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
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.self = dom.window as unknown as typeof globalThis.self
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.Event = dom.window.Event
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
}
