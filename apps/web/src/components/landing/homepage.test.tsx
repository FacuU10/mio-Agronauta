import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup } from '@testing-library/react'
import { LandingHomepage } from './homepage'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  })
}

beforeEach(() => {
  setupDom()
  cleanup()
})

test('landing renderiza CTA exacta hacia /demo', () => {
  const markup = renderToStaticMarkup(<LandingHomepage />)

  assert.match(markup, /href="\/demo"/)
  assert.match(markup, />prueba la version demo</)
})
