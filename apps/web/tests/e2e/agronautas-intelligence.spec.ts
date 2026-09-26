import { expect, test } from '@playwright/test'

test('demo intelligence exposes stale evidence and keeps degraded chat non-grounded', async ({ page }) => {
  await page.goto('/demo?view=intelligence&fieldId=field-corrientes-lote-001')

  const panel = page.getByRole('region', { name: 'Inteligencia económica basada en evidencia' })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('stale')
  await expect(panel).toContainText('Sin modo de evidencia en el contrato')
  await expect(panel).toContainText('Recomendación bloqueada')
  await expect(panel).toContainText('crop-history/yield')

  const chat = page.getByTestId('agronautas-chat-card')
  await chat.getByRole('textbox', { name: 'Pregunta' }).fill('deshabilitado')
  await page.getByRole('button', { name: 'Preguntar al chat' }).click()
  await expect(chat).toContainText(/degradado|no accionable|no disponible/i)
  await expect(chat).toContainText(/no reemplaza el dashboard|no es accionable/i)
})
