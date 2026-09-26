import test from 'node:test'
import assert from 'node:assert/strict'

import { isProductFlowScopeMatch } from './agronautas-product-flows'

test('product-flow domain scope matching requires the same workspace and field', () => {
  const scope = { workspaceId: 'workspace-1', fieldId: 'field-1' }

  assert.equal(isProductFlowScopeMatch(scope, { workspaceId: 'workspace-1', fieldId: 'field-1' }), true)
  assert.equal(isProductFlowScopeMatch(scope, { workspaceId: 'workspace-2', fieldId: 'field-1' }), false)
  assert.equal(isProductFlowScopeMatch(scope, { workspaceId: 'workspace-1', fieldId: 'field-2' }), false)
})
