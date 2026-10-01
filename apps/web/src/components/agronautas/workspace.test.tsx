import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render, waitFor, within } from '@testing-library/react/pure'
import { QueryProvider } from '@/lib/query-client'
import { createAgronautasMockService, type AgronautasService } from '@/lib/agronautas/service'
import { useAgronautasStore } from '@/store/agronautas-store'
import { AgronautasPageClient } from './page-client'
import { buildWorkspaceHref, DEMO_WORKSPACE_VIEWS, OPERATIONAL_WORKSPACE_VIEWS } from './workspace-navigation'

const workspaceField = {
  fieldId: 'field-workspace-001',
  externalFieldId: 'corrientes-workspace-001',
  crop: 'rice' as const,
  hectares: 24,
  locality: 'Mercedes',
  provinceCode: 'AR-W',
  centroid: { lat: -29.2, lng: -58.1 },
  geometryStatus: 'point_only' as const,
  geometrySource: 'fallback' as const,
  geometryUpdatedAt: null,
  createdAt: '2026-08-13T10:00:00.000Z',
  updatedAt: '2026-08-13T10:00:00.000Z',
  sourceRunIds: [],
}

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/agronautas' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.FormData = dom.window.FormData
  globalThis.Event = dom.window.Event
}

beforeEach(() => {
  setupDom()
  useAgronautasStore.getState().reset()
})

afterEach(() => cleanup())

test('workspace links are stable deep links and preserve the selected field context', () => {
  assert.equal(buildWorkspaceHref('fields'), '/agronautas?view=fields')
  assert.equal(buildWorkspaceHref('activity', 'field/workspace 001'), '/agronautas?view=activity&fieldId=field%2Fworkspace+001')
  assert.deepEqual(OPERATIONAL_WORKSPACE_VIEWS.map((view) => view.key), ['fields', 'activity', 'geometry', 'management', 'livestock', 'agronomy', 'planning', 'evidence', 'intelligence', 'copilot'])
  assert.ok(DEMO_WORKSPACE_VIEWS.some((view) => view.key === 'agronomy'))
  assert.equal(buildWorkspaceHref('agronomy'), '/demo?view=agronomy')
})

test('workspace exposes operational anchors with field context after service selection', async () => {
  const base = createAgronautasMockService()
  const selections: string[] = []
  const service: AgronautasService = {
    ...base,
    async listWorkspaceFields(workspaceId) {
      return { contractVersion: 'agronautas-workspace-fields-v1', workspaceId, items: [workspaceField], nextCursor: null }
    },
    async resolveLocation(input) {
      selections.push(input.fieldId)
      return base.resolveLocation(input)
    },
  }

  const view = render(
    <QueryProvider>
      <AgronautasPageClient service={service} initialFieldId={workspaceField.fieldId} initialView="activity" />
    </QueryProvider>,
  )

  await waitFor(() => {
    assert.equal(selections[0], workspaceField.fieldId)
    assert.ok(view.getByText('corrientes-workspace-001'))
    assert.match(view.getByRole('status', { name: 'Workspace Agronautas listo' }).textContent ?? '', /listo/i)
    for (const item of OPERATIONAL_WORKSPACE_VIEWS) {
      const link = within(view.getByRole('navigation', { name: 'Navegación de Agronautas' })).getByRole('link', { name: item.label })
      assert.equal(link.getAttribute('href'), buildWorkspaceHref(item.key, workspaceField.fieldId, '/demo'))
    }
    assert.match(view.getByText(/Selección autorizada/i).textContent ?? '', new RegExp(workspaceField.fieldId))
  })
})

test('workspace keeps a truthful recovery state for an unknown deep-linked field', async () => {
  const base = createAgronautasMockService()
  const view = render(
    <QueryProvider>
      <AgronautasPageClient
        service={{
          ...base,
          async listWorkspaceFields(workspaceId) {
            return { contractVersion: 'agronautas-workspace-fields-v1', workspaceId, items: [], nextCursor: null }
          },
        }}
        initialFieldId="field-does-not-exist"
        initialView="activity"
      />
    </QueryProvider>,
  )

  await waitFor(() => {
    assert.ok(view.getByRole('alert', { name: /selección|lote/i }))
    assert.match(view.getByRole('alert', { name: /selección|lote/i }).textContent ?? '', /no está disponible|no encontrado|índice/i)
    assert.equal(view.queryByText('Decisión del lote'), null)
  })
})
