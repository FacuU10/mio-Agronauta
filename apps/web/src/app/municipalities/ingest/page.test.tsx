import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import HydrologyIngestPage from './page'

beforeEach(() => setupDom())
afterEach(() => cleanup())

test('renders the operator ingest panel at the planned page route', () => {
  const view = render(HydrologyIngestPage())

  assert.ok(view.getByRole('heading', { name: 'Ingesta hidrológica' }))
  assert.ok(view.getByLabelText('Token de ingesta'))
})

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/municipalities/ingest' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.self = dom.window as unknown as typeof globalThis.self
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLInputElement = dom.window.HTMLInputElement
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
}
