import test from 'node:test'
import assert from 'node:assert/strict'
import { CreateManagementItem, ListManagementItems, TransitionManagementItem } from './agronautas-management'
import type { AgronautasManagementRepository } from '../../domain/repositories/agronautas'

const principal = { actorId: 'actor-1', sessionId: 'session-1', workspaceId: 'workspace-1', scopes: ['read', 'write'] as Array<'read' | 'write'> }
const resource = { id: 'operation-1', kind: 'operation' as const, workspaceId: 'workspace-1', fieldId: 'field-1', parentId: null, name: 'Treatment', status: 'planned' as const, revision: 1, responsibleActorId: 'actor-1', createdByActorId: 'actor-1', idempotencyKey: 'request-1', sourceLocationIds: ['location-1'], createdAt: new Date('2026-09-21T10:00:00.000Z'), updatedAt: new Date('2026-09-21T10:00:00.000Z') }
const audit = { auditId: 'audit-1', actorId: 'actor-1', action: 'create' as const, targetId: 'operation-1', outcome: 'accepted' as const, revisionBefore: null, revisionAfter: 1, occurredAt: resource.createdAt, requestId: 'request-1' }

function repository(): AgronautasManagementRepository & { calls: string[] } {
  return {
    calls: [],
    async listManagement() { this.calls.push('list'); return { items: [resource], audit: [audit] } },
    async createManagement() { this.calls.push('create'); return { status: 'created', resource, audit } },
    async transitionManagement() { this.calls.push('transition'); return { status: 'transitioned', resource: { ...resource, status: 'active', revision: 2 }, audit: { ...audit, action: 'transition', revisionBefore: 1, revisionAfter: 2 } } },
  }
}

test('management use cases reject cross-workspace writes and preserve duplicate/revision outcomes', async () => {
  const repo = repository()
  const create = new CreateManagementItem(repo)
  await assert.rejects(() => create.execute({ kind: 'operation', workspaceId: 'workspace-2', fieldId: 'field-1', name: 'No leak', idempotencyKey: 'x', sourceLocationIds: [] }, principal), /WORKSPACE_SCOPE_DENIED/)
  const created = await create.execute({ kind: 'operation', workspaceId: 'workspace-1', fieldId: 'field-1', name: 'Treatment', idempotencyKey: 'request-1', sourceLocationIds: [] }, principal)
  assert.equal(created.items[0]?.id, 'operation-1')
  const transitioned = await new TransitionManagementItem(repo).execute({ workspaceId: 'workspace-1', itemId: 'operation-1', expectedRevision: 1, status: 'active', requestId: 'request-2' }, principal)
  assert.equal(transitioned.items[0]?.revision, 2)
  assert.deepEqual(repo.calls, ['create', 'transition'])
})

test('management list reload returns durable items and audit lineage', async () => {
  const result = await new ListManagementItems(repository()).execute({ workspaceId: 'workspace-1' }, principal)
  assert.equal(result.items[0]?.id, 'operation-1')
  assert.equal(result.audit[0]?.targetId, 'operation-1')
})
