import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveVisibilityState } from './state'

test('view-model state distinguishes loading, error, stale, degraded, missing and success', () => {
  assert.equal(deriveVisibilityState({ isLoading: true, hasData: false }), 'loading')
  assert.equal(deriveVisibilityState({ isLoading: false, hasData: false, error: 'timeout' }), 'error')
  assert.equal(deriveVisibilityState({ isLoading: false, hasData: false }), 'missing')
  assert.equal(deriveVisibilityState({ isLoading: false, hasData: true, freshness: 'stale' }), 'stale')
  assert.equal(deriveVisibilityState({ isLoading: false, hasData: true, freshness: 'degraded' }), 'degraded')
  assert.equal(deriveVisibilityState({ isLoading: false, hasData: true, freshness: 'fresh' }), 'success')
})

test('retryable errors remain error state while missing data remains distinguishable', () => {
  assert.equal(deriveVisibilityState({ isLoading: false, hasData: true, error: 'temporary', retryable: true }), 'error')
  assert.equal(deriveVisibilityState({ isLoading: false, hasData: false, error: null }), 'missing')
})
