import { z } from 'zod'
import { ApiError } from '@/lib/api-client'
import {
  agronautasAuthLoginRequestSchema,
  agronautasAuthMembershipSchema,
  agronautasAuthPrincipalSchema,
  agronautasAuthStatusSchema,
} from '@repo/zod-schemas'

const AUTH_CLIENT_STATES = {
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  RECOVERY: 'recovery',
  MAINTENANCE: 'maintenance',
  UNAVAILABLE: 'unavailable',
  RATE_LIMITED: 'rate_limited',
} as const

export type AgronautasAuthClientState = (typeof AUTH_CLIENT_STATES)[keyof typeof AUTH_CLIENT_STATES]

const publicSessionSchema = z.object({
  principal: agronautasAuthPrincipalSchema,
  accessExpiresAt: z.string().datetime(),
  refreshExpiresAt: z.string().datetime(),
  memberships: z.array(agronautasAuthMembershipSchema).optional(),
}).strict()

export type AgronautasAuthSession = z.infer<typeof publicSessionSchema>
export type AgronautasAuthStatus = z.infer<typeof agronautasAuthStatusSchema>

export interface AgronautasAuthClient {
  login(input: { email: string; password: string; workspaceId?: string }): Promise<AgronautasAuthSession>
  status(): Promise<AgronautasAuthStatus>
  refresh(): Promise<AgronautasAuthSession>
  logout(): Promise<void>
}

export interface AgronautasAuthClientErrorOutcome {
  state: AgronautasAuthClientState
  title: string
  description: string
  preserveDraft: true
  retryAfterMs?: number
}

let pendingStatus: Promise<AgronautasAuthStatus> | undefined
function sharedStatus(): Promise<AgronautasAuthStatus> {
  if (!pendingStatus) {
    pendingStatus = request('/api/agronautas/auth/status')
      .then((data) => agronautasAuthStatusSchema.parse(data))
      .finally(() => { pendingStatus = undefined })
  }
  return pendingStatus
}

export function createAgronautasAuthClient(): AgronautasAuthClient {
  return {
    login: async (input) => {
      const payload = agronautasAuthLoginRequestSchema.parse(input)
      return publicSessionSchema.parse(await request('/api/agronautas/auth/login', { method: 'POST', body: JSON.stringify(payload) }))
    },
    status: sharedStatus,
    refresh: async () => publicSessionSchema.parse(await request('/api/agronautas/auth/refresh', { method: 'POST' })),
    logout: async () => {
      await request('/api/agronautas/auth/logout', { method: 'POST' })
    },
  }
}

export function normalizeAgronautasAuthClientError(error: unknown): AgronautasAuthClientErrorOutcome {
  const apiError = error instanceof ApiError ? error : undefined
  if (apiError?.status === 429) {
    const retryAfterMs = apiError.retryAfterMs ?? 60_000
    return { state: AUTH_CLIENT_STATES.RATE_LIMITED, title: 'Demasiados intentos', description: `Esperá ${Math.ceil(retryAfterMs / 1000)} segundos antes de volver a intentar. Tus datos siguen en el formulario.`, preserveDraft: true, retryAfterMs }
  }
  if (apiError?.code === 'REFRESH_REPLAY' || apiError?.status === 409) {
    return { state: AUTH_CLIENT_STATES.RECOVERY, title: 'Sesión revocada por seguridad', description: 'El refresh fue rechazado por replay. Iniciá sesión nuevamente; no se muestran datos protegidos.', preserveDraft: true }
  }
  if (apiError?.status === 401) {
    return { state: AUTH_CLIENT_STATES.UNAUTHORIZED, title: 'Sesión requerida', description: 'Las credenciales no pudieron verificarse. Revisá los datos o iniciá sesión nuevamente.', preserveDraft: true }
  }
  if (apiError?.status === 403) {
    return { state: AUTH_CLIENT_STATES.FORBIDDEN, title: 'Workspace restringido', description: 'Tu membresía no permite este workspace u operación. Consultá al administrador.', preserveDraft: true }
  }
  if (apiError?.code === 'AUTH_MAINTENANCE' || apiError?.status === 503) {
    return { state: AUTH_CLIENT_STATES.MAINTENANCE, title: 'Autenticación en mantenimiento', description: 'No se pudo probar la política de seguridad. Tus datos permanecen protegidos; intentá más tarde.', preserveDraft: true }
  }
  return { state: AUTH_CLIENT_STATES.UNAVAILABLE, title: 'Acceso no disponible', description: apiError?.message ?? 'No se pudo confirmar el acceso. No se muestran datos no verificados.', preserveDraft: true }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  })
  if (response.status === 204) return undefined
  const data = await response.json().catch(() => ({})) as unknown
  if (!response.ok) {
    const record = asRecord(data)
    const retryHeader = response.headers.get('retry-after')
    const retryValue = retryHeader ? (/^\d+$/.test(retryHeader) ? Number(retryHeader) * 1000 : Date.parse(retryHeader) - Date.now()) : NaN
    const retryAfterMs = Number.isFinite(retryValue) ? Math.max(0, retryValue) : undefined
    throw new ApiError(response.status, typeof record?.['message'] === 'string' ? record['message'] : `HTTP ${response.status}`, data, retryAfterMs, typeof record?.['code'] === 'string' ? record['code'] as string : undefined)
  }
  return data
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}
