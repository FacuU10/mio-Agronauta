import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react/pure'
import { QueryProvider } from '@/lib/query-client'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { ApiError } from '@/lib/api-client'
import { AgronautasFieldDetail, AgronautasFieldDetailPageClient } from './field-detail'

const activeDoms: Array<InstanceType<typeof JSDOM>> = []
const globalNames = ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'Event', 'navigator'] as const
const originalGlobals = new Map(globalNames.map((name) => [name, (globalThis as unknown as Record<string, unknown>)[name]]))

function setGlobal(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
}

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/demo/fields/field-corrientes-lote-001' })
  activeDoms.push(dom)
  setGlobal('window', dom.window)
  setGlobal('document', dom.window.document)
  setGlobal('HTMLElement', dom.window.HTMLElement)
  setGlobal('HTMLButtonElement', dom.window.HTMLButtonElement)
  setGlobal('Event', dom.window.Event)
  setGlobal('navigator', dom.window.navigator)
}

beforeEach(() => {
  setupDom()
})

afterEach(async () => {
  cleanup()
  await new Promise<void>((resolve) => setImmediate(resolve))
  for (const dom of activeDoms.splice(0)) dom.window.close()
  for (const name of globalNames) setGlobal(name, originalGlobals.get(name))
})

test('field detail renders decision evidence, timelines, honest point coverage and report disclaimer', async () => {
  const service = createAgronautasMockService()
  const fieldId = 'field-corrientes-lote-001'
  const [field, risk, alerts, status, riskTimeline, weatherTimeline, dashboard, alertsTimeline] = await Promise.all([
    service.getField(fieldId),
    service.getCurrentRisk(fieldId),
    service.getCurrentAlerts(fieldId),
    service.getMonitoringStatus(fieldId),
    service.getRiskTimeline(fieldId),
    service.getWeatherTimeline(fieldId),
    service.getDashboard(fieldId),
    service.getAlertsTimeline(fieldId),
  ])

  const view = render(
    <AgronautasFieldDetail
      field={field}
      risk={risk}
      alerts={alerts}
      status={status}
      riskTimeline={riskTimeline}
      weatherTimeline={weatherTimeline}
      dashboard={dashboard}
      alertsTimeline={alertsTimeline}
      recomputeStatus={{ status: 'already_in_progress', runId: 'run-2' }}
      isRecomputePending={false}
      onRequestRecompute={() => Promise.resolve()}
    />,
  )

  assert.equal(view.getAllByRole('heading', { level: 1, name: /Detalle del lote/i }).length, 1)
  assert.equal(view.getAllByRole('heading', { level: 2, name: /Detalle del lote/i }).length, 1)
  assert.equal(view.getAllByRole('main').length, 1)
  assert.equal(view.container.querySelector('main > main'), null)
  assert.ok(view.getAllByText(/Riesgo alto/i).length >= 1)
  assert.ok(view.getByText(/Siguiente acción/i))
  assert.ok(view.getByText('Carga de lluvia'))
  assert.ok(view.getByText(/alertas timeline/i))
  assert.ok(view.getByText(/Cobertura por punto/i))
  assert.ok(view.getByText(/no promete análisis poligonal/i))
  assert.ok(view.getByText(/already_in_progress/i))
  assert.ok(view.getByRole('link', { name: /Descargar reporte PDF/i }))
  assert.ok(view.getByText(/no reemplazan criterio agronómico local/i))
  const evidenceStates = view.getByRole('region', { name: 'Estados de evidencia del lote' })
  assert.match(evidenceStates.textContent ?? '', /observed/i)
  assert.match(evidenceStates.textContent ?? '', /stale/i)
  assert.match(evidenceStates.textContent ?? '', /missing/i)
})

