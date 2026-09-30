import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { AuthFailure, AUTH_FAILURE_CODES } from '../../../domain/auth/contracts'
import { PostgresAgronautasAuthRepository } from './agronautas-auth-repository'
import { PostgresAgronautasManagementRepository } from './agronautas-management-repository'

test('bootstrap preserves the storage cause and rolls back before releasing the connection', async () => {
  const cause = Object.assign(new Error('Missing bootstrap table'), { code: '42P01' })
  const statements: string[] = []
  const client = {
    async query(sql: string) {
      statements.push(sql)
      if (sql.includes('agronautas_auth_bootstrap_state')) throw cause
      return { rows: [] }
    },
    release() { statements.push('release') },
  }
  const repository = new PostgresAgronautasAuthRepository({ async connect() { return client } } as never)
  await assert.rejects(() => repository.runBootstrapTransaction({
    input: {
      idempotencyKey: 'bootstrap-failure', bootstrapSecret: 'test-secret',
      pilotWorkspace: { key: 'agronautas-pilot', name: 'Pilot' },
      admin: { email: 'admin@example.test', password: 'test-password', displayName: 'Admin' },
      fieldMappings: [],
    },
    inputHash: 'test-hash', passwordHash: 'test-password-hash',
  }), (error: unknown) => error instanceof AuthFailure
    && error.code === AUTH_FAILURE_CODES.STORAGE_FAILURE && error.cause === cause)
  assert.deepEqual(statements.slice(-2), ['ROLLBACK', 'release'])
})

test('Postgres auth bootstrap is transactional, locks idempotency state, and does not return the input hash', async () => {
  const statements: string[] = []
  const parameters: unknown[][] = []
  const client = {
    async query(sql: string, params: unknown[] = []) {
      statements.push(sql)
      parameters.push(params)
      if (sql.includes('FROM agronautas_auth_bootstrap_state')) return { rows: [] }
      if (sql.includes('jsonb_to_recordset')) return { rows: [] }
      if (sql.includes('SELECT id FROM fields')) return { rows: [{ id: 'field-unmapped' }] }
      if (sql.includes('SELECT field_id FROM agronautas_auth_field_mappings')) return { rows: [{ field_id: 'field-mapped' }] }
      return { rows: [] }
    },
    release() {},
  }
  const pool = { async connect() { return client } }
  const repository = new PostgresAgronautasAuthRepository(pool as never)

  const result = await repository.runBootstrapTransaction({
    input: {
      idempotencyKey: 'bootstrap-1',
      bootstrapSecret: 'bootstrap-secret',
      pilotWorkspace: { key: 'agronautas-pilot', name: 'Pilot' },
      admin: { email: 'admin@example.test', password: 'password-123', displayName: 'Admin' },
      fieldMappings: [{ fieldId: 'field-mapped', workspaceKey: 'agronautas-pilot' }],
    },
    inputHash: 'private-input-hash',
    passwordHash: 'bcrypt-hash',
  })

  assert.deepEqual(result, {
    status: 'created',
    workspaceId: 'agronautas-pilot-workspace',
    adminUserId: result.adminUserId,
    mappedFieldIds: ['field-mapped'],
    unmappedFieldIds: ['field-unmapped'],
  })
  assert.equal('inputHash' in result, false)
  assert.equal(statements[0], 'BEGIN')
  assert.ok(statements.some((statement) => statement.includes('FOR UPDATE')))
  assert.equal(statements.at(-1), 'COMMIT')
  assert.ok(parameters.some((params) => params.includes('private-input-hash')))
})

