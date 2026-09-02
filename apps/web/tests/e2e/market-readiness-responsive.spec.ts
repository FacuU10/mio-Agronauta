import { expect, test } from '@playwright/test'

type DetailRoute = {
  name: string
  path: string
  indexName: string
  anchorName: string
  visibleEvidence: RegExp
}

const detailRoutes: DetailRoute[] = [
  {
    name: 'Agronautas field detail',
    path: '/demo/fields/field-demo-1',
    indexName: 'Índice del detalle del lote',
    anchorName: 'Procedencia',
    visibleEvidence: /Frescura y procedencia|Procedencia no disponible|Sin alertas activas|Sin timeline climático persistido/i,
  },
  {
    name: 'Iberá-Alerta municipality detail',
    path: '/municipalities/ituzaingo',
    indexName: 'Índice del tablero municipal',
    anchorName: 'Pronóstico INA',
    visibleEvidence: /Estado:|Frescura:|Sin datos verificables|Datos parciales|Observado|No disponible/i,
  },
]

for (const route of detailRoutes) {
  test(`${route.name} remains usable at the configured viewport`, async ({ page }, testInfo) => {
    const consoleEvents: Array<{ type: string; text: string }> = []
    const networkEvents: Array<{ kind: string; method?: string; status?: number; url: string; failure?: string }> = []

    page.on('console', (message) => consoleEvents.push({ type: message.type(), text: message.text() }))
    page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message }))
    page.on('response', (response) => networkEvents.push({ kind: 'response', status: response.status(), url: response.url() }))
    page.on('requestfailed', (request) => networkEvents.push({ kind: 'requestfailed', method: request.method(), url: request.url(), failure: request.failure()?.errorText ?? 'unknown' }))

    let screenshot: Buffer | undefined
    try {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      expect(response?.status(), `navigation response for ${route.path}`).toBe(200)

      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('navigation', { name: route.indexName })).toBeVisible()
      const evidenceContainer = route.indexName === 'Índice del tablero municipal'
        ? page.getByRole('region', { name: 'Resumen operativo municipal' })
        : page.getByRole('main')
      await expect(evidenceContainer).toContainText(route.visibleEvidence)

      const viewport = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
      }))
      expect(viewport.documentWidth, 'document must not overflow horizontally').toBeLessThanOrEqual(viewport.viewportWidth)
      expect(viewport.bodyWidth, 'body must not overflow horizontally').toBeLessThanOrEqual(viewport.viewportWidth)

      const sectionLink = page.getByRole('navigation', { name: route.indexName }).getByRole('link', { name: route.anchorName, exact: true })
      const href = await sectionLink.getAttribute('href')
      expect(href, `section link ${route.anchorName} must target an in-page anchor`).toMatch(/^#[\w-]+$/)
      const target = page.locator(href as string)
      await sectionLink.click()
      await target.focus()

      const focusLayout = await target.evaluate((element) => {
        const targetRect = element.getBoundingClientRect()
        const sticky = document.querySelector('[aria-label="Estado resumido municipal"]')
        const stickyRect = sticky?.getBoundingClientRect()
        return {
          targetTop: targetRect.top,
          stickyBottom: stickyRect?.bottom ?? 0,
          focused: document.activeElement === element,
        }
      })
      expect(focusLayout.focused, `focused section ${href} must retain focus`).toBe(true)
      expect(focusLayout.targetTop, `focused section ${href} must clear the sticky summary`).toBeGreaterThanOrEqual(focusLayout.stickyBottom)

      screenshot = await page.screenshot({ fullPage: true })
    } finally {
      if (screenshot) await testInfo.attach(`${route.name}-viewport`, { body: screenshot, contentType: 'image/png' })
      await testInfo.attach(`${route.name}-console`, { body: JSON.stringify(consoleEvents, null, 2), contentType: 'application/json' })
      await testInfo.attach(`${route.name}-network`, { body: JSON.stringify(networkEvents, null, 2), contentType: 'application/json' })
    }
  })
}
