import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { render, cleanup } from '@testing-library/react'
import { GovernmentOverview } from './overview'

beforeEach(() => setupDom())
afterEach(() => cleanup())

test('GovernmentOverview renders canonical telemetry and empty latestTelemetry safely', async () => {
  const payload = {
    province: { provinceCode: 'AR-W', name: 'Corrientes' },
    sourceFreshness: [{ source: 'PNA', freshness: 'fresh', label: 'PNA actualizado', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }],
    provinceAlerts: [],
    municipalities: [
      { id: 'corrientes', localityId: 'corrientes-capital', name: 'Corrientes Capital', provinceCode: 'AR-W', alertHeightM: 6.5, evacuationHeightM: 7, gaugeMappings: { primaryPnaPortId: 'corrientes', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] }, latestTelemetry: [{ source: 'PNA', metric: 'river_height_m', value: 3.2, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }, { source: 'SMN', metric: 'rain_mm', value: 18, unit: 'mm', observedAt: '2026-06-23T09:00:00.000Z', lastSuccessfulObservedAt: '2026-06-23T09:00:00.000Z' }] },
      { id: 'goya', localityId: 'goya-corrientes', name: 'Goya', provinceCode: 'AR-W', gaugeMappings: { primaryPnaPortId: 'goya', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] }, latestTelemetry: [] },
    ],
  }
  const view = render(<GovernmentOverview initialData={payload} />)
    assert.ok(await view.findByText('Corrientes Capital'))
    assert.ok(await view.findByText('Goya'))
    assert.match(view.container.textContent ?? '', /3\.2\s*m/)
    assert.match(view.container.textContent ?? '', /18\s*mm/)
    assert.ok(view.getByText('Sin datos oficiales recientes'))
})

test('GovernmentOverview renders explicit fetch error state', async () => {
  const view = render(<GovernmentOverview initialError="No se pudo cargar el monitoreo provincial" />)
  assert.ok(await view.findByRole('alert'))
})

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.self = dom.window as unknown as typeof globalThis.self
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
}
