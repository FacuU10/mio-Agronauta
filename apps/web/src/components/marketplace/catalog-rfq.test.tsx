import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react'
import { MarketplaceCatalogRfq } from './catalog-rfq'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/agronautas/marketplace',
  })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.FormData = dom.window.FormData
  globalThis.Event = dom.window.Event
}

test('signed-out marketplace shows the public example with a gated offer action', () => {
  setupDom()
  cleanup()
  const view = render(
    <MarketplaceCatalogRfq
      listings={{
        contractVersion: 'agronautas-marketplace-v1',
        status: 'empty',
        staleListingCount: 0,
        generatedAt: '2026-09-21T10:00:00.000Z',
        retryable: false,
        items: [],
      }}
      rfqs={{
        contractVersion: 'agronautas-marketplace-v1',
        status: 'unavailable',
        items: [],
        audit: [],
        retryable: true,
        reason: 'Agronautas session is required for this request.',
      }}
      accessState="unauthorized"
      isLoading={false}
      error="Missing session"
      onRetry={async () => undefined}
      onSubmit={async () => undefined}
    />
  )
  assert.ok(view.getByRole('heading', { name: '70 vaquillonas para madre' }))
  assert.ok(view.getByRole('button', { name: 'Enviar oferta' }))
  assert.equal(view.queryByRole('link', { name: 'Iniciar sesión' }), null)
  assert.ok(view.getByText('Para enviar una oferta, te pediremos iniciar sesión.'))
  assert.equal(view.queryByRole('button', { name: 'Reintentar historial' }), null)
  assert.doesNotMatch(
    view.container.textContent ?? '',
    /RFQ|Missing session|Agronautas session is required/
  )
})

test('marketplace view renders truthful catalog and review-only RFQ handoff', () => {
  setupDom()
  cleanup()
  const view = render(
    <MarketplaceCatalogRfq
      listings={{
        contractVersion: 'agronautas-marketplace-v1',
        status: 'fresh',
        staleListingCount: 0,
        generatedAt: '2026-09-21T10:00:00.000Z',
        retryable: false,
        items: [
          {
            contractVersion: 'agronautas-marketplace-v1',
            listingId: 'listing-1',
            workspaceId: 'workspace-1',
            marketId: 'mercedes-local',
            participantRef: 'participant-1',
            itemName: 'Arroz',
            title: 'Arroz disponible',
            availabilityStatus: 'available',
            availabilityAt: '2026-09-21T10:00:00.000Z',
            quantity: 100,
            unit: 'toneladas',
            qualityStatus: 'unknown',
            provenance: {
              sourceKey: 'operator-catalog',
              sourceUrl: null,
              recordedAt: '2026-09-21T10:00:00.000Z',
            },
            freshnessExpiresAt: '2026-09-22T10:00:00.000Z',
            updatedAt: '2026-09-21T10:00:00.000Z',
          },
        ],
      }}
      rfqs={{
        contractVersion: 'agronautas-marketplace-v1',
        status: 'fresh',
        items: [],
        audit: [],
        retryable: false,
      }}
      isLoading={false}
      error={null}
      onRetry={async () => undefined}
      onSubmit={async () => undefined}
    />
  )
  const rendered = view.container.textContent ?? ''
  assert.match(rendered, /Arroz disponible/)
  assert.match(rendered, /Precio y entrega: a consultar/)
  assert.match(rendered, /Pedí una cotización/)
  assert.doesNotMatch(rendered, /Checkout Pro|Comprar ahora|Pagar ahora|Pedido creado/i)
})

test('marketplace view exposes empty, stale and unavailable states without fabricated rows', () => {
  setupDom()
  cleanup()
  const view = render(
    <MarketplaceCatalogRfq
      listings={{
        contractVersion: 'agronautas-marketplace-v1',
        status: 'degraded',
        staleListingCount: 2,
        generatedAt: '2026-09-21T10:00:00.000Z',
        retryable: true,
        items: [],
        reason: 'stale_catalog',
      }}
      rfqs={{
        contractVersion: 'agronautas-marketplace-v1',
        status: 'unavailable',
        items: [],
        audit: [],
        retryable: true,
        reason: 'storage_unavailable',
      }}
      isLoading={false}
      error="storage unavailable"
      onRetry={async () => undefined}
      onSubmit={async () => undefined}
    />
  )
  assert.ok(view.getAllByRole('alert').length >= 1)
  assert.ok(view.getByText('No pudimos cargar las publicaciones'))
  assert.equal(view.queryByText('Todavía no hay publicaciones'), null)
  assert.ok(view.getAllByRole('button', { name: 'Volver a intentar' }).length >= 1)
})

test('catalog failures do not replace a successful empty consultation history', () => {
  setupDom()
  cleanup()
  const view = render(
    <MarketplaceCatalogRfq
      workspaceId="workspace-1"
      listings={{
        contractVersion: 'agronautas-marketplace-v1',
        status: 'empty',
        staleListingCount: 0,
        generatedAt: '2026-09-21T10:00:00.000Z',
        retryable: false,
        items: [],
      }}
      rfqs={{
        contractVersion: 'agronautas-marketplace-v1',
        status: 'fresh',
        items: [],
        audit: [],
        retryable: false,
      }}
      isLoading={false}
      error="catalog failed"
      onRetry={async () => undefined}
      onSubmit={async () => undefined}
    />
  )
  assert.ok(view.getByText('No pudimos cargar las publicaciones'))
  assert.ok(view.getByText('Todavía no enviaste consultas'))
  assert.equal(view.queryByText('Todavía no hay publicaciones'), null)
  assert.equal(view.queryByLabelText('Buscar publicaciones'), null)
  assert.doesNotMatch(view.container.textContent ?? '', /BFF|Freshness|catalog failed/)
})
