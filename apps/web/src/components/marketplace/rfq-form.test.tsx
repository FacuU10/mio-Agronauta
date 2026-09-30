import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { MarketplaceRfqForm } from './rfq-form'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/agronautas/marketplace',
  })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.HTMLInputElement = dom.window.HTMLInputElement
  globalThis.FormData = dom.window.FormData
  globalThis.Event = dom.window.Event
}

const listing = {
  contractVersion: 'agronautas-marketplace-v1' as const,
  listingId: 'listing-1',
  workspaceId: 'workspace-1',
  marketId: 'mercedes-local',
  participantRef: 'participant-1',
  itemName: 'Arroz',
  title: 'Arroz disponible',
  availabilityStatus: 'available' as const,
  availabilityAt: '2026-09-21T09:00:00.000Z',
  quantity: 100,
  unit: 'toneladas',
  qualityStatus: 'unknown' as const,
  provenance: {
    sourceKey: 'operator-catalog',
    sourceUrl: null,
    recordedAt: '2026-09-21T08:00:00.000Z',
  },
  freshnessExpiresAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-21T09:00:00.000Z',
}

test('RFQ form validates required fields before invoking the typed handoff', async () => {
  setupDom()
  cleanup()
  let calls = 0
  const view = render(
    <MarketplaceRfqForm
      workspaceId="workspace-1"
      listing={listing}
      isSubmitting={false}
      onSubmit={async () => {
        calls += 1
      }}
    />
  )

  fireEvent.submit(
    view.getByRole('button', { name: 'Enviar consulta' }).closest('form') as HTMLFormElement
  )
  await waitFor(() => assert.ok(view.getByRole('alert')))
  assert.match(view.getByRole('alert').textContent ?? '', /cantidad|localidad|unidad/i)
  assert.equal(calls, 0)
})

test('RFQ form sends a stable idempotency key and reports duplicate request recovery', async () => {
  setupDom()
  cleanup()
  let submitted: Record<string, unknown> | undefined
  const view = render(
    <MarketplaceRfqForm
      workspaceId="workspace-1"
      listing={listing}
      isSubmitting={false}
      onSubmit={async (input) => {
        submitted = input as unknown as Record<string, unknown>
        return {
          contractVersion: 'agronautas-marketplace-v1',
          status: 'duplicate',
          items: [],
          audit: [
            {
              contractVersion: 'agronautas-marketplace-v1',
              auditId: 'audit-1',
              workspaceId: 'workspace-1',
              actorId: 'actor-1',
              action: 'submit',
              targetId: 'rfq-1',
              outcome: 'duplicate',
              revisionBefore: 1,
              revisionAfter: 1,
              requestId: 'request-duplicate',
              occurredAt: '2026-09-21T10:00:00.000Z',
            },
          ],
          retryable: false,
        }
      }}
    />
  )

  fireEvent.input(view.getByLabelText('Cantidad solicitada'), { target: { value: '4' } })
  fireEvent.input(view.getByLabelText('Localidad de entrega'), { target: { value: 'Mercedes' } })
  fireEvent.submit(
    view.getByRole('button', { name: 'Enviar consulta' }).closest('form') as HTMLFormElement
  )

  await waitFor(() =>
    assert.ok(view.getByText('Ya recibimos esta consulta. No hace falta enviarla de nuevo.'))
  )
  assert.equal(submitted?.['workspaceId'], 'workspace-1')
  assert.equal(submitted?.['idempotencyKey'], 'rfq-listing-1-mercedes-4-toneladas')
  assert.equal(view.queryByText(/request-duplicate/), null)
})

test('RFQ form keeps forbidden and conflict recovery visible without claiming a commercial outcome', async () => {
  setupDom()
  cleanup()
  const view = render(
    <MarketplaceRfqForm
      workspaceId="workspace-1"
      listing={listing}
      isSubmitting={false}
      onSubmit={async () => {
        throw Object.assign(new Error('forbidden'), { status: 403 })
      }}
    />
  )

  fireEvent.input(view.getByLabelText('Cantidad solicitada'), { target: { value: '2' } })
  fireEvent.input(view.getByLabelText('Localidad de entrega'), { target: { value: 'Mercedes' } })
  fireEvent.submit(
    view.getByRole('button', { name: 'Enviar consulta' }).closest('form') as HTMLFormElement
  )

  await waitFor(() =>
    assert.match(view.getByRole('alert').textContent ?? '', /permisos|workspace/i)
  )
  assert.doesNotMatch(
    view.container.textContent ?? '',
    /Pago confirmado|Pedido creado|Checkout|Oferta aceptada/i
  )
})
