import { expect, test } from '@playwright/test'

test.describe('Agronautas management foundation', () => {
  test('demo management confirms lifecycle transitions, revisions, audit, and duplicate prevention', async ({ page }) => {
    await page.goto('/demo?view=management&fieldId=field-corrientes-lote-001')

    const panel = page.getByTestId('agronautas-management-panel')
    await expect(panel).toBeVisible()
    await expect(panel.getByText('No hay campañas, operaciones o tareas persistidas.')).toBeVisible({ timeout: 30_000 })
    await expect(panel.getByText('Sin actividad de gestión todavía.')).toBeVisible()

    const name = 'Operación demo idempotente'
    await panel.getByLabel('Nombre de operación').fill(name)
    await panel.getByRole('button', { name: 'Crear operación' }).click()
    await expect(panel.getByRole('status').filter({ hasText: `Operación “${name}” confirmada.` })).toBeVisible()
    await expect(panel.getByText('planned')).toBeVisible()
    await expect(panel.getByText('revisión 1')).toBeVisible()
    await expect(panel.getByText(/create · accepted/)).toBeVisible()

    await panel.getByRole('button', { name: 'Activar operación' }).click()
    await expect(panel.getByText('active')).toBeVisible()
    await expect(panel.getByText('revisión 2')).toBeVisible()
    await expect(panel.getByText(/transition · accepted/)).toBeVisible()

    await panel.getByRole('button', { name: 'Completar operación' }).click()
    await expect(panel.getByText('completed')).toBeVisible()
    await expect(panel.getByText('revisión 3')).toBeVisible()

    await panel.getByLabel('Nombre de operación').fill(name)
    await panel.getByRole('button', { name: 'Crear operación' }).click()
    await expect(panel.getByRole('status').filter({ hasText: `Operación “${name}” confirmada.` })).toBeVisible()
    await expect(panel.getByRole('list', { name: 'Registros de gestión' }).getByText(name)).toHaveCount(1)
    await expect(panel.getByText(/revisión 2 → 3/)).toBeVisible()
    await expect(panel.getByText(/retry/)).toHaveCount(0)
  })
})
