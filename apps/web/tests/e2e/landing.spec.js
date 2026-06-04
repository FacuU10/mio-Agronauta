import { expect, test } from '@playwright/test'

test('landing publica CTA exacta y navega a la demo', async ({ page }) => {
  await page.route('**/api/agronautas/**/runtime', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mode: 'real', routePrefix: '/agronautas', compatibilityPrefix: '/agronautas/v1', contractVersion: '1.0.0' }),
    })
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: /reduce la incertidumbre productiva/i })).toBeVisible()

  const cta = page.getByRole('link', { name: 'prueba la version demo' }).first()
  await expect(cta).toBeVisible()
  await expect(cta).toHaveAttribute('href', '/demo')

  await cta.click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByTestId('agronautas-submit-intake')).toBeVisible()
})
