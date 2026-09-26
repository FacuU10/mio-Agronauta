import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { AUTH_FAILURE_CODES, AuthFailure, type AuthPrincipal } from '../../domain/auth/contracts'
import type { AgronautasAuthServicePort } from '../../domain/auth/ports'
import type { MarketplaceAuditRecord, MarketplaceRepository } from '../../domain/repositories/agronautas-marketplace'
import { createAgronautasRouter } from './agronautas'

const workspaceId = 'workspace-1'
const operator: AuthPrincipal = { actorId: 'operator-1', sessionId: 'session-1', membershipId: 'membership-1', workspaceId, workspaceKey: workspaceId, role: 'operator', scopes: ['read', 'write'], expiresAt: '2026-09-22T10:00:00.000Z' }
const reader: AuthPrincipal = { ...operator, actorId: 'reader-1', role: 'reader', scopes: ['read'] }

function authService(): AgronautasAuthServicePort {
  return {
    async authenticateAccessToken(token) { if (token === 'operator-token') return operator; if (token === 'reader-token') return reader; throw new Error('unauthorized') },
    async authenticateBffAssertion(token) { return this.authenticateAccessToken(token) },
    async authorize(principal, requestedWorkspace, scope) { if (principal.workspaceId !== requestedWorkspace || (scope === 'write' && !principal.scopes.includes('write'))) throw new AuthFailure(AUTH_FAILURE_CODES.FORBIDDEN, 'forbidden') },
    async login() { throw new Error('not used') }, async refresh() { throw new Error('not used') }, async logout() { return { revoked: true } }, async status() { throw new Error('not used') },
  }
}

function repository(): MarketplaceRepository & { audits: MarketplaceAuditRecord[] } {
  const audits: MarketplaceAuditRecord[] = []
  let created = false
  let revision = 1
  return {
    audits,
    async listListings() { return [{ listingId: 'listing-1', workspaceId, marketId: 'mercedes-local', participantRef: 'participant-1', itemName: 'Arroz', title: 'Arroz local', availabilityStatus: 'available', availabilityAt: new Date('2026-09-21T10:00:00.000Z'), quantity: 20, unit: 'toneladas', qualityStatus: 'unknown', sourceKey: 'operator-catalog', sourceUrl: null, provenanceRecordedAt: new Date('2026-09-21T10:00:00.000Z'), freshnessExpiresAt: new Date('2026-09-22T10:00:00.000Z'), updatedAt: new Date('2026-09-21T10:00:00.000Z') }] },
    async listRfqs() { return { items: [], audit: audits } },
    async getRfq() { return created ? { rfqId: 'rfq-1', workspaceId, requesterActorId: operator.actorId, listingId: 'listing-1', itemName: 'Arroz', quantity: 2, unit: 'toneladas', locality: 'Mercedes', participantRefs: ['participant-1'], reviewStatus: 'submitted', revision, idempotencyKey: 'rfq-1', createdAt: new Date('2026-09-21T10:00:00.000Z'), updatedAt: new Date('2026-09-21T10:00:00.000Z'), reviewedAt: null, reviewerActorId: null } : null },
    async createRfq(input) { created = true; return { status: 'created', resource: { rfqId: 'rfq-1', workspaceId: input.workspaceId, requesterActorId: input.actorId, listingId: input.listingId ?? null, itemName: input.itemName, quantity: input.quantity, unit: input.unit, locality: input.locality, participantRefs: input.participantRefs, reviewStatus: 'submitted', revision: 1, idempotencyKey: input.idempotencyKey, createdAt: new Date('2026-09-21T10:00:00.000Z'), updatedAt: new Date('2026-09-21T10:00:00.000Z'), reviewedAt: null, reviewerActorId: null }, audit: { auditId: 'audit-1', workspaceId, actorId: input.actorId, action: 'submit', targetId: 'rfq-1', outcome: 'accepted', revisionBefore: null, revisionAfter: 1, requestId: input.requestId, occurredAt: new Date('2026-09-21T10:00:00.000Z') } } },
    async reviewRfq(input) { if (input.expectedRevision !== revision) return { status: 'stale', resource: (await this.getRfq(input)) ?? undefined, audit: { auditId: 'audit-stale', workspaceId, actorId: input.actorId, action: 'review', targetId: input.rfqId, outcome: 'conflict', revisionBefore: revision, revisionAfter: revision, requestId: input.requestId, occurredAt: new Date('2026-09-21T10:01:00.000Z') } }; revision += 1; return { status: 'reviewed', resource: { rfqId: input.rfqId, workspaceId, requesterActorId: operator.actorId, listingId: 'listing-1', itemName: 'Arroz', quantity: 2, unit: 'toneladas', locality: 'Mercedes', participantRefs: ['participant-1'], reviewStatus: input.status, revision, idempotencyKey: 'rfq-1', createdAt: new Date('2026-09-21T10:00:00.000Z'), updatedAt: new Date('2026-09-21T10:00:00.000Z'), reviewedAt: new Date('2026-09-21T10:01:00.000Z'), reviewerActorId: input.actorId }, audit: { auditId: 'audit-2', workspaceId, actorId: input.actorId, action: 'review', targetId: input.rfqId, outcome: 'accepted', revisionBefore: input.expectedRevision, revisionAfter: revision, requestId: input.requestId, occurredAt: new Date('2026-09-21T10:01:00.000Z') } } },
    async cancelRfq(input) { return { status: 'stale', resource: undefined, audit: { auditId: 'audit-3', workspaceId, actorId: input.actorId, action: 'cancel', targetId: input.rfqId, outcome: 'conflict', revisionBefore: revision, revisionAfter: revision, requestId: input.requestId, occurredAt: new Date('2026-09-21T10:02:00.000Z') } } },
    async appendAudit(input) { audits.push(input); return input },
  }
}

