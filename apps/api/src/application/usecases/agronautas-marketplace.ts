import {
  agronautasMarketplaceAuditItemSchema,
  agronautasMarketplaceDiscoveryResponseSchema,
  agronautasMarketplaceRfqResponseSchema,
  type AgronautasMarketplaceDiscoveryResponse,
  type AgronautasMarketplaceRfqCreateRequest,
  type AgronautasMarketplaceRfqResponse,
} from '@repo/zod-schemas'
import type { AuthPrincipal } from '../../domain/auth/contracts'
import type { MarketplaceAuditRecord, MarketplaceRepository, MarketplaceRfqCreateInput } from '../../domain/repositories/agronautas-marketplace'

type MarketplacePrincipal = Pick<AuthPrincipal, 'actorId' | 'workspaceId' | 'scopes' | 'role'>

export class DiscoverMarketplaceListings {
  constructor(private readonly repository: MarketplaceRepository) {}

  async execute(input: { workspaceId: string; marketId?: string; search?: string; now?: Date }, principal: MarketplacePrincipal): Promise<AgronautasMarketplaceDiscoveryResponse> {
    assertScope(principal, input.workspaceId, 'read')
    const now = input.now ?? new Date()
    const records = await this.repository.listListings({ workspaceId: input.workspaceId, marketId: input.marketId, search: input.search })
    const staleListingCount = records.filter((record) => record.availabilityStatus !== 'available' || record.freshnessExpiresAt.getTime() <= now.getTime()).length
    const items = records.filter((record) => record.availabilityStatus === 'available' && record.freshnessExpiresAt.getTime() > now.getTime()).map(toListingResponse)
    const status = items.length === 0 ? staleListingCount > 0 ? 'degraded' : 'empty' : staleListingCount > 0 ? 'degraded' : 'fresh'
    return agronautasMarketplaceDiscoveryResponseSchema.parse({ contractVersion: 'agronautas-marketplace-v1', status, items, staleListingCount, generatedAt: now.toISOString(), ...(staleListingCount > 0 ? { reason: 'stale_or_unavailable_catalog' } : {}) })
  }
}

export class ListMarketplaceRfqs {
  constructor(private readonly repository: MarketplaceRepository) {}

  async execute(input: { workspaceId: string }, principal: MarketplacePrincipal): Promise<AgronautasMarketplaceRfqResponse> {
    assertScope(principal, input.workspaceId, 'read')
    const result = await this.repository.listRfqs({ workspaceId: input.workspaceId, requesterActorId: principal.role === 'reader' ? principal.actorId : undefined })
    return toRfqResponse('fresh', result.items, result.audit)
  }
}

export class SubmitMarketplaceRfq {
  constructor(private readonly repository: MarketplaceRepository) {}

  async execute(input: AgronautasMarketplaceRfqCreateRequest, principal: MarketplacePrincipal, requestId: string): Promise<AgronautasMarketplaceRfqResponse> {
    assertScope(principal, input.workspaceId, 'write')
    const result = await this.repository.createRfq({ ...input, actorId: principal.actorId, requestId } satisfies MarketplaceRfqCreateInput)
    return toRfqResponse(result.status, [result.resource], [result.audit])
  }
}

export class ReviewMarketplaceRfq {
  constructor(private readonly repository: MarketplaceRepository) {}

  async execute(input: { workspaceId: string; rfqId: string; expectedRevision: number; status: 'under_review' | 'approved_for_handoff' | 'declined' | 'unavailable' }, principal: MarketplacePrincipal, requestId: string): Promise<AgronautasMarketplaceRfqResponse> {
    assertScope(principal, input.workspaceId, 'write')
    const result = await this.repository.reviewRfq({ ...input, actorId: principal.actorId, requestId })
    return toRfqResponse(result.status, result.resource ? [result.resource] : [], [result.audit])
  }
}

export class CancelMarketplaceRfq {
  constructor(private readonly repository: MarketplaceRepository) {}

  async execute(input: { workspaceId: string; rfqId: string; expectedRevision: number }, principal: MarketplacePrincipal, requestId: string): Promise<AgronautasMarketplaceRfqResponse> {
    assertScope(principal, input.workspaceId, 'write')
    const current = await this.repository.getRfq({ workspaceId: input.workspaceId, rfqId: input.rfqId })
    if (current && current.requesterActorId !== principal.actorId && principal.role !== 'admin') throw new Error('MARKETPLACE_PERMISSION_DENIED')
    const result = await this.repository.cancelRfq({ ...input, actorId: principal.actorId, requestId })
    return toRfqResponse(result.status, result.resource ? [result.resource] : [], [result.audit])
  }
}

function assertScope(principal: MarketplacePrincipal, workspaceId: string, required: 'read' | 'write'): void {
  if (principal.workspaceId !== workspaceId) throw new Error('WORKSPACE_SCOPE_DENIED')
  if (!principal.scopes.includes(required)) throw new Error('MARKETPLACE_PERMISSION_DENIED')
}

function toListingResponse(record: Awaited<ReturnType<MarketplaceRepository['listListings']>>[number]) {
  return {
    contractVersion: 'agronautas-marketplace-v1' as const,
    listingId: record.listingId,
    workspaceId: record.workspaceId,
    marketId: record.marketId,
    participantRef: record.participantRef,
    itemName: record.itemName,
    title: record.title,
    availabilityStatus: record.availabilityStatus,
    availabilityAt: record.availabilityAt.toISOString(),
    quantity: record.quantity,
    unit: record.unit,
    qualityStatus: record.qualityStatus,
    provenance: { sourceKey: record.sourceKey, sourceUrl: record.sourceUrl, recordedAt: record.provenanceRecordedAt.toISOString() },
    freshnessExpiresAt: record.freshnessExpiresAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toRfqResponse(status: string, resources: Awaited<ReturnType<MarketplaceRepository['listRfqs']>>['items'], audits: MarketplaceAuditRecord[]): AgronautasMarketplaceRfqResponse {
  return agronautasMarketplaceRfqResponseSchema.parse({ contractVersion: 'agronautas-marketplace-v1', status, items: resources.map((record) => ({ contractVersion: 'agronautas-marketplace-v1', rfqId: record.rfqId, workspaceId: record.workspaceId, requesterActorId: record.requesterActorId, listingId: record.listingId, itemName: record.itemName, quantity: record.quantity, unit: record.unit, locality: record.locality, participantRefs: record.participantRefs, reviewStatus: record.reviewStatus, revision: record.revision, idempotencyKey: record.idempotencyKey, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), reviewedAt: record.reviewedAt?.toISOString() ?? null, reviewerActorId: record.reviewerActorId })), audit: audits.map((audit) => agronautasMarketplaceAuditItemSchema.parse({ contractVersion: 'agronautas-marketplace-v1', auditId: audit.auditId, workspaceId: audit.workspaceId, actorId: audit.actorId, action: audit.action, targetId: audit.targetId, outcome: audit.outcome, revisionBefore: audit.revisionBefore, revisionAfter: audit.revisionAfter, requestId: audit.requestId, occurredAt: audit.occurredAt.toISOString() })) })
}
