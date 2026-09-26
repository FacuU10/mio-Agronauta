import test from 'node:test'
import assert from 'node:assert/strict'
import type { AuthPrincipal } from '../../domain/auth/contracts'
import type {
  MarketplaceAuditRecord,
  MarketplaceListingRecord,
  MarketplaceRepository,
  MarketplaceRfqRecord,
} from '../../domain/repositories/agronautas-marketplace'
import { DiscoverMarketplaceListings, SubmitMarketplaceRfq, ReviewMarketplaceRfq, CancelMarketplaceRfq } from './agronautas-marketplace'

const principal: AuthPrincipal = {
  actorId: 'actor-1', sessionId: 'session-1', membershipId: 'membership-1', workspaceId: 'workspace-1', workspaceKey: 'workspace-1', role: 'operator', scopes: ['read', 'write', 'admin'], expiresAt: '2026-09-22T10:00:00.000Z',
}

function listing(overrides: Partial<MarketplaceListingRecord> = {}): MarketplaceListingRecord {
  return {
    listingId: 'listing-1', workspaceId: 'workspace-1', marketId: 'mercedes-local', participantRef: 'participant-1', itemName: 'Arroz', title: 'Arroz disponible', availabilityStatus: 'available', availabilityAt: new Date('2026-09-21T10:00:00.000Z'), quantity: 100, unit: 'toneladas', qualityStatus: 'unknown', sourceKey: 'operator-catalog', sourceUrl: null, provenanceRecordedAt: new Date('2026-09-21T10:00:00.000Z'), freshnessExpiresAt: new Date('2026-09-22T10:00:00.000Z'), updatedAt: new Date('2026-09-21T10:00:00.000Z'), ...overrides,
  }
}

function rfq(overrides: Partial<MarketplaceRfqRecord> = {}): MarketplaceRfqRecord {
  return {
    rfqId: 'rfq-1', workspaceId: 'workspace-1', requesterActorId: 'actor-1', listingId: 'listing-1', itemName: 'Arroz', quantity: 20, unit: 'toneladas', locality: 'Mercedes', participantRefs: ['participant-1'], reviewStatus: 'submitted', revision: 1, idempotencyKey: 'rfq-key-1', createdAt: new Date('2026-09-21T10:00:00.000Z'), updatedAt: new Date('2026-09-21T10:00:00.000Z'), reviewedAt: null, reviewerActorId: null, ...overrides,
  }
}

function audit(overrides: Partial<MarketplaceAuditRecord> = {}): MarketplaceAuditRecord {
  return { auditId: 'audit-1', workspaceId: 'workspace-1', actorId: 'actor-1', action: 'submit', targetId: 'rfq-1', outcome: 'accepted', revisionBefore: null, revisionAfter: 1, requestId: 'request-1', occurredAt: new Date('2026-09-21T10:00:00.000Z'), ...overrides }
}

