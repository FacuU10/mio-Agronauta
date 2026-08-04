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

test('GovernmentDetail renders empty telemetry and parses SSE string tokens', async () => {
    const view = render(<GovernmentDetail municipalityId="corrientes" initialData={{ ...dashboardPayload(), municipality: { ...dashboardPayload().municipality, officialAlerts: [] }, telemetryCards: [], inaPredictions30d: [], alerts: [], provenance: [] }} />)
    assert.ok(await view.findByText('Sin telemetría oficial reciente para este municipio.'))
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

function dashboardPayload() {
  return {
    municipality: { id: 'corrientes', localityId: 'corrientes-capital', name: 'Corrientes Capital', alertHeightM: 6.5, evacuationHeightM: 7, officialAlerts: [{ source: 'SMN', coverageKey: 'smn-corrientes', message: 'Tormentas fuertes', observedAt: '2026-06-23T09:00:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z', freshness: 'fresh', sourceUrl: 'https://example.com/smn' }] },
    gaugeMappings: { primaryPnaPortId: 'corrientes', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] },
    telemetryCards: [{ source: 'PNA', stationId: 'corrientes', metric: 'river_height_m', value: 3.2, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', label: 'Altura PNA' }],
    inaPredictions30d: [{ source: 'INA', stationId: 'ina-corrientes', metric: 'river_height_m', value: 3.8, unit: 'm', observedAt: '2026-07-13T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', label: 'Pronóstico INA', forecastHorizonDays: 20, confidence: 'speculative' }],
    alerts: [{ source: 'SMN', stationId: 'smn-corrientes', metric: 'storm_alert', value: null, unit: 'alerta', observedAt: '2026-06-23T09:00:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z', label: 'Alerta SMN' }],
    provenance: [{ source: 'PNA', freshness: 'fresh', label: 'PNA vigente', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }, { source: 'SMN', freshness: 'degraded', label: 'SMN degradado', lastSuccessfulObservedAt: null }],
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
