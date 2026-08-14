import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { QueryProvider } from '@/lib/query-client'
import { AgronautasPageClient } from './page-client'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { useAgronautasStore } from '@/store/agronautas-store'

const workspaceField = {
  fieldId: 'field-workspace-001',
  externalFieldId: 'corrientes-workspace-001',
  crop: 'rice',
  hectares: 24,
  locality: 'Mercedes',
  provinceCode: 'AR-W',
  centroid: { lat: -29.2, lng: -58.1 },
  geometryStatus: 'point_only' as const,
  geometrySource: 'fallback' as const,
  geometryUpdatedAt: null,
  createdAt: '2026-08-13T10:00:00.000Z',
  updatedAt: '2026-08-13T10:00:00.000Z',
  sourceRunIds: [],
}

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

test('Agronautas field index consumes workspace pagination instead of the legacy global list', async () => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()
  const base = createAgronautasMockService()
  let legacyListCalled = false
  let workspaceListCalled = 0
  const view = render(<QueryProvider><AgronautasPageClient service={{
    ...base,
    async listFields() {
      legacyListCalled = true
      throw new Error('legacy global field list must not be used')
    },
    async listWorkspaceFields(workspaceId, cursor) {
      workspaceListCalled += 1
      return {
        contractVersion: 'agronautas-workspace-fields-v1' as const,
        workspaceId,
        items: cursor ? [{ ...workspaceField, fieldId: 'field-workspace-002', externalFieldId: 'corrientes-workspace-002' }] : [workspaceField],
        nextCursor: cursor ? null : '2026-08-13T10:00:00.000Z',
      }
    },
    async getWorkspace() {
      return {
        contractVersion: 'agronautas-management-v1' as const,
        workspaceId: 'agronautas-default-workspace',
        name: 'Agronautas',
        status: 'active' as const,
        fieldCount: 2,
        createdAt: '2026-08-13T10:00:00.000Z',
        updatedAt: '2026-08-13T10:00:00.000Z',
      }
    },
  }} /></QueryProvider>)

  await waitFor(() => {
    assert.ok(view.getByText('corrientes-workspace-001'))
    assert.equal(legacyListCalled, false)
    assert.equal(workspaceListCalled, 1)
    assert.ok(view.getByRole('button', { name: /Cargar más lotes/i }))
  })

  fireEvent.click(view.getByRole('button', { name: /Cargar más lotes/i }))
  await waitFor(() => {
    assert.ok(view.getByText('corrientes-workspace-002'))
    assert.equal(workspaceListCalled, 2)
  })
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

test('Agronautas hydrology thresholds stay unavailable without a canonical threshold contract', async () => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()

  const view = render(<QueryProvider><AgronautasPageClient service={createAgronautasMockService()} /></QueryProvider>)
  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    const panel = view.getByTestId('agronautas-hydrology-panel')
    const text = panel.textContent ?? ''
    assert.match(text, /Umbral de alerta/)
    assert.match(text, /Umbral de evacuación/)
    assert.match(text, /No disponible/)
    assert.match(text, /contrato hidrológico actual no informa umbrales/i)
    assert.doesNotMatch(text, /3,50\s*m|4,20\s*m|5,60\s*m|6,20\s*m|Lluvia 70\s*mm\/24h|Corte de acceso/i)
  })
})

test('Agronautas does not substitute another zone threshold when the backend contract omits it', async () => {
  setupDom()
  cleanup()
  useAgronautasStore.getState().reset()
  const base = createAgronautasMockService()
  const view = render(<QueryProvider><AgronautasPageClient service={{
    ...base,
    async getHydrologyDashboard(fieldId) {
      const dashboard = await base.getHydrologyDashboard(fieldId)
      return { ...dashboard, zone: 'Ituzaingó' }
    },
  }} /></QueryProvider>)
  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    const panel = view.getByTestId('agronautas-hydrology-panel')
    const text = panel.textContent ?? ''
    assert.match(text, /Tarjeta hidrológica Ituzaingó/)
    assert.match(text, /Umbral de evacuaciónNo disponible/)
    assert.doesNotMatch(text, /3,50\s*m|4,20\s*m|4\.5\s*m|5\s*m/i)
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
