import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import { FutureCapabilities } from './future-capabilities'

beforeEach(() => setupDom())
afterEach(() => cleanup())

test('Agronautas future capabilities are visible as honest, non-operational cards', () => {
  const view = render(<FutureCapabilities product="agronautas" />)

  for (const title of [
    'Precios y tendencias de mercado',
    'Decisiones y recomendaciones de cultivo',
    'Marketplace de exportación',
    'Conexiones del sector',
    'Gestión, tareas y expansión del workspace',
    'Satélite avanzado y simulaciones',
  ]) {
    assert.ok(view.getByRole('article', { name: title }))
  }

  assert.equal(view.getAllByRole('status', { name: 'Próximamente' }).length, 6)
  assert.equal(view.container.querySelectorAll('button, a, input, select, form').length, 0)
  assert.doesNotMatch(view.container.textContent ?? '', /(?:\$|USD|ARS|\b\d+(?:[.,]\d+)?\s*(?:%|kg|ha|mm|t)\b)/i)
})

test('Iberá-Alerta keeps its institutional roadmap separate and non-operational', () => {
  const view = render(<FutureCapabilities product="ibera-alerta" />)

  assert.ok(view.getByText('Hoja de ruta · Iberá-Alerta'))
  assert.ok(view.getByRole('article', { name: 'Integraciones institucionales' }))
  assert.ok(view.getByRole('article', { name: 'Operaciones compartidas' }))
  assert.ok(view.getByRole('article', { name: 'Cobertura territorial ampliada' }))
  assert.equal(view.queryByText('Precios y tendencias de mercado'), null)
  assert.equal(view.container.querySelectorAll('button, a, input, select, form').length, 0)
  assert.equal(view.getAllByRole('status', { name: 'Próximamente' }).length, 3)
})

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/demo' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
}
