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
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.FormData = dom.window.FormData
  globalThis.Event = dom.window.Event
}

test('Agronautas intake offers locality search, provider-neutral pin preview and accessible fallback', async () => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()

  const view = render(<QueryProvider><AgronautasPageClient service={createAgronautasMockService()} /></QueryProvider>)

  assert.ok(view.getByRole('heading', { level: 1, name: /Workspace Agronautas/i }))
  const locality = view.getByLabelText('Buscar localidad')
  fireEvent.change(locality, { target: { value: 'Mer' } })
  assert.ok(view.getByRole('option', { name: /Mercedes/i }))
  fireEvent.click(view.getByRole('option', { name: /Mercedes/i }))
  assert.ok(view.getByText(/Cobertura por punto · Mercedes/i))
   assert.ok(view.getByText(/Google Maps no está disponible/i))
  assert.ok(view.getByRole('region', { name: /alternativa no cartográfica/i }))
   assert.ok(view.getByText(/polygonWkt/i))
  const future = view.getByTestId('agronautas-future-capabilities')
  assert.ok(view.getByRole('heading', { level: 2, name: /Lo que sigue, sin vender humo/i }))
  assert.ok(view.getByRole('article', { name: 'Precios y tendencias de mercado' }))
  assert.equal(future.querySelectorAll('button, a, input, select, form').length, 0)
  assert.doesNotMatch(future.textContent ?? '', /(?:\$|USD|ARS|\b\d+(?:[.,]\d+)?\s*(?:%|kg|ha|mm|t)\b)/i)
})

test('Agronautas dashboard prioritizes decision, confidence, freshness and next action after intake', async () => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()

  const view = render(<QueryProvider><AgronautasPageClient service={createAgronautasMockService()} /></QueryProvider>)
  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    assert.ok(view.getByRole('heading', { level: 2, name: /Decisión del lote/i }))
    assert.ok(view.getByText('Nivel de riesgo'))
     assert.ok(view.getByText('Siguiente acción'))
    assert.ok(view.getAllByText(/Confianza/i).length >= 1)
    assert.ok(view.getAllByText(/Frescura/i).length >= 1)
    assert.ok(view.getByRole('link', { name: /Ver alertas/i }))
    assert.ok(view.getByRole('link', { name: /Ver timeline/i }))
  })
})

test('Agronautas workspace makes runtime, source status and retry boundaries visible', async () => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()

  const view = render(<QueryProvider><AgronautasPageClient service={createAgronautasMockService()} /></QueryProvider>)
  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    const status = view.getByTestId('agronautas-capability-status')
    assert.match(status.textContent ?? '', /Fuentes y telemetría/i)
    assert.match(status.textContent ?? '', /Runtime backend/i)
    assert.match(status.textContent ?? '', /Fuentes y telemetría/i)
    assert.ok(view.getByRole('button', { name: /Reintentar sincronización/i }))
    assert.ok(view.getByRole('link', { name: /Abrir detalle/i }))
  })
})

test('Agronautas keeps unrelated panels available when one source query fails', async () => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()
  const base = createAgronautasMockService()
  const view = render(<QueryProvider><AgronautasPageClient service={{ ...base, async getWeatherTimeline() { throw new Error('weather source unavailable') } }} /></QueryProvider>)

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    assert.ok(view.getByRole('alert').textContent?.includes('weather source unavailable'))
    assert.ok(view.getByText('Drivers y evidencia'))
    assert.ok(view.getAllByText('Alertas actuales').length >= 1)
    assert.ok(view.getByRole('button', { name: /Reintentar sincronización/i }))
  })
})

test('Agronautas intake only exposes crops from the approved runtime contract', async () => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()
  const base = createAgronautasMockService()
  const submitted: Array<{ crop: string }> = []
  const view = render(<QueryProvider><AgronautasPageClient service={{ ...base, async createFieldIntake(input) { submitted.push({ crop: input.crop }); return base.createFieldIntake(input) } }} /></QueryProvider>)

  const crop = view.getByLabelText('Cultivo permitido')
  assert.ok(view.getByRole('option', { name: 'Arroz' }))
  assert.ok(view.getByRole('option', { name: 'Maíz' }))
  fireEvent.change(crop, { target: { value: 'maize' } })
  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => assert.deepEqual(submitted[0], { crop: 'maize' }))
})
