import { expect, test } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

test('real hydrology municipalities page renders the current API source state', async ({ page, request }) => {
  const apiResponse = await request.get('/api/hydrology/municipalities')
  expect(apiResponse.status(), await apiResponse.text()).toBe(200)
  const payload = await apiResponse.json()

  expect(payload.contractVersion).toBe('hydrology-government-municipalities-v1')
  expect(payload.municipalities.length).toBeGreaterThan(0)
  expect(payload.sourceFreshness.map((item) => item.source)).toEqual(['PNA', 'INA', 'INMET', 'SMN'])
  expect(JSON.stringify(payload)).not.toContain('offline-fixture://')
  const inaRecords = payload.municipalities.flatMap((municipality) => municipality.latestTelemetry.filter((item) => item.source === 'INA'))
  expect(inaRecords.length).toBeGreaterThan(0)
  expect(inaRecords.some((item) => typeof item.value === 'number' && /^https:\/\//.test(item.sourceUrl ?? ''))).toBe(true)

  await page.goto('/municipalities', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: /Centro de Monitoreo Hídrico Provincial/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Localidades bajo monitoreo' })).toBeVisible()
  await expect(page.locator('#municipalities-list article')).toHaveCount(payload.municipalities.length)
  for (const source of ['PNA', 'INA', 'INMET', 'SMN']) {
    await expect(page.getByRole('heading', { name: source, exact: true })).toBeVisible()
  }
  await expect(page.getByText(/^INA ·/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver fuente oficial' }).first()).toBeVisible()

  const environment = new URL(page.url()).hostname === 'www.agronauta.com.ar' ? 'production' : 'local'
  const matrixPath = resolve(process.cwd(), '../../artifacts/hydrology-local-real-matrix.json')
  const proofRunId = process.env.HYDROLOGY_PROOF_RUN_ID?.trim() || JSON.parse(await readFile(matrixPath, 'utf8')).proofRunId
  expect(proofRunId).toMatch(/^proof-/)
  const screenshotPath = resolve(process.cwd(), `../../artifacts/hydrology-municipalities-${environment}.png`)
  await mkdir(dirname(screenshotPath), { recursive: true })
  await page.screenshot({ path: screenshotPath, fullPage: true })

  const browserEvidence = {
    verifier: 'hydrology-municipalities-browser-v1',
    proofRunId,
    environment,
    url: page.url(),
    screenshotPath,
    visibleSources: ['PNA', 'INA', 'INMET', 'SMN'],
    municipalityCount: payload.municipalities.length,
  }
  const evidencePath = resolve(process.cwd(), `../../artifacts/hydrology-municipalities-${environment}-browser-evidence.json`)
  await writeFile(evidencePath, `${JSON.stringify(browserEvidence, null, 2)}\n`, 'utf8')

  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'))
  matrix.sourceMatrix = matrix.sourceMatrix.map((row) => ({
    ...row,
    browser: {
      status: 'pass',
      detail: `${environment} /municipalities rendered for proofRunId=${proofRunId}`,
      evidence: { evidencePath, screenshotPath, visibleSources: browserEvidence.visibleSources },
    },
  }))
  await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8')
})
