import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { QueryProvider } from '@/lib/query-client'
import { AgronautasPageClient } from './page-client'
import { createAgronautasMockService, type AgronautasService } from '@/lib/agronautas/service'
import { fieldOverviewSchema } from '@/lib/agronautas/schemas'
import { useAgronautasStore } from '@/store/agronautas-store'

test('apiClient usa BFF versionado por defecto', async () => {
  const capturedUrls: string[] = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    capturedUrls.push(String(input))
    return new Response(JSON.stringify({ mode: 'demo', routePrefix: '/agronautas', compatibilityPrefix: '/agronautas/v1', contractVersion: '1.0.0' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  const { createAgronautasApiService } = await import('@/lib/agronautas/service')
  await createAgronautasApiService().getRuntime()
  assert.equal(capturedUrls[0], '/api/agronautas/v1/runtime')

  globalThis.fetch = previousFetch
})

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
    const evidenceStates = view.getByRole('region', { name: 'Estados de evidencia Agronautas' })
    assert.match(evidenceStates.textContent ?? '', /observed/i)
    assert.match(evidenceStates.textContent ?? '', /forecast/i)
    assert.match(evidenceStates.textContent ?? '', /stale/i)
    assert.match(evidenceStates.textContent ?? '', /mock\/seam/i)
    assert.match(evidenceStates.textContent ?? '', /missing/i)
  })
})

test('dashboard Agronautas renderiza fuentes, frescura, evidencia y acción PDF desde payload persistido', async () => {
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={createAgronautasMockService()} />
    </QueryProvider>,
  )

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    assert.ok(view.getByRole('heading', { level: 1, name: /Agronautas/i }))
    const dashboardText = view.getByTestId('agronautas-persisted-payload-card').textContent ?? ''
    assert.match(document.body.textContent ?? '', /campo argentino/i)
    assert.match(dashboardText, /Frescura degradada/i)
    assert.match(dashboardText, /open-meteo/i)
    assert.match(dashboardText, /satellite_data_stale/i)
    assert.match(dashboardText, /Último dato obtenido/i)
    assert.match(dashboardText, /Fuentes degradadas o no disponibles/i)
    assert.match(dashboardText, /Los indicadores son soporte operativo y no reemplazan criterio agronómico local/i)
    assert.match(dashboardText, /Confianza media/i)
    assert.ok(view.getByRole('link', { name: /Exportar PDF/i }))
  })
  assert.equal(view.queryByText(/Iberá-Alerta/i), null)
})

test('panel admin de ingestión y frescura muestra modos, próxima corrida y alertas no-producción', async () => {
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={createAgronautasMockService()} />
    </QueryProvider>,
  )

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    const adminText = view.getByTestId('agronautas-ingestion-admin-panel').textContent ?? ''
    assert.match(adminText, /Panel de ingestión/i)
    assert.match(adminText, /open-meteo/i)
    assert.match(adminText, /Mock/i)
    assert.match(adminText, /Próxima corrida 03\/06\/2026, 01:00/i)
    assert.match(adminText, /Trigger seguro deshabilitado/i)

    const freshnessText = view.getByTestId('agronautas-source-freshness-panel').textContent ?? ''
    assert.match(freshnessText, /Clima/i)
    assert.match(freshnessText, /Suelo/i)
    assert.match(freshnessText, /Satélite/i)
    assert.match(freshnessText, /stale/i)
    assert.match(freshnessText, /unavailable/i)

    const alertText = view.getByTestId('agronautas-operational-alerts-panel').textContent ?? ''
    assert.match(alertText, /Anegamiento/i)
    assert.match(alertText, /Estrés/i)
    assert.match(alertText, /Heladas/i)
    assert.match(alertText, /no producción/i)
  })
})

test('alta guiada envía FieldIntake v2 con categoría, provincia y país', async () => {
  const submitted: unknown[] = []
  const base = createAgronautasMockService()
  const service: AgronautasService = {
    ...base,
    async createFieldIntake(input) {
      submitted.push(input)
      return base.createFieldIntake(input)
    },
  }

  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={service} />
    </QueryProvider>,
  )

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    assert.deepEqual(submitted[0], {
      contractVersion: '1.0.0',
      fieldId: 'corrientes-lote-001',
      cropCategory: 'cereal',
      crop: 'rice',
      provinceCode: 'AR-W',
      countryCode: 'AR',
      hectares: 42.5,
      locality: 'Mercedes',
      growthStage: 'tillering',
      location: { lat: -29.1846, lng: -58.0759 },
    })
  })
})

test('field overview acepta cultivos no-arroz dentro del alcance Corrientes', () => {
  const overview = fieldOverviewSchema.parse({
    fieldId: 'corrientes-maiz-001',
    externalFieldId: 'ext-maiz-001',
    crop: 'maize',
    hectares: 25,
    locality: 'Mercedes',
    provinceCode: 'AR-W',
    centroid: { lat: -29.18, lng: -58.08 },
  })

  assert.equal(overview.crop, 'maize')
})

test('rechazo fuera de alcance expone error explícito', async () => {
  const base = createAgronautasMockService()
  const submitted: unknown[] = []
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={{ ...base, async createFieldIntake(input) { submitted.push(input); return base.createFieldIntake(input) } }} />
    </QueryProvider>,
  )

  fireEvent.change(view.getByLabelText('Latitud'), { target: { value: '-34.6037' } })
  fireEvent.change(view.getByLabelText('Longitud'), { target: { value: '-58.3816' } })
  assert.equal((view.getByLabelText('Latitud') as HTMLInputElement).value, '-34.6037')
  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    assert.deepEqual((submitted[0] as { location: unknown }).location, { lat: -34.6037, lng: -58.3816 })
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
    assert.ok(view.getAllByText(/Último dato obtenido:/i).length >= 1)
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
    assert.ok(view.getAllByText('Degradado').length >= 1)
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
