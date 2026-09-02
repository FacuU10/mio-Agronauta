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

test('ProductShell keeps the root-owned skip link singular with one stable main focus boundary', () => {
  setupDom()
  cleanup()

  const view = render(
    <>
      <a href="#main-content">Saltar al contenido principal</a>
      <ProductShell product="agronautas" title="Workspace de lotes" navItems={[]}>
        <p>Contenido enfocable</p>
      </ProductShell>
    </>,
  )

  assert.equal(view.container.querySelectorAll('main').length, 1)
  const main = view.container.querySelector('main')
  assert.equal(main?.id, 'main-content')
  assert.equal(main?.getAttribute('tabindex'), '-1')
  assert.equal(view.getAllByRole('link', { name: /Saltar al contenido/i }).length, 1)
  assert.equal(view.getByRole('link', { name: /Saltar al contenido/i }).getAttribute('href'), '#main-content')
  assert.ok(main?.textContent?.includes('Contenido enfocable'))
})

test('ProductShell exposes responsive shell hooks for bounded navigation and focus-safe content', () => {
  setupDom()
  cleanup()

  const view = render(
    <ProductShell product="ibera" title="Centro provincial" navItems={[{ href: '/municipalities', label: 'Localidades' }]}>
      <p>Contenido responsive</p>
    </ProductShell>,
  )

  assert.ok(view.container.querySelector('.responsive-shell'))
  assert.ok(view.container.querySelector('.responsive-nav'))
  assert.ok(view.container.querySelector('main.responsive-main'))
})
