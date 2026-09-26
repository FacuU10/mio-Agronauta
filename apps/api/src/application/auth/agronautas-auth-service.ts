import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { agronautasAuthBootstrapInputSchema } from '@repo/zod-schemas'
import {
  AUTH_FAILURE_CODES,
  AUTH_ROLES,
  AUTH_SCOPES,
  AuthFailure,
  type AuthMembershipRecord,
  type AuthPrincipal,
  type AuthRefreshRecord,
  type AuthRepository,
  type AuthSecrets,
  type AuthSessionRecord,
  type AuthTokenPair,
  type AuthUserRecord,
  type AuthScope,
  type AuthStatusResult,
  type BootstrapInput,
  type BootstrapResult,
  type LoginInput,
  type RedisDenyStore,
  type BootstrapTransactionInput,
} from '../../domain/auth/contracts'

const BCRYPT_COST = 12
const ACCESS_LIFETIME_SECONDS = 15 * 60
const REFRESH_LIFETIME_SECONDS = 30 * 24 * 60 * 60
const NON_DEFAULT_SECRET_VALUES = new Set(['default', 'secret', 'changeme', 'change-me', 'password', 'replace-me', 'replace-with-secret-manager-reference'])

interface AuthServiceOptions {
  secrets: AuthSecrets
  now?: () => Date
  accessLifetimeSeconds?: number
  refreshLifetimeSeconds?: number
  redis?: RedisDenyStore
  protectedAccessEnabled?: boolean
  redisRequired?: boolean
}

interface SignedTokenPayload {
  kind: 'access' | 'refresh'
  id: string
  sessionId: string
  membershipId: string
  familyId?: string
  expiresAt: number
}

interface BffAssertionPayload {
  kind: 'session'
  accessTokenHash: string
  principal: AuthPrincipal
}

interface MemorySeedUser {
  id: string
  email: string
  displayName: string
  password: string
  workspaceId: string
  workspaceKey?: string
  workspaceStatus?: 'active' | 'disabled'
  role: 'reader' | 'operator' | 'admin'
  scopes: AuthScope[]
}

