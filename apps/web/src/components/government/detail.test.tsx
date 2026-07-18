import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { render, cleanup } from '@testing-library/react'
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

function dashboardPayload() {
  return {
    municipality: { id: 'corrientes', localityId: 'corrientes-capital', name: 'Corrientes Capital', alertHeightM: 6.5, evacuationHeightM: 7, officialAlerts: [{ source: 'SMN', coverageKey: 'smn-corrientes', message: 'Tormentas fuertes', observedAt: '2026-06-23T09:00:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z', freshness: 'fresh', sourceUrl: 'https://example.com/smn' }] },
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
