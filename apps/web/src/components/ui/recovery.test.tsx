import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import { Recovery } from './recovery'

const React = { createElement }

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.Node = dom.window.Node
}

test('Recovery makes maintenance non-retryable and keeps the safe navigation action reachable', () => {
  setupDom()
  cleanup()
  const view = render(
    <Recovery
      state="maintenance"
      title="Servicio en mantenimiento"
      description="El capability no está disponible temporalmente."
      action={{ href: '/agronautas', label: 'Volver al workspace' }}
    />,
  )

  const alert = view.getByRole('alert')
  assert.equal(alert.getAttribute('aria-live'), 'assertive')
  assert.match(alert.textContent ?? '', /Mantenimiento/)
  assert.ok(view.getByRole('link', { name: 'Volver al workspace' }))
  assert.equal(view.queryByRole('button', { name: 'Reintentar' }), null)
})

test('Recovery exposes retry only for a retryable error and keeps the explanation focusable', () => {
  setupDom()
  cleanup()
  const view = render(
    <Recovery state="error" title="No se pudo actualizar" description="La solicitud no fue confirmada." retryable onRetry={() => undefined} />,
  )

  const alert = view.getByRole('alert')
  assert.equal(alert.getAttribute('tabindex'), '-1')
  assert.equal(alert.getAttribute('aria-live'), 'assertive')
  assert.ok(view.getByRole('button', { name: 'Reintentar' }))
})
