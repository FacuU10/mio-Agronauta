import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveRecoveryState, deriveVisibilityState } from './state'

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

test('typed recovery policy separates auth boundaries, maintenance, transient retry and empty data', () => {
  assert.deepEqual(deriveRecoveryState({ status: 401, hasData: true }), { state: 'unauthorized', retryable: false, preservesData: false })
  assert.deepEqual(deriveRecoveryState({ status: 403, hasData: true }), { state: 'forbidden', retryable: false, preservesData: false })
  assert.deepEqual(deriveRecoveryState({ status: 503, hasData: true }), { state: 'maintenance', retryable: true, preservesData: true })
  assert.deepEqual(deriveRecoveryState({ status: 429, hasData: false }), { state: 'retry', retryable: true, preservesData: false })
  assert.deepEqual(deriveRecoveryState({ status: 200, hasData: false }), { state: 'missing', retryable: false, preservesData: false })
})
