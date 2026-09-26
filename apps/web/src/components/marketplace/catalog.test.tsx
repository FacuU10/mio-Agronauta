import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { MarketplaceCatalog } from './catalog'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/agronautas/marketplace' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.HTMLInputElement = dom.window.HTMLInputElement
  globalThis.HTMLSelectElement = dom.window.HTMLSelectElement
  globalThis.Event = dom.window.Event
}

const listings = {
  contractVersion: 'agronautas-marketplace-v1' as const,
  status: 'fresh' as const,
  staleListingCount: 1,
  generatedAt: '2026-09-21T10:00:00.000Z',
  retryable: false,
  items: [
    {
      contractVersion: 'agronautas-marketplace-v1' as const,
      listingId: 'listing-rice',
      workspaceId: 'workspace-1',
      marketId: 'mercedes-local',
      participantRef: 'participant-rice',
      itemName: 'Arroz',
      title: 'Arroz de Corrientes',
      availabilityStatus: 'available' as const,
      availabilityAt: '2026-09-21T09:00:00.000Z',
      quantity: 100,
      unit: 'toneladas',
      qualityStatus: 'verified' as const,
      provenance: { sourceKey: 'operator-catalog', sourceUrl: null, recordedAt: '2026-09-21T08:00:00.000Z' },
      freshnessExpiresAt: '2026-09-22T10:00:00.000Z',
      updatedAt: '2026-09-21T09:00:00.000Z',
    },
    {
      contractVersion: 'agronautas-marketplace-v1' as const,
      listingId: 'listing-citrus-other-workspace',
      workspaceId: 'workspace-2',
      marketId: 'bella-vista-local',
      participantRef: 'participant-citrus',
      itemName: 'Cítricos',
      title: 'Cítricos de Bella Vista',
      availabilityStatus: 'available' as const,
      availabilityAt: '2026-09-21T09:00:00.000Z',
      quantity: 20,
      unit: 'cajones',
      qualityStatus: 'unverified' as const,
      provenance: { sourceKey: 'other-workspace', sourceUrl: null, recordedAt: '2026-09-21T08:00:00.000Z' },
      freshnessExpiresAt: '2026-09-22T10:00:00.000Z',
      updatedAt: '2026-09-21T09:00:00.000Z',
    },
  ],
}

test('catalog filters by search and market without leaking another workspace', () => {
  setupDom()
  cleanup()
  const view = render(<MarketplaceCatalog workspaceId="workspace-1" response={listings} onSelectListing={() => undefined} />)

  assert.ok(view.getByText('Arroz de Corrientes'))
  assert.equal(view.queryByText('Cítricos de Bella Vista'), null)
  assert.ok(view.getByText('operator-catalog'))
  assert.ok(view.getByText('2026-09-22T10:00:00.000Z'))

  fireEvent.input(view.getByLabelText('Buscar publicaciones'), { target: { value: 'cítricos' } })
  assert.ok(view.getByText('No hay publicaciones que coincidan con los filtros del workspace.'))
})

test('catalog renders empty and unavailable recovery states without fabricated listings', () => {
  setupDom()
  cleanup()
  const onRetry = () => undefined
  const view = render(<MarketplaceCatalog workspaceId="workspace-1" response={{ ...listings, status: 'unavailable', items: [], reason: 'storage_unavailable', retryable: true }} onSelectListing={() => undefined} onRetry={onRetry} />)

  assert.ok(view.getByRole('alert'))
  assert.ok(view.getByText('No hay publicaciones actuales verificables.'))
  assert.ok(view.getByRole('button', { name: 'Reintentar catálogo' }))
  assert.doesNotMatch(view.container.textContent ?? '', /Comprar|Pagar|Checkout|Pedido|Precio|Oferta/i)
})
