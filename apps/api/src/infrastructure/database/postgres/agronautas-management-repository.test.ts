import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_AGRONAUTAS_WORKSPACE_ID } from '../../../domain/repositories/agronautas'
import { PostgresAgronautasManagementRepository } from './agronautas-management-repository'

interface StoredField {
  id: string
  externalFieldId: string
  workspaceId: string | null
  createdAt: Date
  updatedAt: Date
  evidenceId: string
}

test('default workspace creation never infers ownership for unmapped fields', async () => {
  const createdAt = new Date('2026-08-10T10:00:00.000Z')
  const updatedAt = new Date('2026-08-11T10:00:00.000Z')
  const fields: StoredField[] = [
    { id: 'field-existing-1', externalFieldId: 'external-1', workspaceId: null, createdAt, updatedAt, evidenceId: 'evidence-1' },
    { id: 'field-existing-2', externalFieldId: 'external-2', workspaceId: null, createdAt, updatedAt, evidenceId: 'evidence-2' },
  ]
  let workspaceRows = 0
  const workspaceRecord = { id: DEFAULT_AGRONAUTAS_WORKSPACE_ID, name: 'Agronautas', status: 'active', created_at: createdAt, updated_at: updatedAt }
  const pool = {
    async query(sql: string, params: unknown[] = []) {
      if (sql.includes('INSERT INTO "agronautas_workspaces"')) {
        workspaceRows = Math.max(workspaceRows, 1)
        return { rows: [workspaceRecord] }
      }
      if (sql.startsWith('UPDATE "fields"')) assert.fail('workspace initialization must not backfill field ownership')
      if (sql.startsWith('SELECT COUNT(*)')) {
        return { rows: [{ count: fields.filter((field) => field.workspaceId === params[0]).length }] }
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
  }
  const repository = new PostgresAgronautasManagementRepository(pool as never)

  await repository.ensureDefaultWorkspace()
  const snapshotAfterFirstRun = fields.map((field) => ({ ...field }))
  fields.push({ id: 'field-created-after-backfill', externalFieldId: 'external-3', workspaceId: null, createdAt, updatedAt, evidenceId: 'evidence-3' })
  await repository.ensureDefaultWorkspace()

  assert.equal(workspaceRows, 1)
  assert.deepEqual(fields.map(({ id, externalFieldId, workspaceId, evidenceId }) => ({ id, externalFieldId, workspaceId, evidenceId })), [
    ...snapshotAfterFirstRun.map(({ id, externalFieldId, workspaceId, evidenceId }) => ({ id, externalFieldId, workspaceId, evidenceId })),
    { id: 'field-created-after-backfill', externalFieldId: 'external-3', workspaceId: null, evidenceId: 'evidence-3' },
  ])
  assert.deepEqual(fields.slice(0, 2).map(({ createdAt: actualCreatedAt, updatedAt: actualUpdatedAt }) => ({ actualCreatedAt, actualUpdatedAt })), [
    { actualCreatedAt: createdAt, actualUpdatedAt: updatedAt },
    { actualCreatedAt: createdAt, actualUpdatedAt: updatedAt },
  ])
})

test('field activity requires the selected workspace ownership predicate', async () => {
  let capturedSql = ''
  let capturedParams: unknown[] = []
  const pool = {
    async query(sql: string, params: unknown[] = []) {
      capturedSql = sql
      capturedParams = params
      return { rows: [{ source_type: 'field', source_id: 'field-1', occurred_at: '2026-08-11T10:00:00.000Z', title: 'Field record created' }] }
    },
  }
  const repository = new PostgresAgronautasManagementRepository(pool as never)

  const activity = await repository.listFieldActivity('field-1', 'workspace-selected')

  assert.match(capturedSql, /WITH authorized_field/i)
  assert.match(capturedSql, /agronautas_auth_field_mappings/i)
  assert.deepEqual(capturedParams, ['field-1', 'workspace-selected'])
  assert.equal(activity[0]?.sourceId, 'field-1')
})

test('field activity rejects an unmapped legacy field even when its legacy workspace matches', async () => {
  let capturedSql = ''
  const pool = {
    async query(sql: string) {
      capturedSql = sql
      return { rows: [] }
    },
  }
  const repository = new PostgresAgronautasManagementRepository(pool as never)

  const activity = await repository.listFieldActivity('legacy-field', 'workspace-selected')

  assert.match(capturedSql, /agronautas_auth_field_mappings/i)
  assert.doesNotMatch(capturedSql, /field\.workspace_id\s*=\s*\$2/i)
  assert.deepEqual(activity, [])
})

test('management read projections do not expose legacy fields without explicit auth mappings', async () => {
  const queries: string[] = []
  const pool = {
    async query(sql: string) {
      queries.push(sql)
      if (sql.includes('COUNT(*)')) return { rows: [{ field_count: 0 }] }
      if (sql.includes('FROM "fields"')) return { rows: [] }
      return { rows: [{ id: 'workspace-a', name: 'Workspace A', status: 'active', created_at: new Date('2026-08-11T10:00:00.000Z'), updated_at: new Date('2026-08-11T10:00:00.000Z') }] }
    },
  }
  const repository = new PostgresAgronautasManagementRepository(pool as never)

  await repository.getWorkspace('workspace-a')
  await repository.listWorkspaceFields({ workspaceId: 'workspace-a', limit: 10 })

  assert.equal(queries.some((sql) => /workspace\."id"\s*=\s*\$2|field\.workspace_id\s*=\s*\$2/i.test(sql)), false)
  assert.equal(queries.filter((sql) => /agronautas_auth_field_mappings/i.test(sql)).length, 2)
})

test('management audit projection keeps forbidden orphan records in the workspace', async () => {
  const auditRow = {
    audit_id: 'audit-orphan-forbidden',
    actor_id: 'actor-1',
    action: 'transition',
    target_id: 'missing-item',
    outcome: 'forbidden',
    revision_before: null,
    revision_after: null,
    occurred_at: new Date('2026-08-11T10:00:00.000Z'),
    request_id: 'request-orphan-forbidden',
  }
  let auditQuery = ''
  const pool = {
    async query(sql: string) {
      if (sql.includes('FROM "agronautas_management_items" item')) return { rows: [] }
      auditQuery = sql
      return { rows: [auditRow] }
    },
  }
  const repository = new PostgresAgronautasManagementRepository(pool as never)

  const result = await repository.listManagement({ workspaceId: 'workspace-a' })

  assert.match(auditQuery, /LEFT JOIN\s+"agronautas_management_items" item/i)
  assert.match(auditQuery, /item\."id"\s*=\s*audit\."target_id"\s+AND\s+item\."workspace_id"\s*=\s*audit\."workspace_id"/i)
  assert.deepEqual(result.audit, [{
    auditId: 'audit-orphan-forbidden',
    actorId: 'actor-1',
    action: 'transition',
    targetId: 'missing-item',
    outcome: 'forbidden',
    revisionBefore: null,
    revisionAfter: null,
    occurredAt: auditRow.occurred_at,
    requestId: 'request-orphan-forbidden',
  }])
})
