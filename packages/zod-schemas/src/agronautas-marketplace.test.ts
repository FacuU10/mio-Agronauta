import test from 'node:test'
import assert from 'node:assert/strict'
import {
  agronautasMarketplaceListingSchema,
  agronautasMarketplaceDiscoveryResponseSchema,
  agronautasMarketplaceRfqCreateRequestSchema,
  agronautasMarketplaceRfqReviewRequestSchema,
  agronautasMarketplaceRfqResponseSchema,
  isForbiddenMarketplaceAction,
} from './agronautas-marketplace'

const listing = {
  contractVersion: 'agronautas-marketplace-v1' as const,
  listingId: 'listing-1',
  workspaceId: 'workspace-1',
  marketId: 'mercedes-local',
  participantRef: 'participant-local-1',
  itemName: 'Arroz cáscara',
  title: 'Arroz cáscara disponible',
  availabilityStatus: 'available' as const,
  availabilityAt: '2026-09-21T10:00:00.000Z',
  quantity: 100,
  unit: 'toneladas',
  qualityStatus: 'unknown' as const,
  provenance: { sourceKey: 'operator-catalog', sourceUrl: null, recordedAt: '2026-09-21T10:00:00.000Z' },
  freshnessExpiresAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
}

test('marketplace contracts require scope, provenance, freshness and explicit unknown facts', () => {
  assert.equal(agronautasMarketplaceListingSchema.safeParse(listing).success, true)
  assert.equal(agronautasMarketplaceListingSchema.safeParse({ ...listing, provenance: undefined }).success, false)
  assert.equal(agronautasMarketplaceListingSchema.safeParse({ ...listing, quantity: undefined }).success, false)
  assert.equal(agronautasMarketplaceDiscoveryResponseSchema.safeParse({
    contractVersion: 'agronautas-marketplace-v1',
    status: 'fresh',
    items: [listing],
    staleListingCount: 0,
    generatedAt: '2026-09-21T10:01:00.000Z',
  }).success, true)
})

test('RFQ contracts are review-only and reject financial or order-shaped fields', () => {
  const request = agronautasMarketplaceRfqCreateRequestSchema.safeParse({
    contractVersion: 'agronautas-marketplace-v1',
    workspaceId: 'workspace-1',
    listingId: 'listing-1',
    itemName: 'Arroz cáscara',
    quantity: 20,
    unit: 'toneladas',
    locality: 'Mercedes',
    idempotencyKey: 'rfq-1',
    participantRefs: ['participant-local-1'],
  })
  assert.equal(request.success, true)
  assert.equal(agronautasMarketplaceRfqCreateRequestSchema.safeParse({
    ...(request.success ? request.data : {}),
    price: 123,
  }).success, false)
  assert.equal(isForbiddenMarketplaceAction('offer'), true)
  assert.equal(isForbiddenMarketplaceAction('checkout'), true)
  assert.equal(isForbiddenMarketplaceAction('inventory'), true)
  assert.equal(isForbiddenMarketplaceAction('review'), false)
})

test('RFQ review response preserves durable status, revision, audit and unavailable state', () => {
  assert.equal(agronautasMarketplaceRfqReviewRequestSchema.safeParse({
    contractVersion: 'agronautas-marketplace-v1',
    expectedRevision: 1,
    status: 'under_review',
  }).success, true)
  assert.equal(agronautasMarketplaceRfqResponseSchema.safeParse({
    contractVersion: 'agronautas-marketplace-v1',
    status: 'unavailable',
    items: [],
    audit: [],
    retryable: true,
    reason: 'participant_handoff_unavailable',
  }).success, true)
})
