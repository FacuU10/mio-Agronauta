import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { QueryProvider } from '@/lib/query-client'
import { AgronautasPageClient } from './page-client'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { useAgronautasStore } from '@/store/agronautas-store'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/demo' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
}

test('planning surface exposes labeled assumptions, explicit unavailable states, and a user-assumption result', async () => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()
  const view = render(<QueryProvider><AgronautasPageClient service={createAgronautasMockService()} /></QueryProvider>)
  await waitFor(() => assert.ok(view.getByRole('region', { name: 'Planificación de campaña Agronautas' })))
  assert.ok(view.getByLabelText('Área (ha)'))
  assert.ok(view.getByLabelText('Rendimiento supuesto (kg/ha)'))
  fireEvent.click(view.getByRole('button', { name: 'Calcular supuesto' }))
  await waitFor(() => {
    assert.ok(view.getByText(/Simulación basada en supuestos de usuario/i))
  })
  fireEvent.click(view.getByRole('button', { name: 'Ver contexto de lectura' }))
  await waitFor(() => {
    assert.ok(view.getAllByText(/field-demo-1/i).length >= 1)
    assert.ok(view.getAllByText(/Mercedes/i).length >= 1)
    assert.ok(view.getAllByText(/open-meteo/i).length >= 1)
    assert.ok(view.getAllByText(/degraded/i).length >= 1)
    assert.ok(view.getAllByText(/demo-climate/i).length >= 1)
    assert.ok(view.getByText(/No hay una observación de suelo verificada/i))
  })
  assert.equal(view.queryByText(/Iberá-Alerta/i), null)
})
