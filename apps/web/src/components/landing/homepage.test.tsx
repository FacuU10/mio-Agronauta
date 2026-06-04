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
  globalThis.HTMLInputElement = dom.window.HTMLInputElement
  globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.Event = dom.window.Event
  globalThis.FormData = dom.window.FormData
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  })
}

beforeEach(() => {
  setupDom()
  cleanup()
})

test('landing preserva anchors del source y expone exactamente un CTA a /demo', () => {
  const markup = renderToStaticMarkup(<LandingHomepage initialShowSplash={false} />)

  const demoLinks = markup.match(/href="\/demo"/g) ?? []

  assert.equal(demoLinks.length, 1)
  assert.match(markup, /AGRONAUTA RISK ENGINE/)
  assert.match(markup, /REDUCCIÓN DE/)
  assert.match(markup, /Agronautas/)
  assert.match(markup, /Risk Engine/)
  assert.match(markup, /Insurtech/)
  assert.match(markup, /Hoja de Ruta/)
  assert.match(markup, /\/landing\/source\/logo\.webp/)
  assert.match(markup, /\/landing\/source\/imagen1\.webp/)
  assert.match(markup, />Demo</)
})

test('landing elimina el flujo contact-first heredado', () => {
  const markup = renderToStaticMarkup(<LandingHomepage initialShowSplash={false} />)

  assert.doesNotMatch(markup, /Solicitar contacto/)
  assert.doesNotMatch(markup, /Organización o rol/)
  assert.doesNotMatch(markup, /\?Qué necesitás resolver\?/)
  assert.doesNotMatch(markup, /api\/contact-intake/)
})
