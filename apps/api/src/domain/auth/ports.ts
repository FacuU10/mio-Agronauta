import type { AuthPrincipal, AuthScope, AuthStatusResult, AuthTokenPair, RedisDenyStore } from './contracts'

export interface AgronautasAuthServicePort {
  authenticateAccessToken(accessToken: string): Promise<AuthPrincipal>
  authenticateBffAssertion(accessToken: string, assertion: string): Promise<AuthPrincipal>
  authorize(principal: AuthPrincipal, workspaceId: string, scope: AuthScope, fieldId?: string): Promise<void>
  login(input: { email: string; password: string; workspaceId?: string }): Promise<AuthTokenPair>
  refresh(refreshToken: string): Promise<AuthTokenPair>
  logout(accessToken: string): Promise<{ revoked: true }>
  status(accessToken: string): Promise<AuthStatusResult>
}

export interface AgronautasRedisAuthClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>
}

export interface AgronautasAuthDenyMarkerPort extends RedisDenyStore {}
