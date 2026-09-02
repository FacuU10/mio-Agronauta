import { expect, type Page, type TestInfo } from '@playwright/test'

export type NetworkEvidence = {
  kind: 'response' | 'requestfailed'
  method: string
  status?: number
  url: string
  resourceType: string
  failure?: string
}

const CONTRACT_STATUSES = new Set([200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504])

export class MarketReadinessPage {
  readonly consoleEvents: Array<{ type: string; text: string }> = []
  readonly pageErrors: string[] = []
  readonly networkEvents: NetworkEvidence[] = []

  constructor(readonly page: Page, private readonly testInfo: TestInfo) {
    page.on('console', (message) => this.consoleEvents.push({ type: message.type(), text: message.text() }))
    page.on('pageerror', (error) => this.pageErrors.push(error.message))
    page.on('response', (response) => {
      const request = response.request()
      const url = response.url()
      if (request.resourceType() === 'document' || url.includes('/api/')) {
        this.networkEvents.push({ kind: 'response', method: request.method(), status: response.status(), url, resourceType: request.resourceType() })
      }
    })
    page.on('requestfailed', (request) => {
      const url = request.url()
      if (request.resourceType() === 'document' || url.includes('/api/')) {
        this.networkEvents.push({ kind: 'requestfailed', method: request.method(), url, resourceType: request.resourceType(), failure: request.failure()?.errorText ?? 'unknown' })
      }
    })
  }

  async goto(path: string): Promise<void> {
    const response = await this.page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(response?.status(), `navigation response for ${path}`).toBe(200)
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
    await this.page.waitForTimeout(250)
  }

  async assertCommonRouteContract(): Promise<void> {
    await expect(this.page.locator('main'), 'each audited route must expose exactly one main landmark').toHaveCount(1)
    const viewport = await this.page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }))
    expect(viewport.documentWidth, 'document must not overflow horizontally').toBeLessThanOrEqual(viewport.viewportWidth)
    expect(viewport.bodyWidth, 'body must not overflow horizontally').toBeLessThanOrEqual(viewport.viewportWidth)
    expect(this.pageErrors, 'the route must not crash in the browser').toEqual([])
  }

  async assertApiResponse(pathname: string, label: string): Promise<void> {
    await expect.poll(
      () => this.networkEvents.some((event) => event.kind === 'response' && new URL(event.url).pathname === pathname),
      { timeout: 10_000, message: `${label} must produce a real response for ${pathname}` },
    ).toBe(true)

    const responses = this.networkEvents.filter((event) => event.kind === 'response' && new URL(event.url).pathname === pathname)
    expect(responses.every((event) => CONTRACT_STATUSES.has(event.status ?? -1)), `${label} returned an undocumented HTTP status`).toBe(true)
  }

  assertObservedApiStatuses(): void {
    const unexpected = this.networkEvents
      .filter((event) => event.kind === 'response' && event.url.includes('/api/') && !CONTRACT_STATUSES.has(event.status ?? -1))
      .map((event) => `${event.method} ${event.status} ${event.url}`)
    expect(unexpected, 'BFF/API responses must use the declared contract status set').toEqual([])
  }

  async attachEvidence(label: string): Promise<void> {
    try {
      await this.testInfo.attach(`${label}-screenshot`, { body: await this.page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' })
    } catch (error) {
      this.consoleEvents.push({ type: 'screenshot-error', text: error instanceof Error ? error.message : String(error) })
    }
    await this.testInfo.attach(`${label}-console`, { body: JSON.stringify(this.consoleEvents, null, 2), contentType: 'application/json' })
    await this.testInfo.attach(`${label}-network`, { body: JSON.stringify(this.networkEvents, null, 2), contentType: 'application/json' })
    await this.testInfo.attach(`${label}-page-errors`, { body: JSON.stringify(this.pageErrors, null, 2), contentType: 'application/json' })
  }
}

export function routeEvidenceLabel(path: string): string {
  return path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'home'
}
