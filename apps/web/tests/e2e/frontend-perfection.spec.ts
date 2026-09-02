import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'

import { MarketReadinessPage } from './market-readiness-page'

test.describe('Agronautas frontend perfection browser acceptance', () => {
  test.describe.configure({ mode: 'serial' })

  const routeCases = [
    {
      id: 'FRONTEND-PERFECTION-H-001',
      name: 'public landing',
      path: '/',
      mode: 'public',
      boundary: 'public contact boundary is not exercised by the route load',
      expectedApi: undefined,
      assertRoute: async (evidence: MarketReadinessPage) => {
        await expect(evidence.page.getByRole('heading', { level: 1, name: /REDUCCIÓN DE INCERTIDUMBRE/i })).toBeVisible()
        await expect(evidence.page.getByRole('link', { name: 'Ver Risk Engine', exact: true })).toHaveAttribute('href', '#risk-engine')
      },
    },
    {
      id: 'FRONTEND-PERFECTION-H-002',
      name: 'guided demo conversion',
      path: '/probar-demo',
      mode: 'public',
      boundary: 'contact mutation remains unrequested after keyboard validation',
      expectedApi: undefined,
      assertRoute: async (evidence: MarketReadinessPage) => {
        await expect(evidence.page.getByRole('heading', { level: 1, name: /Probá una demo guiada/i })).toBeVisible()
        const name = evidence.page.getByLabel('Nombre')
        await name.focus()
        await evidence.page.keyboard.press('Enter')
        await expect(evidence.page.getByRole('alert').filter({ hasText: 'Revisá los campos marcados' })).toBeVisible()
        await expect(name).toBeFocused()
        expect(evidence.networkEvents.some((event) => event.url.includes('/api/agronautas/v1/contact/demo') && event.method === 'POST')).toBe(false)
      },
    },
    {
      id: 'FRONTEND-PERFECTION-H-003',
      name: 'Agronautas workspace',
      path: '/demo',
      mode: 'demo-or-unavailable',
      boundary: 'Agronautas runtime BFF',
      expectedApi: '/api/agronautas/v1/runtime',
      assertRoute: async (evidence: MarketReadinessPage) => {
        await expect(evidence.page.getByRole('heading', { level: 1, name: 'Workspace Agronautas' })).toBeVisible()
        const body = await evidence.page.locator('body').innerText()
        expect(body).toMatch(/Modo (demo|real)|Acceso Agronautas no autorizado|Backend Agronautas no disponible/i)
        if (/Modo demo/i.test(body)) {
          expect(body).toMatch(/Demo aislada: no representa identidad, rol ni tenancy de producción/i)
        }
      },
    },
    {
      id: 'FRONTEND-PERFECTION-H-004',
      name: 'field detail',
      path: '/demo/fields/field-demo-1',
      mode: 'demo-or-unavailable',
      boundary: 'Agronautas field BFF',
      expectedApi: '/api/agronautas/v1/fields/field-demo-1',
      assertRoute: async (evidence: MarketReadinessPage) => {
        await expect(evidence.page.getByRole('heading', { level: 1, name: 'Detalle del lote' })).toBeVisible()
        await expect(evidence.page.locator('body')).toContainText(/Frescura y procedencia|Procedencia no disponible|No se pudo cargar el lote|Geometría no disponible|Cargando detalle del lote/i)
        await expect.poll(
          () => evidence.networkEvents.some((event) => isExpectedGeometryResponse(event)),
          { timeout: 10_000, message: 'H-004 must observe the declared geometry capability request' },
        ).toBe(true)
        const geometryResponses = evidence.networkEvents.filter((event) => isExpectedGeometryResponse(event))
        expect(geometryResponses).toHaveLength(1)
        expect(geometryResponses[0]?.status).toBe(404)
      },
    },
    {
      id: 'FRONTEND-PERFECTION-H-005',
      name: 'municipality overview',
      path: '/municipalities',
      mode: 'live-or-unavailable',
      boundary: 'Hydrology municipalities BFF',
      expectedApi: '/api/hydrology/municipalities',
      assertRoute: async (evidence: MarketReadinessPage) => {
        await expect(evidence.page.getByRole('heading', { level: 1, name: 'Centro de Monitoreo Hídrico Provincial' })).toBeVisible()
        await expect(evidence.page.getByLabel('Filtrar localidades')).toBeVisible()
        await expect(evidence.page.locator('body')).toContainText(/localidades|Datos parciales|Sin datos verificables|No disponible|Degradado/i)
      },
    },
    {
      id: 'FRONTEND-PERFECTION-H-006',
      name: 'Virasoro municipality detail',
      path: '/municipalities/virasoro',
      mode: 'live-or-unavailable',
      boundary: 'Hydrology municipality dashboard BFF',
      expectedApi: '/api/hydrology/municipalities/virasoro/dashboard',
      assertRoute: async (evidence: MarketReadinessPage) => {
        await expect(evidence.page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(evidence.page.getByRole('navigation', { name: 'Índice del tablero municipal' })).toBeVisible()
        await expect(evidence.page.locator('body')).toContainText(/Estado:|Frescura:|Sin datos verificables|Datos parciales|Observado|No disponible/i)
        const index = evidence.page.getByRole('navigation', { name: 'Índice del tablero municipal' })
        const forecastLink = index.getByRole('link', { name: 'Pronóstico INA', exact: true })
        await forecastLink.click()
        const target = evidence.page.locator('#municipal-forecast')
        await target.focus()
        const focusLayout = await target.evaluate((element) => {
          const targetRect = element.getBoundingClientRect()
          const sticky = document.querySelector('[aria-label="Estado resumido municipal"]')
          return {
            targetTop: targetRect.top,
            stickyBottom: sticky?.getBoundingClientRect().bottom ?? 0,
            focused: document.activeElement === element,
          }
        })
        expect(focusLayout.focused).toBe(true)
        expect(focusLayout.targetTop).toBeGreaterThanOrEqual(focusLayout.stickyBottom)
        await expect(evidence.page.locator('body')).toContainText(/No hay pronóstico INA disponible|Días 15–30/i)
      },
    },
    {
      id: 'FRONTEND-PERFECTION-H-007',
      name: 'hydrology ingest',
      path: '/municipalities/ingest',
      mode: 'auth-or-unavailable',
      boundary: 'Hydrology ingest verification BFF',
      expectedApi: '/api/hydrology/ingest/verify',
      assertRoute: async (evidence: MarketReadinessPage) => {
        await expect(evidence.page.getByRole('heading', { level: 1, name: 'Ingesta hidrológica' })).toBeVisible()
        const token = evidence.page.getByLabel('Token de ingesta')
        const ingestError = evidence.page.locator('#hydrology-ingest-error')
        await token.fill('invalid-token')
        await evidence.page.keyboard.press('Enter')
        await expect.poll(
          async () => (await ingestError.count()) > 0 || (await evidence.page.getByText('Acceso verificado', { exact: true }).count()) > 0,
          { timeout: 15_000 },
        ).toBe(true)
        if (await ingestError.count()) {
          await expect(ingestError).toContainText(/autorizar|ingesta|token|servicio/i)
          const retry = evidence.page.getByRole('button', { name: 'Reintentar verificación', exact: true })
          await expect(retry).toBeVisible()
          await expect(retry).toBeFocused()
          await evidence.page.keyboard.press('Enter')
          await expect(token).toBeFocused()
        } else {
          await expect(evidence.page.getByText(/Acceso verificado para esta página/)).toBeVisible()
        }
        await expect(evidence.page.locator('body')).not.toContainText('invalid-token')
      },
    },
  ] as const

  for (const routeCase of routeCases) {
    test(`${routeCase.id} ${routeCase.name} is truthful and usable`, async ({ page }, testInfo) => {
      test.setTimeout(60_000)
      const evidence = new MarketReadinessPage(page, testInfo)
      const hydrationWarnings: string[] = []
      const consoleErrors: string[] = []
      const consoleWarnings: string[] = []
      const allResponses: Array<{ method: string; status: number; url: string; resourceType: string }> = []

        if (routeCase.id === 'FRONTEND-PERFECTION-H-004' || routeCase.id === 'FRONTEND-PERFECTION-H-007') {
          page.on('response', (response) => {
            allResponses.push({
              method: response.request().method(),
            status: response.status(),
            url: response.url(),
            resourceType: response.request().resourceType(),
          })
        })
      }

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
        if (message.type() === 'warning') consoleWarnings.push(message.text())
        if (/hydration|did not match|server.*client|client.*server/i.test(message.text())) hydrationWarnings.push(message.text())
      })

      let screenshot: Buffer | undefined
      try {
        await evidence.goto(routeCase.path)
        await evidence.assertCommonRouteContract()
        await expect(page.locator('html')).toHaveAttribute('lang', /^es(?:-|$)/i)
        await expect(page).toHaveTitle(/.+/)
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)

        const skipLink = page.getByRole('link', { name: /Saltar al contenido/i })
        await expect(skipLink).toHaveCount(1)
        await skipLink.focus()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(/#main-content$/)

        await routeCase.assertRoute(evidence)
        if (routeCase.expectedApi) await evidence.assertApiResponse(routeCase.expectedApi, routeCase.boundary)
        evidence.assertObservedApiStatuses()

        const expectedConsoleErrors = routeCase.id === 'FRONTEND-PERFECTION-H-004'
          ? ['Failed to load resource: the server responded with a status of 404 (Not Found)']
          : routeCase.id === 'FRONTEND-PERFECTION-H-007'
            ? ['Failed to load resource: the server responded with a status of 401 (Unauthorized)']
            : []
        expect(consoleErrors, 'only the declared route-boundary console message may be present').toEqual(expectedConsoleErrors)
        if (routeCase.id === 'FRONTEND-PERFECTION-H-004') {
          const additional404s = allResponses.filter((response) => response.status === 404 && !isExpectedGeometryResponse(response))
          expect(additional404s, 'only the declared H-004 geometry response may return 404').toEqual([])
        }
        if (routeCase.id === 'FRONTEND-PERFECTION-H-007') {
          const verificationResponses = allResponses.filter((response) => isExpectedIngestVerificationResponse(response))
          expect(verificationResponses, 'H-007 must observe exactly one ingest verification request').toHaveLength(1)
          expect(verificationResponses[0]?.status, 'H-007 ingest verification must return HTTP 401').toBe(401)
          const additionalBoundaryResponses = allResponses.filter((response) => {
            const isBoundaryStatus = response.status === 401 || response.status === 404 || response.status >= 500
            return isBoundaryStatus && !isExpectedIngestVerificationResponse(response)
          })
          expect(additionalBoundaryResponses, 'H-007 must not emit additional 401, 404, or 5xx responses').toEqual([])
        }
        expect(evidence.pageErrors, 'page errors must be empty').toEqual([])
        expect(hydrationWarnings, 'hydration warnings must be empty').toEqual([])
        screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' })
      } finally {
        if (routeCase.path === '/municipalities/ingest') {
          const token = page.getByLabel('Token de ingesta')
          if (await token.count()) await token.fill('')
        }
        if (screenshot) {
          await testInfo.attach(`${routeCase.id}-${testInfo.project.name}-screenshot`, { body: screenshot, contentType: 'image/png' })
        }
        await testInfo.attach(`${routeCase.id}-${testInfo.project.name}-local-evidence`, {
          body: JSON.stringify({
            testId: routeCase.id,
            route: routeCase.path,
            viewport: testInfo.project.use.viewport,
            environment: 'local managed harness',
            baseUrl: testInfo.project.use.baseURL,
            commit: gitIdentity(),
            dataMode: routeCase.mode,
            expectedBoundary: routeCase.boundary,
            expectedApi: routeCase.expectedApi ?? 'none until an explicit user mutation',
            screenshot: screenshot ? `${routeCase.id}-${testInfo.project.name}-screenshot` : 'not captured because the route did not reach its expected outcome',
            console: { errors: consoleErrors, warnings: consoleWarnings },
            pageErrors: evidence.pageErrors,
            hydrationWarnings,
            network: evidence.networkEvents,
            production: { status: 'blocked/unknown', reason: 'No approved production origin or provider capability was supplied for this run.' },
          }, null, 2),
          contentType: 'application/json',
        })
      }
    })
  }
})

function gitIdentity(): { root: string; branch: string; commit: string; status: string } {
  const git = (args: string[]) => execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trim()
  return {
    root: git(['rev-parse', '--show-toplevel']),
    branch: git(['branch', '--show-current']),
    commit: git(['rev-parse', 'HEAD']),
    status: git(['status', '--short', '--branch']),
  }
}

function isExpectedGeometryResponse(event: { method: string; status?: number; url: string }): boolean {
  const url = new URL(event.url)
  return event.method === 'GET'
    && url.pathname === '/api/agronautas/v1/fields/field-demo-1/geometry'
    && url.search === '?mode=demo'
}

function isExpectedIngestVerificationResponse(event: { method: string; status?: number; url: string }): boolean {
  const url = new URL(event.url)
  return event.method === 'POST'
    && url.pathname === '/api/hydrology/ingest/verify'
}
