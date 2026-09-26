import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import { ApiError } from '@/lib/api-client'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { EvidencePanel } from './evidence-panel'

test('evidence panel keeps empty and unavailable sources explicit with bounded recovery', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })

  const model = await createAgronautasMockService().getEvidenceDashboard('field-corrientes-lote-001')
  const view = render(<EvidencePanel model={model} onRetry={() => Promise.resolve()} />)

  assert.ok(view.getByRole('region', { name: 'Dashboard de evidencia Agronautas' }))
  assert.match(view.container.textContent ?? '', /Modo|Observed|Source|no se inventan|Reintentar/i)
  assert.match(view.container.textContent ?? '', /unavailable|missing|stale|degraded/i)
})

test('evidence panel renders maintenance and does not turn non-retryable maintenance into an action', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })

  const model = await createAgronautasMockService().getEvidenceDashboard('field-corrientes-lote-001')
  const maintenanceModel = {
    ...model,
    ingestion: [{ provider: 'SMN', signalType: 'weather', state: 'maintenance' as const, retryable: false, reason: 'maintenance_window' }],
  }
  const view = render(<EvidencePanel model={maintenanceModel} onRetry={() => Promise.resolve()} />)

  assert.match(view.container.textContent ?? '', /maintenance_window/)
  assert.match(view.container.textContent ?? '', /maintenance/i)
  assert.equal(view.queryByRole('button', { name: 'Reintentar evidencia' }), null)
})

test('evidence panel allows recovery for transient failure but not access or missing-contract failures', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
  let retries = 0
  const onRetry = () => {
    retries += 1
    return Promise.resolve()
  }

  for (const status of [401, 403, 404]) {
    const view = render(<EvidencePanel error={new ApiError(status, `HTTP ${status}`)} onRetry={onRetry} />)
    assert.equal(view.queryByRole('button', { name: 'Reintentar evidencia' }), null)
    cleanup()
  }

  const transient = render(<EvidencePanel error={new ApiError(503, 'maintenance')} onRetry={onRetry} />)
  transient.getByRole('button', { name: 'Reintentar evidencia' }).click()
  assert.equal(retries, 1)
})
