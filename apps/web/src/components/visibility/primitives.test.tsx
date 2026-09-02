import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, render } from '@testing-library/react/pure'
import { CopilotStatus, DataTable, EmptyState, ErrorState, EvidenceDrawer, EvidenceStatus, FocusVisibleBoundary, FreshnessBanner, LiveRegion, LoadingState, MapFrame, RetryAction, SourceCard, StatusBadge, StatusView, UnavailableState, VisibilityState } from './primitives'
import { createFocusTarget, createLiveRegionAdapter } from '@/lib/visibility/focus'
import type { EvidenceStatusViewModel } from '@/lib/visibility/view-models'

const originalGlobals = {
  window: globalThis.window,
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  navigator: globalThis.navigator,
}
const activeDoms: Array<InstanceType<typeof JSDOM>> = []

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  activeDoms.push(dom)
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: dom.window.navigator })
}

afterEach(() => {
  try {
    cleanup()
  } finally {
    try {
      for (const dom of activeDoms.splice(0)) dom.window.close()
    } finally {
      globalThis.window = originalGlobals.window
      globalThis.document = originalGlobals.document
      globalThis.HTMLElement = originalGlobals.HTMLElement
      Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: originalGlobals.navigator })
    }
  }
})

test('visibility primitives explain degraded, stale and missing states without relying on color', () => {
  setupDom()

  const view = render(
    <div>
      <StatusBadge state="degraded" />
      <FreshnessBanner state="stale" lastSuccessfulAt="2026-06-03T00:00:00.000Z" />
      <VisibilityState state="missing" title="Sin snapshot" description="No hay datos contratados para este lote." retryLabel="Reintentar" />
    </div>,
  )

  assert.ok(view.getByText('Degradado'))
  assert.ok(view.getAllByRole('status').some((item) => item.textContent?.includes('Degradado')))
  assert.ok(view.getByText(/Último dato exitoso/i))
  assert.ok(view.getByRole('alert').textContent?.includes('Sin snapshot'))
  assert.ok(view.getByRole('button', { name: 'Reintentar' }))
})

test('evidence and source primitives preserve provenance and map fallback affordance', () => {
  setupDom()

  const view = render(
    <div>
      <SourceCard source="open-meteo" mode="live" observedAt="2026-06-03T00:00:00.000Z" lastSuccessfulObservedAt="2026-06-03T00:00:00.000Z" />
      <EvidenceDrawer evidence={['weather:open-meteo', 'soil:inta']} />
      <MapFrame title="Previsualización de cobertura" fallback="Mercedes · AR-W · -29.18, -58.07" />
    </div>,
  )

  assert.ok(view.getAllByText('open-meteo').length >= 1)
  assert.ok(view.getByText('weather:open-meteo'))
  assert.ok(view.getByRole('region', { name: /alternativa no cartográfica/i }))
  assert.ok(view.getByText(/Mercedes · AR-W/i))
})

test('copilot primitive names citation-unavailable output instead of presenting success', () => {
  setupDom()

  const view = render(<CopilotStatus outcome="empty" citationUnavailable actionable={false} reason="No verified citations were returned." />)

  assert.ok(view.getByRole('alert').textContent?.includes('Citación no disponible'))
  assert.ok(view.getByText(/no es accionable/i))
})

test('source primitive exposes truthful mode, freshness, source and reason metadata', () => {
  setupDom()

  const view = render(
    <div>
      <SourceCard source="open-meteo" mode="live" freshness="fresh" observedAt="2026-06-03T00:00:00.000Z" reason="Provider confirmed." />
      <SourceCard source="seam-fixture" mode="seam" />
      <SourceCard source="mock-fixture" mode="mock" />
      <SourceCard source="missing-source" mode="unavailable" reason="Provider is not configured." />
    </div>,
  )

  assert.ok(view.getByText('Live'))
  assert.ok(view.getByText('Seam'))
  assert.ok(view.getByText('Mock'))
  assert.ok(view.getByText('Unavailable'))
  assert.ok(view.getByText('fresh'))
  assert.ok(view.getByText((_, element) => element?.textContent === 'Fuente: open-meteo'))
  assert.ok(view.getByText((_, element) => element?.textContent === 'Motivo: Provider confirmed.'))
  assert.ok(view.getByText((_, element) => element?.textContent === 'Motivo: Provider is not configured.'))
})

test('copilot primitive keeps actionable output distinct and exposes retry-after', () => {
  setupDom()

  const view = render(
    <div>
      <CopilotStatus outcome="ready" citationUnavailable={false} actionable reason="Verified answer." />
      <CopilotStatus outcome="retryable" citationUnavailable={false} actionable={false} retryAfterMs={5000} onRetry={() => undefined} reason="Rate limited." />
    </div>,
  )

  assert.ok(view.getByRole('status').textContent?.includes('Copilot fundamentado'))
  assert.ok(view.getByRole('alert').textContent?.includes('5 segundos'))
  assert.ok((view.getByRole('button', { name: /reintentar copilot/i }) as HTMLButtonElement).disabled)
})

