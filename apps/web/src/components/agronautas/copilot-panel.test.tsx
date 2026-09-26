import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { render } from '@testing-library/react'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { CopilotPanel } from './copilot-panel'

test('Copilot panel never presents non-grounded or citation-free output as actionable', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })

  const response = await createAgronautasMockService().askFieldChat('field-corrientes-lote-001', {
    contractVersion: '1.0.0',
    message: 'deshabilitado',
  })
  const view = render(<CopilotPanel response={response} onRetry={() => undefined} />)

  assert.match(view.container.textContent ?? '', /citación|fundamentado|no reemplaza criterio/i)
  assert.equal(view.queryByText('Copilot fundamentado'), null)
  assert.ok(view.getByRole('alert'))
})

test('Copilot panel exposes contract evidence mode, freshness, lineage and keeps stale output non-actionable', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })

  const response = await createAgronautasMockService().askFieldChat('field-corrientes-lote-001', {
    contractVersion: '1.0.0',
    message: 'deshabilitado',
  })
  const staleResponse = {
    ...response,
    providerMode: 'mock' as const,
    providerModes: ['mock' as const],
    evidenceStatus: 'stale' as const,
    readiness: 'stale' as const,
    sourceRunIds: ['copilot-source-run-1'],
  }
  const view = render(<CopilotPanel response={staleResponse} onRetry={() => undefined} />)

  assert.match(view.container.textContent ?? '', /Modo de evidencia: Mock/i)
  assert.match(view.container.textContent ?? '', /Frescura de evidencia: stale/i)
  assert.match(view.container.textContent ?? '', /copilot-source-run-1/)
  assert.equal(view.queryByText('Copilot fundamentado'), null)
  assert.ok(view.getByRole('alert'))
})
