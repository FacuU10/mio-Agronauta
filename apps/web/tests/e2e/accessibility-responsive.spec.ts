import { expect, test } from '@playwright/test'

test.describe('demo accessibility and responsive behavior', () => {
  test('keeps keyboard navigation, touch targets, motion, and content usable', async ({ page }, testInfo) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (error) => consoleErrors.push(error.message))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/demo?view=fields')
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('[id="main-content"]')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1, name: 'Workspace Agronautas' })).toBeVisible()

    const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' })
    await page.keyboard.press('Tab')
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main#main-content')).toBeFocused()

    const navigation = page.getByRole('navigation', { name: 'Navegación de Agronautas' })
    await expect(navigation.getByRole('link', { name: 'Campos' })).toHaveAttribute('aria-current', 'page')
    await expect(navigation.getByRole('link', { name: 'Marketplace' })).toBeVisible()
    await expect(navigation.getByRole('link')).toHaveCount(13)

    await skipLink.focus()
    for (let index = 0; index < 14; index += 1) {
      await page.keyboard.press('Tab')
    }
    const lastNavigationLink = navigation.getByRole('link', { name: 'Marketplace' })
    await expect(lastNavigationLink).toBeFocused()

    const layout = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('main button, main input, main select')]
        .filter((control) => {
          const rect = control.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        })
        .map((control) => ({
          name: control.getAttribute('aria-label') || control.textContent?.trim() || control.getAttribute('name') || control.getAttribute('id'),
          height: control.getBoundingClientRect().height,
        }))
      const headerTargetHeights = [...document.querySelectorAll('header a[href]')]
        .map((link) => link.getBoundingClientRect().height)
      const firstAnimation = document.querySelector('.agronautas-canvas > *')
      const nav = document.querySelector('.responsive-nav')
      const lastLink = nav?.querySelector('a:last-child')
      const navBounds = nav?.getBoundingClientRect()
      const linkBounds = lastLink?.getBoundingClientRect()

      return {
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        controls,
        headerTargetHeights,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        animationDuration: firstAnimation ? getComputedStyle(firstAnimation).animationDuration : '0s',
        navigationCanScroll: nav ? nav.scrollWidth > nav.clientWidth : false,
        lastNavigationLinkVisible: Boolean(navBounds && linkBounds && linkBounds.left >= navBounds.left && linkBounds.right <= navBounds.right),
      }
    })

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.reducedMotion).toBe(true)
    expect(layout.scrollBehavior).toBe('auto')
    expect(Number.parseFloat(layout.animationDuration)).toBeLessThanOrEqual(0.001)
    expect(layout.controls.length).toBeGreaterThan(0)
    expect(layout.controls.filter((control) => control.height < 44)).toEqual([])
    expect(layout.headerTargetHeights.filter((height) => height < 44)).toEqual([])
    expect(layout.navigationCanScroll).toBe(layout.viewportWidth < 600)
    expect(layout.lastNavigationLinkVisible).toBe(true)
    expect(consoleErrors).toEqual([])

    await testInfo.attach('demo-accessibility-responsive-viewport.png', {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
  })
})
