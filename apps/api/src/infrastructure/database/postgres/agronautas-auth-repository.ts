import type { Pool, PoolClient, QueryResultRow } from 'pg'
import { randomUUID } from 'node:crypto'
import { getPostgresPool } from './pool'
import {
  AUTH_FAILURE_CODES,
  AuthFailure,
  type AuthMembershipRecord,
  type AuthRefreshRecord,
  type AuthRepository,
  type AuthSessionRecord,
  type AuthUserRecord,
  type BootstrapTransactionInput,
  type BootstrapTransactionResult,
  type AuthRole,
  type AuthScope,
} from '../../../domain/auth/contracts'

export class PostgresAgronautasAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pick<Pool, 'query' | 'connect'> = getPostgresPool()) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const result = await this.pool.query('SELECT id, email, display_name, password_hash, status FROM agronautas_auth_users WHERE lower(email) = lower($1) LIMIT 1', [email])
    return result.rows[0] ? toUser(result.rows[0]) : null
  }

  async getUserById(userId: string): Promise<AuthUserRecord | null> {
    const result = await this.pool.query('SELECT id, email, display_name, password_hash, status FROM agronautas_auth_users WHERE id = $1 LIMIT 1', [userId])
    return result.rows[0] ? toUser(result.rows[0]) : null
  }

  async getMembershipForUser(userId: string, workspaceId?: string): Promise<AuthMembershipRecord | null> {
    const result = await this.pool.query(
      `SELECT membership.id, membership.user_id, membership.workspace_id, membership.role, membership.scopes,
               membership.status AS membership_status,
               workspace.workspace_key, workspace.status AS workspace_status
         FROM agronautas_auth_memberships membership
         JOIN agronautas_auth_workspaces workspace ON workspace.id = membership.workspace_id
        WHERE membership.user_id = $1 AND membership.status = 'active'
          AND ($2::text IS NULL OR membership.workspace_id = $2)
        ORDER BY membership.created_at ASC LIMIT 1`,
      [userId, workspaceId ?? null],
    )
    return result.rows[0] ? toMembership(result.rows[0]) : null
  }

  async listMembershipsForUser(userId: string): Promise<AuthMembershipRecord[]> {
    const result = await this.pool.query(
      `SELECT membership.id, membership.user_id, membership.workspace_id, membership.role, membership.scopes,
               membership.status AS membership_status,
               workspace.workspace_key, workspace.status AS workspace_status
         FROM agronautas_auth_memberships membership
         JOIN agronautas_auth_workspaces workspace ON workspace.id = membership.workspace_id
        WHERE membership.user_id = $1 AND membership.status = 'active'
        ORDER BY membership.created_at ASC, membership.id ASC`,
      [userId],
    )
    return result.rows.map(toMembership).filter((membership): membership is AuthMembershipRecord => membership !== null)
  }

  async getMembership(membershipId: string): Promise<AuthMembershipRecord | null> {
    const result = await this.pool.query(
      `SELECT membership.id, membership.user_id, membership.workspace_id, membership.role, membership.scopes,
               membership.status AS membership_status,
               workspace.workspace_key, workspace.status AS workspace_status
         FROM agronautas_auth_memberships membership
         JOIN agronautas_auth_workspaces workspace ON workspace.id = membership.workspace_id
        WHERE membership.id = $1 LIMIT 1`,
      [membershipId],
    )
    return result.rows[0] ? toMembership(result.rows[0]) : null
  }

  async createSession(input: { userId: string; membershipId: string; refreshFamilyId: string; expiresAt: Date }): Promise<AuthSessionRecord> {
    const id = randomUUID()
    const result = await this.pool.query(
      `INSERT INTO agronautas_auth_sessions (id, user_id, membership_id, refresh_family_id, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, membership_id, refresh_family_id, expires_at, revoked_at`,
      [id, input.userId, input.membershipId, input.refreshFamilyId, input.expiresAt],
    )
    return toSession(result.rows[0])
  }

  async getSession(sessionId: string): Promise<AuthSessionRecord | null> {
    const result = await this.pool.query('SELECT id, user_id, membership_id, refresh_family_id, expires_at, revoked_at FROM agronautas_auth_sessions WHERE id = $1 LIMIT 1', [sessionId])
    return result.rows[0] ? toSession(result.rows[0]) : null
  }

  async revokeSession(sessionId: string, at: Date): Promise<void> {
    await this.pool.query('UPDATE agronautas_auth_sessions SET revoked_at = COALESCE(revoked_at, $2), updated_at = now() WHERE id = $1', [sessionId, at])
  }

  async createRefreshToken(input: { sessionId: string; familyId: string; expiresAt: Date }): Promise<AuthRefreshRecord> {
    const id = randomUUID()
    const result = await this.pool.query(
      `INSERT INTO agronautas_auth_refresh_tokens (id, session_id, family_id, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, session_id, family_id, expires_at, consumed_at, revoked_at`,
      [id, input.sessionId, input.familyId, input.expiresAt],
    )
    return toRefresh(result.rows[0])
  }

  async getRefreshToken(id: string): Promise<AuthRefreshRecord | null> {
    const result = await this.pool.query('SELECT id, session_id, family_id, expires_at, consumed_at, revoked_at FROM agronautas_auth_refresh_tokens WHERE id = $1 LIMIT 1', [id])
    return result.rows[0] ? toRefresh(result.rows[0]) : null
  }

  async rotateRefreshToken(id: string, at: Date, replacementExpiresAt: Date): Promise<{ status: 'consumed' | 'replayed' | 'expired' | 'session_expired' | 'revoked' | 'missing'; record?: AuthRefreshRecord; replacement?: AuthRefreshRecord }> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const existing = await client.query(
        'SELECT id, session_id, family_id, expires_at, consumed_at, revoked_at FROM agronautas_auth_refresh_tokens WHERE id = $1 FOR UPDATE',
        [id],
      )
      if (!existing.rows[0]) {
        await client.query('COMMIT')
        return { status: 'missing' }
      }

      const token = toRefresh(existing.rows[0])
      if (token.expiresAt <= at) {
        await client.query('COMMIT')
        return { status: 'expired', record: token }
      }
      if (token.revokedAt) {
        await client.query('COMMIT')
        return { status: 'revoked', record: token }
      }
      if (token.consumedAt) {
        await client.query('UPDATE agronautas_auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, $2), updated_at = now() WHERE family_id = $1', [token.familyId, at])
        await client.query('UPDATE agronautas_auth_sessions SET revoked_at = COALESCE(revoked_at, $2), updated_at = now() WHERE id = $1', [token.sessionId, at])
        await client.query('COMMIT')
        return { status: 'replayed', record: { ...token, revokedAt: token.revokedAt ?? at } }
      }

      const sessionResult = await client.query(
        'SELECT id, user_id, membership_id, refresh_family_id, expires_at, revoked_at FROM agronautas_auth_sessions WHERE id = $1 FOR UPDATE',
        [token.sessionId],
      )
      const session = sessionResult.rows[0] ? toSession(sessionResult.rows[0]) : null
      if (!session || session.revokedAt) {
        await client.query('COMMIT')
        return { status: 'revoked', record: token }
      }
      if (session.expiresAt <= at) {
        await client.query('COMMIT')
        return { status: 'session_expired', record: token }
      }
      const boundedReplacementExpiresAt = new Date(Math.min(replacementExpiresAt.getTime(), session.expiresAt.getTime()))

      const consumed = await client.query(
        'UPDATE agronautas_auth_refresh_tokens SET consumed_at = $2, updated_at = now() WHERE id = $1 RETURNING id, session_id, family_id, expires_at, consumed_at, revoked_at',
        [id, at],
      )
      const replacementId = randomUUID()
      const replacement = await client.query(
        `INSERT INTO agronautas_auth_refresh_tokens (id, session_id, family_id, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id, session_id, family_id, expires_at, consumed_at, revoked_at`,
        [replacementId, token.sessionId, token.familyId, boundedReplacementExpiresAt],
      )
      await client.query('COMMIT')
      return { status: 'consumed', record: toRefresh(consumed.rows[0]), replacement: toRefresh(replacement.rows[0]) }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async consumeRefreshToken(id: string, at: Date): Promise<{ status: 'consumed' | 'replayed' | 'expired' | 'revoked' | 'missing'; record?: AuthRefreshRecord }> {
    const consumed = await this.pool.query(
      `UPDATE agronautas_auth_refresh_tokens
          SET consumed_at = $2, updated_at = now()
        WHERE id = $1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > $2
        RETURNING id, session_id, family_id, expires_at, consumed_at, revoked_at`,
      [id, at],
    )
    if (consumed.rows[0]) return { status: 'consumed', record: toRefresh(consumed.rows[0]) }
    const existing = await this.getRefreshToken(id)
    if (!existing) return { status: 'missing' }
    if (existing.expiresAt <= at) return { status: 'expired', record: existing }
    if (existing.revokedAt) return { status: 'revoked', record: existing }
    return { status: 'replayed', record: existing }
  }

  async revokeRefreshFamily(familyId: string, at: Date): Promise<void> {
    await this.pool.query('UPDATE agronautas_auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, $2), updated_at = now() WHERE family_id = $1', [familyId, at])
  }

  async runBootstrapTransaction(input: BootstrapTransactionInput): Promise<BootstrapTransactionResult> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('agronautas-auth-bootstrap', 0))")
      const stateResult = await client.query('SELECT idempotency_key, input_hash, workspace_id, admin_user_id, mapped_field_ids, unmapped_field_ids FROM agronautas_auth_bootstrap_state WHERE singleton_id = $1 FOR UPDATE', ['agronautas'])
      const existing = stateResult.rows[0]
      if (existing) {
        if (existing.idempotency_key === input.input.idempotencyKey && existing.input_hash === input.inputHash) {
          await client.query('COMMIT')
          return { status: 'already_initialized', workspaceId: String(existing.workspace_id), adminUserId: String(existing.admin_user_id), mappedFieldIds: toStringArray(existing.mapped_field_ids), unmappedFieldIds: toStringArray(existing.unmapped_field_ids) }
        }
        throw new AuthFailure(existing.idempotency_key === input.input.idempotencyKey ? AUTH_FAILURE_CODES.IDEMPOTENCY_CONFLICT : AUTH_FAILURE_CODES.ALREADY_INITIALIZED_CONFLICT, 'Agronautas bootstrap is already initialized')
      }

      const invalidMapping = await client.query(
        `SELECT mapping.field_id FROM jsonb_to_recordset($1::jsonb) mapping(field_id text, workspace_key text)
          LEFT JOIN fields field ON field.id = mapping.field_id
         WHERE field.id IS NULL OR mapping.workspace_key <> 'agronautas-pilot'`,
        [JSON.stringify(input.input.fieldMappings)],
      )
      if (invalidMapping.rows[0]) throw new AuthFailure(AUTH_FAILURE_CODES.MAPPING_CONFLICT, 'Field mapping is not explicit or does not target the pilot workspace', 409)

      const workspaceId = 'agronautas-pilot-workspace'
      for (const mapping of input.input.fieldMappings) {
        const existingMapping = await client.query(
          'SELECT workspace_id, workspace_key FROM agronautas_auth_field_mappings WHERE field_id = $1 FOR UPDATE',
          [mapping.fieldId],
        )
        const existing = existingMapping.rows[0]
        if (existing && (String(existing.workspace_id) !== workspaceId || String(existing.workspace_key) !== mapping.workspaceKey)) {
          throw new AuthFailure(AUTH_FAILURE_CODES.MAPPING_CONFLICT, 'Field mapping already belongs to another workspace', 409)
        }
      }
      await client.query(
        `INSERT INTO "agronautas_workspaces" ("id", "name", "status") VALUES ($1, $2, 'active')
         ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name"`,
        [workspaceId, input.input.pilotWorkspace.name],
      )
      await client.query(
        `INSERT INTO agronautas_auth_workspaces (id, workspace_key, name) VALUES ($1, 'agronautas-pilot', $2)
         ON CONFLICT (workspace_key) DO UPDATE SET name = EXCLUDED.name`,
        [workspaceId, input.input.pilotWorkspace.name],
      )
      const adminUserId = randomUUID()
      await client.query('INSERT INTO agronautas_auth_users (id, email, display_name, password_hash) VALUES ($1, $2, $3, $4)', [adminUserId, input.input.admin.email.toLowerCase(), input.input.admin.displayName, input.passwordHash])
      await client.query(
        `INSERT INTO agronautas_auth_memberships (id, user_id, workspace_id, role, scopes)
         VALUES ($1, $2, $3, 'admin', $4::jsonb)`,
        [randomUUID(), adminUserId, workspaceId, JSON.stringify(['read', 'write', 'recompute', 'admin'])],
      )
      for (const mapping of input.input.fieldMappings) {
        await client.query(
          `INSERT INTO agronautas_auth_field_mappings (field_id, workspace_id, workspace_key)
           VALUES ($1, $2, $3)
           ON CONFLICT (field_id) DO NOTHING`,
          [mapping.fieldId, workspaceId, mapping.workspaceKey],
        )
      }
      const mapped = await client.query('SELECT field_id FROM agronautas_auth_field_mappings WHERE workspace_id = $1 ORDER BY field_id', [workspaceId])
      const unmapped = await client.query('SELECT id FROM fields WHERE id NOT IN (SELECT field_id FROM agronautas_auth_field_mappings) ORDER BY id')
      const mappedFieldIds = mapped.rows.map((row) => String(row.field_id))
      const unmappedFieldIds = unmapped.rows.map((row) => String(row.id))
       const result: BootstrapTransactionResult = { status: 'created', workspaceId, adminUserId, mappedFieldIds, unmappedFieldIds }
      await client.query(
        `INSERT INTO agronautas_auth_bootstrap_state (singleton_id, idempotency_key, input_hash, workspace_id, admin_user_id, mapped_field_ids, unmapped_field_ids, secret_consumed_at)
         VALUES ('agronautas', $1, $2, $3, $4, $5::jsonb, $6::jsonb, now())`,
        [input.input.idempotencyKey, input.inputHash, workspaceId, adminUserId, JSON.stringify(mappedFieldIds), JSON.stringify(unmappedFieldIds)],
      )
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      if (error instanceof AuthFailure) throw error
      throw new AuthFailure(AUTH_FAILURE_CODES.STORAGE_FAILURE, 'Bootstrap transaction failed', undefined, { cause: error })
    } finally {
      client.release()
    }
  }

  async isFieldMapped(fieldId: string, workspaceId: string): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM agronautas_auth_field_mappings WHERE field_id = $1 AND workspace_id = $2 LIMIT 1', [fieldId, workspaceId])
    return Boolean(result.rows[0])
  }
}