test('field detail recompute keeps the backend state visible for both request outcomes', async () => {
  const service = createAgronautasMockService()
  const fieldId = 'field-corrientes-lote-001'
  const [field, risk, alerts, status, riskTimeline, weatherTimeline, dashboard, alertsTimeline] = await Promise.all([
    service.getField(fieldId), service.getCurrentRisk(fieldId), service.getCurrentAlerts(fieldId), service.getMonitoringStatus(fieldId),
    service.getRiskTimeline(fieldId), service.getWeatherTimeline(fieldId), service.getDashboard(fieldId), service.getAlertsTimeline(fieldId),
  ])
  let result = await service.requestRecompute(fieldId)
  const requested: string[] = []
  const view = render(
    <AgronautasFieldDetail
      field={field} risk={risk} alerts={alerts} status={status} riskTimeline={riskTimeline} weatherTimeline={weatherTimeline}
      dashboard={dashboard} alertsTimeline={alertsTimeline} recomputeStatus={result} isRecomputePending={false}
      onRequestRecompute={async () => { requested.push(fieldId); result = await service.requestRecompute(fieldId) }}
    />,
  )

  fireEvent.click(view.getByRole('button', { name: /Solicitar recompute/i }))
  await waitFor(() => assert.deepEqual(requested, [fieldId]))
  assert.equal(result.status, 'already_in_progress')
})

test('field detail renders an intentional unavailable state for a 404 geometry capability', async () => {
  const service = createAgronautasMockService()
  const fieldId = 'field-corrientes-lote-001'
  const [field, risk, alerts, status, riskTimeline, weatherTimeline, dashboard, alertsTimeline] = await Promise.all([
    service.getField(fieldId), service.getCurrentRisk(fieldId), service.getCurrentAlerts(fieldId), service.getMonitoringStatus(fieldId),
    service.getRiskTimeline(fieldId), service.getWeatherTimeline(fieldId), service.getDashboard(fieldId), service.getAlertsTimeline(fieldId),
  ])

  const view = render(
    <AgronautasFieldDetail
      field={field}
      risk={risk}
      alerts={alerts}
      status={status}
      riskTimeline={riskTimeline}
      weatherTimeline={weatherTimeline}
      dashboard={dashboard}
      alertsTimeline={alertsTimeline}
      geometryOutcome={{ state: 'unavailable', status: 404, reason: 'capability_unavailable' }}
      isRecomputePending={false}
      onRequestRecompute={() => Promise.resolve()}
    />,
  )

  assert.equal(view.getAllByRole('main').length, 1)
  assert.equal(view.container.querySelector('main > main'), null)
  assert.ok(view.getByRole('alert', { name: /Geometría no disponible/i }))
  assert.match(view.getByRole('alert', { name: /Geometría no disponible/i }).textContent ?? '', /404|capacidad/i)
  assert.ok(view.getByText('Carga de lluvia'))
  assert.ok(view.getAllByText(/Riesgo alto/i).length >= 1)
})

test('field detail provides a compact section index without changing the decision summary', async () => {
  const service = createAgronautasMockService()
  const fieldId = 'field-corrientes-lote-001'
  const [field, risk, alerts, status, riskTimeline, weatherTimeline, dashboard, alertsTimeline] = await Promise.all([
    service.getField(fieldId), service.getCurrentRisk(fieldId), service.getCurrentAlerts(fieldId), service.getMonitoringStatus(fieldId),
    service.getRiskTimeline(fieldId), service.getWeatherTimeline(fieldId), service.getDashboard(fieldId), service.getAlertsTimeline(fieldId),
  ])

  const view = render(
    <AgronautasFieldDetail
      field={field} risk={risk} alerts={alerts} status={status} riskTimeline={riskTimeline} weatherTimeline={weatherTimeline}
      dashboard={dashboard} alertsTimeline={alertsTimeline} isRecomputePending={false} onRequestRecompute={() => Promise.resolve()}
    />,
  )

  const index = view.getByRole('navigation', { name: 'Índice del detalle del lote' })
  const links = Array.from(index.querySelectorAll('a')).map((link) => link.getAttribute('href'))
  assert.deepEqual(links, ['#field-decision', '#field-evidence', '#field-drivers', '#field-timelines', '#field-coverage', '#field-provenance', '#field-actions'])

  for (const id of links.map((href) => href?.slice(1)).filter((value): value is string => Boolean(value))) {
    const target = view.container.querySelector(`#${id}`)
    assert.ok(target, `missing section target: ${id}`)
    assert.equal(target?.getAttribute('tabindex'), '-1')
  }

  const decision = view.container.querySelector('#field-decision')
  assert.ok(decision)
  assert.match(decision?.textContent ?? '', /Siguiente acción/)
})

