import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { QueryProvider } from '@/lib/query-client'
import { AgronautasPageClient } from './page-client'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { useAgronautasStore } from '@/store/agronautas-store'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.FormData = dom.window.FormData
  globalThis.Event = dom.window.Event
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  })
}

beforeEach(() => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()
})

test('alta válida muestra dashboard con alertas y evidencia', async () => {
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={createAgronautasMockService()} />
    </QueryProvider>,
  )

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    assert.ok(view.getByText(/Modo demo/i))
    assert.ok(view.getByText('Drivers y evidencia'))
    assert.ok(view.getByText('Riesgo de anegamiento'))
    assert.ok(view.getByText(/weather:open-meteo/i))
  })
})

test('rechazo fuera de alcance expone error explícito', async () => {
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={createAgronautasMockService()} />
    </QueryProvider>,
  )

  fireEvent.change(view.getByLabelText('Latitud'), { target: { value: '-34.6037' } })
  fireEvent.change(view.getByLabelText('Longitud'), { target: { value: '-58.3816' } })
  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    assert.ok(view.getByRole('alert').textContent?.includes('fuera del alcance'))
  })
})

test('visualización stale advierte recompute en curso', async () => {
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={createAgronautasMockService()} />
    </QueryProvider>,
  )

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    assert.ok(view.getByText('Snapshot stale detectado'))
    assert.ok(view.getByText(/recompute enqueued/i))
  })
})
