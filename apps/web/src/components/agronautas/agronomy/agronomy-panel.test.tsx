import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, within } from '@testing-library/react/pure'
import { AgronomyPanel } from './agronomy-panel'
import { AgronautasWorkspace } from '../workspace'

beforeEach(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/demo?view=agronomy',
  })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.FormData = dom.window.FormData
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
})
afterEach(cleanup)

test('agronomy is independent and retains the workspace navigation', () => {
  const props = {
    accessState: 'demo',
    runtimeMode: 'demo',
    workspaceView: 'agronomy',
    workspaceBasePath: '/demo',
    selectedFieldId: null,
  } as React.ComponentProps<typeof AgronautasWorkspace>
  const view = render(<AgronautasWorkspace {...props} />)
  assert.ok(view.getByRole('heading', { name: 'Gestión Agronómica', level: 1 }))
  assert.equal(view.getAllByRole('tab').length, 6)
  assert.equal(view.container.querySelector('#agronautas-management'), null)
  assert.equal(view.container.querySelector('#agronautas-intake'), null)
  assert.equal(
    within(view.getByRole('navigation', { name: 'Navegación de Agronautas' })).getByRole('link', { name: 'Agronomía' }).getAttribute('aria-current'),
    'page'
  )
})

test('local edits, completion and deletion update the overview', () => {
  const view = render(<AgronomyPanel />)
  fireEvent.click(view.getByRole('tab', { name: 'Lotes' }))
  fireEvent.click(view.getAllByRole('button', { name: 'Editar' })[0]!)
  const dialog = within(view.getByRole('dialog'))
  fireEvent.change(dialog.getByLabelText(/Nombre del lote/), { target: { value: 'Lote Demo' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Guardar registro' }))
  assert.ok(view.getByRole('cell', { name: 'Lote Demo' }))
  fireEvent.click(view.getByRole('tab', { name: 'Tareas' }))
  fireEvent.click(view.getAllByRole('button', { name: 'Completar' })[0]!)
  assert.ok(view.getByText('Completada'))
  fireEvent.click(view.getAllByRole('button', { name: 'Eliminar' })[0]!)
  fireEvent.click(view.getByRole('button', { name: 'Confirmar eliminación' }))
  assert.equal(view.queryByRole('cell', { name: 'Fertilizar Lote Norte' }), null)
  fireEvent.click(view.getByRole('tab', { name: 'Resumen' }))
  assert.ok(view.getByText('Lote Demo'))
  assert.equal(view.queryByText('Fertilizar Lote Norte'), null)
})

test('stock movements validate available quantity and refresh critical stock', () => {
  const view = render(<AgronomyPanel />)
  fireEvent.click(view.getByRole('tab', { name: 'Stock' }))
  fireEvent.click(view.getAllByRole('button', { name: 'Registrar salida' })[0]!)
  fireEvent.change(view.getByLabelText('Cantidad (kg)'), { target: { value: '500' } })
  fireEvent.submit(view.getByRole('button', { name: 'Guardar movimiento' }).closest('form')!)
  assert.ok(view.getByRole('alert'))
  fireEvent.click(view.getByRole('button', { name: 'Cancelar' }))
  fireEvent.click(view.getAllByRole('button', { name: 'Registrar entrada' })[0]!)
  fireEvent.change(view.getByLabelText('Cantidad (kg)'), { target: { value: '200' } })
  fireEvent.click(view.getByRole('button', { name: 'Guardar movimiento' }))
  assert.ok(view.getByRole('cell', { name: '650' }))
  fireEvent.click(view.getByRole('tab', { name: 'Resumen' }))
  assert.equal(view.queryByText('Stock bajo'), null)
})
