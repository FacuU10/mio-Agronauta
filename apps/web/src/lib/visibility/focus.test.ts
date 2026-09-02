import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FOCUS_VISIBLE_POLICY,
  createFocusTarget,
  createLiveRegionAdapter,
  createRecoveryFocusIntent,
  createSectionFocusIntent,
  getFirstInvalidFocusTarget,
} from './focus'

test('first-invalid focus selects the first safe labeled target and exposes keyboard-safe policy', () => {
  const name = createFocusTarget({ targetId: 'field-name', accessibleLabel: 'Nombre del campo' })
  const email = createFocusTarget({ targetId: 'field-email', accessibleLabel: 'Correo electrónico' })

  const firstInvalid = getFirstInvalidFocusTarget([
    { target: name, invalid: false },
    { target: email, invalid: true },
  ])

  assert.equal(firstInvalid?.targetId, 'field-email')
  assert.equal(firstInvalid?.accessibleLabel, 'Correo electrónico')
  assert.equal(firstInvalid?.policy.keyboard, 'native')
  assert.equal(firstInvalid?.policy.focusVisible, 'focus-visible')
  assert.equal(firstInvalid?.policy.occlusion, 'must-not-occlude')
  assert.throws(
    () => createFocusTarget({ targetId: 'field name', accessibleLabel: 'Nombre del campo' }),
    /safe target ID/,
  )
})

test('first-invalid focus returns no target when every supplied control is valid', () => {
  const name = createFocusTarget({ targetId: 'field-name', accessibleLabel: 'Nombre del campo' })

  assert.equal(getFirstInvalidFocusTarget([{ target: name, invalid: false }]), undefined)
})

test('recovery focus preserves the retry permission and points to a labeled keyboard action', () => {
  const intent = createRecoveryFocusIntent({
    targetId: 'retry-weather',
    accessibleLabel: 'Reintentar consulta meteorológica',
    retryAllowed: true,
  })

  assert.equal(intent.reason, 'recovery')
  assert.equal(intent.retryAllowed, true)
  assert.equal(intent.target.targetId, 'retry-weather')
  assert.equal(intent.target.policy.onRecovery, 'focus')
  assert.equal(intent.target.policy.keyboard, 'native')
})

test('recovery focus does not invent retry availability when the normalized outcome disallows it', () => {
  const intent = createRecoveryFocusIntent({
    targetId: 'recovery-result',
    accessibleLabel: 'Resultado de recuperación',
    retryAllowed: false,
    policy: { onRecovery: 'focus', onInvalid: 'preserve', onSection: 'preserve' },
  })

  assert.equal(intent.retryAllowed, false)
  assert.equal(intent.target.policy.onInvalid, 'preserve')
  assert.equal(intent.target.policy.onSection, 'preserve')
})

test('section navigation creates a focus target that remains visible below sticky content', () => {
  const intent = createSectionFocusIntent({
    targetId: 'section-evidence',
    accessibleLabel: 'Evidencia observada',
  })

  assert.equal(intent.reason, 'section')
  assert.equal(intent.target.targetId, 'section-evidence')
  assert.equal(intent.target.policy.onSection, 'focus')
  assert.equal(intent.target.policy.occlusion, 'must-not-occlude')
  assert.equal(intent.target.policy.scroll, 'target-into-view')
})

test('live-region adapter keeps one labeled announcement and the focus-visible policy explicit', () => {
  const region = createLiveRegionAdapter({
    targetId: 'operation-status',
    message: 'La consulta está lista para revisar.',
    politeness: 'polite',
    announcementKey: 'weather-query-ready',
  })

  assert.deepEqual(region, {
    targetId: 'operation-status',
    message: 'La consulta está lista para revisar.',
    role: 'status',
    ariaLive: 'polite',
    atomic: true,
    announcementKey: 'weather-query-ready',
  })
  assert.deepEqual(FOCUS_VISIBLE_POLICY, {
    keyboard: 'native',
    focusVisible: 'focus-visible',
    occlusion: 'must-not-occlude',
    scroll: 'target-into-view',
  })
})

test('assertive live-region announcements retain safe IDs and alert semantics', () => {
  const region = createLiveRegionAdapter({
    targetId: 'operation-error',
    message: 'No se pudo completar la consulta. Reintentá cuando el servicio esté disponible.',
    politeness: 'assertive',
    announcementKey: 'weather-query-error',
  })

  assert.equal(region.role, 'alert')
  assert.equal(region.ariaLive, 'assertive')
  assert.equal(region.atomic, true)
  assert.equal(region.targetId, 'operation-error')
})
