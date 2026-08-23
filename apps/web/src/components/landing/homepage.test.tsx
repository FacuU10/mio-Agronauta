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

function assertImageAssetPath(markup: string, expectedPath: string) {
  const separatorTolerantPattern = expectedPath
    .split('/')
    .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('(?:/|%2F)')

  assert.match(markup, new RegExp(separatorTolerantPattern, 'i'))
}

test('assertImageAssetPath acepta rutas con separadores plain o encoded', () => {
  assert.doesNotThrow(() => assertImageAssetPath('src="/landing/source/logo.webp"', '/landing/source/logo.webp'))
  assert.doesNotThrow(() => assertImageAssetPath('url=%2Flanding%2Fsource%2Flogo.webp', '/landing/source/logo.webp'))
  assert.throws(() => assertImageAssetPath('url=%2Flanding%2Fsource%2Fimagen1.webp', '/landing/source/logo.webp'))
})

test('landing preserva anchors del source y redirige CTAs a /probar-demo', () => {
  const markup = renderToStaticMarkup(<LandingHomepage initialShowSplash={false} />)

  const demoLinks = markup.match(/href="\/probar-demo"/g) ?? []

  assert.equal(demoLinks.length, 3)
  assert.match(markup, /AGRONAUTA RISK ENGINE/)
  assert.match(markup, /REDUCCIÓN DE/)
  assert.match(markup, /Agronautas/)
  assert.match(markup, /Risk Engine/)
  assert.match(markup, /Insurtech/)
  assert.match(markup, /Hoja de Ruta/)
  assertImageAssetPath(markup, '/landing/source/logo.webp')
  assertImageAssetPath(markup, '/landing/source/imagen1.webp')
  assert.match(markup, />Probar demo</)
  assert.match(markup, />Agendar demo</)
})

test('landing elimina el flujo contact-first heredado', () => {
  const markup = renderToStaticMarkup(<LandingHomepage initialShowSplash={false} />)

  assert.doesNotMatch(markup, /Solicitar contacto/)
  assert.doesNotMatch(markup, /Organización o rol/)
  assert.doesNotMatch(markup, /\?Qué necesitás resolver\?/)
  assert.doesNotMatch(markup, /api\/contact-intake/)
})

test('landing labels unsupported metrics, recency, monitoring, and insurance as unavailable or illustrative', () => {
  const markup = renderToStaticMarkup(<LandingHomepage initialShowSplash={false} />)

  assert.match(markup, /No disponible/)
  assert.match(markup, /ilustrativ/i)
  assert.match(markup, /No disponible para contratación/i)
  assert.doesNotMatch(markup, new RegExp('>96%<|>100%<|>1\\.2M<|15\\+ fuentes|Hace 2 minutos|USD 1\\.85/kg|Liquidación 7 días'))
})

test('landing marks roadmap phases and dates as illustrative and insurance as unavailable', () => {
  const markup = renderToStaticMarkup(<LandingHomepage initialShowSplash={false} />)

  assert.match(markup, /Hoja de Ruta ilustrativa/i)
  assert.match(markup, /fechas y fases no confirmadas/i)
  assert.match(markup, /Plan ilustrativo 1/i)
  assert.match(markup, /Fecha no confirmada/i)
  assert.match(markup, /Capacidad futura no disponible: seguros para heladas/i)
  assert.doesNotMatch(markup, /Q1 2025|Q2 2025|Q3 2025|Q4 2025|Q1 2026/)
  assert.doesNotMatch(markup, /Seguros diseñados para heladas, anegamientos y sequías de Corrientes/)
})

test('landing gives every roadmap entry an unconfirmed illustrative phase and date', () => {
  const markup = renderToStaticMarkup(<LandingHomepage initialShowSplash={false} />)

  assert.equal((markup.match(/Plan ilustrativo [1-5]/g) ?? []).length, 5)
  assert.equal((markup.match(/Fecha no confirmada/g) ?? []).length, 5)
})
