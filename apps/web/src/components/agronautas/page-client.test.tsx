import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react/pure'
import { QueryProvider } from '@/lib/query-client'
import { AgronautasPageClient } from './page-client'
import { createAgronautasMockService, type AgronautasService } from '@/lib/agronautas/service'
import { ApiError } from '@/lib/api-client'
import { fieldOverviewSchema } from '@/lib/agronautas/schemas'
import { useAgronautasStore } from '@/store/agronautas-store'

const activeDoms: Array<InstanceType<typeof JSDOM>> = []
const globalNames = ['window', 'document', 'HTMLElement', 'HTMLFormElement', 'HTMLButtonElement', 'FormData', 'Event', 'navigator'] as const
const originalGlobals = new Map(globalNames.map((name) => [name, (globalThis as unknown as Record<string, unknown>)[name]]))

function setGlobal(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
}

test('apiClient usa BFF versionado por defecto', async () => {
  const capturedUrls: string[] = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    capturedUrls.push(String(input))
    return new Response(JSON.stringify({
      mode: 'demo',
      routePrefix: '/agronautas',
      compatibilityPrefix: '/agronautas/v1',
      contractVersion: '1.0.0',
      scheduler: { enabled: false, status: 'disabled' },
      worker: { status: 'unavailable', reason: 'worker_not_configured' },
    }), {
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
  activeDoms.push(dom)
  setGlobal('window', dom.window)
  setGlobal('document', dom.window.document)
  setGlobal('HTMLElement', dom.window.HTMLElement)
  setGlobal('HTMLFormElement', dom.window.HTMLFormElement)
  setGlobal('HTMLButtonElement', dom.window.HTMLButtonElement)
  setGlobal('FormData', dom.window.FormData)
  setGlobal('Event', dom.window.Event)
  setGlobal('navigator', dom.window.navigator)
}

beforeEach(() => {
  setupDom()
  useAgronautasStore.getState().reset()
})

afterEach(async () => {
  cleanup()
  for (const dom of activeDoms.splice(0)) dom.window.close()
  await new Promise<void>((resolve) => setImmediate(resolve))
  for (const name of globalNames) setGlobal(name, originalGlobals.get(name))
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

test('401 de runtime ofrece una entrada de demo explícita y no muestra workspace cargado', async () => {
  const base = createAgronautasMockService()
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={{ ...base, async getRuntime() { throw new ApiError(401, 'Missing or invalid bearer token') } }} />
    </QueryProvider>,
  )

  await waitFor(() => {
    assert.ok(view.getByRole('heading', { name: /Acceso Agronautas no autorizado/i }))
    assert.ok(view.getByRole('link', { name: /Solicitar entrada al demo/i }))
    assert.equal(view.getAllByRole('main').length, 1)
    assert.equal(view.container.querySelector('main > main'), null)
    assert.equal(view.queryByRole('button', { name: 'Registrar lote' }), null)
  })
})

test('403 de runtime muestra acceso restringido sin ofrecer una falsa ruta de autenticación', async () => {
  const base = createAgronautasMockService()
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={{ ...base, async getRuntime() { throw new ApiError(403, 'Workspace forbidden') } }} />
    </QueryProvider>,
  )

  await waitFor(() => {
    assert.ok(view.getByRole('heading', { name: /Acceso Agronautas restringido/i }))
    assert.equal(view.queryByRole('link', { name: /Solicitar entrada al demo/i }), null)
    assert.equal(view.queryByRole('button', { name: 'Registrar lote' }), null)
    assert.match(view.getByRole('alert', { name: /Acceso Agronautas restringido/i }).textContent ?? '', /403|restringido/i)
  })
})

test('runtime backend unavailable se distingue del acceso no autorizado', async () => {
  const base = createAgronautasMockService()
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={{ ...base, async getRuntime() { throw new ApiError(503, 'Runtime unavailable') } }} />
    </QueryProvider>,
  )

  await waitFor(() => {
    assert.ok(view.getByRole('heading', { name: /Backend Agronautas no disponible/i }))
    assert.ok(view.getByRole('button', { name: /Reintentar conexión/i }))
    assert.equal(view.queryByRole('heading', { name: /Acceso Agronautas no autorizado/i }), null)
  })
})

test('modo demo está rotulado como aislado y no como tenancy de producción', async () => {
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={createAgronautasMockService()} />
    </QueryProvider>,
  )

  await waitFor(() => {
    assert.ok(view.getByText(/Demo aislada/i))
    assert.ok(view.getByText(/no representa identidad, rol ni tenancy de producción/i))
  })
})

test('404 de capacidades muestra estados no disponibles y conserva evidencia disponible', async () => {
  const base = createAgronautasMockService()
  const unavailable = (name: string) => async () => { throw new ApiError(404, `${name} capability unavailable`) }
  const service: AgronautasService = {
    ...base,
    getFieldGeometry: unavailable('geometry'),
    getFieldActivity: unavailable('activity'),
    getFieldIntelligence: unavailable('intelligence'),
    getHydrologyDashboard: unavailable('hydrology'),
  }
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={service} />
    </QueryProvider>,
  )

  fireEvent.click(view.getByRole('button', { name: 'Registrar lote' }))

  await waitFor(() => {
    assert.ok(view.getByText(/Geometría no disponible/i))
    assert.ok(view.getByText(/Actividad no disponible/i))
    assert.ok(view.getByText(/Inteligencia no disponible/i))
    assert.ok(view.getByText(/Hidrología no disponible/i))
    assert.ok(view.getByText('Drivers y evidencia'))
    assert.ok(view.getByText('Carga de lluvia'))
    assert.ok(view.getByText(/Frescura degradada/i))
    assert.doesNotMatch(view.getByTestId('agronautas-hydrology-panel').textContent ?? '', /5\.42\s*m|Pronóstico INA/i)
  }, { timeout: 5000 })
})

test('el shell Agronautas expone un destino de contenido sin sumar otro main', async () => {
  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={createAgronautasMockService()} />
    </QueryProvider>,
  )

  await waitFor(() => {
    assert.ok(view.getByTestId('agronautas-main-content'))
    assert.equal(view.getAllByRole('main').length, 1)
    assert.equal(view.container.querySelector('main > main'), null)
  })
  await new Promise<void>((resolve) => setImmediate(resolve))
})
