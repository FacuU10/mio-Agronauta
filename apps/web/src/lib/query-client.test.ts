import test from 'node:test'
import assert from 'node:assert/strict'
import { QueryClient } from '@tanstack/react-query'
import { useAgronautasStore } from '@/store/agronautas-store'
import { clearAgronautasProtectedState, createAgronautasQueryKey } from './query-client'

const scopeA = { actorId: 'actor-a', sessionId: 'session-a', workspaceId: 'workspace-a' }
const scopeB = { actorId: 'actor-b', sessionId: 'session-b', workspaceId: 'workspace-b' }

test('protected Agronautas query keys isolate actor, session, and workspace transitions', () => {
  const keyA = createAgronautasQueryKey('protected', scopeA, 'field', 'field-1')
  const keyB = createAgronautasQueryKey('protected', scopeB, 'field', 'field-1')
  const publicKey = createAgronautasQueryKey('public', null, 'field', 'field-1')

  assert.notDeepEqual(keyA, keyB)
  assert.deepEqual(keyA.slice(0, 5), ['agronautas', 'protected', 'actor-a', 'session-a', 'workspace-a'])
  assert.deepEqual(publicKey, ['agronautas', 'public', 'field', 'field-1'])
})

test('location query keys isolate selected field and canonical location lineage', () => {
  const fieldA = createAgronautasQueryKey('protected', scopeA, 'location', 'field-1', 'location-1')
  const fieldB = createAgronautasQueryKey('protected', scopeA, 'location', 'field-2', 'location-1')
  const locationB = createAgronautasQueryKey('protected', scopeA, 'location', 'field-1', 'location-2')

  assert.notDeepEqual(fieldA, fieldB)
  assert.notDeepEqual(fieldA, locationB)
})

test('auth-boundary cleanup removes protected cache and Zustand state while retaining public cache', () => {
  const queryClient = new QueryClient()
  const protectedKey = createAgronautasQueryKey('protected', scopeA, 'field', 'field-1')
  const publicKey = createAgronautasQueryKey('public', null, 'runtime')
  queryClient.setQueryData(protectedKey, { externalFieldId: 'private-old-field' })
  queryClient.setQueryData(publicKey, { mode: 'demo' })
  useAgronautasStore.getState().setSelectedFieldId('field-1')
  useAgronautasStore.getState().setLastCreatedFieldId('field-1')
  useAgronautasStore.getState().setIntakeError('old session error')

  clearAgronautasProtectedState(queryClient)

  assert.equal(queryClient.getQueryData(protectedKey), undefined)
  assert.deepEqual(queryClient.getQueryData(publicKey), { mode: 'demo' })
   assert.deepEqual(useAgronautasStore.getState(), {
     selectedFieldId: null,
     selectedLocation: null,
     selectionError: null,
     lastCreatedFieldId: null,
     intakeError: null,
     setSelectedFieldId: useAgronautasStore.getState().setSelectedFieldId,
     setSelectedLocation: useAgronautasStore.getState().setSelectedLocation,
     setSelectionError: useAgronautasStore.getState().setSelectionError,
     setLastCreatedFieldId: useAgronautasStore.getState().setLastCreatedFieldId,
    setIntakeError: useAgronautasStore.getState().setIntakeError,
    reset: useAgronautasStore.getState().reset,
  })
})
