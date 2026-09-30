export const AUTH_ROLES = {
  READER: 'reader',
  OPERATOR: 'operator',
  ADMIN: 'admin',
} as const

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES]

export const AUTH_SCOPES = {
  READ: 'read',
  WRITE: 'write',
  RECOMPUTE: 'recompute',
  ADMIN: 'admin',
} as const

export type AuthScope = (typeof AUTH_SCOPES)[keyof typeof AUTH_SCOPES]

export const AUTH_FAILURE_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_BOOTSTRAP_SECRET: 'INVALID_BOOTSTRAP_SECRET',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  UNMAPPED_RECORD: 'UNMAPPED_RECORD',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  ALREADY_INITIALIZED_CONFLICT: 'ALREADY_INITIALIZED_CONFLICT',
  MAPPING_CONFLICT: 'MAPPING_CONFLICT',
  STORAGE_FAILURE: 'STORAGE_FAILURE',
  REFRESH_REPLAY: 'REFRESH_REPLAY',
  AUTH_MAINTENANCE: 'AUTH_MAINTENANCE',
} as const

export type AuthFailureCode = (typeof AUTH_FAILURE_CODES)[keyof typeof AUTH_FAILURE_CODES]

export interface AuthSecrets {
  accessSecret: string
  refreshSecret: string
  bootstrapSecret: string
  bffBearerToken: string
}

export interface AuthUserRecord {
  id: string
  email: string
  displayName: string
  passwordHash: string
  status: 'active' | 'disabled'
}

export interface AuthMembershipRecord {
  id: string
  userId: string
  workspaceId: string
  workspaceKey: string
  role: AuthRole
  scopes: AuthScope[]
  status: 'active' | 'revoked'
  workspaceStatus: 'active' | 'disabled'
}

export interface AuthSessionRecord {
  id: string
  userId: string
  membershipId: string
  refreshFamilyId: string
  expiresAt: Date
  revokedAt: Date | null
}

export interface AuthRefreshRecord {
  id: string
  sessionId: string
  familyId: string
  expiresAt: Date
  consumedAt: Date | null
  revokedAt: Date | null
}

export interface AuthPrincipal {
  actorId: string
  sessionId: string
  membershipId: string
  workspaceId: string
  workspaceKey: string
  role: AuthRole
  scopes: AuthScope[]
  expiresAt: string
}

export interface AuthTokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresAt: string
  refreshExpiresAt: string
  principal: AuthPrincipal
}

export interface LoginInput {
  email: string
  password: string
  workspaceId?: string
}

export interface LogoutResult {
  revoked: true
}

export interface BootstrapInput {
  idempotencyKey: string
  bootstrapSecret: string
  pilotWorkspace: { key: 'agronautas-pilot'; name: string }
  admin: { email: string; password: string; displayName: string }
  fieldMappings: Array<{ fieldId: string; workspaceKey: string }>
}

export interface BootstrapResult {
  status: 'created' | 'already_initialized'
  workspaceId: string
  adminUserId: string
  mappedFieldIds: string[]
  unmappedFieldIds: string[]
}

export interface BootstrapTransactionInput {
  input: BootstrapInput
  passwordHash: string
  inputHash: string
}

export type BootstrapTransactionResult = BootstrapResult

export interface AuthStatusResult {
  principal: AuthPrincipal
  memberships: Array<{
    membershipId: string
    workspaceId: string
    workspaceKey: string
    role: AuthRole
    scopes: AuthScope[]
  }>
  accessExpiresAt: string
  refreshExpiresAt: string
}

export interface RedisDenyStore {
  isDenied(key: string): Promise<boolean>
  deny(key: string, ttlSeconds: number): Promise<void>
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>
  getUserById(userId: string): Promise<AuthUserRecord | null>
  getMembershipForUser(userId: string, workspaceId?: string): Promise<AuthMembershipRecord | null>
  listMembershipsForUser(userId: string): Promise<AuthMembershipRecord[]>
  getMembership(membershipId: string): Promise<AuthMembershipRecord | null>
  createSession(input: { userId: string; membershipId: string; refreshFamilyId: string; expiresAt: Date }): Promise<AuthSessionRecord>
  getSession(sessionId: string): Promise<AuthSessionRecord | null>
  revokeSession(sessionId: string, at: Date): Promise<void>
  createRefreshToken(input: { sessionId: string; familyId: string; expiresAt: Date }): Promise<AuthRefreshRecord>
  getRefreshToken(id: string): Promise<AuthRefreshRecord | null>
  rotateRefreshToken(id: string, at: Date, replacementExpiresAt: Date): Promise<{
    status: 'consumed' | 'replayed' | 'expired' | 'session_expired' | 'revoked' | 'missing'
    record?: AuthRefreshRecord
    replacement?: AuthRefreshRecord
  }>
  consumeRefreshToken(id: string, at: Date): Promise<{ status: 'consumed' | 'replayed' | 'expired' | 'revoked' | 'missing'; record?: AuthRefreshRecord }>
  revokeRefreshFamily(familyId: string, at: Date): Promise<void>
  runBootstrapTransaction(input: BootstrapTransactionInput): Promise<BootstrapTransactionResult>
  isFieldMapped(fieldId: string, workspaceId: string): Promise<boolean>
}

export class AuthFailure extends Error {
  override readonly name = 'AuthFailure'
  override readonly message: string

  constructor(
    readonly code: AuthFailureCode,
    message: string = code,
    readonly statusCode: number = failureStatus(code),
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.message = message
  }
}

function failureStatus(code: AuthFailureCode): number {
  if (code === AUTH_FAILURE_CODES.FORBIDDEN || code === AUTH_FAILURE_CODES.UNMAPPED_RECORD) return code === AUTH_FAILURE_CODES.UNMAPPED_RECORD ? 422 : 403
  if (code === AUTH_FAILURE_CODES.REFRESH_REPLAY || code === AUTH_FAILURE_CODES.IDEMPOTENCY_CONFLICT || code === AUTH_FAILURE_CODES.ALREADY_INITIALIZED_CONFLICT) return 409
  if (code === AUTH_FAILURE_CODES.AUTH_MAINTENANCE || code === AUTH_FAILURE_CODES.STORAGE_FAILURE) return 503
  if (code === AUTH_FAILURE_CODES.INVALID_INPUT) return 400
  return 401
}
