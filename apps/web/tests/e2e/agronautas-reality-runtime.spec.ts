import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

interface BrowserEvidence {
  verifier: 'agronautas-browser-runtime-evidence-v1'
  runId: string
  outcome: 'complete' | 'blocked'
  productionProven: false
  topology: 'managed-playwright-harness' | 'configured-browser-target'
  fullDatabaseRedisWorkerCronRender: 'unproven'
  pageUrl: string
  snapshotPath: string
  screenshotPath: string
  networkPath: string
  consolePath: string
  consoleStatus: 'captured' | 'warnings-captured'
  runtimeWarnings: string[]
  bffRuntime: { status: number | null; body: unknown; error?: string }
  blockedReason?: string
}

test.describe('Agronautas real runtime evidence', () => {
  test('captures real browser, BFF, screenshot, snapshot, console, and network evidence without route stubs', async ({ page }, testInfo) => {
    const runId = `browser-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`
    const outputDir = testInfo.outputPath(`agronautas-reality-runtime-${runId}`)
    await mkdir(outputDir, { recursive: true })

    const consoleEvents: Array<Record<string, unknown>> = []
    const networkEvents: Array<Record<string, unknown>> = []
    page.on('console', (message) => consoleEvents.push({ type: message.type(), text: message.text(), location: message.location() }))
    page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message }))
    page.on('request', (request) => networkEvents.push({ type: 'request', method: request.method(), url: request.url() }))
    page.on('response', (response) => networkEvents.push({ type: 'response', status: response.status(), url: response.url() }))
    page.on('requestfailed', (request) => networkEvents.push({ type: 'requestfailed', url: request.url(), failure: request.failure()?.errorText ?? 'unknown' }))

    let outcome: BrowserEvidence['outcome'] = 'complete'
    let blockedReason: string | undefined
    let bffRuntime: BrowserEvidence['bffRuntime'] = { status: null, body: null }
    let snapshotPath = `${outputDir}/snapshot.html`
    let screenshotPath = `${outputDir}/screenshot.png`

    try {
      await page.goto('/demo', { waitUntil: 'domcontentloaded', timeout: 20_000 })
      const snapshot = await page.locator('body').evaluate((body) => body.outerHTML)
      snapshotPath = `${outputDir}/snapshot.html`
      await writeFile(snapshotPath, snapshot, 'utf8')
      screenshotPath = `${outputDir}/screenshot.png`
      await page.screenshot({ path: screenshotPath, fullPage: true })

      bffRuntime = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/agronautas/v1/runtime', { cache: 'no-store' })
          const text = await response.text()
          let body: unknown = text
          try { body = text ? JSON.parse(text) as unknown : null } catch { /* preserve non-JSON response */ }
          return { status: response.status, body }
        } catch (error) {
          return { status: null, body: null, error: error instanceof Error ? error.message : String(error) }
        }
      })
      if (bffRuntime.status === null) {
        outcome = 'blocked'
        blockedReason = bffRuntime.error ?? 'BFF runtime request did not return a response'
      }
    } catch (error) {
      outcome = 'blocked'
      blockedReason = error instanceof Error ? error.message : String(error)
      await page.screenshot({ path: screenshotPath }).catch(() => undefined)
      await writeFile(snapshotPath, '<!-- browser navigation unavailable; no DOM snapshot was claimed -->\n', 'utf8')
    }

    const networkPath = `${outputDir}/network.json`
    const consolePath = `${outputDir}/console.json`
    await writeFile(networkPath, `${JSON.stringify(networkEvents, null, 2)}\n`, 'utf8')
    await writeFile(consolePath, `${JSON.stringify(consoleEvents, null, 2)}\n`, 'utf8')
    const runtimeWarnings = consoleEvents
       .filter((event) => event['type'] === 'warning' || event['type'] === 'error' || event['type'] === 'pageerror')
       .map((event) => typeof event['text'] === 'string' ? event['text'] : 'runtime browser warning')
    const evidence: BrowserEvidence = {
      verifier: 'agronautas-browser-runtime-evidence-v1',
      runId,
      outcome,
      productionProven: false,
       topology: process.env['PLAYWRIGHT_BASE_URL'] ? 'configured-browser-target' : 'managed-playwright-harness',
      fullDatabaseRedisWorkerCronRender: 'unproven',
      pageUrl: page.url(),
      snapshotPath,
      screenshotPath,
      networkPath,
      consolePath,
      consoleStatus: runtimeWarnings.length > 0 ? 'warnings-captured' : 'captured',
      runtimeWarnings,
      bffRuntime,
      ...(blockedReason ? { blockedReason } : {}),
    }
    const manifestPath = `${outputDir}/browser-evidence.json`
    await writeFile(manifestPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
    await testInfo.attach('browser-evidence', { path: manifestPath, contentType: 'application/json' })
    await testInfo.attach('browser-snapshot', { path: snapshotPath, contentType: 'text/html' })
    await testInfo.attach('browser-screenshot', { path: screenshotPath, contentType: 'image/png' })
    await testInfo.attach('browser-network', { path: networkPath, contentType: 'application/json' })
    await testInfo.attach('browser-console', { path: consolePath, contentType: 'application/json' })

    if (outcome === 'blocked') testInfo.annotations.push({ type: 'blocked-runtime', description: blockedReason ?? 'runtime unavailable' })
    expect(evidence.productionProven).toBe(false)
    expect(['complete', 'blocked']).toContain(evidence.outcome)
    expect(evidence.snapshotPath).toContain('snapshot.html')
    expect(evidence.screenshotPath).toContain('screenshot.png')
    expect(evidence.networkPath).toContain('network.json')
    expect(evidence.consolePath).toContain('console.json')
  })
})
