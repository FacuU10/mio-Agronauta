import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import { Evidence } from './evidence'

const React = { createElement }

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.Node = dom.window.Node
}

test('Evidence renders provenance, mode, freshness and observation time without inferring a provider claim', () => {
  setupDom()
  cleanup()
  const view = render(
    <Evidence
      title="Procedencia de la lectura"
      state={{ mode: 'mock', freshness: 'missing', source: 'fixture-local', observedAt: '2026-09-22T10:00:00.000Z', reason: 'no_observation' }}
    />,
  )

  const article = view.getByRole('article', { name: 'Procedencia de la lectura' })
  assert.match(article.textContent ?? '', /Fuente: fixture-local/)
  assert.match(article.textContent ?? '', /Modo: Mock/)
  assert.match(article.textContent ?? '', /Freshness: missing/)
  assert.match(article.textContent ?? '', /Observado: 2026-09-22T10:00:00.000Z/)
  assert.match(article.textContent ?? '', /Motivo: no_observation/)
})

test('Evidence keeps a fresh live observation distinguishable from its source metadata', () => {
  setupDom()
  cleanup()
  const view = render(
    <Evidence
      state={{ mode: 'live', freshness: 'fresh', source: 'provider-contract', observedAt: '2026-09-22T11:00:00.000Z', lastSuccessfulObservedAt: '2026-09-22T11:00:00.000Z' }}
    />,
  )

  const article = view.getByRole('article', { name: 'Estado de evidencia' })
  assert.match(article.textContent ?? '', /Modo: Live/)
  assert.match(article.textContent ?? '', /Freshness: fresh/)
  assert.match(article.textContent ?? '', /Último éxito: 2026-09-22T11:00:00.000Z/)
})
