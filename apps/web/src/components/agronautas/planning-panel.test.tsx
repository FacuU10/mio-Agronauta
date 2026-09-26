import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { QueryProvider } from '@/lib/query-client'
import { createAgronautasMockService } from '@/lib/agronautas/service'
import { agronautasWorkspaceFieldPageSchema } from '@/lib/agronautas/schemas'
import { AgronautasPageClient } from './page-client'
import { PlanningPanel } from './planning-panel'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/demo' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
}

test('planning panel exposes loading, empty, degraded, and recovery states without fabricating evidence', async () => {
  setupDom()
  cleanup()
  const view = render(<PlanningPanel fieldId={null} planningContext={undefined} simulation={undefined} isLoading={true} error={null} isMutating={false} onLoadPlanningContext={async () => undefined} onSimulateAssumptions={async () => undefined} />)
  assert.ok(view.getByText(/Cargando contexto de planificación/))
  assert.ok(view.getByText(/Cargando contexto de planificación/))
  cleanup()

  const empty = render(<PlanningPanel fieldId={null} planningContext={undefined} simulation={undefined} isLoading={false} error={null} isMutating={false} onLoadPlanningContext={async () => undefined} onSimulateAssumptions={async () => undefined} />)
  assert.ok(empty.getByText(/No hay un lote seleccionado/))
  cleanup()

  const error = render(<PlanningPanel fieldId="field-1" planningContext={undefined} simulation={undefined} isLoading={false} error="planning unavailable" isMutating={false} onLoadPlanningContext={async () => undefined} onSimulateAssumptions={async () => undefined} />)
  assert.ok(error.getByRole('button', { name: 'Reintentar planificación' }))
  cleanup()

  const degraded = render(<PlanningPanel fieldId="field-1" planningContext={{
    contractVersion: 'agronautas-campaign-planning-context-v1', persistent: false,
    workspace: { workspaceId: 'workspace-1', name: 'Agronautas', status: 'active' }, campaignName: 'Campaña', season: '2026',
    fields: [{ fieldId: 'field-1', externalFieldId: 'field-1', crop: 'rice', hectares: 10, locality: 'Mercedes', geometryStatus: 'point_only' }],
    evidence: [{ fieldId: 'field-1', climate: { state: 'available', source: 'open-meteo', observedAt: '2026-09-21T10:00:00.000Z', freshness: 'degraded', provenance: ['demo-climate'] }, risk: { state: 'unavailable', reason: 'No hay riesgo verificado.', engine: { selectionStatus: 'undecided' } } }],
    availability: [{ domain: 'soil', state: 'unavailable', reason: 'No hay suelo verificado.', dependency: 'fuente de suelo' }, { domain: 'prices', state: 'unavailable', reason: 'No hay precios verificados.', dependency: 'fuente de precios' }, { domain: 'fx', state: 'unavailable', reason: 'No hay FX verificado.', dependency: 'fuente de FX' }, { domain: 'external_economics', state: 'unavailable', reason: 'No hay economía verificada.', dependency: 'fuente económica' }],
  }} simulation={undefined} isLoading={false} error={null} isMutating={false} onLoadPlanningContext={async () => undefined} onSimulateAssumptions={async () => undefined} />)
  assert.ok(degraded.getByText(/degraded/))
  assert.ok(degraded.getByText(/No hay riesgo verificado/))
})

test('planning panel preserves drafts when the typed context request fails', async () => {
  setupDom()
  cleanup()
  const onLoadPlanningContext = async () => {
    throw new Error('context unavailable')
  }
  const view = render(<PlanningPanel fieldId="field-1" planningContext={undefined} simulation={undefined} isLoading={false} error={null} isMutating={false} onLoadPlanningContext={onLoadPlanningContext} onSimulateAssumptions={async () => undefined} />)
  const campaign = view.getByLabelText('Nombre de campaña')
  fireEvent.input(campaign, { target: { value: 'Borrador campaña' } })
  await waitFor(() => assert.equal((campaign as HTMLInputElement).value, 'Borrador campaña'))
  fireEvent.click(view.getByRole('button', { name: 'Ver contexto de lectura' }))
  await waitFor(() => assert.ok(view.getByText('context unavailable')))
  assert.equal((campaign as HTMLInputElement).value, 'Borrador campaña')
})

test('management workspace preserves typed cursor pagination without fabricating a page', async () => {
  setupDom()
  cleanup()
  const base = createAgronautasMockService()
  const first = await base.listWorkspaceFields('agronautas-default-workspace')
  const secondItem = { ...first.items[0], fieldId: 'field-corrientes-lote-002', externalFieldId: 'corrientes-lote-002' }
  const service = {
    ...base,
    async listWorkspaceFields(workspaceId: string, cursor?: string) {
      return agronautasWorkspaceFieldPageSchema.parse({ ...first, workspaceId, items: cursor ? [secondItem] : first.items, nextCursor: cursor ? null : 'cursor-2' })
    },
  }
  const view = render(<QueryProvider><AgronautasPageClient service={service} /></QueryProvider>)
  await waitFor(() => assert.ok(view.getByRole('button', { name: 'Cargar más lotes' })))
  fireEvent.click(view.getByRole('button', { name: 'Cargar más lotes' }))
  await waitFor(() => assert.ok(view.getByText('corrientes-lote-002')))
  assert.equal(view.queryByRole('button', { name: 'Cargar más lotes' }), null)
})