export function resolveAuthSecrets(env: NodeJS.ProcessEnv = process.env, testInjection?: AuthSecrets): AuthSecrets {
  if (testInjection && isTestRuntime(env)) return testInjection

  const values = {
    accessSecret: env['AGRONAUTAS_AUTH_ACCESS_SECRET'],
    refreshSecret: env['AGRONAUTAS_AUTH_REFRESH_SECRET'],
    bootstrapSecret: env['AGRONAUTAS_AUTH_BOOTSTRAP_SECRET'],
    bffBearerToken: env['AGRONAUTAS_BFF_BEARER_TOKEN'],
  }

  for (const [name, value] of Object.entries(values)) {
    const normalized = value?.trim()
    if (!normalized) throw new Error(`${secretEnvironmentName(name)} is missing`)
    if (NON_DEFAULT_SECRET_VALUES.has(normalized.toLowerCase()) || normalized.length < 24) throw new Error(`${name} must be non-default and at least 24 characters`)
  }

  return {
    accessSecret: values.accessSecret!.trim(),
    refreshSecret: values.refreshSecret!.trim(),
    bootstrapSecret: values.bootstrapSecret!.trim(),
    bffBearerToken: values.bffBearerToken!.trim(),
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

export function inspectBcryptCost(hash: string): number {
  const match = /^\$2[aby]?\$(\d{2})\$/.exec(hash)
  if (!match) throw new Error('Password hash is not bcrypt compatible')
  return Number(match[1])
}

export class AgronautasAuthService {
  private readonly now: () => Date
  private readonly accessLifetimeSeconds: number
  private readonly refreshLifetimeSeconds: number
  private readonly redis?: RedisDenyStore
  private readonly protectedAccessEnabled: boolean

  constructor(private readonly repository: AuthRepository, private readonly options: AuthServiceOptions) {
    this.now = options.now ?? (() => new Date())
    this.accessLifetimeSeconds = options.accessLifetimeSeconds ?? ACCESS_LIFETIME_SECONDS
    this.refreshLifetimeSeconds = options.refreshLifetimeSeconds ?? REFRESH_LIFETIME_SECONDS
    this.redis = options.redis
    this.protectedAccessEnabled = options.protectedAccessEnabled ?? true
  }

  async login(input: LoginInput): Promise<AuthTokenPair> {
    if (!this.protectedAccessEnabled) throw new AuthFailure(AUTH_FAILURE_CODES.AUTH_MAINTENANCE, 'Authentication is temporarily in maintenance mode')
    const email = input.email.trim().toLowerCase()
    if (!email || !input.password) throw new AuthFailure(AUTH_FAILURE_CODES.INVALID_INPUT, 'Email and password are required')
    const user = await this.repository.findUserByEmail(email)
    if (!user || user.status !== 'active' || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AuthFailure(AUTH_FAILURE_CODES.INVALID_CREDENTIALS, 'Invalid credentials')
    const memberships = await this.repository.listMembershipsForUser(user.id)
    const membership = input.workspaceId
      ? memberships.find((candidate) => candidate.workspaceId === input.workspaceId) ?? null
      : memberships.length === 1 ? memberships[0] : null
    if (!membership || membership.status !== 'active' || membership.workspaceStatus !== 'active') throw new AuthFailure(input.workspaceId || membership ? AUTH_FAILURE_CODES.FORBIDDEN : AUTH_FAILURE_CODES.INVALID_INPUT, input.workspaceId || membership ? 'Active workspace membership and workspace are required' : 'Workspace selection is required')
    return this.issueTokenPair(user, membership)
  }

  async status(accessToken: string): Promise<AuthStatusResult> {
    const principal = await this.authenticateAccessToken(accessToken)
    const session = await this.repository.getSession(principal.sessionId)
    if (!session) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Session is invalid or revoked')
    return {
      principal,
       memberships: (await this.repository.listMembershipsForUser(principal.actorId)).filter((membership) => membership.status === 'active' && membership.workspaceStatus === 'active').map((membership) => ({
        membershipId: membership.id,
        workspaceId: membership.workspaceId,
        workspaceKey: membership.workspaceKey,
        role: membership.role,
        scopes: [...membership.scopes],
      })),
      accessExpiresAt: principal.expiresAt,
      refreshExpiresAt: session.expiresAt.toISOString(),
    }
  }

  async authenticateAccessToken(accessToken: string): Promise<AuthPrincipal> {
    if (!this.protectedAccessEnabled) throw new AuthFailure(AUTH_FAILURE_CODES.AUTH_MAINTENANCE, 'Authentication is temporarily in maintenance mode')
    const payload = this.readToken(accessToken, 'access')
    if (payload.expiresAt <= this.now().getTime()) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Access token expired')
    await this.assertRedisAllowed(`session:${payload.sessionId}`, payload.expiresAt)
    const session = await this.repository.getSession(payload.sessionId)
    if (!session || session.revokedAt || session.expiresAt.getTime() <= this.now().getTime() || session.membershipId !== payload.membershipId) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Session is invalid or revoked')
    const user = await this.repository.getUserById(session.userId)
    if (!user || user.status !== 'active') throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'User is disabled or invalid')
    const membership = await this.repository.getMembership(session.membershipId)
    if (!membership || membership.userId !== session.userId || membership.status !== 'active' || membership.workspaceStatus !== 'active') throw new AuthFailure(AUTH_FAILURE_CODES.FORBIDDEN, 'Active workspace membership and workspace are required')
    return this.toPrincipal(session, membership, new Date(payload.expiresAt))
  }

  async authenticateBffAssertion(accessToken: string, assertion: string): Promise<AuthPrincipal> {
    const principal = await this.authenticateAccessToken(accessToken)
    const payload = readBffAssertion(assertion, this.options.secrets.bffBearerToken)
    if (payload.accessTokenHash !== hashAccessToken(accessToken) || !samePrincipal(payload.principal, principal)) {
      throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Invalid server authentication assertion')
    }
    return principal
  }

  async refresh(refreshToken: string): Promise<AuthTokenPair> {
    if (!this.protectedAccessEnabled) throw new AuthFailure(AUTH_FAILURE_CODES.AUTH_MAINTENANCE, 'Authentication is temporarily in maintenance mode')
    const payload = this.readToken(refreshToken, 'refresh')
    if (payload.expiresAt <= this.now().getTime()) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Refresh token expired')
    const stored = await this.repository.getRefreshToken(payload.id)
    if (!stored) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Refresh token is invalid')
    if (stored.expiresAt.getTime() <= this.now().getTime()) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Refresh token expired')
    if (stored.revokedAt) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Refresh token is revoked')
    const storedSession = await this.repository.getSession(stored.sessionId)
    if (!stored.consumedAt && (!storedSession || storedSession.revokedAt || storedSession.expiresAt.getTime() <= this.now().getTime())) {
      throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Session expired or revoked')
    }
    await this.assertRedisAllowed(`refresh-family:${stored.familyId}`, stored.expiresAt.getTime())
    const now = this.now()
    const replacementExpiresAt = new Date(now.getTime() + this.refreshLifetimeSeconds * 1000)
    const rotated = await this.repository.rotateRefreshToken(payload.id, now, replacementExpiresAt)
    if (rotated.status === 'replayed' && rotated.record) {
      throw new AuthFailure(AUTH_FAILURE_CODES.REFRESH_REPLAY, 'Refresh family revoked after replay')
    }
    if (rotated.status === 'expired') throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Refresh token expired')
    if (rotated.status === 'session_expired') throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Session expired')
    if (rotated.status === 'revoked') throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Refresh token is revoked')
    if (rotated.status !== 'consumed' || !rotated.record || !rotated.replacement) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Refresh token is invalid')
    const session = await this.repository.getSession(rotated.record.sessionId)
    if (!session || session.revokedAt) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Session is invalid or revoked')
    const membership = await this.repository.getMembership(session.membershipId)
    const user = membership ? await this.repository.getUserById(membership.userId) : null
    if (!membership || membership.userId !== session.userId || !user || user.status !== 'active' || membership.status !== 'active' || membership.workspaceStatus !== 'active') throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Membership or workspace is invalid')
    return this.issueTokenPair(user, membership, session.id, rotated.record.familyId, rotated.replacement)
  }

  async logout(accessToken: string): Promise<{ revoked: true }> {
    const payload = this.readToken(accessToken, 'access')
    const session = await this.repository.getSession(payload.sessionId)
    if (!session) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Session is invalid')
    await this.repository.revokeSession(session.id, this.now())
    await this.repository.revokeRefreshFamily(session.refreshFamilyId, this.now())
    if (this.redis) {
      try {
        await this.redis.deny(`session:${session.id}`, AgronautasAuthService.denyTtlSeconds(Math.floor((session.expiresAt.getTime() - this.now().getTime()) / 1000)))
      } catch {
        // Durable PostgreSQL revocation is authoritative; Redis invalidation is best effort after logout.
      }
    }
    return { revoked: true }
  }

  async bootstrap(input: BootstrapInput): Promise<BootstrapResult> {
    validateBootstrapInput(input)
    if (!constantTimeEqual(input.bootstrapSecret, this.options.secrets.bootstrapSecret)) throw new AuthFailure(AUTH_FAILURE_CODES.INVALID_BOOTSTRAP_SECRET, 'Invalid bootstrap secret')
    const transaction: BootstrapTransactionInput = {
      input,
      passwordHash: await hashPassword(input.admin.password),
      inputHash: stableInputHash(input),
    }
    try {
      return await this.repository.runBootstrapTransaction(transaction)
    } catch (error) {
      if (error instanceof AuthFailure) throw error
      throw new AuthFailure(AUTH_FAILURE_CODES.STORAGE_FAILURE, 'Bootstrap transaction failed')
    }
  }

  async authorize(principal: AuthPrincipal, workspaceId: string, scope: AuthScope, fieldId?: string): Promise<void> {
    const membership = await this.repository.getMembership(principal.membershipId)
    if (!membership || membership.userId !== principal.actorId || membership.status !== 'active' || membership.workspaceStatus !== 'active' || principal.workspaceId !== workspaceId || membership.workspaceId !== workspaceId) throw new AuthFailure(AUTH_FAILURE_CODES.FORBIDDEN, 'Workspace membership or workspace does not permit this request')
    if (!membership.scopes.includes(scope) || !principal.scopes.includes(scope)) throw new AuthFailure(AUTH_FAILURE_CODES.FORBIDDEN, `Scope ${scope} is required`)
    if (fieldId && !(await this.repository.isFieldMapped(fieldId, workspaceId))) throw new AuthFailure(AUTH_FAILURE_CODES.UNMAPPED_RECORD, 'UNMAPPED_RECORD: Field has no explicit workspace mapping')
  }

  async authorizeField(workspaceId: string, fieldId: string, actorId: string, scope: AuthScope): Promise<void> {
    const membership = await this.repository.getMembershipForUser(actorId, workspaceId)
    if (!membership || membership.workspaceStatus !== 'active') throw new AuthFailure(AUTH_FAILURE_CODES.FORBIDDEN, 'Workspace membership or workspace does not permit this request')
    if (!membership.scopes.includes(scope)) throw new AuthFailure(AUTH_FAILURE_CODES.FORBIDDEN, `Scope ${scope} is required`)
    if (!(await this.repository.isFieldMapped(fieldId, workspaceId))) throw new AuthFailure(AUTH_FAILURE_CODES.UNMAPPED_RECORD, 'UNMAPPED_RECORD: Field has no explicit workspace mapping')
  }

  static denyTtlSeconds(remainingLifetimeSeconds: number): number {
    return Math.max(1, Math.min(300, Math.ceil(remainingLifetimeSeconds)))
  }

  private async issueTokenPair(user: AuthUserRecord, membership: AuthMembershipRecord, sessionId?: string, refreshFamilyId?: string, existingRefresh?: AuthRefreshRecord): Promise<AuthTokenPair> {
    const now = this.now()
    const familyId = existingRefresh?.familyId ?? refreshFamilyId ?? randomUUID()
    const session = sessionId
      ? (await this.repository.getSession(sessionId))!
      : await this.repository.createSession({ userId: user.id, membershipId: membership.id, refreshFamilyId: familyId, expiresAt: new Date(now.getTime() + this.refreshLifetimeSeconds * 1000) })
    const sessionExpiresAt = session.expiresAt.getTime()
    const accessExpiresAt = new Date(Math.min(now.getTime() + this.accessLifetimeSeconds * 1000, sessionExpiresAt))
    const refreshExpiresAt = new Date(Math.min(existingRefresh?.expiresAt.getTime() ?? now.getTime() + this.refreshLifetimeSeconds * 1000, sessionExpiresAt))
    const refresh = existingRefresh ?? await this.repository.createRefreshToken({ sessionId: session.id, familyId, expiresAt: refreshExpiresAt })
    const principal = this.toPrincipal(session, membership, accessExpiresAt)
    return {
      accessToken: this.writeToken({ kind: 'access', id: session.id, sessionId: session.id, membershipId: membership.id, expiresAt: accessExpiresAt.getTime() }),
      refreshToken: this.writeToken({ kind: 'refresh', id: refresh.id, sessionId: session.id, membershipId: membership.id, familyId, expiresAt: refresh.expiresAt.getTime() }),
      accessExpiresAt: accessExpiresAt.toISOString(),
      refreshExpiresAt: refresh.expiresAt.toISOString(),
      principal,
    }
  }

  private toPrincipal(session: AuthSessionRecord, membership: AuthMembershipRecord, expiresAt: Date): AuthPrincipal {
    return {
      actorId: session.userId,
      sessionId: session.id,
      membershipId: membership.id,
      workspaceId: membership.workspaceId,
      workspaceKey: membership.workspaceKey,
      role: membership.role,
      scopes: [...membership.scopes],
      expiresAt: expiresAt.toISOString(),
    }
  }

  private writeToken(payload: SignedTokenPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const secret = payload.kind === 'access' ? this.options.secrets.accessSecret : this.options.secrets.refreshSecret
    return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('base64url')}`
  }

  private readToken(token: string, kind: SignedTokenPayload['kind']): SignedTokenPayload {
    const [encoded, signature] = token.split('.')
    if (!encoded || !signature) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Missing or invalid bearer token')
    const secret = kind === 'access' ? this.options.secrets.accessSecret : this.options.secrets.refreshSecret
    const expected = createHmac('sha256', secret).update(encoded).digest('base64url')
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Missing or invalid bearer token')
    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedTokenPayload
       if (payload.kind !== kind || !payload.id || !payload.sessionId || !payload.membershipId || !Number.isFinite(payload.expiresAt)) throw new Error('invalid token')
      return payload
    } catch {
      throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Missing or invalid bearer token')
    }
  }

  private async assertRedisAllowed(key: string, expiresAtMs: number): Promise<void> {
    if (!this.redis) {
      if (this.options.redisRequired) throw new AuthFailure(AUTH_FAILURE_CODES.AUTH_MAINTENANCE, 'Required Redis policy unavailable')
      return
    }
    try {
      if (await this.redis.isDenied(key)) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Session is denied')
    } catch (error) {
      if (error instanceof AuthFailure) throw error
      throw new AuthFailure(AUTH_FAILURE_CODES.AUTH_MAINTENANCE, `Required Redis policy unavailable for ${key}`)
    }
    if (expiresAtMs <= this.now().getTime()) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Credential expired')
  }
}

export class InMemoryAgronautasAuthRepository implements AuthRepository {
  private readonly users = new Map<string, AuthUserRecord>()
  private readonly memberships = new Map<string, AuthMembershipRecord>()
  private readonly sessions = new Map<string, AuthSessionRecord>()
  private readonly refreshTokens = new Map<string, AuthRefreshRecord>()
  private readonly existingFieldIds: string[]
  private readonly mappings = new Map<string, string>()
  private bootstrapState: { key: string; inputHash: string; result: BootstrapResult } | null = null

  constructor(seed: { users?: MemorySeedUser[]; existingFieldIds?: string[] } = {}) {
    this.existingFieldIds = [...(seed.existingFieldIds ?? [])]
    for (const user of seed.users ?? []) {
      const record: AuthUserRecord = { id: user.id, email: user.email.toLowerCase(), displayName: user.displayName, passwordHash: bcrypt.hashSync(user.password, BCRYPT_COST), status: 'active' }
      this.users.set(record.id, record)
       const membership: AuthMembershipRecord = { id: `membership-${user.id}`, userId: user.id, workspaceId: user.workspaceId, workspaceKey: user.workspaceKey ?? user.workspaceId, role: user.role, scopes: [...user.scopes], status: 'active', workspaceStatus: user.workspaceStatus ?? 'active' }
      this.memberships.set(membership.id, membership)
    }
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return [...this.users.values()].find((user) => user.email === email.toLowerCase()) ?? null
  }

  async getUserById(userId: string): Promise<AuthUserRecord | null> { return this.users.get(userId) ?? null }

  async getMembershipForUser(userId: string, workspaceId?: string): Promise<AuthMembershipRecord | null> {
    return [...this.memberships.values()].find((item) => item.userId === userId && item.status === 'active' && (!workspaceId || item.workspaceId === workspaceId)) ?? null
  }

  async listMembershipsForUser(userId: string): Promise<AuthMembershipRecord[]> {
    return [...this.memberships.values()].filter((item) => item.userId === userId && item.status === 'active')
  }

  async getMembership(membershipId: string): Promise<AuthMembershipRecord | null> { return this.memberships.get(membershipId) ?? null }

  async setWorkspaceStatus(workspaceId: string, status: 'active' | 'disabled'): Promise<void> {
    for (const membership of this.memberships.values()) {
      if (membership.workspaceId === workspaceId) membership.workspaceStatus = status
    }
  }

  async createSession(input: { userId: string; membershipId: string; refreshFamilyId: string; expiresAt: Date }): Promise<AuthSessionRecord> {
    const session = { id: randomUUID(), ...input, revokedAt: null }
    this.sessions.set(session.id, session)
    return session
  }

  async getSession(sessionId: string): Promise<AuthSessionRecord | null> { return this.sessions.get(sessionId) ?? null }

  async revokeSession(sessionId: string, at: Date): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) session.revokedAt = at
  }

  async createRefreshToken(input: { sessionId: string; familyId: string; expiresAt: Date }): Promise<AuthRefreshRecord> {
    const token = { id: randomUUID(), ...input, consumedAt: null, revokedAt: null }
    this.refreshTokens.set(token.id, token)
    return token
  }

  async getRefreshToken(id: string): Promise<AuthRefreshRecord | null> { return this.refreshTokens.get(id) ?? null }

  async rotateRefreshToken(id: string, at: Date, replacementExpiresAt: Date): Promise<{ status: 'consumed' | 'replayed' | 'expired' | 'session_expired' | 'revoked' | 'missing'; record?: AuthRefreshRecord; replacement?: AuthRefreshRecord }> {
    const token = this.refreshTokens.get(id)
    if (!token) return { status: 'missing' }
    if (token.expiresAt <= at) return { status: 'expired', record: token }
    if (token.revokedAt) return { status: 'revoked', record: token }
    if (token.consumedAt) {
      await this.revokeRefreshFamily(token.familyId, at)
      await this.revokeSession(token.sessionId, at)
      return { status: 'replayed', record: token }
    }
    const session = this.sessions.get(token.sessionId)
    if (!session || session.revokedAt) return { status: 'revoked', record: token }
    if (session.expiresAt <= at) return { status: 'session_expired', record: token }
    token.consumedAt = at
    const replacement = await this.createRefreshToken({ sessionId: token.sessionId, familyId: token.familyId, expiresAt: new Date(Math.min(replacementExpiresAt.getTime(), session.expiresAt.getTime())) })
    return { status: 'consumed', record: token, replacement }
  }

  async consumeRefreshToken(id: string, at: Date): Promise<{ status: 'consumed' | 'replayed' | 'expired' | 'revoked' | 'missing'; record?: AuthRefreshRecord }> {
    const token = this.refreshTokens.get(id)
    if (!token) return { status: 'missing' }
    if (token.expiresAt <= at) return { status: 'expired', record: token }
    if (token.revokedAt) return { status: 'revoked', record: token }
    if (token.consumedAt) return { status: 'replayed', record: token }
    token.consumedAt = at
    return { status: 'consumed', record: token }
  }

  async revokeRefreshFamily(familyId: string, at: Date): Promise<void> {
    for (const token of this.refreshTokens.values()) if (token.familyId === familyId) token.revokedAt = at
  }

  async runBootstrapTransaction(input: BootstrapTransactionInput): Promise<import('../../domain/auth/contracts').BootstrapTransactionResult> {
    if (this.bootstrapState) {
      if (this.bootstrapState.key === input.input.idempotencyKey && this.bootstrapState.inputHash === input.inputHash) return { ...this.bootstrapState.result, status: 'already_initialized' }
      if (this.bootstrapState.key === input.input.idempotencyKey) throw new AuthFailure(AUTH_FAILURE_CODES.IDEMPOTENCY_CONFLICT, 'IDEMPOTENCY_CONFLICT: bootstrap idempotency key was reused with different input')
      throw new AuthFailure(AUTH_FAILURE_CODES.ALREADY_INITIALIZED_CONFLICT, 'ALREADY_INITIALIZED_CONFLICT: Agronautas bootstrap is already initialized')
    }
    const invalidMapping = input.input.fieldMappings.find((mapping) => !this.existingFieldIds.includes(mapping.fieldId) || mapping.workspaceKey !== input.input.pilotWorkspace.key)
    if (invalidMapping) throw new AuthFailure(AUTH_FAILURE_CODES.MAPPING_CONFLICT, 'Field mapping is not explicit or does not target the pilot workspace', 409)
    const workspaceId = 'agronautas-pilot-workspace'
    const admin: AuthUserRecord = { id: randomUUID(), email: input.input.admin.email.toLowerCase(), displayName: input.input.admin.displayName, passwordHash: input.passwordHash, status: 'active' }
    this.users.set(admin.id, admin)
    const membership: AuthMembershipRecord = { id: randomUUID(), userId: admin.id, workspaceId, workspaceKey: input.input.pilotWorkspace.key, role: AUTH_ROLES.ADMIN, scopes: [AUTH_SCOPES.READ, AUTH_SCOPES.WRITE, AUTH_SCOPES.RECOMPUTE, AUTH_SCOPES.ADMIN], status: 'active', workspaceStatus: 'active' }
    this.memberships.set(membership.id, membership)
    for (const mapping of input.input.fieldMappings) this.mappings.set(mapping.fieldId, workspaceId)
    const mappedFieldIds = [...this.mappings.entries()].filter(([, id]) => id === workspaceId).map(([fieldId]) => fieldId)
    const result: BootstrapResult = { status: 'created', workspaceId, adminUserId: admin.id, mappedFieldIds, unmappedFieldIds: this.existingFieldIds.filter((id) => !mappedFieldIds.includes(id)) }
    this.bootstrapState = { key: input.input.idempotencyKey, inputHash: input.inputHash, result }
    return result
  }

  async isFieldMapped(fieldId: string, workspaceId: string): Promise<boolean> { return this.mappings.get(fieldId) === workspaceId }
}

export function validateBootstrapInput(input: BootstrapInput): void {
  const parsed = agronautasAuthBootstrapInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new AuthFailure(AUTH_FAILURE_CODES.INVALID_INPUT, 'Bootstrap input does not match the internal contract')
  }
  const candidate = input as unknown as Record<string, unknown>
  const pilotWorkspace = candidate['pilotWorkspace'] as Record<string, unknown>
  const admin = candidate['admin'] as Record<string, unknown>
  const mappings = candidate['fieldMappings'] as unknown[]
  if (Object.keys(candidate).sort().join(',') !== 'admin,bootstrapSecret,fieldMappings,idempotencyKey,pilotWorkspace'
    || Object.keys(pilotWorkspace).sort().join(',') !== 'key,name'
    || Object.keys(admin).sort().join(',') !== 'displayName,email,password'
    || mappings.some((mapping) => !mapping || typeof mapping !== 'object' || Object.keys(mapping as Record<string, unknown>).sort().join(',') !== 'fieldId,workspaceKey')) {
    throw new AuthFailure(AUTH_FAILURE_CODES.INVALID_INPUT, 'Bootstrap input does not match the internal contract')
  }
}

export function createBffAssertion(accessToken: string, principal: AuthPrincipal, secret: string): string {
  const payload: BffAssertionPayload = { kind: 'session', accessTokenHash: hashAccessToken(accessToken), principal }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('base64url')}`
}

function readBffAssertion(assertion: string, secret: string): BffAssertionPayload {
  const [encoded, signature] = assertion.split('.')
  if (!encoded || !signature) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Invalid server authentication assertion')
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url')
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Invalid server authentication assertion')
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as BffAssertionPayload
    if (payload.kind !== 'session' || !payload.accessTokenHash || !payload.principal?.actorId) throw new Error('invalid assertion')
    return payload
  } catch {
    throw new AuthFailure(AUTH_FAILURE_CODES.UNAUTHORIZED, 'Invalid server authentication assertion')
  }
}

function hashAccessToken(accessToken: string): string {
  return createHash('sha256').update(accessToken).digest('hex')
}

function samePrincipal(left: AuthPrincipal, right: AuthPrincipal): boolean {
  return left.actorId === right.actorId
    && left.sessionId === right.sessionId
    && left.membershipId === right.membershipId
    && left.workspaceId === right.workspaceId
    && left.workspaceKey === right.workspaceKey
    && left.role === right.role
    && left.expiresAt === right.expiresAt
    && left.scopes.length === right.scopes.length
    && left.scopes.every((scope, index) => scope === right.scopes[index])
}

function stableInputHash(input: BootstrapInput): string {
  return createHash('sha256').update(JSON.stringify({ ...input, bootstrapSecret: '[redacted]' })).digest('hex')
}

function isTestRuntime(env: NodeJS.ProcessEnv): boolean {
  return env['NODE_ENV'] === 'test' || Boolean(env['NODE_TEST_CONTEXT']) || process.argv.includes('--test')
}

function secretEnvironmentName(name: string): string {
  const names: Record<string, string> = {
    accessSecret: 'AGRONAUTAS_AUTH_ACCESS_SECRET',
    refreshSecret: 'AGRONAUTAS_AUTH_REFRESH_SECRET',
    bootstrapSecret: 'AGRONAUTAS_AUTH_BOOTSTRAP_SECRET',
    bffBearerToken: 'AGRONAUTAS_BFF_BEARER_TOKEN',
  }
  return names[name] ?? 'AGRONAUTAS_AUTH_SECRET'
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  if (leftBytes.length !== rightBytes.length) return false
  return timingSafeEqual(leftBytes, rightBytes)
}
