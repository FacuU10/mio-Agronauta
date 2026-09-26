import test from 'node:test'
import assert from 'node:assert/strict'
import { isAgronautasAuthBoundaryFailure, normalizeAgronautasAuthRecovery } from './auth-recovery'

test('auth recovery keeps unauthorized and forbidden outcomes non-actionable at both viewport contracts', () => {
  for (const viewport of ['desktop', 'mobile'] as const) {
    assert.deepEqual(normalizeAgronautasAuthRecovery({ status: 401, code: 'UNAUTHORIZED', retryable: false, viewport }), {
      state: 'unauthorized',
      title: 'Sesión requerida',
      description: 'Iniciá sesión para continuar. No se muestran datos protegidos.',
      retryAllowed: false,
      preserveDraft: true,
      viewport,
    })
    assert.equal(normalizeAgronautasAuthRecovery({ status: 403, code: 'FORBIDDEN', retryable: false, viewport }).state, 'forbidden')
    assert.equal(normalizeAgronautasAuthRecovery({ status: 503, code: 'AUTH_MAINTENANCE', retryable: true, viewport }).retryAllowed, false)
  }
})

test('refresh replay clears the authenticated presentation instead of retrying a security boundary', () => {
  const outcome = normalizeAgronautasAuthRecovery({ status: 409, code: 'REFRESH_REPLAY', retryable: false, viewport: 'desktop' })
  assert.equal(outcome.state, 'recovery')
  assert.equal(outcome.retryAllowed, false)
  assert.match(outcome.description, /revocada|iniciá sesión/i)
})

test('auth-boundary classification covers session and maintenance transitions without treating ordinary unavailability as auth failure', () => {
  assert.equal(isAgronautasAuthBoundaryFailure({ status: 401 }), true)
  assert.equal(isAgronautasAuthBoundaryFailure({ status: 403 }), true)
  assert.equal(isAgronautasAuthBoundaryFailure({ status: 409, code: 'REFRESH_REPLAY' }), true)
  assert.equal(isAgronautasAuthBoundaryFailure({ status: 503, code: 'AUTH_MAINTENANCE' }), true)
  assert.equal(isAgronautasAuthBoundaryFailure({ status: 404 }), false)
})
