import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { QueryProvider } from '@/lib/query-client'
import { AgronautasPageClient } from './page-client'
import { createAgronautasMockService, type AgronautasService } from '@/lib/agronautas/service'
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
    assert.ok(view.getByText('Estado monitoreo'))
    assert.ok(view.getByText('Riesgo de anegamiento'))
    assert.ok(view.getByText(/weather:open-meteo/i))
    assert.ok(view.getByText('Timeline climático'))
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

  fireEvent.click(view.getByRole('button', { name: 'Solicitar recompute' }))
  fireEvent.click(view.getByRole('button', { name: 'Solicitar recompute' }))

  await waitFor(() => {
    assert.ok(view.getByText(/recompute already_in_progress/i))
  })
})

test('chat grounded responde sin romper el dashboard', async () => {
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={createAgronautasMockService()} />
    </QueryProvider>,
  )

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))
  await waitFor(() => assert.ok(view.getByTestId('agronautas-chat-card')))

  fireEvent.change(view.getByLabelText('Pregunta'), { target: { value: 'Explicá el riesgo actual' } })
  fireEvent.click(view.getByRole('button', { name: 'Preguntar al chat' }))

  await waitFor(() => {
    assert.ok(view.getByText(/score 74/i))
    assert.ok(view.getByText('Drivers y evidencia'))
  })
})

test('chat degradado expone motivo honesto', async () => {
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={createAgronautasMockService()} />
    </QueryProvider>,
  )

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))
  await waitFor(() => assert.ok(view.getByTestId('agronautas-chat-card')))

  fireEvent.change(view.getByLabelText('Pregunta'), { target: { value: 'chat deshabilitado' } })
  fireEvent.click(view.getByRole('button', { name: 'Preguntar al chat' }))

  await waitFor(() => {
    assert.ok(view.getByText(/Groq no está configurado/i))
    assert.ok(view.getByText('Degradado'))
  })
})

test('localidad seed Mercedes renderiza contexto útil sin placeholders vacíos', async () => {
  const base = createAgronautasMockService()
  const seededService: AgronautasService = {
    ...base,
    async getField(fieldId) {
      return { ...(await base.getField(fieldId)), locality: 'Mercedes', externalFieldId: 'corrientes-demo-mercedes' }
    },
    async getWeatherTimeline(fieldId) {
      return {
        fieldId,
        items: [{ provider: 'open-meteo', observedAt: '2026-06-03T09:00:00.000Z', freshnessHours: 2, confidence: 0.82, staleCause: null, temperatureC: 26.4, rainfallMm7d: 63.5, humidityPct: 81 }],
      }
    },
    async askFieldChat(fieldId, input) {
      return {
        ...(await base.askFieldChat(fieldId, input)),
        answer: 'Mercedes mantiene contexto grounded con clima Open-Meteo persistido y riesgo explicable.',
      }
    },
  }

  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={seededService} />
    </QueryProvider>,
  )

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))
  await waitFor(() => {
    assert.ok(view.getByText('corrientes-demo-mercedes'))
    assert.ok(view.getByText('Mercedes'))
    assert.ok(view.getByText(/lluvia 7d 63.5mm/i))
  })

  fireEvent.change(view.getByLabelText('Pregunta'), { target: { value: 'Explicá el riesgo actual' } })
  fireEvent.click(view.getByRole('button', { name: 'Preguntar al chat' }))

  await waitFor(() => {
    assert.ok(view.getByText(/contexto grounded/i))
  })
})
