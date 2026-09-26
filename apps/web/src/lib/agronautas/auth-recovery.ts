const AUTH_RECOVERY_STATES = {
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  MAINTENANCE: 'maintenance',
  RECOVERY: 'recovery',
  UNAVAILABLE: 'unavailable',
} as const

type AuthRecoveryState = (typeof AUTH_RECOVERY_STATES)[keyof typeof AUTH_RECOVERY_STATES]
type AuthRecoveryViewport = 'desktop' | 'mobile'

export interface AgronautasAuthRecoveryInput {
  status: number
  code?: string
  retryable: boolean
  viewport: AuthRecoveryViewport
}

export interface AgronautasAuthRecoveryOutcome {
  state: AuthRecoveryState
  title: string
  description: string
  retryAllowed: false
  preserveDraft: true
  viewport: AuthRecoveryViewport
}

export function isAgronautasAuthBoundaryFailure(input: { status?: number; code?: string }): boolean {
  return input.status === 401 || input.status === 403 || input.status === 409 || input.status === 503 || input.code === 'REFRESH_REPLAY' || input.code === 'AUTH_MAINTENANCE'
}

export function normalizeAgronautasAuthRecovery(input: AgronautasAuthRecoveryInput): AgronautasAuthRecoveryOutcome {
  if (input.code === 'REFRESH_REPLAY' || input.status === 409) {
    return { state: AUTH_RECOVERY_STATES.RECOVERY, title: 'Sesión revocada', description: 'La sesión fue revocada por seguridad. Iniciá sesión nuevamente para continuar.', retryAllowed: false, preserveDraft: true, viewport: input.viewport }
  }
  if (input.status === 401) {
    return { state: AUTH_RECOVERY_STATES.UNAUTHORIZED, title: 'Sesión requerida', description: 'Iniciá sesión para continuar. No se muestran datos protegidos.', retryAllowed: false, preserveDraft: true, viewport: input.viewport }
  }
  if (input.status === 403) {
    return { state: AUTH_RECOVERY_STATES.FORBIDDEN, title: 'Acceso restringido', description: 'Tu membresía no permite esta operación. Consultá al administrador del workspace.', retryAllowed: false, preserveDraft: true, viewport: input.viewport }
  }
  if (input.status === 503 || input.code === 'AUTH_MAINTENANCE') {
    return { state: AUTH_RECOVERY_STATES.MAINTENANCE, title: 'Autenticación en mantenimiento', description: 'No se puede probar la política de seguridad ahora. Tus datos permanecen protegidos; intentá más tarde.', retryAllowed: false, preserveDraft: true, viewport: input.viewport }
  }
  return { state: AUTH_RECOVERY_STATES.UNAVAILABLE, title: 'Acceso no disponible', description: 'No se pudo confirmar el acceso. Conservamos tu borrador y no mostramos datos no verificados.', retryAllowed: false, preserveDraft: true, viewport: input.viewport }
}
