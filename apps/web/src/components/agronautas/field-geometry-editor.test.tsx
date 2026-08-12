import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { FieldGeometryEditor } from './field-geometry-editor'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/demo' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.Event = dom.window.Event
}

const pointOnlyGeometry = {
  fieldId: 'field-demo-1',
  polygonWkt: 'POLYGON((-58.08 -29.18,-58.07 -29.18,-58.07 -29.19,-58.08 -29.18))',
  centroid: { lat: -29.1833, lng: -58.0767 },
  areaM2: 10000,
  hectares: 1,
  perimeterM: 400,
  status: 'point_only' as const,
  source: 'fallback' as const,
  updatedAt: null,
}

test('geometry editor exposes accessible fallback, draft metrics, invalid preservation and authenticated save', async () => {
  setupDom()
  cleanup()
  const saved: string[] = []
  const view = render(<FieldGeometryEditor fieldId="field-demo-1" initialGeometry={pointOnlyGeometry} onSave={async (input) => { saved.push(input.polygonWkt); return { ...pointOnlyGeometry, polygonWkt: input.polygonWkt, status: 'saved', source: 'operator', hectares: 1 } }} />)

  assert.ok(view.getByText(/Google Maps no está disponible/i))
  assert.ok(view.getByRole('button', { name: /Agregar vértice/i }))
  fireEvent.click(view.getByRole('button', { name: /Agregar vértice/i }))
  assert.ok(view.getByText('Borrador'))
  assert.ok(view.getByText(/Área/i))

  fireEvent.click(view.getByRole('button', { name: /Guardar perímetro/i }))
  await waitFor(() => assert.equal(saved.length, 1))
  assert.match(saved[0] ?? '', /^POLYGON\(\(/)
  assert.ok(view.getByText(/Guardado por el backend/i))
})

test('geometry editor rejects incomplete draft and keeps the last saved geometry visible', async () => {
  setupDom()
  cleanup()
  const view = render(<FieldGeometryEditor fieldId="field-demo-1" initialGeometry={pointOnlyGeometry} onSave={async () => { throw new Error('should not save') }} />)
  fireEvent.click(view.getByRole('button', { name: /Quitar vértice/i }))
  fireEvent.click(view.getByRole('button', { name: /Guardar perímetro/i }))
  assert.ok(view.getByRole('alert'))
  assert.match(view.getByRole('alert').textContent ?? '', /tres vértices/i)
  assert.ok(view.getByText(/Último perímetro guardado/i))
})