function app(repositoryOverride?: MarketplaceRepository) {
  const application = express()
  application.use(express.json())
  application.use('/agronautas', createAgronautasRouter({ authService: authService(), marketplaceRepository: repositoryOverride ?? repository() }))
  return application
}

async function request(application: express.Express, path: string, init: RequestInit = {}) {
  const server = application.listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('test server unavailable')
  try { return await fetch(`http://127.0.0.1:${address.port}${path}`, init) } finally { await new Promise<void>((resolve) => server.close(() => resolve())) }
}

test('marketplace routes protect workspace scope, deduplicate RFQs, review status and audit forbidden writes', async () => {
  const repositoryOverride = repository()
  const application = app(repositoryOverride)
  const listings = await request(application, '/agronautas/marketplace/listings', { headers: { authorization: 'Bearer reader-token' } })
  assert.equal(listings.status, 200)
  assert.equal((await listings.json() as { items: Array<{ workspaceId: string }> }).items[0]?.workspaceId, workspaceId)
  const forbidden = await request(application, '/agronautas/marketplace/rfqs', { method: 'POST', headers: { authorization: 'Bearer reader-token', 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: 'agronautas-marketplace-v1', workspaceId, listingId: 'listing-1', itemName: 'Arroz', quantity: 2, unit: 'toneladas', locality: 'Mercedes', idempotencyKey: 'reader-rfq', participantRefs: [] }) })
  assert.equal(forbidden.status, 403)
  assert.equal(repositoryOverride.audits.at(-1)?.outcome, 'forbidden')
  const input = { contractVersion: 'agronautas-marketplace-v1', workspaceId, listingId: 'listing-1', itemName: 'Arroz', quantity: 2, unit: 'toneladas', locality: 'Mercedes', idempotencyKey: 'rfq-1', participantRefs: ['participant-1'] }
  const created = await request(application, '/agronautas/marketplace/rfqs', { method: 'POST', headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' }, body: JSON.stringify(input) })
  assert.equal(created.status, 201)
  const reviewed = await request(application, '/agronautas/marketplace/rfqs/rfq-1/review', { method: 'POST', headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: 'agronautas-marketplace-v1', expectedRevision: 1, status: 'under_review' }) })
  assert.equal(reviewed.status, 200)
  const stale = await request(application, '/agronautas/marketplace/rfqs/rfq-1/review', { method: 'POST', headers: { authorization: 'Bearer operator-token', 'content-type': 'application/json' }, body: JSON.stringify({ contractVersion: 'agronautas-marketplace-v1', expectedRevision: 1, status: 'declined' }) })
  assert.equal(stale.status, 409)
})