function toUser(row: QueryResultRow): AuthUserRecord | null {
  if (row['status'] !== 'active' && row['status'] !== 'disabled') return null
  return { id: String(row['id']), email: String(row['email']), displayName: String(row['display_name']), passwordHash: String(row['password_hash']), status: row['status'] }
}

function toMembership(row: QueryResultRow): AuthMembershipRecord | null {
  const membershipStatus = row['membership_status']
  const workspaceStatus = row['workspace_status']
  if (membershipStatus !== 'active' && membershipStatus !== 'revoked') return null
  if (workspaceStatus !== 'active' && workspaceStatus !== 'disabled') return null
  if (!isRole(row['role'])) return null
  const scopes = Array.isArray(row['scopes']) ? row['scopes'].filter(isScope) : []
  return { id: String(row['id']), userId: String(row['user_id']), workspaceId: String(row['workspace_id']), workspaceKey: String(row['workspace_key']), role: row['role'], scopes, status: membershipStatus, workspaceStatus }
}

function toSession(row: QueryResultRow): AuthSessionRecord {
  return { id: String(row['id']), userId: String(row['user_id']), membershipId: String(row['membership_id']), refreshFamilyId: String(row['refresh_family_id']), expiresAt: new Date(String(row['expires_at'])), revokedAt: row['revoked_at'] ? new Date(String(row['revoked_at'])) : null }
}

function toRefresh(row: QueryResultRow): AuthRefreshRecord {
  return { id: String(row['id']), sessionId: String(row['session_id']), familyId: String(row['family_id']), expiresAt: new Date(String(row['expires_at'])), consumedAt: row['consumed_at'] ? new Date(String(row['consumed_at'])) : null, revokedAt: row['revoked_at'] ? new Date(String(row['revoked_at'])) : null }
}

function toStringArray(value: unknown): string[] { return Array.isArray(value) ? value.map(String) : [] }
function isRole(value: unknown): value is AuthRole { return value === 'reader' || value === 'operator' || value === 'admin' }
function isScope(value: unknown): value is AuthScope { return value === 'read' || value === 'write' || value === 'recompute' || value === 'admin' }
