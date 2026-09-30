import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { MarketplaceRfqHistory } from './rfq-history'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/agronautas/marketplace',
  })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.Event = dom.window.Event
}

const response = {
  contractVersion: 'agronautas-marketplace-v1' as const,
  status: 'fresh' as const,
  items: [
    {
      contractVersion: 'agronautas-marketplace-v1' as const,
      rfqId: 'rfq-1',
      workspaceId: 'workspace-1',
      requesterActorId: 'actor-1',
      listingId: 'listing-1',
      itemName: 'Arroz',
      quantity: 4,
      unit: 'toneladas',
      locality: 'Mercedes',
      participantRefs: ['participant-1'],
      reviewStatus: 'submitted' as const,
      revision: 1,
      idempotencyKey: 'rfq-listing-1-mercedes-4-toneladas',
      createdAt: '2026-09-21T10:00:00.000Z',
      updatedAt: '2026-09-21T10:00:00.000Z',
      reviewedAt: null,
      reviewerActorId: null,
    },
  ],
  audit: [
    {
      contractVersion: 'agronautas-marketplace-v1' as const,
      auditId: 'audit-1',
      workspaceId: 'workspace-1',
      actorId: 'actor-1',
      action: 'submit' as const,
      targetId: 'rfq-1',
      outcome: 'accepted' as const,
      revisionBefore: null,
      revisionAfter: 1,
      requestId: 'request-create-1',
      occurredAt: '2026-09-21T10:00:00.000Z',
    },
  ],
  retryable: false,
}

test('RFQ history renders scoped lifecycle, revision, request IDs and provenance audit', () => {
  setupDom()
  cleanup()
  const view = render(
    <MarketplaceRfqHistory
      workspaceId="workspace-1"
      response={response}
      isMutating={false}
      onCancel={async () => undefined}
    />
  )

  assert.ok(view.getByText('Arroz'))
  assert.ok(view.getByText('Enviada'))
  assert.equal(view.queryByText(/Revisión 1/), null)
  assert.doesNotMatch(view.container.textContent ?? '', /request-create-1/)
  assert.doesNotMatch(
    view.container.textContent ?? '',
    /idempotencia|rfq-listing-1-mercedes-4-toneladas/
  )
  assert.equal(view.queryByText('Cítricos'), null)
})

test('RFQ history handles forbidden cancellation and stale recovery without removing the record', async () => {
  setupDom()
  cleanup()
  const view = render(
    <MarketplaceRfqHistory
      workspaceId="workspace-1"
      response={response}
      isMutating={false}
      onCancel={async () => {
        throw Object.assign(new Error('stale'), { status: 409 })
      }}
    />
  )

  fireEvent.click(view.getByRole('button', { name: 'Cancelar consulta de Arroz' }))
  await waitFor(() => assert.ok(view.getByRole('alert')))
  assert.match(view.getByRole('alert').textContent ?? '', /cambiado|actualizá/i)
  assert.ok(view.getByText('Arroz'))
})
