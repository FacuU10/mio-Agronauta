import { expect, test } from '@playwright/test'

test.describe('deterministic browser demo fixtures', () => {
  test('reloads the same fixture without sending API writes', async ({ page }) => {
    const apiRequests: string[] = []
    page.on('request', (request) => {
      if (/\/api\//.test(request.url())) apiRequests.push(`${request.method()} ${request.url()}`)
    })

    await page.goto('/demo?view=fields')
    await expect(page.getByText('corrientes-lote-001', { exact: true })).toBeVisible()
    await expect(page.getByText(/Mercedes · rice · 42\.5 ha/)).toBeVisible()
    await expect(page.getByText(/DEMO LOCAL · SIN PERSISTENCIA/i)).toBeVisible()
    const fixtureBeforeReload = await page.locator('main#main-content').innerText()

    await page.reload()

    await expect(page.getByText('corrientes-lote-001', { exact: true })).toBeVisible()
    await expect(page.getByText(/DEMO LOCAL · SIN PERSISTENCIA/i)).toBeVisible()
    expect(await page.locator('main#main-content').innerText()).toBe(fixtureBeforeReload)
    expect(apiRequests).toEqual([])
  })

  test('keeps demo mutations in memory and discards them on reload', async ({ page }) => {
    const apiRequests: string[] = []
    page.on('request', (request) => {
      if (/\/api\//.test(request.url())) apiRequests.push(`${request.method()} ${request.url()}`)
    })

    await page.goto('/demo?view=management')
    await page.getByRole('button', { name: 'Abrir detalle' }).click()
    await page.getByLabel('Nombre de operación').fill('Tarea efímera de demostración')
    await page.getByRole('button', { name: 'Crear operación' }).click()
    await expect(page.getByText('Tarea efímera de demostración', { exact: true })).toBeVisible()

    await page.reload()

    await expect(page.getByText('No hay campañas, operaciones o tareas persistidas.')).toBeVisible()
    await expect(page.getByText('Tarea efímera de demostración')).toHaveCount(0)
    expect(apiRequests).toEqual([])
  })
})