test('Postgres auth bootstrap preserves an existing same-workspace mapping without an update', async () => {
  const statements: string[] = []
  const client = {
    async query(sql: string, params: unknown[] = []) {
      statements.push(sql)
      if (sql.includes('FROM agronautas_auth_bootstrap_state')) return { rows: [] }
      if (sql.includes('jsonb_to_recordset')) return { rows: [] }
      if (sql.includes('SELECT workspace_id, workspace_key') && params[0] === 'field-mapped') return { rows: [{ workspace_id: 'agronautas-pilot-workspace', workspace_key: 'agronautas-pilot' }] }
      if (sql.includes('SELECT field_id FROM agronautas_auth_field_mappings')) return { rows: [{ field_id: 'field-mapped' }] }
      if (sql.includes('SELECT id FROM fields')) return { rows: [] }
      return { rows: [] }
    },
    release() {},
  }
  const repository = new PostgresAgronautasAuthRepository({ async connect() { return client } } as never)

  await repository.runBootstrapTransaction({
    input: {
      idempotencyKey: 'bootstrap-same-mapping',
      bootstrapSecret: 'bootstrap-secret',
      pilotWorkspace: { key: 'agronautas-pilot', name: 'Pilot' },
      admin: { email: 'admin@example.test', password: 'password-123', displayName: 'Admin' },
      fieldMappings: [{ fieldId: 'field-mapped', workspaceKey: 'agronautas-pilot' }],
    },
    inputHash: 'same-mapping-hash',
    passwordHash: 'bcrypt-hash',
  })

  assert.equal(statements.some((statement) => statement.includes('DO UPDATE SET workspace_id = EXCLUDED.workspace_id')), false)
  assert.ok(statements.some((statement) => statement.includes('SELECT workspace_id, workspace_key') && statement.includes('FOR UPDATE')))
})

test('Postgres auth bootstrap rolls back and returns MAPPING_CONFLICT for a different workspace mapping', async () => {
  const statements: string[] = []
  const client = {
    async query(sql: string, params: unknown[] = []) {
      statements.push(sql)
      if (sql.includes('FROM agronautas_auth_bootstrap_state')) return { rows: [] }
      if (sql.includes('jsonb_to_recordset')) return { rows: [] }
      if (sql.includes('SELECT workspace_id, workspace_key') && params[0] === 'field-mapped') return { rows: [{ workspace_id: 'other-workspace', workspace_key: 'other-workspace' }] }
      return { rows: [] }
    },
    release() {},
  }
  const repository = new PostgresAgronautasAuthRepository({ async connect() { return client } } as never)

  await assert.rejects(
    () => repository.runBootstrapTransaction({
      input: {
        idempotencyKey: 'bootstrap-conflicting-mapping',
        bootstrapSecret: 'bootstrap-secret',
        pilotWorkspace: { key: 'agronautas-pilot', name: 'Pilot' },
        admin: { email: 'admin@example.test', password: 'password-123', displayName: 'Admin' },
        fieldMappings: [{ fieldId: 'field-mapped', workspaceKey: 'agronautas-pilot' }],
      },
      inputHash: 'conflicting-mapping-hash',
      passwordHash: 'bcrypt-hash',
    }),
    (error: unknown) => error instanceof AuthFailure && error.code === AUTH_FAILURE_CODES.MAPPING_CONFLICT && error.statusCode === 409,
  )
  assert.equal(statements.at(-1), 'ROLLBACK')
  assert.equal(statements.some((statement) => statement.includes('INSERT INTO agronautas_auth_users')), false)
})

test('Postgres auth adapters reject unknown persisted statuses instead of treating them as active', async () => {
  const pool = {
    async query(sql: string) {
      if (sql.includes('agronautas_auth_users')) return { rows: [{ id: 'user-1', email: 'user@example.test', display_name: 'User', password_hash: 'hash', status: 'mystery' }] }
      if (sql.includes('agronautas_auth_memberships')) return { rows: [{ id: 'membership-1', user_id: 'user-1', workspace_id: 'workspace-1', workspace_key: 'workspace-1', role: 'operator', scopes: ['read'], status: 'mystery' }] }
      throw new Error(`Unexpected query: ${sql}`)
    },
  }
  const repository = new PostgresAgronautasAuthRepository(pool as never)

  assert.equal(await repository.findUserByEmail('user@example.test'), null)
  assert.equal(await repository.getMembership('membership-1'), null)
})

test('auth migration constrains user, membership, and workspace statuses', async () => {
  const migration = await readFile(resolve(process.cwd(), 'prisma/migrations/20260915090000_agronautas_auth_security_isolation/migration.sql'), 'utf8')

  assert.match(migration, /agronautas_auth_users_status_chk[\s\S]*CHECK \("status" IN \('active', 'disabled'\)\)/i)
  assert.match(migration, /agronautas_auth_memberships_status_chk[\s\S]*CHECK \("status" IN \('active', 'revoked'\)\)/i)
  assert.match(migration, /agronautas_auth_workspaces_status_chk[\s\S]*CHECK \("status" IN \('active', 'disabled'\)\)/i)
})

