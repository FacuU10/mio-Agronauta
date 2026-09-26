import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AgronautasAuthService,
  InMemoryAgronautasAuthRepository,
  hashPassword,
  inspectBcryptCost,
  resolveAuthSecrets,
  createBffAssertion,
} from './agronautas-auth-service'
import {
  AUTH_SCOPES,
  AuthFailure,
  type AuthMembershipRecord,
  type AuthRefreshRecord,
  type AuthUserRecord,
  type BootstrapInput,
} from '../../domain/auth/contracts'

const TEST_SECRETS = {
  accessSecret: 'access-secret-for-tests-only-1234567890',
  refreshSecret: 'refresh-secret-for-tests-only-1234567890',
  bootstrapSecret: 'bootstrap-secret-for-tests-only-1234567890',
  bffBearerToken: 'bff-secret-for-tests-only-1234567890',
}

test('production auth secrets fail closed while explicit test injection is accepted', () => {
  assert.throws(() => resolveAuthSecrets({ NODE_ENV: 'production' }), /AGRONAUTAS_AUTH_ACCESS_SECRET/)
  assert.throws(() => resolveAuthSecrets({
    NODE_ENV: 'production',
    AGRONAUTAS_AUTH_ACCESS_SECRET: 'default',
    AGRONAUTAS_AUTH_REFRESH_SECRET: 'refresh',
    AGRONAUTAS_AUTH_BOOTSTRAP_SECRET: 'bootstrap',
    AGRONAUTAS_BFF_BEARER_TOKEN: 'bff',
  }), /non-default/)

  assert.deepEqual(resolveAuthSecrets({ NODE_ENV: 'test' }, TEST_SECRETS), TEST_SECRETS)
})

test('password hashing uses bcrypt cost 12 and does not return the source password', async () => {
  const hash = await hashPassword('correct horse battery staple')
  assert.notEqual(hash, 'correct horse battery staple')
  assert.equal(inspectBcryptCost(hash), 12)
})

test('login, status, logout and refresh contracts are durable and replay-safe', async () => {
  const repository = new InMemoryAgronautasAuthRepository({
    users: [{ id: 'user-1', email: 'admin@example.test', displayName: 'Admin', password: 'password-123', workspaceId: 'workspace-a', role: 'admin', scopes: [AUTH_SCOPES.READ, AUTH_SCOPES.WRITE, AUTH_SCOPES.ADMIN] }],
  })
  const service = new AgronautasAuthService(repository, { secrets: TEST_SECRETS })

  const login = await service.login({ email: 'admin@example.test', password: 'password-123' })
  assert.equal(login.principal.actorId, 'user-1')
  assert.equal(login.principal.workspaceId, 'workspace-a')
  assert.ok(login.accessToken)
  assert.ok(login.refreshToken)

  const status = await service.status(login.accessToken)
  assert.equal(status.principal.actorId, 'user-1')
  assert.deepEqual(status.principal.scopes, [AUTH_SCOPES.READ, AUTH_SCOPES.WRITE, AUTH_SCOPES.ADMIN])

  const rotated = await service.refresh(login.refreshToken)
  assert.notEqual(rotated.refreshToken, login.refreshToken)
  await assert.rejects(() => service.refresh(login.refreshToken), (error: unknown) => error instanceof AuthFailure && error.code === 'REFRESH_REPLAY')
  await assert.rejects(() => service.status(rotated.accessToken), /revoked|invalid/i)

  const secondLogin = await service.login({ email: 'admin@example.test', password: 'password-123' })
  await service.logout(secondLogin.accessToken)
  await assert.rejects(() => service.status(secondLogin.accessToken), /revoked|invalid/i)
})

test('refresh delegates single-use rotation to one repository transaction', async () => {
  class AtomicRotationRepository extends InMemoryAgronautasAuthRepository {
    rotationCalls = 0

      override async rotateRefreshToken(id: string, at: Date, replacementExpiresAt: Date): Promise<{ status: 'consumed' | 'replayed' | 'expired' | 'session_expired' | 'revoked' | 'missing'; record?: AuthRefreshRecord; replacement?: AuthRefreshRecord }> {
      this.rotationCalls += 1
      const consumed = await this.consumeRefreshToken(id, at)
      if (consumed.status !== 'consumed' || !consumed.record) return consumed
      const replacement = await this.createRefreshToken({ sessionId: consumed.record.sessionId, familyId: consumed.record.familyId, expiresAt: replacementExpiresAt })
      return { ...consumed, replacement }
    }
  }

  const repository = new AtomicRotationRepository({
    users: [{ id: 'user-rotation', email: 'rotation@example.test', displayName: 'Rotation', password: 'password-123', workspaceId: 'workspace-a', role: 'admin', scopes: [AUTH_SCOPES.READ, AUTH_SCOPES.WRITE] }],
  })
  const service = new AgronautasAuthService(repository, { secrets: TEST_SECRETS })
  const login = await service.login({ email: 'rotation@example.test', password: 'password-123' })

  await service.refresh(login.refreshToken)

  assert.equal(repository.rotationCalls, 1)
})

