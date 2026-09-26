import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { ManagementPanel } from './management-panel'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/agronautas' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.FormData = dom.window.FormData
  globalThis.Event = dom.window.Event
}

test('management panel renders empty/loading/error recovery and creates an operation for the selected field', async () => {
  setupDom()
  cleanup()
  const view = render(<ManagementPanel selectedFieldId="field-1" items={[]} audit={[]} isLoading={false} error={null} isMutating={false} onRetry={async () => undefined} onCreateOperation={async () => undefined} onTransition={async () => undefined} />)
  assert.ok(view.getByText('No hay campañas, operaciones o tareas persistidas.'))
  assert.ok(view.getByLabelText('Nombre de operación'))
  assert.ok(view.getByRole('button', { name: 'Crear operación' }))
})

test('management panel exposes honest loading and retryable storage error states', () => {
  setupDom()
  cleanup()
  const loading = render(<ManagementPanel selectedFieldId={null} items={[]} audit={[]} isLoading={true} error={null} isMutating={false} onRetry={async () => undefined} onCreateOperation={async () => undefined} onTransition={async () => undefined} />)
  assert.ok(loading.getByRole('status'))
  cleanup()
  const error = render(<ManagementPanel selectedFieldId="field-1" items={[]} audit={[]} isLoading={false} error="storage unavailable" isMutating={false} onRetry={async () => undefined} onCreateOperation={async () => undefined} onTransition={async () => undefined} />)
  assert.ok(error.getByRole('button', { name: 'Reintentar gestión' }))
})

test('management panel renders lifecycle, revision, and source-backed audit history', () => {
  setupDom()
  cleanup()
  const view = render(<ManagementPanel
    selectedFieldId="field-1"
    items={[{
      id: 'operation-1', kind: 'operation', workspaceId: 'workspace-1', fieldId: 'field-1', parentId: null,
      name: 'Aplicar tratamiento', status: 'blocked', revision: 3, responsibleActorId: 'actor-1',
      createdByActorId: 'actor-1', idempotencyKey: 'operation-1', sourceLocationIds: ['location-1'],
      planningLabel: 'assumption_only', createdAt: '2026-09-21T10:00:00.000Z', updatedAt: '2026-09-21T10:02:00.000Z',
    }]}
    audit={[{
      auditId: 'audit-1', actorId: 'actor-1', action: 'transition', targetId: 'operation-1', outcome: 'accepted',
      revisionBefore: 2, revisionAfter: 3, occurredAt: '2026-09-21T10:02:00.000Z', requestId: 'request-1',
    }]}
    isLoading={false}
    error={null}
    isMutating={false}
    onRetry={async () => undefined}
    onCreateOperation={async () => undefined}
    onTransition={async () => undefined}
  />)

  assert.ok(view.getByText('blocked'))
  assert.ok(view.getAllByText(/revisión 3/).length >= 1)
  assert.ok(view.getAllByText(/actor-1/).length >= 1)
  assert.ok(view.getByText(/2 → 3/))
  assert.ok(view.getByText(/2026-09-21T10:02:00.000Z/))
})

test('management panel preserves the create draft after a conflict and exposes recovery', async () => {
  setupDom()
  cleanup()
  const onCreateOperation = async () => {
    throw Object.assign(new Error('La gestión cambió'), { status: 409 })
  }
  const view = render(<ManagementPanel selectedFieldId="field-1" items={[]} audit={[]} isLoading={false} error={null} isMutating={false} onRetry={async () => undefined} onCreateOperation={onCreateOperation} onTransition={async () => undefined} />)

  const input = view.getByLabelText('Nombre de operación')
  fireEvent.input(input, { target: { value: 'Borrador protegido' } })
  await waitFor(() => assert.equal((input as HTMLInputElement).value, 'Borrador protegido'))
  fireEvent.submit(view.getByRole('button', { name: 'Crear operación' }).closest('form') as HTMLFormElement)

  await waitFor(() => assert.ok(view.getByRole('alert')))
  assert.equal((input as HTMLInputElement).value, 'Borrador protegido')
  assert.ok(view.getByRole('button', { name: 'Reintentar gestión' }))
})

test('management panel reports forbidden access without rendering management data', () => {
  setupDom()
  cleanup()
  const view = render(<ManagementPanel selectedFieldId="field-1" items={[]} audit={[]} isLoading={false} error={null} isMutating={false} accessState="forbidden" accessReason="scope denied" onRetry={async () => undefined} onCreateOperation={async () => undefined} onTransition={async () => undefined} />)

  assert.ok(view.getByText('Gestión Agronautas restringida'))
  assert.equal(view.queryByLabelText('Nombre de operación'), null)
})