function repository(seed: { listings?: MarketplaceListingRecord[]; rfqs?: MarketplaceRfqRecord[] } = {}): MarketplaceRepository & { audits: MarketplaceAuditRecord[] } {
  const listings = seed.listings ?? [listing()]
  const rfqs = seed.rfqs ?? []
  const audits: MarketplaceAuditRecord[] = []
  return {
    audits,
    async listListings(input) { return listings.filter((entry) => entry.workspaceId === input.workspaceId && (!input.marketId || entry.marketId === input.marketId)) },
    async createRfq(input) {
      const duplicate = rfqs.find((entry) => entry.workspaceId === input.workspaceId && entry.idempotencyKey === input.idempotencyKey)
      if (duplicate) return { status: 'duplicate', resource: duplicate, audit: audit({ targetId: duplicate.rfqId, outcome: 'duplicate', action: 'retry' }) }
      const resource = rfq({ rfqId: `rfq-${rfqs.length + 1}`, requesterActorId: input.actorId, listingId: input.listingId ?? null, itemName: input.itemName, quantity: input.quantity, unit: input.unit, locality: input.locality, participantRefs: input.participantRefs, idempotencyKey: input.idempotencyKey })
      rfqs.push(resource)
      return { status: 'created', resource, audit: audit({ targetId: resource.rfqId }) }
    },
    async getRfq(input) { return rfqs.find((entry) => entry.rfqId === input.rfqId && entry.workspaceId === input.workspaceId) ?? null },
    async reviewRfq(input) {
      const resource = rfqs.find((entry) => entry.rfqId === input.rfqId && entry.workspaceId === input.workspaceId)
      if (!resource) return { status: 'not_found', audit: audit({ targetId: input.rfqId, outcome: 'unavailable', action: 'review' }) }
      if (resource.revision !== input.expectedRevision) return { status: 'stale', resource, audit: audit({ targetId: resource.rfqId, outcome: 'conflict', action: 'review', revisionBefore: resource.revision, revisionAfter: resource.revision }) }
      resource.reviewStatus = input.status
      resource.revision += 1
      resource.reviewerActorId = input.actorId
      resource.reviewedAt = new Date('2026-09-21T10:05:00.000Z')
      return { status: 'reviewed', resource, audit: audit({ targetId: resource.rfqId, action: 'review', revisionBefore: input.expectedRevision, revisionAfter: resource.revision }) }
    },
    async cancelRfq(input) {
      const resource = rfqs.find((entry) => entry.rfqId === input.rfqId && entry.workspaceId === input.workspaceId)
      if (!resource) return { status: 'not_found', audit: audit({ targetId: input.rfqId, outcome: 'unavailable', action: 'cancel' }) }
      resource.reviewStatus = 'cancelled'
      resource.revision += 1
      return { status: 'cancelled', resource, audit: audit({ targetId: resource.rfqId, action: 'cancel', revisionBefore: input.expectedRevision, revisionAfter: resource.revision }) }
    },
    async listRfqs() { return { items: rfqs, audit: audits } },
    async appendAudit(entry) { audits.push(entry); return entry },
  }
}

test('discovery filters stale listings and never returns another workspace', async () => {
  const now = new Date('2026-09-21T12:00:00.000Z')
  const useCase = new DiscoverMarketplaceListings(repository({ listings: [listing(), listing({ listingId: 'stale-1', freshnessExpiresAt: new Date('2026-09-20T10:00:00.000Z') }), listing({ listingId: 'foreign', workspaceId: 'workspace-2' })] }))
  const response = await useCase.execute({ workspaceId: 'workspace-1', marketId: 'mercedes-local', now }, principal)
  assert.equal(response.status, 'degraded')
  assert.deepEqual(response.items.map((entry) => entry.listingId), ['listing-1'])
  assert.equal(response.staleListingCount, 1)
})

test('RFQ submission is scoped, idempotent and review/cancel operations remain human-controlled', async () => {
  const repo = repository()
  const submit = new SubmitMarketplaceRfq(repo)
  const input = { contractVersion: 'agronautas-marketplace-v1' as const, workspaceId: 'workspace-1', listingId: 'listing-1', itemName: 'Arroz', quantity: 20, unit: 'toneladas', locality: 'Mercedes', idempotencyKey: 'same-rfq', participantRefs: ['participant-1'] }
  const first = await submit.execute(input, principal, 'request-1')
  const duplicate = await submit.execute(input, principal, 'request-2')
  assert.equal(first.status, 'created')
  assert.equal(duplicate.status, 'duplicate')
  const reviewed = await new ReviewMarketplaceRfq(repo).execute({ workspaceId: 'workspace-1', rfqId: first.items[0]!.rfqId, expectedRevision: 1, status: 'under_review' }, principal, 'review-1')
  assert.equal(reviewed.items[0]?.reviewStatus, 'under_review')
  const cancelled = await new CancelMarketplaceRfq(repo).execute({ workspaceId: 'workspace-1', rfqId: first.items[0]!.rfqId, expectedRevision: 2 }, principal, 'cancel-1')
  assert.equal(cancelled.items[0]?.reviewStatus, 'cancelled')
  await assert.rejects(() => submit.execute({ ...input, workspaceId: 'workspace-2' }, principal, 'foreign'), /WORKSPACE_SCOPE_DENIED/)
})
