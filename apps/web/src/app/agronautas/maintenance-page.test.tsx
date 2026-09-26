import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react/pure'
import { AgronautasMaintenancePage, type MaintenanceReadiness } from '@/components/agronautas/maintenance-page'

const React = { createElement }

const viewports = [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
] as const

for (const [viewport, width, height] of viewports) {
  test(`maintenance state withholds protected content at ${viewport} contract viewport`, () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/agronautas/maintenance' })
    Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true })
    Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true })
    Object.defineProperty(globalThis, 'HTMLElement', { value: dom.window.HTMLElement, configurable: true })
    Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
    Object.defineProperty(dom.window, 'innerWidth', { value: width, configurable: true })
    Object.defineProperty(dom.window, 'innerHeight', { value: height, configurable: true })

    const readiness: MaintenanceReadiness = { ready: false, maintenance: { enabled: true, reason: 'maintenance_mode' } }
    try {
      const view = render(<AgronautasMaintenancePage readiness={readiness} />)
      assert.ok(view.getByRole('heading', { name: /Agronautas en mantenimiento/i }))
      assert.equal(view.queryByText(/Workspace Agronautas listo|Registrar lote|live|operativo/i), null)
      assert.equal(view.queryByRole('button', { name: /Reintentar/i }), null)
    } finally {
      cleanup()
      dom.window.close()
    }
  })
}