test('empty, citation-free and unverified Copilot output never receives success styling', () => {
  setupDom()

  const view = render(
    <div>
      <CopilotStatus outcome="empty" citationUnavailable={false} actionable reason="Empty output." />
      <CopilotStatus outcome="empty" citationUnavailable actionable reason="No citations." />
      <CopilotStatus outcome="ready" citationUnavailable={false} actionable unverifiedClaims reason="Claims were not verified." />
    </div>,
  )

  const alerts = view.getAllByRole('alert')
  assert.equal(alerts.length, 3)
  for (const alert of alerts) {
    assert.doesNotMatch(alert.textContent ?? '', /Copilot fundamentado/)
    assert.doesNotMatch(alert.className, /emerald/)
  }
})

test('typed status primitives preserve source, freshness, reason and retry permission', () => {
  setupDom()

  const status: EvidenceStatusViewModel = {
    mode: 'unavailable',
    freshness: 'missing',
    source: 'INA',
    reason: 'Provider is not configured.',
    actionable: false,
  }

  const view = render(
    <div>
      <EvidenceStatus status={status} />
      <UnavailableState title="Telemetría no disponible" description="No hay una fuente verificable para esta consulta." status={{ state: 'unavailable', retryable: false, reason: status.reason, source: status.source, freshness: status.freshness, mode: status.mode }} />
    </div>,
  )

  assert.ok(view.getByText('INA'))
  assert.ok(view.getByText('missing'))
  assert.ok(view.getByText('Provider is not configured.'))
  assert.equal(view.getByRole('alert').querySelector('button'), null)
})

test('loading, empty and error primitives expose distinct semantics and a safe retry action', () => {
  setupDom()
  let retries = 0

  const view = render(
    <div>
      <LoadingState title="Cargando telemetría" description="Consultando fuentes…" />
      <EmptyState title="Sin pronóstico" description="El contrato no devolvió un pronóstico para esta localidad." />
      <ErrorState title="Falló la consulta" description="Verificá conectividad y reintentá la consulta." onRetry={() => { retries += 1 }} retryLabel="Reintentar consulta" />
    </div>,
  )

  assert.equal(view.getByRole('status', { name: 'Cargando telemetría' }).getAttribute('aria-busy'), 'true')
  assert.ok(view.getByRole('status', { name: 'Sin pronóstico' }))
  assert.ok(view.getByRole('alert').textContent?.includes('Verificá conectividad'))
  view.getByRole('button', { name: 'Reintentar consulta' }).click()
  assert.equal(retries, 1)
})

test('live region and focus boundary render adapter semantics without deriving business state', () => {
  setupDom()

  const live = createLiveRegionAdapter({
    targetId: 'operation-status',
    message: 'La consulta está lista para revisar.',
    politeness: 'polite',
    announcementKey: 'query-ready',
  })
  const target = createFocusTarget({ targetId: 'result-section', accessibleLabel: 'Resultado de la consulta' })

  const view = render(
    <FocusVisibleBoundary target={target}>
      <LiveRegion adapter={live} />
      <p>Resultado observado</p>
    </FocusVisibleBoundary>,
  )

  const region = view.getByRole('status')
  assert.equal(region.id, 'operation-status')
  assert.equal(region.getAttribute('aria-live'), 'polite')
  assert.equal(region.getAttribute('aria-atomic'), 'true')
  assert.equal(region.getAttribute('data-announcement-key'), 'query-ready')
  const boundary = view.getByLabelText('Resultado de la consulta')
  assert.equal(boundary.id, 'result-section')
  assert.equal(boundary.getAttribute('tabindex'), '-1')
  assert.ok(boundary.textContent?.includes('Resultado observado'))
})

test('status adapter and retry primitive keep retry timing and blocked actions explicit', () => {
  setupDom()
  let retries = 0

  const view = render(
    <div>
      <StatusView status={{ state: 'retry', retryable: true, reason: 'Servicio temporalmente limitado.', source: 'open-meteo', freshness: 'stale', mode: 'live' }} title="Consulta temporalmente limitada" description="La última lectura sigue visible mientras se espera una nueva consulta." onRetry={() => { retries += 1 }} />
      <RetryAction onRetry={() => { retries += 1 }} label="Reintentar ahora" retryAfterMs={2_000} />
      <RetryAction onRetry={() => { retries += 1 }} allowed={false} label="No disponible" />
    </div>,
  )

  assert.ok(view.getByRole('status', { name: 'Consulta temporalmente limitada' }).textContent?.includes('Servicio temporalmente limitado.'))
  assert.equal(view.getByRole('button', { name: /reintentar en 2 segundos/i }).hasAttribute('disabled'), true)
  assert.equal(view.queryByRole('button', { name: 'No disponible' }), null)
  assert.equal(retries, 0)
})

test('responsive evidence primitives bound wide content and preserve focus-safe targets', () => {
  setupDom()

  const target = createFocusTarget({ targetId: 'responsive-result', accessibleLabel: 'Resultado responsive' })
  const view = render(
    <div>
      <FocusVisibleBoundary target={target}><p>Resultado</p></FocusVisibleBoundary>
      <DataTable label="Lecturas" columns={['Fuente', 'Observado']} rows={[["Nombre de fuente extenso", '2026-06-03 00:00']]} />
    </div>,
  )

  assert.ok(view.getByLabelText('Resultado responsive').className.includes('focus-safe-target'))
  assert.ok(view.getByRole('table', { name: 'Lecturas' }).parentElement?.className.includes('evidence-scroll'))
  assert.ok(view.getByRole('table', { name: 'Lecturas' }).className.includes('evidence-table'))
})
