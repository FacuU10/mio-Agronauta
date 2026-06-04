import { expect, test } from '@playwright/test'

test('landing matches source anchors and routes the single CTA to /demo', async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1200 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'REDUCCIÓN DE INCERTIDUMBRE', exact: true })).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('heading', { name: /agronautas risk engine/i })).toBeVisible()

  await expect(page.getByText(/organización o rol/i)).toHaveCount(0)
  await expect(page.getByText(/solicitar contacto/i)).toHaveCount(0)

  const demoLinks = page.locator('a[href="/demo"]')
  await expect(demoLinks).toHaveCount(1)
  await expect(demoLinks.first()).toHaveText('Demo')

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: /abrir menú/i }).click()
  await expect(page.getByRole('link', { name: 'Risk Engine' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Soluciones' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Data' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Insurtech' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Roadmap' })).toBeVisible()
  await page.getByRole('button', { name: /cerrar menú/i }).click()

  const indicators = page.locator('button[aria-label^="Ir a slide"]')
  await expect(indicators).toHaveCount(3)
  await page.getByRole('button', { name: /siguiente slide/i }).click()
  await expect(indicators.nth(1)).toHaveClass(/bg-emerald-500/)
  await page.getByRole('button', { name: /slide anterior/i }).click()
  await expect(indicators.nth(0)).toHaveClass(/bg-emerald-500/)

  await page.setViewportSize({ width: 1700, height: 1200 })
  await demoLinks.first().click()
  await expect(page).toHaveURL(/\/demo$/)
})
