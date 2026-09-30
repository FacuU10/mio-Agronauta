import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, within } from '@testing-library/react/pure'
import { LivestockPanel } from './livestock-panel'
import { AgronautasWorkspace } from '../workspace'

beforeEach(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/demo?view=livestock',
  })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.FormData = dom.window.FormData
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
afterEach(cleanup)

test('filters the mock herd and opens the selected animal details', () => {
  const view = render(<LivestockPanel />)
  assert.ok(view.getByText('Mostrando 8 de 8 animales'))
  fireEvent.change(view.getByLabelText('Categoría'), { target: { value: 'Vaca' } })
  fireEvent.change(view.getByLabelText('Potrero'), { target: { value: 'Potrero Este' } })
  assert.ok(view.getByText('Mostrando 1 de 8 animales'))
  fireEvent.click(view.getByRole('button', { name: 'Ver ficha de AR-008' }))
  const dialog = view.getByRole('dialog', { name: 'Ficha de AR-008' })
  assert.ok(within(dialog).getByText('441 kg'))
  assert.ok(within(dialog).getByText('Cruza'))
  assert.ok(within(dialog).getByText('Tratamiento'))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
  assert.equal(view.queryByRole('dialog'), null)
  assert.equal(document.body.style.overflow, '')
  fireEvent.change(view.getByLabelText('Categoría'), { target: { value: 'Toro' } })
  assert.ok(view.getByText('No encontramos animales con esos filtros.'))
  fireEvent.click(view.getByRole('button', { name: 'Limpiar filtros' }))
  assert.ok(view.getByText('Mostrando 8 de 8 animales'))
})

test('simulates movements only in local state and updates animal details', () => {
  const view = render(<LivestockPanel />)
  fireEvent.click(view.getByRole('button', { name: 'Registrar movimiento' }))
  fireEvent.change(view.getByLabelText('Potrero de destino'), { target: { value: 'Potrero Sur' } })
  fireEvent.click(view.getByRole('button', { name: 'Simular movimiento' }))
  assert.ok(view.getByRole('status').textContent?.includes('AR-001'))
  fireEvent.click(view.getByRole('button', { name: 'Ver ficha de AR-001' }))
  assert.ok(within(view.getByRole('dialog')).getByText('Potrero Sur'))
})

test('livestock renders independently without agricultural modules', () => {
  const props = {
    accessState: 'demo',
    runtimeMode: 'demo',
    workspaceView: 'livestock',
    workspaceBasePath: '/demo',
    selectedFieldId: null,
  } as React.ComponentProps<typeof AgronautasWorkspace>
  const view = render(<AgronautasWorkspace {...props} />)
  assert.ok(view.getByRole('heading', { name: 'Hacienda', level: 1 }))
  assert.equal(view.queryByText('Nuevo lote'), null)
  assert.equal(view.container.querySelector('#agronautas-management'), null)
  assert.equal(view.container.querySelector('#agronautas-intake'), null)
  assert.equal(view.container.querySelector('#agronautas-planning'), null)
  assert.equal(view.getByRole('link', { name: 'Hacienda' }).getAttribute('aria-current'), 'page')
})
