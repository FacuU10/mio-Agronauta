import { z } from 'zod'

const EVIDENCE_MODES = {
  DEMO: 'demo',
  LOCAL_REAL: 'local-real',
  BLOCKED: 'blocked',
} as const

const VISIBILITY = {
  VISIBLE: 'visible',
  NOT_VISIBLE: 'not-visible',
} as const

const BLOCKER_CATEGORIES = {
  API_UNAVAILABLE: 'api-unavailable',
  AUTH_REQUIRED: 'auth-required',
  DATABASE_UNAVAILABLE: 'database-unavailable',
  FRESHNESS_NOT_VISIBLE: 'freshness-not-visible',
  PROVENANCE_NOT_VISIBLE: 'provenance-not-visible',
  PROVIDER_UNAVAILABLE: 'provider-unavailable',
  QUEUE_UNAVAILABLE: 'queue-unavailable',
  ROUTE_UNAVAILABLE: 'route-unavailable',
  WORKER_UNAVAILABLE: 'worker-unavailable',
} as const

const blockerCategorySchema = z.nativeEnum(BLOCKER_CATEGORIES)

export const uiuxEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  route: z.string().min(1).max(200).regex(/^\/(?!\/)[^?#]*$/),
  viewport: z.object({ width: z.number().int().positive().max(10000), height: z.number().int().positive().max(10000) }).strict(),
  mode: z.nativeEnum(EVIDENCE_MODES),
  provenance: z.nativeEnum(VISIBILITY),
  freshness: z.nativeEnum(VISIBILITY),
  blockers: z.array(blockerCategorySchema),
  testId: z.string().min(1).max(120).regex(/^uiux-evidence(?:-[a-z0-9]+)*$/),
  screenshot: z.enum(['attached', 'not-attached']),
  consoleErrorCount: z.number().int().nonnegative(),
  apiRequestCount: z.number().int().nonnegative(),
  commitIdentity: z.literal('not-supplied'),
  worktreeIdentity: z.literal('current-working-tree'),
  productionEvidence: z.literal('N/A'),
}).strict()

export type UiuxEvidence = z.infer<typeof uiuxEvidenceSchema>

interface UiuxEvidenceInput {
  route: string
  viewport: { width: number; height: number }
  mode: UiuxEvidence['mode']
  provenance: UiuxEvidence['provenance']
  freshness: UiuxEvidence['freshness']
  blockers: UiuxEvidence['blockers']
  testId: string
  screenshot: UiuxEvidence['screenshot']
  consoleErrorCount: number
  apiRequestCount: number
}

export function createUiuxEvidence(input: UiuxEvidenceInput): UiuxEvidence {
  let route = '/unavailable'
  try {
    route = new URL(input.route, 'http://local.invalid').pathname
  } catch {
    route = '/unavailable'
  }

  const testId = input.testId.length <= 120 && /^uiux-evidence(?:-[a-z0-9]+)*$/.test(input.testId)
    ? input.testId
    : 'uiux-evidence'

  return uiuxEvidenceSchema.parse({
    schemaVersion: 1,
    route,
    viewport: input.viewport,
    mode: input.mode,
    provenance: input.provenance,
    freshness: input.freshness,
    blockers: input.blockers,
    testId,
    screenshot: input.screenshot,
    consoleErrorCount: input.consoleErrorCount,
    apiRequestCount: input.apiRequestCount,
    commitIdentity: 'not-supplied',
    worktreeIdentity: 'current-working-tree',
    productionEvidence: 'N/A',
  })
}
