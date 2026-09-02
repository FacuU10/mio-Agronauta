const SAFE_TARGET_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/

export type SafeTargetId = string & { readonly __safeTargetId: unique symbol }
export type FocusTrigger = 'focus' | 'preserve'

export const FOCUS_VISIBLE_POLICY = {
  keyboard: 'native',
  focusVisible: 'focus-visible',
  occlusion: 'must-not-occlude',
  scroll: 'target-into-view',
} as const

export type FocusVisiblePolicy = typeof FOCUS_VISIBLE_POLICY

export interface FocusTargetPolicy extends FocusVisiblePolicy {
  onInvalid: FocusTrigger
  onRecovery: FocusTrigger
  onSection: FocusTrigger
}

export interface FocusTarget {
  targetId: SafeTargetId
  accessibleLabel: string
  policy: FocusTargetPolicy
}

export interface FocusTargetInput {
  targetId: string
  accessibleLabel: string
  policy?: Partial<Pick<FocusTargetPolicy, 'onInvalid' | 'onRecovery' | 'onSection'>>
}

export interface InvalidFocusEntry {
  target: FocusTarget
  invalid: boolean
}

export type FocusIntentReason = 'recovery' | 'section'

export interface FocusIntent {
  target: FocusTarget
  reason: FocusIntentReason
  retryAllowed?: boolean
}

export interface RecoveryFocusInput extends FocusTargetInput {
  retryAllowed: boolean
}

export interface LiveRegionAdapterInput {
  targetId: string
  message: string
  politeness: 'polite' | 'assertive'
  announcementKey: string
}

export interface LiveRegionAdapter {
  targetId: SafeTargetId
  message: string
  role: 'status' | 'alert'
  ariaLive: 'polite' | 'assertive'
  atomic: true
  announcementKey: string
}

export function isSafeTargetId(value: string): value is SafeTargetId {
  return SAFE_TARGET_ID_PATTERN.test(value)
}

export function createFocusTarget(input: FocusTargetInput): FocusTarget {
  const targetId = toSafeTargetId(input.targetId)
  const accessibleLabel = input.accessibleLabel.trim()
  if (!accessibleLabel) throw new TypeError('Focus targets require an accessible label')

  return {
    targetId,
    accessibleLabel,
    policy: {
      ...FOCUS_VISIBLE_POLICY,
      onInvalid: input.policy?.onInvalid ?? 'focus',
      onRecovery: input.policy?.onRecovery ?? 'focus',
      onSection: input.policy?.onSection ?? 'focus',
    },
  }
}

export function getFirstInvalidFocusTarget(entries: readonly InvalidFocusEntry[]): FocusTarget | undefined {
  return entries.find((entry) => entry.invalid)?.target
}

export function createRecoveryFocusIntent(input: RecoveryFocusInput): FocusIntent {
  return {
    target: createFocusTarget(input),
    reason: 'recovery',
    retryAllowed: input.retryAllowed,
  }
}

export function createSectionFocusIntent(input: FocusTargetInput): FocusIntent {
  return {
    target: createFocusTarget(input),
    reason: 'section',
  }
}

export function createLiveRegionAdapter(input: LiveRegionAdapterInput): LiveRegionAdapter {
  const message = input.message.trim()
  if (!message) throw new TypeError('Live regions require an announcement message')

  const announcementKey = input.announcementKey.trim()
  if (!announcementKey) throw new TypeError('Live regions require a stable announcement key')

  return {
    targetId: toSafeTargetId(input.targetId),
    message,
    role: input.politeness === 'assertive' ? 'alert' : 'status',
    ariaLive: input.politeness,
    atomic: true,
    announcementKey,
  }
}

function toSafeTargetId(value: string): SafeTargetId {
  if (!isSafeTargetId(value)) throw new TypeError(`Invalid safe target ID: ${value}`)
  return value
}
