import { expect, test } from '@playwright/test'

test('operator must verify before submitting one sanitized same-origin hydrology ingest request', async ({ page }) => {
  const token = crypto.randomUUID()
  const verificationRequests = []
  const ingestRequests = []

  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/hydrology/ingest/verify') verificationRequests.push(request)
    if (new URL(request.url()).pathname === '/api/hydrology/ingest') ingestRequests.push(request)
  })

  await page.route('**/api/hydrology/ingest/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify({ contractVersion: '1.0.0', authorized: true }),
    })
  })

  await page.route('**/api/hydrology/ingest', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'partial',
        runId: 'browser-run-safe',
        requestedSources: ['PNA', 'SMN'],
        results: [
          { source: 'PNA', status: 'success', recordsIngested: 2 },
          { source: 'SMN', status: 'failed', recordsIngested: 0, errorMessage: 'private diagnostic', diagnostic: 'private network detail', tokenEcho: token },
        ],
      }),
    })
  })

  await page.goto('/municipalities/ingest')
  const input = page.getByLabel('Token de ingesta')
  await expect(input).toHaveAttribute('type', 'password')
  await expect(page.getByRole('button', { name: 'Iniciar ingesta' })).toBeHidden()
  await input.fill(token)
  await page.getByRole('button', { name: 'Verificar acceso' }).press('Enter')
  await expect(page.getByRole('button', { name: 'Iniciar ingesta' })).toBeVisible()
  await page.getByRole('button', { name: 'Iniciar ingesta' }).click()

  await expect(page.getByRole('status')).toHaveText('Ingesta parcial')
  await expect(page.getByRole('region', { name: 'Diagnósticos de ingesta' })).toContainText('degraded')
  await expect(page.getByRole('region', { name: 'Diagnósticos de ingesta' })).toContainText('partial')
  await expect(page.getByText('PNA').first()).toBeVisible()
  await expect(page.getByText('SMN').first()).toBeVisible()
  await expect(page.locator('body')).not.toContainText('private diagnostic')
  await expect(page.locator('body')).not.toContainText('private network detail')
  await expect(page.locator('body')).not.toContainText(token)
  await expect(page.getByRole('button', { name: 'Verificar acceso' })).toBeVisible()
  expect(page.url()).not.toContain(token)

  expect(verificationRequests).toHaveLength(1)
  expect(verificationRequests[0].method()).toBe('POST')
  expect(verificationRequests[0].postData() || '').not.toContain(token)
  expect(verificationRequests[0].headers()['x-hydrology-ingest-token']).toBe(token)
  expect(ingestRequests).toHaveLength(1)
  expect(ingestRequests[0].method()).toBe('POST')
  expect(new URL(ingestRequests[0].url()).origin).toBe(new URL(page.url()).origin)
  expect(ingestRequests[0].headers()['x-hydrology-ingest-token']).toBe(token)
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 })

  await page.reload()
  await expect(page.getByRole('button', { name: 'Iniciar ingesta' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Verificar acceso' })).toBeVisible()
})