test('membership projections select and preserve membership and joined workspace status', async () => {
  const queries: string[] = []
  const pool = {
    async query(sql: string) {
      queries.push(sql)
      return {
        rows: [{
          id: 'membership-1', user_id: 'user-1', workspace_id: 'workspace-1', role: 'operator', scopes: ['read'],
          workspace_key: 'workspace-one', membership_status: 'active', workspace_status: 'active',
        }],
      }
    },
  }
  const repository = new PostgresAgronautasAuthRepository(pool as never)

  const membership = await repository.getMembership('membership-1')

  assert.deepEqual(membership, {
    id: 'membership-1', userId: 'user-1', workspaceId: 'workspace-1', workspaceKey: 'workspace-one',
    role: 'operator', scopes: ['read'], status: 'active', workspaceStatus: 'active',
  })
  assert.match(queries[0] ?? '', /membership\.status\s+AS\s+membership_status/i)
  assert.match(queries[0] ?? '', /workspace\.status\s+AS\s+workspace_status/i)
})

test('disabled workspace membership is represented for fail-closed service enforcement and unknown status is rejected', async () => {
  let workspaceStatus: unknown = 'disabled'
  const repository = new PostgresAgronautasAuthRepository({
    async query() {
      return {
        rows: [{
          id: 'membership-1', user_id: 'user-1', workspace_id: 'workspace-1', role: 'operator', scopes: ['read'],
          workspace_key: 'workspace-one', membership_status: 'active', workspace_status: workspaceStatus,
        }],
      }
    },
  } as never)

  assert.equal((await repository.getMembership('membership-1'))?.workspaceStatus, 'disabled')
  workspaceStatus = 'unknown'
  assert.equal(await repository.getMembership('membership-1'), null)
})

test('Postgres session mapping carries absolute expiry and refresh rotation rejects an expired session before replacement', async () => {
  const now = new Date('2026-09-15T12:00:00.000Z')
  const expiredAt = new Date(now.getTime() - 1)
  const statements: string[] = []
  const client = {
    async query(sql: string) {
      statements.push(sql)
      if (sql.includes('FROM agronautas_auth_refresh_tokens') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'refresh-1', session_id: 'session-1', family_id: 'family-1', expires_at: new Date(now.getTime() + 60_000), consumed_at: null, revoked_at: null }] }
      }
      if (sql.includes('FROM agronautas_auth_sessions') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'session-1', user_id: 'user-1', membership_id: 'membership-1', refresh_family_id: 'family-1', expires_at: expiredAt, revoked_at: null }] }
      }
      return { rows: [] }
    },
    release() {},
  }
  const repository = new PostgresAgronautasAuthRepository({ async connect() { return client } } as never)

  const result = await repository.rotateRefreshToken('refresh-1', now, new Date(now.getTime() + 86_400_000))

  assert.equal(result.status, 'session_expired')
  assert.equal(statements.some((statement) => statement.includes('SET consumed_at')), false)
  assert.equal(statements.some((statement) => statement.includes('INSERT INTO agronautas_auth_refresh_tokens')), false)
  assert.equal(statements.at(-1), 'COMMIT')
})

test('Postgres session row mapping preserves the absolute expiry used by status and refresh policy', async () => {
  const expiresAt = new Date('2026-09-20T12:00:00.000Z')
  const repository = new PostgresAgronautasAuthRepository({
    async query(sql: string) {
      assert.match(sql, /expires_at/)
      return { rows: [{ id: 'session-1', user_id: 'user-1', membership_id: 'membership-1', refresh_family_id: 'family-1', expires_at: expiresAt, revoked_at: null }] }
    },
  } as never)

  const session = await repository.getSession('session-1')

  assert.equal(session?.expiresAt.toISOString(), expiresAt.toISOString())
})

test('workspace projections preserve disabled status and reject unknown status instead of hardcoding active', async () => {
  let status: unknown = 'disabled'
  const repository = new PostgresAgronautasManagementRepository({
    async query(sql: string) {
      if (sql.trim().startsWith('SELECT COUNT')) return { rows: [{ count: 0 }] }
      return { rows: [{ id: 'workspace-1', name: 'Workspace One', status, created_at: '2026-09-15T00:00:00.000Z', updated_at: '2026-09-15T00:00:00.000Z', field_count: 0 }] }
    },
  } as never)

  assert.equal((await repository.getWorkspace('workspace-1'))?.status, 'disabled')
  status = 'unknown'
  assert.equal(await repository.getWorkspace('workspace-1'), null)
})
