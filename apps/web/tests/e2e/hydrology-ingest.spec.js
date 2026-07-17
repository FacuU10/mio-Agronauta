import { expect, test } from '@playwright/test'

test('operator can submit one sanitized same-origin hydrology ingest request without persisting the token', async ({ page }) => {
  const token = crypto.randomUUID()
  const ingestRequests = []

  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/hydrology/ingest') ingestRequests.push(request)
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
  await input.fill(token)
  await page.getByRole('button', { name: 'Iniciar ingesta' }).press('Enter')

  await expect(page.getByRole('status')).toHaveText('Ingesta parcial')
  await expect(page.getByText('PNA').first()).toBeVisible()
  await expect(page.getByText('SMN').first()).toBeVisible()
  await expect(page.locator('body')).not.toContainText('private diagnostic')
  await expect(page.locator('body')).not.toContainText('private network detail')
  await expect(page.locator('body')).not.toContainText(token)
  await expect(input).toHaveValue('')
  expect(page.url()).not.toContain(token)

  expect(ingestRequests).toHaveLength(1)
  expect(ingestRequests[0].method()).toBe('POST')
  expect(new URL(ingestRequests[0].url()).origin).toBe(new URL(page.url()).origin)
  expect(ingestRequests[0].headers()['x-hydrology-ingest-token']).toBe(token)
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 })
})
