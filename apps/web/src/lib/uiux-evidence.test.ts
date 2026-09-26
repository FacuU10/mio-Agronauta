import assert from 'node:assert/strict'
import test from 'node:test'

import { createUiuxEvidence, uiuxEvidenceSchema } from '../../tests/e2e/helpers/evidence'

test('creates a route-scoped demo report without query credentials or unsupported claims', () => {
  const evidence = createUiuxEvidence({
    route: '/demo?view=evidence&token=must-not-appear#panel',
    viewport: { width: 1440, height: 900 },
    mode: 'demo',
    provenance: 'visible',
    freshness: 'visible',
    blockers: [],
    testId: 'uiux-evidence token=private',
    screenshot: 'attached',
    consoleErrorCount: 0,
    apiRequestCount: 0,
  })

  assert.equal(evidence.route, '/demo')
  assert.equal(evidence.mode, 'demo')
  assert.equal(evidence.testId, 'uiux-evidence')
  assert.equal(evidence.commitIdentity, 'not-supplied')
  assert.equal(evidence.productionEvidence, 'N/A')
  assert.equal(JSON.stringify(evidence).includes('must-not-appear'), false)
  assert.equal(JSON.stringify(evidence).includes('token'), false)
})

test('schema accepts local-real and blocked observations with categorized blockers only', () => {
  const localReal = uiuxEvidenceSchema.parse({
    schemaVersion: 1,
    route: '/agronautas',
    viewport: { width: 390, height: 844 },
    mode: 'local-real',
    provenance: 'visible',
    freshness: 'visible',
    blockers: [],
    testId: 'uiux-evidence-mobile',
    screenshot: 'attached',
    consoleErrorCount: 0,
    apiRequestCount: 2,
    commitIdentity: 'not-supplied',
    worktreeIdentity: 'current-working-tree',
    productionEvidence: 'N/A',
  })
  const blocked = uiuxEvidenceSchema.parse({
    ...localReal,
    mode: 'blocked',
    blockers: ['api-unavailable', 'auth-required'],
    provenance: 'not-visible',
    freshness: 'not-visible',
  })

  assert.equal(localReal.mode, 'local-real')
  assert.deepEqual(blocked.blockers, ['api-unavailable', 'auth-required'])
})

test('rejects raw blocker descriptions and unsupported production evidence', () => {
  const result = uiuxEvidenceSchema.safeParse({
    schemaVersion: 1,
    route: '/demo',
    viewport: { width: 1440, height: 900 },
    mode: 'blocked',
    provenance: 'not-visible',
    freshness: 'not-visible',
    blockers: ['API token=private'],
    testId: 'uiux-evidence',
    screenshot: 'attached',
    consoleErrorCount: 0,
    apiRequestCount: 0,
    commitIdentity: 'not-supplied',
    worktreeIdentity: 'current-working-tree',
    productionEvidence: 'proven',
  })

  assert.equal(result.success, false)
})
