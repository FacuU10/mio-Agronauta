import type {
  AgronautasMarketplaceAuditAction,
  AgronautasMarketplaceAuditOutcome,
  AgronautasMarketplaceListingStatus,
  AgronautasMarketplaceQualityStatus,
  AgronautasMarketplaceRfqCreateRequest,
  AgronautasMarketplaceRfqStatus,
} from '@repo/zod-schemas'

export interface MarketplaceListingRecord {
  listingId: string
  workspaceId: string
  marketId: string
  participantRef: string
  itemName: string
  title: string
  availabilityStatus: AgronautasMarketplaceListingStatus
  availabilityAt: Date
  quantity: number | null
  unit: string | null
  qualityStatus: AgronautasMarketplaceQualityStatus
  sourceKey: string
  sourceUrl: string | null
  provenanceRecordedAt: Date
  freshnessExpiresAt: Date
  updatedAt: Date
}

export interface MarketplaceRfqRecord {
  rfqId: string
  workspaceId: string
  requesterActorId: string
  listingId: string | null
  itemName: string
  quantity: number
  unit: string
  locality: string
  participantRefs: string[]
  reviewStatus: AgronautasMarketplaceRfqStatus
  revision: number
  idempotencyKey: string
  createdAt: Date
  updatedAt: Date
  reviewedAt: Date | null
  reviewerActorId: string | null
}

export interface MarketplaceAuditRecord {
  auditId: string
  workspaceId: string
  actorId: string
  action: AgronautasMarketplaceAuditAction
  targetId: string
  outcome: AgronautasMarketplaceAuditOutcome
  revisionBefore: number | null
  revisionAfter: number | null
  requestId: string
  occurredAt: Date
}

export type MarketplaceRfqCreateInput = AgronautasMarketplaceRfqCreateRequest & { actorId: string; requestId: string }

export interface MarketplaceRepository {
  listListings(input: { workspaceId: string; marketId?: string; search?: string }): Promise<MarketplaceListingRecord[]>
  listRfqs(input: { workspaceId: string; requesterActorId?: string }): Promise<{ items: MarketplaceRfqRecord[]; audit: MarketplaceAuditRecord[] }>
  getRfq(input: { workspaceId: string; rfqId: string }): Promise<MarketplaceRfqRecord | null>
  createRfq(input: MarketplaceRfqCreateInput): Promise<{ status: 'created' | 'duplicate' | 'conflict'; resource: MarketplaceRfqRecord; audit: MarketplaceAuditRecord }>
  reviewRfq(input: { workspaceId: string; rfqId: string; expectedRevision: number; status: AgronautasMarketplaceRfqStatus; actorId: string; requestId: string }): Promise<{ status: 'reviewed' | 'stale' | 'not_found'; resource?: MarketplaceRfqRecord; audit: MarketplaceAuditRecord }>
  cancelRfq(input: { workspaceId: string; rfqId: string; expectedRevision: number; actorId: string; requestId: string }): Promise<{ status: 'cancelled' | 'stale' | 'not_found'; resource?: MarketplaceRfqRecord; audit: MarketplaceAuditRecord }>
  appendAudit(input: MarketplaceAuditRecord): Promise<MarketplaceAuditRecord>
}
