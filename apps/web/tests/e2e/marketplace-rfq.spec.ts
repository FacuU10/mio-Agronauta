import { expect, test } from '@playwright/test'
import type { AgronautasMarketplaceRfqResponse } from '@/lib/agronautas/schemas'

const authStatus = {
  principal: { actorId: 'actor-demo', sessionId: 'session-demo', membershipId: 'membership-demo', workspaceId: 'workspace-1', workspaceKey: 'agronautas-pilot', role: 'operator', scopes: ['read', 'write'], expiresAt: '2030-09-15T15:00:00.000Z' },
  memberships: [],
  accessExpiresAt: '2030-09-15T15:00:00.000Z',
  refreshExpiresAt: '2030-10-15T15:00:00.000Z',
}

const listingResponse = {
  contractVersion: 'agronautas-marketplace-v1',
  status: 'fresh',
  staleListingCount: 0,
  generatedAt: '2026-09-21T10:00:00.000Z',
  retryable: false,
  items: [{ contractVersion: 'agronautas-marketplace-v1', listingId: 'listing-demo-1', workspaceId: 'workspace-1', marketId: 'mercedes-local', participantRef: 'participant-demo-1', itemName: 'Arroz', title: 'Arroz de Corrientes', availabilityStatus: 'available', availabilityAt: '2026-09-21T09:00:00.000Z', quantity: 100, unit: 'toneladas', qualityStatus: 'verified', provenance: { sourceKey: 'operator-catalog', sourceUrl: null, recordedAt: '2026-09-21T08:00:00.000Z' }, freshnessExpiresAt: '2026-09-22T10:00:00.000Z', updatedAt: '2026-09-21T09:00:00.000Z' }],
}

test.describe('Marketplace catalog and RFQ', () => {
  test('stubbed demo flow keeps request identity, human review lifecycle, and scope boundaries visible', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'evidence', description: 'stubbed/demo browser evidence only; not local-real or production proof' })
    let rfqResponse: AgronautasMarketplaceRfqResponse = { contractVersion: 'agronautas-marketplace-v1', status: 'fresh', items: [], audit: [], retryable: false }

    await page.route('**/api/agronautas/**', async (route) => {
      const request = route.request()
      const pathname = new URL(request.url()).pathname
      if (pathname.endsWith('/auth/status')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authStatus) })
      if (pathname.endsWith('/marketplace/listings')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listingResponse) })
      if (pathname.endsWith('/marketplace/rfqs') && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rfqResponse) })
      if (pathname.endsWith('/marketplace/rfqs') && request.method() === 'POST') {
        rfqResponse = { contractVersion: 'agronautas-marketplace-v1', status: 'created', items: [{ contractVersion: 'agronautas-marketplace-v1', rfqId: 'rfq-demo-1', workspaceId: 'workspace-1', requesterActorId: 'actor-demo', listingId: 'listing-demo-1', itemName: 'Arroz', quantity: 4, unit: 'toneladas', locality: 'Mercedes', participantRefs: ['participant-demo-1'], reviewStatus: 'submitted', revision: 1, idempotencyKey: 'rfq-listing-demo-1-mercedes-4-toneladas', createdAt: '2026-09-21T10:00:00.000Z', updatedAt: '2026-09-21T10:00:00.000Z', reviewedAt: null, reviewerActorId: null }], audit: [{ contractVersion: 'agronautas-marketplace-v1', auditId: 'audit-create-1', workspaceId: 'workspace-1', actorId: 'actor-demo', action: 'submit', targetId: 'rfq-demo-1', outcome: 'accepted', revisionBefore: null, revisionAfter: 1, requestId: 'request-create-1', occurredAt: '2026-09-21T10:00:00.000Z' }], retryable: false }
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(rfqResponse) })
      }
      if (pathname.endsWith('/marketplace/rfqs/rfq-demo-1') && request.method() === 'DELETE') {
        rfqResponse = { ...rfqResponse, status: 'cancelled', items: rfqResponse.items.map((item) => ({ ...item, reviewStatus: 'cancelled', revision: 2, updatedAt: '2026-09-21T10:01:00.000Z' })), audit: [...rfqResponse.audit, { contractVersion: 'agronautas-marketplace-v1', auditId: 'audit-cancel-1', workspaceId: 'workspace-1', actorId: 'actor-demo', action: 'cancel', targetId: 'rfq-demo-1', outcome: 'accepted', revisionBefore: 1, revisionAfter: 2, requestId: 'request-cancel-1', occurredAt: '2026-09-21T10:01:00.000Z' }] }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rfqResponse) })
      }
      return route.continue()
    })

    await page.goto('/agronautas/marketplace')
    await expect(page.getByRole('heading', { name: 'Publicaciones verificables' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Arroz de Corrientes' })).toBeVisible()
    await page.getByRole('button', { name: 'Solicitar revisión humana' }).click()
    await page.getByLabel('Cantidad solicitada').fill('4')
    await page.getByLabel('Localidad de entrega').fill('Mercedes')
    await page.getByRole('button', { name: 'Enviar a revisión humana' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Solicitud enviada a revisión humana' })).toBeVisible()
    await expect(page.getByText('Solicitud HTTP: request-create-1', { exact: true })).toBeVisible()
    await expect(page.getByText('RFQ rfq-demo-1')).toBeVisible()
    await expect(page.getByText('rfq-listing-demo-1-mercedes-4-toneladas')).toBeVisible()
    await expect(page.getByText(/Pago confirmado|Pedido creado|Checkout|Oferta aceptada/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Cancelar solicitud rfq-demo-1' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Cancelación de rfq-demo-1 confirmada' })).toBeVisible()
    await expect(page.getByText('request-cancel-1')).toBeVisible()
  })
})
