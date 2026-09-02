import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { fireEvent, render, cleanup, waitFor } from '@testing-library/react/pure'
import { GovernmentOverview, createOverviewOperatorSummary, filterMunicipalities } from './overview'

const originalGlobals = {
  window: globalThis.window,
  self: globalThis.self,
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  navigator: globalThis.navigator,
}
const activeDoms: Array<InstanceType<typeof JSDOM>> = []

type OverviewPayload = NonNullable<NonNullable<Parameters<typeof GovernmentOverview>[0]>['initialData']>

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
      Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: originalGlobals.navigator })
    }
  }
})

test('GovernmentOverview renders canonical telemetry and empty latestTelemetry safely', async () => {
  const payload: OverviewPayload = {
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
  const evidenceStates = view.getByRole('region', { name: 'Estados de evidencia provincial' })
  assert.match(evidenceStates.textContent ?? '', /observed/i)
  assert.match(evidenceStates.textContent ?? '', /missing/i)
})

test('GovernmentOverview renders explicit fetch error state', async () => {
  const view = render(<GovernmentOverview initialError="No se pudo cargar el monitoreo provincial" />)
  assert.ok(await view.findByRole('alert'))
})

test('GovernmentOverview keeps unauthorized access explicit without offering an unsafe retry', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 })) as typeof fetch

  try {
    const view = render(<GovernmentOverview />)
    const alert = await view.findByRole('alert')
    assert.match(alert.textContent ?? '', /No estás autorizado para consultar el monitoreo provincial/)
    assert.equal(view.queryByRole('button', { name: 'Reintentar monitoreo' }), null)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('GovernmentOverview keeps an accessible list fallback and renders all official source cards with filters', async () => {
  const payload: OverviewPayload = {
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

test('GovernmentOverview puts a truthful operator summary before the municipality sections', async () => {
  const payload: OverviewPayload = {
    province: { provinceCode: 'AR-W', name: 'Corrientes' },
    sourceFreshness: [{ source: 'PNA', freshness: 'fresh', label: 'PNA actualizado', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }],
    provinceAlerts: [],
    municipalities: [{ id: 'corrientes', localityId: 'corrientes-capital', name: 'Corrientes Capital', provinceCode: 'AR-W', alertHeightM: 6.5, evacuationHeightM: 7, gaugeMappings: { primaryPnaPortId: 'corrientes', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] }, officialAlerts: [], latestTelemetry: [{ source: 'PNA', metric: 'river_height_m', value: 3.2, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', freshness: 'fresh' }] }],
  }

  const summary = createOverviewOperatorSummary(payload)
  assert.equal(summary.status, 'Observado')
  assert.equal(summary.freshness, 'Vigente')
  assert.equal(summary.threshold, 'Por debajo del umbral de alerta')
  assert.equal(summary.confidence, 'Evidencia observada')
  assert.equal(summary.nextSafeAction, 'Continuar monitoreo y confirmar el protocolo oficial antes de escalar')

  const view = render(<GovernmentOverview initialData={payload} />)
  const operatorSummary = view.getByRole('region', { name: 'Resumen operativo provincial' })
  assert.match(operatorSummary.textContent ?? '', /Estado:\s*Observado/)
  assert.match(operatorSummary.textContent ?? '', /Frescura:\s*Vigente/)
  assert.match(operatorSummary.textContent ?? '', /Umbral:\s*Por debajo del umbral de alerta/)
  assert.match(operatorSummary.textContent ?? '', /Confianza:\s*Evidencia observada/)
  assert.match(operatorSummary.textContent ?? '', /Próxima acción segura:\s*Continuar monitoreo/)
  const municipalitiesHeading = view.getByRole('heading', { name: 'Localidades bajo monitoreo' })
  assert.ok(Boolean(operatorSummary.compareDocumentPosition(municipalitiesHeading) & 4))
})

test('GovernmentOverview exposes one landmark, a skip link, and named filter controls', async () => {
  const payload: OverviewPayload = {
    province: { provinceCode: 'AR-W', name: 'Corrientes' },
    sourceFreshness: [],
    provinceAlerts: [],
    municipalities: [],
  }
  const view = render(<GovernmentOverview initialData={payload} />)

  assert.equal(view.container.querySelectorAll('main').length, 1)
  assert.equal(view.container.querySelectorAll('main main').length, 0)
  const skipLink = view.getByRole('link', { name: 'Saltar al listado' })
  assert.equal(skipLink.getAttribute('href'), '#municipalities-list')
  const skipTarget = view.container.querySelector('#municipalities-list')
  assert.ok(skipTarget)
  assert.equal(skipTarget?.getAttribute('tabindex'), '-1')
  assert.equal(view.getAllByRole('heading', { level: 1 }).length, 1)
  assert.ok(view.getByRole('heading', { level: 2, name: 'Alertas provinciales' }))
  assert.ok(view.getByRole('heading', { level: 2, name: 'Localidades bajo monitoreo' }))

  const query = view.getByRole('textbox', { name: 'Filtrar localidades' })
  assert.equal(query.getAttribute('name'), 'municipalityQuery')
  assert.equal(query.getAttribute('autocomplete'), 'off')
  assert.equal(view.getByRole('combobox', { name: 'Fuente' }).getAttribute('name'), 'municipalitySource')
  assert.equal(view.getByRole('combobox', { name: 'Fuente' }).getAttribute('autocomplete'), 'off')
  assert.equal(view.getByRole('combobox', { name: 'Estado' }).getAttribute('name'), 'municipalityStatus')
  assert.equal(view.getByRole('combobox', { name: 'Estado' }).getAttribute('autocomplete'), 'off')
})

test('GovernmentOverview announces fetch errors as an assertive live region', async () => {
  const view = render(<GovernmentOverview initialError="No se pudo cargar el monitoreo provincial" />)
  const error = await view.findByRole('alert')
  assert.equal(error.getAttribute('aria-live'), 'assertive')
  assert.equal(error.getAttribute('aria-atomic'), 'true')
})

test('GovernmentOverview distinguishes stale source telemetry and recovers through an accessible retry', async () => {
  const previousFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    return new Response(JSON.stringify({
      province: { provinceCode: 'AR-W', name: 'Corrientes' },
      sourceFreshness: [{ source: 'PNA', freshness: 'stale', label: 'Última lectura demorada', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z' }],
      provinceAlerts: [],
      municipalities: [{ id: 'goya', localityId: 'goya-corrientes', name: 'Goya', provinceCode: 'AR-W', gaugeMappings: { primaryPnaPortId: 'goya', secondaryPnaPortIds: [], inaStationIds: [], smnRegionIds: [], inmetStationIds: [] }, officialAlerts: [], latestTelemetry: [{ source: 'PNA', metric: 'river_height_m', value: 4.1, unit: 'm', observedAt: '2026-06-23T10:30:00.000Z', lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z', freshness: 'stale' }] }],
    }), { headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const view = render(<GovernmentOverview initialError="No se pudo cargar el monitoreo provincial" />)
    const retry = view.getByRole('button', { name: 'Reintentar monitoreo' })
    fireEvent.click(retry)

    await waitFor(() => assert.equal(calls, 1))
    assert.ok(await view.findByText('Última lectura demorada'))
    assert.ok(view.getByText('demorada'))
    assert.match(view.container.textContent ?? '', /Datos parciales/)
    assert.doesNotMatch(view.container.textContent ?? '', /PNA.*Vigente/s)
  } finally {
    globalThis.fetch = previousFetch
  }
})

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  activeDoms.push(dom)
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.self = dom.window as unknown as typeof globalThis.self
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
}