test('expired sessions reject an otherwise valid refresh without consuming or extending the session', async () => {
  class CountingRepository extends InMemoryAgronautasAuthRepository {
    refreshCreationCalls = 0
    createdRefreshTokens: AuthRefreshRecord[] = []

    override async createRefreshToken(input: { sessionId: string; familyId: string; expiresAt: Date }): Promise<AuthRefreshRecord> {
      this.refreshCreationCalls += 1
      const token = await super.createRefreshToken(input)
      this.createdRefreshTokens.push(token)
      return token
    }
  }

  const now = new Date('2026-09-15T12:00:00.000Z')
  const repository = new CountingRepository({
    users: [{ id: 'expired-session-user', email: 'expired-session@example.test', displayName: 'Expired Session', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const service = new AgronautasAuthService(repository, { secrets: TEST_SECRETS, now: () => now })
  const login = await service.login({ email: 'expired-session@example.test', password: 'password-123' })
  const session = await repository.getSession(login.principal.sessionId)
  assert.ok(session)
  session!.expiresAt = new Date(now.getTime() - 1)
  const expiredAt = session!.expiresAt.getTime()

  await assert.rejects(
    () => service.refresh(login.refreshToken),
    (error: unknown) => error instanceof AuthFailure && error.code === 'UNAUTHORIZED' && error.statusCode === 401,
  )

  assert.equal(repository.refreshCreationCalls, 1)
  assert.equal(repository.createdRefreshTokens[0]?.consumedAt, null)
  assert.equal(session!.expiresAt.getTime(), expiredAt)
})

test('refresh replacement access and refresh expiry never exceed the absolute session expiry and status reports that boundary', async () => {
  const now = new Date('2026-09-15T12:00:00.000Z')
  const repository = new InMemoryAgronautasAuthRepository({
    users: [{ id: 'bounded-session-user', email: 'bounded-session@example.test', displayName: 'Bounded Session', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const service = new AgronautasAuthService(repository, {
    secrets: TEST_SECRETS,
    now: () => now,
    accessLifetimeSeconds: 2 * 60 * 60,
    refreshLifetimeSeconds: 60 * 60,
  })
  const login = await service.login({ email: 'bounded-session@example.test', password: 'password-123' })
  const session = await repository.getSession(login.principal.sessionId)
  assert.ok(session)
  const sessionExpiresAt = session!.expiresAt.getTime()

  now.setTime(now.getTime() + 30 * 60 * 1000)
  const rotated = await service.refresh(login.refreshToken)
  const status = await service.status(rotated.accessToken)

  assert.ok(Date.parse(rotated.accessExpiresAt) <= sessionExpiresAt)
  assert.ok(Date.parse(rotated.refreshExpiresAt) <= sessionExpiresAt)
  assert.equal(Date.parse(status.refreshExpiresAt), sessionExpiresAt)
  assert.equal(session!.expiresAt.getTime(), sessionExpiresAt)
})

test('consumed refresh replay remains a typed conflict and revokes the session family', async () => {
  const repository = new InMemoryAgronautasAuthRepository({
    users: [{ id: 'replay-user', email: 'replay@example.test', displayName: 'Replay', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const service = new AgronautasAuthService(repository, { secrets: TEST_SECRETS })
  const login = await service.login({ email: 'replay@example.test', password: 'password-123' })
  const rotated = await service.refresh(login.refreshToken)

  await assert.rejects(
    () => service.refresh(login.refreshToken),
    (error: unknown) => error instanceof AuthFailure && error.code === 'REFRESH_REPLAY' && error.statusCode === 409,
  )
  await assert.rejects(() => service.status(rotated.accessToken), /revoked|invalid/i)
})

test('bootstrap accepts the exact internal input, is idempotent, and leaves unmapped fields read-only', async () => {
  const repository = new InMemoryAgronautasAuthRepository({ existingFieldIds: ['field-mapped', 'field-unmapped'] })
  const service = new AgronautasAuthService(repository, { secrets: TEST_SECRETS })
  const input: BootstrapInput = {
    idempotencyKey: 'bootstrap-run-1',
    bootstrapSecret: TEST_SECRETS.bootstrapSecret,
    pilotWorkspace: { key: 'agronautas-pilot', name: 'Agronautas Pilot' },
    admin: { email: 'operator@example.test', password: 'safe-password-123', displayName: 'Pilot Operator' },
    fieldMappings: [{ fieldId: 'field-mapped', workspaceKey: 'agronautas-pilot' }],
  }

  const created = await service.bootstrap(input)
  const repeated = await service.bootstrap(input)
  assert.equal(created.status, 'created')
  assert.equal(repeated.status, 'already_initialized')
  assert.deepEqual(created.mappedFieldIds, ['field-mapped'])
  assert.deepEqual(created.unmappedFieldIds, ['field-unmapped'])
  await assert.rejects(() => service.bootstrap({ ...input, admin: { ...input.admin, email: 'other@example.test' } }), /IDEMPOTENCY_CONFLICT/)
  await assert.rejects(() => service.bootstrap({ ...input, idempotencyKey: 'bootstrap-run-2' }), /ALREADY_INITIALIZED_CONFLICT/)
  await assert.rejects(() => service.authorizeField(created.workspaceId, 'field-unmapped', created.adminUserId, AUTH_SCOPES.WRITE), /UNMAPPED_RECORD/)
  assert.equal('inputHash' in created, false)
})

test('bootstrap runtime validation rejects malformed or extra input as a typed failure', async () => {
  const service = new AgronautasAuthService(new InMemoryAgronautasAuthRepository(), { secrets: TEST_SECRETS })

  await assert.rejects(
    () => service.bootstrap({ fieldMappings: [null] } as unknown as BootstrapInput),
    (error: unknown) => error instanceof AuthFailure && error.code === 'INVALID_INPUT' && error.statusCode === 400,
  )
  await assert.rejects(
    () => service.bootstrap({
      idempotencyKey: 'bootstrap-invalid-extra', bootstrapSecret: TEST_SECRETS.bootstrapSecret,
      pilotWorkspace: { key: 'agronautas-pilot', name: 'Pilot' },
      admin: { email: 'operator@example.test', password: 'safe-password-123', displayName: 'Operator' },
      fieldMappings: [], unexpected: true,
    } as unknown as BootstrapInput),
    (error: unknown) => error instanceof AuthFailure && error.code === 'INVALID_INPUT',
  )
})

test('BFF assertions are signed and must match the authenticated user principal', async () => {
  const repository = new InMemoryAgronautasAuthRepository({
    users: [{ id: 'user-bff', email: 'bff@example.test', displayName: 'BFF', password: 'password-123', workspaceId: 'workspace-bff', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const service = new AgronautasAuthService(repository, { secrets: TEST_SECRETS })
  const login = await service.login({ email: 'bff@example.test', password: 'password-123' })
  const assertion = createBffAssertion(login.accessToken, login.principal, TEST_SECRETS.bffBearerToken)

  const principal = await service.authenticateBffAssertion(login.accessToken, assertion)
  assert.equal(principal.actorId, 'user-bff')
  await assert.rejects(() => service.authenticateBffAssertion(`${login.accessToken}tampered`, assertion), /invalid/i)
})

test('deny markers use the bounded remaining lifetime and required Redis failure is maintenance', async () => {
  assert.equal(AgronautasAuthService.denyTtlSeconds(900), 300)
  assert.equal(AgronautasAuthService.denyTtlSeconds(60), 60)
  assert.equal(AgronautasAuthService.denyTtlSeconds(0), 1)

  const repository = new InMemoryAgronautasAuthRepository({
    users: [{ id: 'user-1', email: 'member@example.test', displayName: 'Member', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const service = new AgronautasAuthService(repository, {
    secrets: TEST_SECRETS,
    redis: { isDenied: async () => { throw new Error('redis down') }, deny: async () => undefined },
  })
  const login = await service.login({ email: 'member@example.test', password: 'password-123' })
  await assert.rejects(() => service.status(login.accessToken), (error: unknown) => error instanceof AuthFailure && error.code === 'AUTH_MAINTENANCE')
})

test('access and refresh fail closed for disabled users and memberships', async () => {
  class MutableStatusRepository extends InMemoryAgronautasAuthRepository {
    userStatus: AuthUserRecord['status'] = 'active'
    membershipStatus: AuthMembershipRecord['status'] = 'active'

    override async getUserById(userId: string): Promise<AuthUserRecord | null> {
      const user = await super.getUserById(userId)
      return user ? { ...user, status: this.userStatus } : null
    }

    override async getMembership(membershipId: string): Promise<AuthMembershipRecord | null> {
      const membership = await super.getMembership(membershipId)
      return membership ? { ...membership, status: this.membershipStatus } : null
    }
  }

  const disabledUserRepository = new MutableStatusRepository({
    users: [{ id: 'disabled-user', email: 'disabled@example.test', displayName: 'Disabled', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const disabledUserService = new AgronautasAuthService(disabledUserRepository, { secrets: TEST_SECRETS })
  const disabledUserLogin = await disabledUserService.login({ email: 'disabled@example.test', password: 'password-123' })
  disabledUserRepository.userStatus = 'disabled'
  await assert.rejects(() => disabledUserService.authenticateAccessToken(disabledUserLogin.accessToken), /invalid|disabled/i)
  await assert.rejects(() => disabledUserService.refresh(disabledUserLogin.refreshToken), /invalid|disabled/i)

  const revokedMembershipRepository = new MutableStatusRepository({
    users: [{ id: 'revoked-membership-user', email: 'revoked@example.test', displayName: 'Revoked', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const revokedMembershipService = new AgronautasAuthService(revokedMembershipRepository, { secrets: TEST_SECRETS })
  const revokedMembershipLogin = await revokedMembershipService.login({ email: 'revoked@example.test', password: 'password-123' })
  revokedMembershipRepository.membershipStatus = 'revoked'
  await assert.rejects(() => revokedMembershipService.authenticateAccessToken(revokedMembershipLogin.accessToken), /membership/i)
  await assert.rejects(() => revokedMembershipService.refresh(revokedMembershipLogin.refreshToken), /membership/i)
})

test('unknown persisted user and membership statuses fail closed', async () => {
  class UnknownStatusRepository extends InMemoryAgronautasAuthRepository {
    override async getUserById(userId: string): Promise<AuthUserRecord | null> {
      const user = await super.getUserById(userId)
      return user ? { ...user, status: 'unknown' as AuthUserRecord['status'] } : null
    }

    override async getMembership(membershipId: string): Promise<AuthMembershipRecord | null> {
      const membership = await super.getMembership(membershipId)
      return membership ? { ...membership, status: 'unknown' as AuthMembershipRecord['status'] } : null
    }
  }

  const repository = new UnknownStatusRepository({
    users: [{ id: 'unknown-status-user', email: 'unknown@example.test', displayName: 'Unknown', password: 'password-123', workspaceId: 'workspace-a', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const service = new AgronautasAuthService(repository, { secrets: TEST_SECRETS })
  const login = await service.login({ email: 'unknown@example.test', password: 'password-123' })
  await assert.rejects(() => service.authenticateAccessToken(login.accessToken), /invalid|membership/i)
  await assert.rejects(() => service.refresh(login.refreshToken), /invalid|membership/i)
})

test('disabled workspace memberships cannot login or continue through status, refresh, or authorization', async () => {
  const repository = new InMemoryAgronautasAuthRepository({
    users: [{ id: 'disabled-workspace-user', email: 'disabled-workspace@example.test', displayName: 'Disabled Workspace', password: 'password-123', workspaceId: 'workspace-disabled', workspaceStatus: 'disabled', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const service = new AgronautasAuthService(repository, { secrets: TEST_SECRETS })

  await assert.rejects(
    () => service.login({ email: 'disabled-workspace@example.test', password: 'password-123' }),
    (error: unknown) => error instanceof AuthFailure && error.code === 'FORBIDDEN' && error.statusCode === 403,
  )

  const activeRepository = new InMemoryAgronautasAuthRepository({
    users: [{ id: 'workspace-transition-user', email: 'workspace-transition@example.test', displayName: 'Workspace Transition', password: 'password-123', workspaceId: 'workspace-transition', role: 'operator', scopes: [AUTH_SCOPES.READ] }],
  })
  const activeService = new AgronautasAuthService(activeRepository, { secrets: TEST_SECRETS })
  const login = await activeService.login({ email: 'workspace-transition@example.test', password: 'password-123' })
  const membership = await activeRepository.getMembership(login.principal.membershipId)
  assert.ok(membership)
  await activeRepository.setWorkspaceStatus(membership!.workspaceId, 'disabled')

  await assert.rejects(() => activeService.authenticateAccessToken(login.accessToken), /workspace/i)
  await assert.rejects(() => activeService.status(login.accessToken), /workspace/i)
  await assert.rejects(() => activeService.refresh(login.refreshToken), /workspace|membership/i)
  await assert.rejects(() => activeService.authorize(login.principal, membership!.workspaceId, AUTH_SCOPES.READ), /workspace/i)
})
