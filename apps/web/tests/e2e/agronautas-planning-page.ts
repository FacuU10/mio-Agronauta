import { expect, type Page } from '@playwright/test'

export class AgronautasPlanningPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/demo')
  }

  async calculate(): Promise<void> {
    await this.page.getByRole('button', { name: 'Calcular supuesto' }).click()
  }

  async verifyAccessibleSurface(): Promise<void> {
    await expect(this.page.getByRole('region', { name: 'Planificación de campaña Agronautas' })).toBeVisible()
    await expect(this.page.getByLabel('Área (ha)')).toBeVisible()
    await expect(this.page.getByLabel('Rendimiento supuesto (kg/ha)')).toBeVisible()
  }
}
