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

test('default workspace backfill is repeatable, preserves field/evidence identity, and picks up later fields', async () => {
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
      if (sql.startsWith('UPDATE "fields"')) {
        fields.forEach((field) => {
          if (field.workspaceId === null) field.workspaceId = String(params[0])
        })
        return { rows: [] }
      }
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
    { id: 'field-created-after-backfill', externalFieldId: 'external-3', workspaceId: DEFAULT_AGRONAUTAS_WORKSPACE_ID, evidenceId: 'evidence-3' },
  ])
  assert.deepEqual(fields.slice(0, 2).map(({ createdAt: actualCreatedAt, updatedAt: actualUpdatedAt }) => ({ actualCreatedAt, actualUpdatedAt })), [
    { actualCreatedAt: createdAt, actualUpdatedAt: updatedAt },
    { actualCreatedAt: createdAt, actualUpdatedAt: updatedAt },
  ])
})
