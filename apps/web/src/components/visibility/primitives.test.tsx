import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import { EvidenceDrawer, FreshnessBanner, MapFrame, SourceCard, StatusBadge, VisibilityState } from './primitives'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
}

test('visibility primitives explain degraded, stale and missing states without relying on color', () => {
  setupDom()
  cleanup()

  const view = render(
    <div>
      <StatusBadge state="degraded" />
      <FreshnessBanner state="stale" lastSuccessfulAt="2026-06-03T00:00:00.000Z" />
      <VisibilityState state="missing" title="Sin snapshot" description="No hay datos contratados para este lote." retryLabel="Reintentar" />
    </div>,
  )

  assert.ok(view.getByText('Degradado'))
  assert.ok(view.getAllByRole('status').some((item) => item.textContent?.includes('Degradado')))
  assert.ok(view.getByText(/Último dato exitoso/i))
  assert.ok(view.getByRole('alert').textContent?.includes('Sin snapshot'))
  assert.ok(view.getByRole('button', { name: 'Reintentar' }))
})

test('evidence and source primitives preserve provenance and map fallback affordance', () => {
  setupDom()
  cleanup()

  const view = render(
    <div>
      <SourceCard source="open-meteo" mode="live" observedAt="2026-06-03T00:00:00.000Z" lastSuccessfulObservedAt="2026-06-03T00:00:00.000Z" />
      <EvidenceDrawer evidence={['weather:open-meteo', 'soil:inta']} />
      <MapFrame title="Previsualización de cobertura" fallback="Mercedes · AR-W · -29.18, -58.07" />
    </div>,
  )

  assert.ok(view.getByText('open-meteo'))
  assert.ok(view.getByText('weather:open-meteo'))
  assert.ok(view.getByRole('region', { name: /alternativa no cartográfica/i }))
  assert.ok(view.getByText(/Mercedes · AR-W/i))
})
