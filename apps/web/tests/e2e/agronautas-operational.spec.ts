import { expect, test } from '@playwright/test'

test.describe('Agronautas operational workspace', () => {
  test('preserves field context across workspace deep links', async ({ page }) => {
    await page.goto('/demo?view=fields&fieldId=field-corrientes-lote-001')

    await expect(page.getByRole('heading', { level: 1, name: 'Workspace Agronautas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Abrir detalle' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Selección autorizada/)).toContainText('field-corrientes-lote-001')

    for (const [label, view] of [
      ['Campos', 'fields'],
      ['Actividad', 'activity'],
      ['Geometría', 'geometry'],
      ['Gestión', 'management'],
      ['Planificación', 'planning'],
      ['Evidencia', 'evidence'],
      ['Inteligencia', 'intelligence'],
      ['Copilot', 'copilot'],
    ] as const) {
      await expect(page.getByRole('link', { name: label })).toHaveAttribute('href', `/demo?view=${view}&fieldId=field-corrientes-lote-001`)
    }

    await page.getByRole('link', { name: 'Actividad' }).click()
    await expect(page).toHaveURL(/\/demo\?view=activity&fieldId=field-corrientes-lote-001/)
    await expect(page.getByText('Actividad derivada de fuentes')).toBeVisible()
    await expect(page.getByText(/Selección autorizada/)).toContainText('field-corrientes-lote-001')
  })

  test('bounds unknown workspace and protected field recovery without fabricated data', async ({ page }) => {
    await page.goto('/demo?view=activity&fieldId=field-unknown')
    await expect(page.getByRole('alert', { name: 'Selección de lote no disponible' })).toContainText('no está disponible')
    await expect(page.getByText('Decisión del lote')).toHaveCount(0)

    await page.goto('/agronautas/fields/field-unknown')
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.getByText(/Acceso al detalle no autorizado|No se pudo cargar el lote|Verificando autenticación Agronautas/)).toBeVisible()
    await expect(page.getByText('field-unknown')).toHaveCount(0)
  })
})
