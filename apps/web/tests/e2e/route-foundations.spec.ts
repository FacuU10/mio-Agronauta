import { expect, test } from '@playwright/test'

test.describe('route foundations', () => {
  test('marketplace deep link preserves route identity and active navigation', async ({ page }) => {
    await page.goto('/agronautas/marketplace')

    await expect(page).toHaveTitle(/Marketplace Agronautas/)
    await expect(page.locator('main#main-content')).toHaveCount(1)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Marketplace Agronautas' })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Marketplace', exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toHaveAttribute(
      'href',
      '#main-content'
    )
  })
})
