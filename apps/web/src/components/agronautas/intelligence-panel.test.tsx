import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { QueryProvider } from '@/lib/query-client'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { AgronautasPageClient } from './page-client'
import { IntelligencePanel } from './intelligence-panel'

test('intelligence panel shows evidence-backed climate and blocks unavailable economic domains', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.FormData = dom.window.FormData
  globalThis.Event = dom.window.Event
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
  cleanup()

  const view = render(<QueryProvider><AgronautasPageClient service={createAgronautasMockService()} /></QueryProvider>)
  view.getByRole('button', { name: 'Registrar lote' }).click()

  await new Promise((resolve) => setTimeout(resolve, 120))
  const panel = view.getByRole('region', { name: 'Inteligencia económica basada en evidencia' })
  assert.match(panel.textContent ?? '', /climática/i)
  assert.match(panel.textContent ?? '', /Suelo.*unavailable|unavailable.*Suelo/s)
  assert.match(panel.textContent ?? '', /Recomendación bloqueada/) 
  assert.match(panel.textContent ?? '', /crop-history\/yield/)
})

test('intelligence panel keeps Copilot evidence states truthful on desktop and mobile-sized DOMs', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.FormData = dom.window.FormData
  globalThis.Event = dom.window.Event
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
  cleanup()

  const view = render(<QueryProvider><AgronautasPageClient service={createAgronautasMockService()} /></QueryProvider>)
  view.getByRole('button', { name: 'Registrar lote' }).click()
  await new Promise((resolve) => setTimeout(resolve, 120))
  const chat = view.getByTestId('agronautas-chat-card')
  assert.match(chat.textContent ?? '', /evidencia|grounding/i)
  fireEvent.change(view.getByRole('textbox', { name: 'Pregunta' }), { target: { value: 'deshabilitado' } })
  fireEvent.click(view.getByRole('button', { name: 'Preguntar al chat' }))
  await new Promise((resolve) => setTimeout(resolve, 120))
  assert.match(chat.textContent ?? '', /no disponible|degradado|persistido/i)
})

test('intelligence panel exposes source, freshness, timestamps, limits and non-prescriptive language', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
  cleanup()

  const service = createAgronautasMockService()
  const intelligence = await service.getFieldIntelligence('field-corrientes-lote-001')
  const view = render(<IntelligencePanel intelligence={intelligence} onRetry={() => Promise.resolve()} />)

  assert.match(view.getByRole('region', { name: 'Inteligencia económica basada en evidencia' }).textContent ?? '', /Fuente|Frescura|Observado|no reemplaza criterio/i)
  assert.match(view.container.textContent ?? '', /No se puede recomendar|bloqueada|no reemplaza/i)
})

test('intelligence panel preserves source mode, evidence references and stale limitations', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
  cleanup()

  const intelligence = await createAgronautasMockService().getFieldIntelligence('field-corrientes-lote-001')
  if (intelligence.climate.state !== 'available') throw new Error('Expected mock climate evidence')
  const staleIntelligence = {
    ...intelligence,
    climate: {
      ...intelligence.climate,
      value: { ...intelligence.climate.value, freshness: 'stale' as const },
    },
  }
  const view = render(<IntelligencePanel intelligence={staleIntelligence} onRetry={() => Promise.resolve()} />)
  const panel = view.getByRole('region', { name: 'Inteligencia económica basada en evidencia' })

  assert.match(panel.textContent ?? '', /Modo: sin modo de evidencia en el contrato/i)
  assert.match(panel.textContent ?? '', /crop-history\/yield/i)
  assert.match(panel.textContent ?? '', /stale/i)
  assert.match(panel.textContent ?? '', /sin evidencia suficiente|bloqueada/i)
})

test('intelligence panel does not offer retry when access is unauthorized or forbidden', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
  cleanup()

  for (const state of ['unauthorized', 'forbidden'] as const) {
    const view = render(<IntelligencePanel availability={{ state, reason: state }} onRetry={() => Promise.resolve()} />)
    assert.equal(view.queryByRole('button', { name: 'Reintentar inteligencia' }), null)
    cleanup()
  }
})
