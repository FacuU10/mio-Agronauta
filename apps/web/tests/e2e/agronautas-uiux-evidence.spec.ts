import { expect, test } from '@playwright/test'

import { createUiuxEvidence } from './helpers/evidence'

test('uiux-evidence records demo route, viewport, visible provenance, and freshness without claims', async ({ page }, testInfo) => {
  let consoleErrorCount = 0
  let apiRequestCount = 0
  page.on('pageerror', () => { consoleErrorCount += 1 })
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrorCount += 1
  })
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequestCount += 1
  })

  await page.goto('/demo?view=intelligence&fieldId=field-corrientes-lote-001')
  const intelligence = page.getByRole('region', { name: 'Inteligencia económica basada en evidencia' })
  await expect(intelligence).toBeVisible()
  await expect(intelligence).toContainText(/Fuente/i)
  await expect(intelligence).toContainText(/Frescura/i)
  const provenance = intelligence.getByText(/Fuente|Proveniencia/i)
  const freshness = intelligence.getByText(/Frescura/i)
  const provenanceVisible = await provenance.evaluateAll((elements) => elements.some((element) => element.getClientRects().length > 0))
  const freshnessVisible = await freshness.evaluateAll((elements) => elements.some((element) => element.getClientRects().length > 0))
  const screenshot = await page.screenshot()
  const evidence = createUiuxEvidence({
    route: new URL(page.url()).pathname,
    viewport: page.viewportSize() ?? { width: 0, height: 0 },
    mode: 'demo',
    provenance: provenanceVisible ? 'visible' : 'not-visible',
    freshness: freshnessVisible ? 'visible' : 'not-visible',
    blockers: [
      ...(provenanceVisible ? [] : ['provenance-not-visible' as const]),
      ...(freshnessVisible ? [] : ['freshness-not-visible' as const]),
    ],
    testId: 'uiux-evidence-demo-browser',
    screenshot: 'attached',
    consoleErrorCount,
    apiRequestCount,
  })

  await testInfo.attach('agronautas-uiux-evidence.json', {
    body: `${JSON.stringify(evidence, null, 2)}\n`,
    contentType: 'application/json',
  })
  await testInfo.attach('agronautas-uiux-screenshot.png', { body: screenshot, contentType: 'image/png' })

  await expect(page.getByText(/DEMO LOCAL · SIN PERSISTENCIA/i)).toBeVisible()
  expect(evidence.route).toBe('/demo')
  expect(evidence.viewport).toEqual(testInfo.project.use.viewport)
  expect(evidence.mode).toBe('demo')
  expect(evidence.provenance).toBe('visible')
  expect(evidence.freshness).toBe('visible')
  expect(evidence.blockers).toEqual([])
  expect(evidence.productionEvidence).toBe('N/A')
  expect(evidence.commitIdentity).toBe('not-supplied')
  expect(evidence.apiRequestCount).toBe(0)
  expect(evidence.consoleErrorCount).toBe(0)
})
