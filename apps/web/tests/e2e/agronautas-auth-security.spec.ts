import { expect, test, type Page } from '@playwright/test'

const operatorEmail = process.env['AGRONAUTAS_E2E_OPERATOR_EMAIL']
const operatorPassword = process.env['AGRONAUTAS_E2E_OPERATOR_PASSWORD']
const memberEmail = process.env['AGRONAUTAS_E2E_MEMBER_EMAIL']
const memberPassword = process.env['AGRONAUTAS_E2E_MEMBER_PASSWORD']
const forbiddenWorkspaceId = process.env['AGRONAUTAS_E2E_FORBIDDEN_WORKSPACE_ID']
const maintenancePath = process.env['AGRONAUTAS_E2E_MAINTENANCE_PATH']
const draftFailurePath = process.env['AGRONAUTAS_E2E_DRAFT_FAILURE_PATH']
const draftCollisionExternalFieldId = 'corrientes-demo-mercedes'
const workspaceReadyTimeoutMs = 15_000
const maintenanceReadyTimeoutMs = 15_000

const liveCredentialsAvailable = Boolean(operatorEmail && operatorPassword && memberEmail && memberPassword)

test.describe('Agronautas authentication security isolation', () => {
  test.beforeEach(({ }, testInfo) => {
    if (!liveCredentialsAvailable) testInfo.annotations.push({ type: 'blocked-runtime', description: 'not_run: configure AGRONAUTAS_E2E_OPERATOR_EMAIL, AGRONAUTAS_E2E_OPERATOR_PASSWORD, AGRONAUTAS_E2E_MEMBER_EMAIL, and AGRONAUTAS_E2E_MEMBER_PASSWORD against a live API/PostgreSQL/Redis environment' })
    test.skip(!liveCredentialsAvailable, 'blocked/not_run: live seeded operator/member credentials and API/PostgreSQL/Redis listeners are absent')
  })

  test('operator signs in and reaches only the authorized workspace', async ({ page }) => {
    await signIn(page, operatorEmail!, operatorPassword!)
    await expect(page).toHaveURL(/\/agronautas$/)
    await expect(page.getByRole('heading', { name: /Workspace Agronautas/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Registrar lote' })).toBeVisible()
    await expect(page.getByText(/Demo aislada/i)).toHaveCount(0)
  })

  test('member sign-in and cross-workspace access remain visibly forbidden', async ({ page }) => {
    await signIn(page, memberEmail!, memberPassword!)
    await expect(page).toHaveURL(/\/agronautas$/)
    test.skip(!forbiddenWorkspaceId, 'blocked/not_run: AGRONAUTAS_E2E_FORBIDDEN_WORKSPACE_ID is required for a real cross-workspace assertion')
    const response = await page.request.get(`/api/agronautas/workspace/fields?workspaceId=${encodeURIComponent(forbiddenWorkspaceId!)}`)
    expect(response.status()).toBe(403)
    await expect(page.getByText(new RegExp(forbiddenWorkspaceId!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toHaveCount(0)
  })

  test('refresh is server-managed and replay recovery never claims an authenticated session', async ({ page }) => {
    await signIn(page, operatorEmail!, operatorPassword!)
    const refresh = await page.request.post('/api/agronautas/auth/refresh')
    expect([200, 401, 409, 503]).toContain(refresh.status())
    if (refresh.status() === 200) {
      const body = await refresh.json() as Record<string, unknown>
      expect(body).not.toHaveProperty('accessToken')
      expect(body).not.toHaveProperty('refreshToken')
    }
    if (refresh.status() === 409) {
      await expect(page.getByText(/Sesión revocada|workspace|mantenimiento/i)).toBeVisible()
    }
  })

  test('maintenance state is visible only when a configured live maintenance path returns it', async ({ page }, testInfo) => {
    test.skip(!maintenancePath, 'blocked/not_run: configure AGRONAUTAS_E2E_MAINTENANCE_PATH against a live maintenance response')
    testInfo.annotations.push({ type: 'runtime-evidence', description: `live maintenance path ${maintenancePath}` })
    await page.goto(maintenancePath!)
    await expect(page.getByRole('heading', { name: /Agronautas en mantenimiento|Mantenimiento no confirmado|Estado Agronautas no disponible/i })).toBeVisible({ timeout: maintenanceReadyTimeoutMs })
    await expect(page.getByRole('status', { name: 'Workspace Agronautas listo' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Registrar lote' })).toHaveCount(0)
  })

  test('draft remains visible after a protected mutation failure and readiness is not fabricated', async ({ page }, testInfo) => {
    test.skip(!draftFailurePath, 'blocked/not_run: configure AGRONAUTAS_E2E_DRAFT_FAILURE_PATH as the protected mutation URL pattern')
    testInfo.annotations.push({ type: 'runtime-evidence', description: `protected mutation failure pattern ${draftFailurePath}` })
    await signIn(page, operatorEmail!, operatorPassword!)
    await page.goto('/agronautas')
    await expect(page.getByRole('status', { name: 'Workspace Agronautas listo' })).toBeVisible({ timeout: workspaceReadyTimeoutMs })
    const draft = page.getByLabel('ID externo')
    await draft.fill(draftCollisionExternalFieldId)
    const configuredFailurePath = draftFailurePath!.startsWith('http') ? new URL(draftFailurePath!, page.url()).pathname : draftFailurePath!
    const mutationResponse = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === configuredFailurePath)
    await page.getByRole('button', { name: 'Registrar lote' }).click()
    const response = await mutationResponse
    expect(response.status()).toBe(422)
    await expect(page.getByRole('alert', { name: /Error de intake Agronautas/i })).toBeVisible()
    await expect(page.getByTestId('agronautas-dashboard-metrics')).toHaveCount(0)
    await expect(draft).toHaveValue(draftCollisionExternalFieldId)
  })
})

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/agronautas$/)
  await expect(page.getByRole('status', { name: 'Workspace Agronautas listo' })).toBeVisible({ timeout: workspaceReadyTimeoutMs })
  await expect(page.getByRole('button', { name: 'Registrar lote' })).toBeVisible()
}