test('field detail keeps the section index when geometry is unavailable', async () => {
  const service = createAgronautasMockService()
  const fieldId = 'field-corrientes-lote-001'
  const [field, risk, alerts, status, riskTimeline, weatherTimeline, dashboard, alertsTimeline] = await Promise.all([
    service.getField(fieldId), service.getCurrentRisk(fieldId), service.getCurrentAlerts(fieldId), service.getMonitoringStatus(fieldId),
    service.getRiskTimeline(fieldId), service.getWeatherTimeline(fieldId), service.getDashboard(fieldId), service.getAlertsTimeline(fieldId),
  ])

  const view = render(
    <AgronautasFieldDetail
      field={field} risk={risk} alerts={alerts} status={status} riskTimeline={riskTimeline} weatherTimeline={weatherTimeline}
      dashboard={dashboard} alertsTimeline={alertsTimeline} geometryOutcome={{ state: 'unavailable', status: 404, reason: 'capability_unavailable' }}
      isRecomputePending={false} onRequestRecompute={() => Promise.resolve()}
    />,
  )

  assert.ok(view.getByRole('alert', { name: /Geometría no disponible/i }))
  assert.ok(view.getByRole('navigation', { name: 'Índice del detalle del lote' }))
  assert.equal(view.container.querySelector('#field-coverage')?.getAttribute('tabindex'), '-1')
  assert.equal(view.container.querySelector('#field-actions')?.getAttribute('tabindex'), '-1')
})

test('field detail renders empty risk timeline as an explicit empty state', async () => {
  const service = createAgronautasMockService()
  const fieldId = 'field-corrientes-lote-001'
  const [field, risk, alerts, status, riskTimeline, weatherTimeline, dashboard, alertsTimeline] = await Promise.all([
    service.getField(fieldId), service.getCurrentRisk(fieldId), service.getCurrentAlerts(fieldId), service.getMonitoringStatus(fieldId),
    service.getRiskTimeline(fieldId), service.getWeatherTimeline(fieldId), service.getDashboard(fieldId), service.getAlertsTimeline(fieldId),
  ])

  const view = render(
    <AgronautasFieldDetail
      field={field} risk={risk} alerts={alerts} status={status} riskTimeline={{ ...riskTimeline, items: [] }} weatherTimeline={weatherTimeline}
      dashboard={dashboard} alertsTimeline={alertsTimeline} isRecomputePending={false} onRequestRecompute={() => Promise.resolve()}
    />,
  )

  assert.ok(view.getByText(/Sin timeline de riesgo persistido/i))
})

test('field detail preserves explicit 401, 403 and 404 boundaries', async () => {
  const base = createAgronautasMockService()
  const boundaries = [
    [401, /Acceso al detalle no autorizado/i],
    [403, /Detalle del lote restringido/i],
    [404, /Lote no encontrado/i],
  ] as const

  for (const [status, title] of boundaries) {
    const view = render(
      <QueryProvider>
        <AgronautasFieldDetailPageClient
          fieldId="field-corrientes-lote-001"
          service={{ ...base, async getField() { throw new ApiError(status, `field ${status}`) } }}
        />
      </QueryProvider>,
    )

    await waitFor(() => {
      assert.ok(view.getByRole('heading', { name: title }))
      assert.equal(view.queryByText('Decisión del lote'), null)
      assert.match(view.getByRole('alert', { name: title }).textContent ?? '', new RegExp(String(status)))
    })
    cleanup()
  }
})
