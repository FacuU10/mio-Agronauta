import { z } from 'zod'

export const AGRONAUTAS_MARKETPLACE_CONTRACT_VERSION = 'agronautas-marketplace-v1' as const

export const AGRONAUTAS_MARKETPLACE_LISTING_STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  EXPIRED: 'expired',
} as const
export type AgronautasMarketplaceListingStatus = (typeof AGRONAUTAS_MARKETPLACE_LISTING_STATUS)[keyof typeof AGRONAUTAS_MARKETPLACE_LISTING_STATUS]

export const AGRONAUTAS_MARKETPLACE_DISCOVERY_STATUS = {
  FRESH: 'fresh',
  DEGRADED: 'degraded',
  EMPTY: 'empty',
  UNAVAILABLE: 'unavailable',
} as const
export type AgronautasMarketplaceDiscoveryStatus = (typeof AGRONAUTAS_MARKETPLACE_DISCOVERY_STATUS)[keyof typeof AGRONAUTAS_MARKETPLACE_DISCOVERY_STATUS]

export const AGRONAUTAS_MARKETPLACE_RFQ_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED_FOR_HANDOFF: 'approved_for_handoff',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  UNAVAILABLE: 'unavailable',
  EXPIRED: 'expired',
} as const
export type AgronautasMarketplaceRfqStatus = (typeof AGRONAUTAS_MARKETPLACE_RFQ_STATUS)[keyof typeof AGRONAUTAS_MARKETPLACE_RFQ_STATUS]

export const AGRONAUTAS_MARKETPLACE_QUALITY_STATUS = {
  VERIFIED: 'verified',
  UNVERIFIED: 'unverified',
  UNKNOWN: 'unknown',
} as const
export type AgronautasMarketplaceQualityStatus = (typeof AGRONAUTAS_MARKETPLACE_QUALITY_STATUS)[keyof typeof AGRONAUTAS_MARKETPLACE_QUALITY_STATUS]

export const AGRONAUTAS_MARKETPLACE_AUDIT_ACTION = {
  SUBMIT: 'submit',
  REVIEW: 'review',
  CANCEL: 'cancel',
  RETRY: 'retry',
} as const
export type AgronautasMarketplaceAuditAction = (typeof AGRONAUTAS_MARKETPLACE_AUDIT_ACTION)[keyof typeof AGRONAUTAS_MARKETPLACE_AUDIT_ACTION]

export const AGRONAUTAS_MARKETPLACE_AUDIT_OUTCOME = {
  ACCEPTED: 'accepted',
  DUPLICATE: 'duplicate',
  CONFLICT: 'conflict',
  FORBIDDEN: 'forbidden',
  UNAVAILABLE: 'unavailable',
} as const
export type AgronautasMarketplaceAuditOutcome = (typeof AGRONAUTAS_MARKETPLACE_AUDIT_OUTCOME)[keyof typeof AGRONAUTAS_MARKETPLACE_AUDIT_OUTCOME]

const identifierSchema = z.string().trim().min(1).max(160)
const isoDateTimeSchema = z.string().datetime()
const contractVersionSchema = z.literal(AGRONAUTAS_MARKETPLACE_CONTRACT_VERSION)

const provenanceSchema = z.object({
  sourceKey: identifierSchema,
  sourceUrl: z.string().url().nullable(),
  recordedAt: isoDateTimeSchema,
}).strict()

export const agronautasMarketplaceListingSchema = z.object({
  contractVersion: contractVersionSchema,
  listingId: identifierSchema,
  workspaceId: identifierSchema,
  marketId: identifierSchema,
  participantRef: identifierSchema,
  itemName: z.string().trim().min(1).max(180),
  title: z.string().trim().min(1).max(220),
  availabilityStatus: z.enum([
    AGRONAUTAS_MARKETPLACE_LISTING_STATUS.AVAILABLE,
    AGRONAUTAS_MARKETPLACE_LISTING_STATUS.UNAVAILABLE,
    AGRONAUTAS_MARKETPLACE_LISTING_STATUS.EXPIRED,
  ]),
  availabilityAt: isoDateTimeSchema,
  quantity: z.number().finite().positive().nullable(),
  unit: identifierSchema.nullable(),
  qualityStatus: z.enum([
    AGRONAUTAS_MARKETPLACE_QUALITY_STATUS.VERIFIED,
    AGRONAUTAS_MARKETPLACE_QUALITY_STATUS.UNVERIFIED,
    AGRONAUTAS_MARKETPLACE_QUALITY_STATUS.UNKNOWN,
  ]),
  provenance: provenanceSchema,
  freshnessExpiresAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}).strict()

export type AgronautasMarketplaceListing = z.infer<typeof agronautasMarketplaceListingSchema>

export const agronautasMarketplaceDiscoveryRequestSchema = z.object({
  contractVersion: contractVersionSchema,
  workspaceId: identifierSchema,
  marketId: identifierSchema.optional(),
  search: z.string().trim().max(100).optional(),
}).strict()

export const agronautasMarketplaceDiscoveryResponseSchema = z.object({
  contractVersion: contractVersionSchema,
  status: z.enum([
    AGRONAUTAS_MARKETPLACE_DISCOVERY_STATUS.FRESH,
    AGRONAUTAS_MARKETPLACE_DISCOVERY_STATUS.DEGRADED,
    AGRONAUTAS_MARKETPLACE_DISCOVERY_STATUS.EMPTY,
    AGRONAUTAS_MARKETPLACE_DISCOVERY_STATUS.UNAVAILABLE,
  ]),
  items: z.array(agronautasMarketplaceListingSchema),
  staleListingCount: z.number().int().nonnegative(),
  generatedAt: isoDateTimeSchema,
  reason: identifierSchema.optional(),
  retryable: z.boolean().default(false),
}).strict()

