import { expect, test } from '@playwright/test'
import { MarketReadinessPage, routeEvidenceLabel } from './market-readiness-page'

test.describe('Agronautas / Iberá-Alerta market readiness', () => {
  test.describe.configure({ mode: 'serial' })

  test('landing exposes an observable Risk Engine path and keyboard navigation', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const evidence = new MarketReadinessPage(page, testInfo)
    try {
      await evidence.goto('/')
      await evidence.assertCommonRouteContract()
      await expect(page.getByRole('heading', { level: 1, name: /REDUCCIÓN DE INCERTIDUMBRE/i })).toBeVisible()
      const riskLink = page.getByRole('link', { name: 'Ver Risk Engine', exact: true })
      await expect(riskLink).toHaveAttribute('href', '#risk-engine')
      await riskLink.focus()
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/#risk-engine$/)
      evidence.assertObservedApiStatuses()
    } finally {
      await evidence.attachEvidence('home')
    }
  })

  test('demo request exposes keyboard validation without claiming lead delivery', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const evidence = new MarketReadinessPage(page, testInfo)
    try {
      await evidence.goto('/probar-demo')
      await evidence.assertCommonRouteContract()
      await expect(page.getByRole('heading', { level: 1, name: /Probá una demo guiada/i })).toBeVisible()
      const name = page.getByLabel('Nombre')
      await name.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('alert').filter({ hasText: 'Revisá los campos marcados' })).toBeVisible()
      await expect(name).toBeFocused()
      expect(evidence.networkEvents.some((event) => event.url.includes('/api/agronautas/v1/contact/demo') && event.method === 'POST')).toBe(false)
      evidence.assertObservedApiStatuses()
    } finally {
      await evidence.attachEvidence('probar-demo')
    }
  })

  test('workspace distinguishes loaded, demo, unauthorized, and unavailable states', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const evidence = new MarketReadinessPage(page, testInfo)
    try {
      await evidence.goto('/demo')
      await evidence.assertCommonRouteContract()
      await expect(page.getByRole('heading', { level: 1, name: 'Workspace Agronautas' })).toBeVisible()
      const body = await page.locator('body').innerText()
      expect(body).toMatch(/Modo (demo|real)|Acceso Agronautas no autorizado|Backend Agronautas no disponible/i)
      if (/Modo demo/i.test(body)) {
        expect(body).toMatch(/Demo aislada: no representa identidad, rol ni tenancy de producción/i)
      }
      await evidence.assertApiResponse('/api/agronautas/v1/runtime', 'Agronautas runtime BFF')
      evidence.assertObservedApiStatuses()
    } finally {
      await evidence.attachEvidence('demo')
    }
  })

  test('field detail preserves evidence and explicit capability limits', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const evidence = new MarketReadinessPage(page, testInfo)
    try {
      await evidence.goto('/demo/fields/field-demo-1')
      await evidence.assertCommonRouteContract()
      await expect(page.getByRole('heading', { level: 1, name: 'Detalle del lote' })).toBeVisible()
      await expect(page.locator('body')).toContainText(/Frescura y procedencia|Procedencia no disponible|No se pudo cargar el lote|Geometría no disponible|Cargando detalle del lote/i)
      await evidence.assertApiResponse('/api/agronautas/v1/fields/field-demo-1', 'Agronautas field BFF')
      evidence.assertObservedApiStatuses()
    } finally {
      await evidence.attachEvidence('field-detail')
    }
  })

  test('municipality overview supports a truthful empty filter state', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const evidence = new MarketReadinessPage(page, testInfo)
    try {
      await evidence.goto('/municipalities')
      await evidence.assertCommonRouteContract()
      await expect(page.getByRole('heading', { level: 1, name: 'Centro de Monitoreo Hídrico Provincial' })).toBeVisible()
      const query = page.getByLabel('Filtrar localidades')
      await evidence.assertApiResponse('/api/hydrology/municipalities', 'Hydrology municipalities BFF')
      await expect(page.getByText(/\d+ localidades/)).toBeVisible()
      await query.fill('localidad-que-no-existe-en-la-fuente')
      await expect(page.getByText('No hay localidades que coincidan con estos filtros.')).toBeVisible()
      await query.fill('')
      await expect(page.locator('body')).toContainText(/Observado|Datos parciales|Sin datos verificables|No disponible|Degradado/i)
      evidence.assertObservedApiStatuses()
    } finally {
      await evidence.attachEvidence('municipalities')
    }
  })

  test('municipality detail keeps section navigation below the sticky status summary', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const evidence = new MarketReadinessPage(page, testInfo)
    try {
      await evidence.goto('/municipalities/ituzaingo')
      await evidence.assertCommonRouteContract()
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('body')).toContainText(/Estado:|Frescura:|Sin datos verificables|Datos parciales|Observado|No disponible/i)
      const index = page.getByRole('navigation', { name: 'Índice del tablero municipal' })
      const forecastLink = index.getByRole('link', { name: 'Pronóstico INA', exact: true })
      await forecastLink.click()
      const target = page.locator('#municipal-forecast')
      await target.focus()
      const focusLayout = await target.evaluate((element) => {
        const targetRect = element.getBoundingClientRect()
        const sticky = document.querySelector('[aria-label="Estado resumido municipal"]')
        return { targetTop: targetRect.top, stickyBottom: sticky?.getBoundingClientRect().bottom ?? 0, focused: document.activeElement === element }
      })
      expect(focusLayout.focused).toBe(true)
      expect(focusLayout.targetTop).toBeGreaterThanOrEqual(focusLayout.stickyBottom)
      await expect(page.locator('body')).toContainText(/No hay pronóstico INA disponible|Días 15–30/i)
      await evidence.assertApiResponse('/api/hydrology/municipalities/ituzaingo/dashboard', 'Hydrology municipality dashboard BFF')
      evidence.assertObservedApiStatuses()
    } finally {
      await evidence.attachEvidence('municipality-detail')
    }
  })

  test('ingest rejects or explicitly reports the real verification boundary', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const evidence = new MarketReadinessPage(page, testInfo)
    try {
      await evidence.goto('/municipalities/ingest')
      await evidence.assertCommonRouteContract()
      await expect(page.getByRole('heading', { level: 1, name: 'Ingesta hidrológica' })).toBeVisible()
      const token = page.getByLabel('Token de ingesta')
      const ingestError = page.locator('#hydrology-ingest-error')
      await token.fill('invalid-token')
      await page.keyboard.press('Enter')
      await expect.poll(async () => (await ingestError.count()) > 0 || (await page.getByText('Acceso verificado', { exact: true }).count()) > 0, { timeout: 15_000 }).toBe(true)
      await evidence.assertApiResponse('/api/hydrology/ingest/verify', 'Hydrology ingest verification BFF')
      if (await ingestError.count()) {
        await expect(ingestError).toContainText(/autorizar|ingesta|token|servicio/i)
        const retry = page.getByRole('button', { name: 'Reintentar verificación', exact: true })
        await expect(retry).toBeVisible()
        await expect(retry).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(token).toBeFocused()
      } else {
        await expect(page.getByText(/Acceso verificado para esta página/)).toBeVisible()
      }
      await expect(page.locator('body')).not.toContainText('invalid-token')
      evidence.assertObservedApiStatuses()
    } finally {
      await evidence.attachEvidence('ingest')
    }
  })
})

test.afterEach(async ({}, testInfo) => {
  testInfo.annotations.push({ type: 'evidence', description: `Attachments use the route label ${routeEvidenceLabel(testInfo.title)}` })
})
