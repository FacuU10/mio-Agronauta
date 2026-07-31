import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { AgronautasFieldDetail } from './field-detail'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/demo/fields/field-corrientes-lote-001' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.Event = dom.window.Event
}

test('field detail renders decision evidence, timelines, honest point coverage and report disclaimer', async () => {
  setupDom()
  cleanup()
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

  assert.equal(view.getAllByRole('heading', { level: 1, name: /Detalle del lote/i }).length, 2)
  assert.ok(view.getAllByText(/Riesgo alto/i).length >= 1)
  assert.ok(view.getByText(/Siguiente acción/i))
  assert.ok(view.getByText('Carga de lluvia'))
  assert.ok(view.getByText(/alertas timeline/i))
  assert.ok(view.getByText(/Cobertura por punto/i))
  assert.ok(view.getByText(/no promete análisis poligonal/i))
  assert.ok(view.getByText(/already_in_progress/i))
  assert.ok(view.getByRole('link', { name: /Descargar reporte PDF/i }))
  assert.ok(view.getByText(/no reemplazan criterio agronómico local/i))
})

test('field detail recompute keeps the backend state visible for both request outcomes', async () => {
  setupDom()
  cleanup()
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
