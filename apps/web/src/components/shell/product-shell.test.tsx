import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import { ProductShell } from './product-shell'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/demo' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.Node = dom.window.Node
}

test('ProductShell identifies Agronautas and keeps workspace navigation keyboard-visible', () => {
  setupDom()
  cleanup()

  const view = render(
    <ProductShell
      product="agronautas"
      title="Workspace de lotes"
      navItems={[{ href: '/demo', label: 'Workspace' }, { href: '/demo/fields/demo', label: 'Lote activo' }]}
    >
      <p>Contenido de prueba</p>
    </ProductShell>,
  )

  assert.equal(view.getByRole('banner').getAttribute('data-product'), 'agronautas')
  assert.ok(view.getByRole('link', { name: 'Workspace' }))
  assert.ok(view.getByRole('link', { name: 'Lote activo' }))
  assert.ok(view.getByRole('link', { name: /Saltar al contenido/i }))
  assert.equal(view.getByText('Contenido de prueba').textContent, 'Contenido de prueba')
})

test('ProductShell preserves Iberá identity as a separate product configuration', () => {
  setupDom()
  cleanup()

  const view = render(
    <ProductShell product="ibera" title="Centro provincial" navItems={[{ href: '/municipalities', label: 'Localidades' }]}>
      <p>Telemetría</p>
    </ProductShell>,
  )

  assert.equal(view.getByRole('banner').getAttribute('data-product'), 'ibera')
  assert.ok(view.getAllByText('Iberá-Alerta').length >= 1)
  assert.equal(view.queryByText('Riesgo agrícola'), null)
})
