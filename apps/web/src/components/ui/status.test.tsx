import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import { Status } from './status'

const React = { createElement }

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.Node = dom.window.Node
}

test('Status exposes typed degraded provenance and a retry action through live-region semantics', () => {
  setupDom()
  cleanup()
  const view = render(
    <Status
      state="degraded"
      title="Datos parcialmente disponibles"
      description="La lectura requiere una nueva consulta."
      source="open-meteo"
      freshness="stale"
      mode="seam"
      reason="provider_timeout"
      retryable
      onRetry={() => undefined}
    />,
  )

  const alert = view.getByRole('alert')
  assert.equal(alert.getAttribute('aria-live'), 'assertive')
  assert.match(alert.textContent ?? '', /Degradado/)
  assert.match(alert.textContent ?? '', /Fuente: open-meteo/)
  assert.match(alert.textContent ?? '', /Freshness: stale/)
  assert.match(alert.textContent ?? '', /Modo: Seam/)
  assert.ok(view.getByRole('button', { name: 'Reintentar' }))
})

test('Status keeps a loading state as a polite busy region without offering retry prematurely', () => {
  setupDom()
  cleanup()
  const view = render(
    <Status state="loading" title="Cargando evidencia" description="Esperando una respuesta normalizada." />,
  )

  const status = view.getByRole('status')
  assert.equal(status.getAttribute('aria-live'), 'polite')
  assert.equal(status.getAttribute('aria-busy'), 'true')
  assert.equal(view.queryByRole('button', { name: 'Reintentar' }), null)
})
