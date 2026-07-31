import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { render, cleanup } from '@testing-library/react'
import { GovernmentOverview, filterMunicipalities } from './overview'

beforeEach(() => setupDom())
afterEach(() => cleanup())

test('GovernmentOverview renders canonical telemetry and empty latestTelemetry safely', async () => {
  const payload = {
    province: { provinceCode: 'AR-W', name: 'Corrientes' },
    sourceFreshness: [{ source: 'PNA', freshness: 'fresh', label: 'PNA actualizado', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }],
    provinceAlerts: [],
    municipalities: [
      { id: 'corrientes', localityId: 'corrientes-capital', name: 'Corrientes Capital', provinceCode: 'AR-W', alertHeightM: 6.5, evacuationHeightM: 7, gaugeMappings: { primaryPnaPortId: 'corrientes', secondaryPnaPortIds: [], inaStationIds: ['6764'], smnRegionIds: [], inmetStationIds: [] }, officialAlerts: [{ source: 'SMN', coverageKey: 'smn-corrientes', message: 'Tormentas fuertes', observedAt: '2026-06-23T09:00:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z', freshness: 'fresh', sourceUrl: 'https://example.com/smn' }], latestTelemetry: [{ source: 'PNA', metric: 'river_height_m', value: 3.2, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }, { source: 'INA', metric: 'river_height_m', value: 3.11, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', sourceUrl: 'https://alerta.ina.gob.ar/a5/getObservaciones/6764' }, { source: 'SMN', metric: 'rain_mm', value: 18, unit: 'mm', observedAt: '2026-06-23T09:00:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z' }] },
      { id: 'goya', localityId: 'goya-corrientes', name: 'Goya', provinceCode: 'AR-W', gaugeMappings: { primaryPnaPortId: 'goya', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] }, officialAlerts: [], latestTelemetry: [] },
    ],
  }
  const view = render(<GovernmentOverview initialData={payload} />)
    assert.equal((await view.findAllByText('Corrientes Capital')).length, 2)
    assert.equal((await view.findAllByText('Goya')).length, 2)
    assert.match(view.container.textContent ?? '', /3\.2\s*m/)
    assert.match(view.container.textContent ?? '', /3\.11\s*m/)
  assert.ok(view.getByRole('link', { name: 'Ver fuente oficial' }))
  assert.doesNotMatch(view.container.textContent ?? '', /18\s*mm/)
  assert.ok(view.getByText('Sin datos oficiales recientes'))
  assert.ok(view.getByText('Tormentas fuertes'))
  assert.ok(view.getByText('Cobertura smn-corrientes'))
  assert.ok(view.getByText('Vigente'))
  assert.ok(view.getByText('Sin alertas oficiales recientes'))
})

test('GovernmentOverview renders explicit fetch error state', async () => {
  const view = render(<GovernmentOverview initialError="No se pudo cargar el monitoreo provincial" />)
  assert.ok(await view.findByRole('alert'))
})

test('GovernmentOverview keeps an accessible list fallback and renders all official source cards with filters', async () => {
  const payload = {
    province: { provinceCode: 'AR-W', name: 'Corrientes' },
    sourceFreshness: [{ source: 'PNA', freshness: 'fresh', label: 'PNA actualizado', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }],
    provinceAlerts: [],
    municipalities: [
      { id: 'mercedes', localityId: 'mercedes-corrientes', name: 'Mercedes', provinceCode: 'AR-W', gaugeMappings: { primaryPnaPortId: 'mercedes', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] }, officialAlerts: [], latestTelemetry: [] },
      { id: 'ituzaingo', localityId: 'ituzaingo-corrientes', name: 'Ituzaingó', provinceCode: 'AR-W', gaugeMappings: { primaryPnaPortId: 'ituzaingo', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] }, officialAlerts: [], latestTelemetry: [] },
    ],
  }
  const view = render(<GovernmentOverview initialData={payload} />)

  assert.ok(await view.findByLabelText('Filtrar localidades'))
  assert.ok(view.getByRole('region', { name: 'Alternativa no cartográfica' }))
  assert.ok(view.getAllByText('PNA').length >= 1)
  assert.ok(view.getAllByText('INA').length >= 1)
  assert.ok(view.getAllByText('INMET').length >= 1)
  assert.ok(view.getAllByText('SMN').length >= 1)
  assert.equal(filterMunicipalities(payload.municipalities, { query: 'itu', source: 'all', status: 'all' }).map((item) => item.id).join(','), 'ituzaingo')
  const future = view.getByTestId('ibera-alerta-future-capabilities')
  assert.ok(view.getByRole('heading', { level: 2, name: /Expansión institucional pendiente/i }))
  assert.ok(view.getByRole('article', { name: 'Integraciones institucionales' }))
  assert.equal(future.querySelectorAll('button, a, input, select, form').length, 0)
})

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.self = dom.window as unknown as typeof globalThis.self
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
}
