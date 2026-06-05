import { expect, test } from '@playwright/test'

test('landing matches source anchors and routes demo CTAs to /probar-demo while /demo stays direct', async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1200 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: 'REDUCCIÓN DE INCERTIDUMBRE', exact: true })).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('heading', { name: /agronautas risk engine/i })).toBeVisible()

  const brandedImages = page.locator('img[src*="/_next/image"]')
  await expect(brandedImages.first()).toBeVisible()
  await expect(page.getByAltText('Agronautas').first()).toBeVisible()
  expect(await brandedImages.count()).toBeGreaterThanOrEqual(4)

  const imageReadiness = await brandedImages.evaluateAll((images) =>
    images.slice(0, 3).every((image) => image.complete && image.naturalWidth > 0)
  )
  expect(imageReadiness).toBe(true)

  await expect(page.getByText(/organización o rol/i)).toHaveCount(0)
  await expect(page.getByText(/solicitar contacto/i)).toHaveCount(0)

  const desktopDemoLinks = page.getByRole('link', { name: /probar demo|agendar demo/i })
  await expect(desktopDemoLinks).toHaveCount(3)
  await expect(page.getByRole('link', { name: /probar demo/i }).first()).toBeVisible()

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: /abrir menú/i }).click()
  await expect(page.getByRole('link', { name: 'Risk Engine' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Soluciones' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Data' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Insurtech' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Roadmap' })).toBeVisible()
  await expect(page.getByRole('link', { name: /probar demo/i }).last()).toBeVisible()
  await page.getByRole('button', { name: /cerrar menú/i }).click()

  const indicators = page.locator('button[aria-label^="Ir a slide"]')
  await expect(indicators).toHaveCount(3)
  await page.getByRole('button', { name: /siguiente slide/i }).click()
  await expect(indicators.nth(1)).toHaveClass(/bg-emerald-500/)
  await page.getByRole('button', { name: /slide anterior/i }).click()
  await expect(indicators.nth(0)).toHaveClass(/bg-emerald-500/)

  await page.setViewportSize({ width: 1700, height: 1200 })
  await page.getByRole('link', { name: /probar demo/i }).first().click()
  await expect(page).toHaveURL(/\/probar-demo$/)

  await page.goto('/demo')
  await expect(page).toHaveURL(/\/demo$/)
})