export type AgronautasMarketplaceDiscoveryRequest = z.infer<typeof agronautasMarketplaceDiscoveryRequestSchema>
export type AgronautasMarketplaceDiscoveryResponse = z.infer<typeof agronautasMarketplaceDiscoveryResponseSchema>

export const agronautasMarketplaceRfqCreateRequestSchema = z.object({
  contractVersion: contractVersionSchema,
  workspaceId: identifierSchema,
  listingId: identifierSchema.nullable().optional(),
  itemName: z.string().trim().min(1).max(180),
  quantity: z.number().finite().positive(),
  unit: identifierSchema,
  locality: z.string().trim().min(1).max(160),
  participantRefs: z.array(identifierSchema).max(8).default([]),
  idempotencyKey: identifierSchema,
}).strict()

export const agronautasMarketplaceRfqReviewRequestSchema = z.object({
  contractVersion: contractVersionSchema,
  expectedRevision: z.number().int().positive(),
  status: z.enum([
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.UNDER_REVIEW,
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.APPROVED_FOR_HANDOFF,
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.DECLINED,
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.UNAVAILABLE,
  ]),
}).strict()

export const agronautasMarketplaceRfqSchema = z.object({
  contractVersion: contractVersionSchema,
  rfqId: identifierSchema,
  workspaceId: identifierSchema,
  requesterActorId: identifierSchema,
  listingId: identifierSchema.nullable(),
  itemName: z.string().trim().min(1).max(180),
  quantity: z.number().finite().positive(),
  unit: identifierSchema,
  locality: z.string().trim().min(1).max(160),
  participantRefs: z.array(identifierSchema).max(8),
  reviewStatus: z.enum([
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.SUBMITTED,
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.UNDER_REVIEW,
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.APPROVED_FOR_HANDOFF,
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.DECLINED,
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.CANCELLED,
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.UNAVAILABLE,
    AGRONAUTAS_MARKETPLACE_RFQ_STATUS.EXPIRED,
  ]),
  revision: z.number().int().positive(),
  idempotencyKey: identifierSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  reviewedAt: isoDateTimeSchema.nullable(),
  reviewerActorId: identifierSchema.nullable(),
}).strict()

export const agronautasMarketplaceAuditItemSchema = z.object({
  contractVersion: contractVersionSchema,
  auditId: identifierSchema,
  workspaceId: identifierSchema,
  actorId: identifierSchema,
  action: z.enum([
    AGRONAUTAS_MARKETPLACE_AUDIT_ACTION.SUBMIT,
    AGRONAUTAS_MARKETPLACE_AUDIT_ACTION.REVIEW,
    AGRONAUTAS_MARKETPLACE_AUDIT_ACTION.CANCEL,
    AGRONAUTAS_MARKETPLACE_AUDIT_ACTION.RETRY,
  ]),
  targetId: identifierSchema,
  outcome: z.enum([
    AGRONAUTAS_MARKETPLACE_AUDIT_OUTCOME.ACCEPTED,
    AGRONAUTAS_MARKETPLACE_AUDIT_OUTCOME.DUPLICATE,
    AGRONAUTAS_MARKETPLACE_AUDIT_OUTCOME.CONFLICT,
    AGRONAUTAS_MARKETPLACE_AUDIT_OUTCOME.FORBIDDEN,
    AGRONAUTAS_MARKETPLACE_AUDIT_OUTCOME.UNAVAILABLE,
  ]),
  revisionBefore: z.number().int().positive().nullable(),
  revisionAfter: z.number().int().positive().nullable(),
  requestId: identifierSchema,
  occurredAt: isoDateTimeSchema,
}).strict()

export const agronautasMarketplaceRfqResponseSchema = z.object({
  contractVersion: contractVersionSchema,
  status: z.enum(['fresh', 'created', 'duplicate', 'reviewed', 'cancelled', 'conflict', 'stale', 'not_found', 'unavailable']),
  items: z.array(agronautasMarketplaceRfqSchema),
  audit: z.array(agronautasMarketplaceAuditItemSchema),
  retryable: z.boolean().default(false),
  reason: identifierSchema.optional(),
}).strict()

export type AgronautasMarketplaceRfqCreateRequest = z.infer<typeof agronautasMarketplaceRfqCreateRequestSchema>
export type AgronautasMarketplaceRfqReviewRequest = z.infer<typeof agronautasMarketplaceRfqReviewRequestSchema>
export type AgronautasMarketplaceRfq = z.infer<typeof agronautasMarketplaceRfqSchema>
export type AgronautasMarketplaceAuditItem = z.infer<typeof agronautasMarketplaceAuditItemSchema>
export type AgronautasMarketplaceRfqResponse = z.infer<typeof agronautasMarketplaceRfqResponseSchema>

const forbiddenMarketplaceActions = new Set([
  'offer', 'offers', 'order', 'orders', 'payment', 'payments', 'payout', 'payouts', 'checkout', 'money_out', 'settlement', 'escrow', 'custody', 'credit', 'guarantee', 'inventory', 'logistics', 'export',
])

export function isForbiddenMarketplaceAction(action: string): boolean {
  return forbiddenMarketplaceActions.has(action.trim().toLowerCase())
}
