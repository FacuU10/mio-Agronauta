import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import { QueryProvider } from '@/lib/query-client'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { AgronautasPageClient } from './page-client'

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
