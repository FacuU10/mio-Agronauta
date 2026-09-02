import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { FieldGeometryEditor } from './field-geometry-editor'

const activeDoms: Array<InstanceType<typeof JSDOM>> = []
const globalNames = ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'Event'] as const
const originalGlobals = new Map(globalNames.map((name) => [name, (globalThis as unknown as Record<string, unknown>)[name]]))

function setGlobal(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
}

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/demo' })
  activeDoms.push(dom)
  setGlobal('window', dom.window)
  setGlobal('document', dom.window.document)
  setGlobal('HTMLElement', dom.window.HTMLElement)
  setGlobal('HTMLButtonElement', dom.window.HTMLButtonElement)
  setGlobal('Event', dom.window.Event)
}

afterEach(async () => {
  cleanup()
  for (const dom of activeDoms.splice(0)) dom.window.close()
  await new Promise<void>((resolve) => setImmediate(resolve))
  for (const name of globalNames) setGlobal(name, originalGlobals.get(name))
})

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
  const view = render(<FieldGeometryEditor fieldId="field-demo-1" initialGeometry={pointOnlyGeometry} onSave={async (input) => {
    const polygonWkt = input.polygonWkt ?? pointOnlyGeometry.polygonWkt
    saved.push(polygonWkt)
    return { ...pointOnlyGeometry, polygonWkt, status: 'saved', source: 'operator', hectares: 1 }
  }} />)

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

test('geometry editor announces invalid saves and focuses the first corrective control', () => {
  setupDom()
  cleanup()
  const view = render(<FieldGeometryEditor fieldId="field-demo-1" initialGeometry={pointOnlyGeometry} onSave={async () => { throw new Error('should not save') }} />)

  fireEvent.click(view.getByRole('button', { name: /Quitar vértice/i }))
  fireEvent.click(view.getByRole('button', { name: /Guardar perímetro/i }))

  const error = view.getByRole('alert')
  const addVertex = view.getByRole('button', { name: /Agregar vértice/i })
  assert.equal(error.getAttribute('aria-live'), 'assertive')
  assert.equal(error.getAttribute('aria-atomic'), 'true')
  assert.equal(addVertex.getAttribute('aria-describedby'), error.id)
  assert.equal(document.activeElement, addVertex)
})

test('geometry editor distinguishes saved geometry from a local draft and prevents duplicate saves', async () => {
  setupDom()
  cleanup()
  let calls = 0
  let resolveSave: ((value: typeof pointOnlyGeometry) => void) | undefined
  const pending = new Promise<typeof pointOnlyGeometry>((resolve) => { resolveSave = resolve })
  const view = render(<FieldGeometryEditor fieldId="field-demo-1" initialGeometry={pointOnlyGeometry} onSave={async (input) => {
    calls += 1
     return pending.then((result) => ({ ...result, polygonWkt: input.polygonWkt ?? result.polygonWkt, status: 'saved' as const, source: 'operator' as const }))
  }} />)

  assert.ok(view.getByText(/^Guardado$/i))
  fireEvent.click(view.getByRole('button', { name: /Agregar vértice/i }))
  assert.ok(view.getByText(/^Borrador$/i))
  fireEvent.click(view.getByRole('button', { name: /Guardar perímetro/i }))
  fireEvent.submit(view.getByRole('form', { name: /Guardar perímetro/i }))
  assert.equal(calls, 1)
  resolveSave?.(pointOnlyGeometry)
  await waitFor(() => assert.ok(view.getByText(/Guardado por el backend/i)))
})
