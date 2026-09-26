'use client'

import { createElement, useState } from 'react'
import type { AgronautasMarketplaceDiscoveryResponse, AgronautasMarketplaceListing } from '@/lib/agronautas/schemas'
import { Evidence, type SourceMode } from '@/components/ui/evidence'
import { Status } from '@/components/ui/status'

const React = { createElement }

export interface MarketplaceCatalogProps {
  workspaceId: string
  response: AgronautasMarketplaceDiscoveryResponse
  isLoading?: boolean
  mode?: SourceMode
  accessState?: 'unauthorized' | 'forbidden' | 'maintenance'
  accessReason?: string
  onRetry?: () => void
  onSelectListing: (listing: AgronautasMarketplaceListing) => void
}

export function MarketplaceCatalog({ workspaceId, response, isLoading = false, mode = 'live', accessState, accessReason, onRetry, onSelectListing }: MarketplaceCatalogProps) {
  const [search, setSearch] = useState('')
  const [marketId, setMarketId] = useState('all')

  if (accessState) {
    const copy: readonly [string, string] = accessState === 'unauthorized'
      ? ['Catálogo protegido', 'Iniciá sesión para consultar publicaciones del workspace.']
      : accessState === 'forbidden'
        ? ['Catálogo restringido', accessReason ?? 'La sesión no tiene permiso para consultar este workspace.']
        : ['Catálogo en mantenimiento', accessReason ?? 'No se pudo verificar el acceso al catálogo.']
    return <Status state={accessState} title={copy[0]} description={copy[1]} />
  }

  if (isLoading) return <Status state="loading" title="Cargando catálogo" description="Consultando publicaciones del workspace sin completar filas con datos inventados." />

  const scopedListings = response.items.filter((listing) => listing.workspaceId === workspaceId)
  const markets = [...new Set(scopedListings.map((listing) => listing.marketId))]
  const normalizedSearch = search.trim().toLowerCase()
  const visibleListings = scopedListings.filter((listing) => {
    const matchesMarket = marketId === 'all' || listing.marketId === marketId
    const matchesSearch = !normalizedSearch || `${listing.title} ${listing.itemName} ${listing.participantRef}`.toLowerCase().includes(normalizedSearch)
    return matchesMarket && matchesSearch
  })

  const status = response.status === 'unavailable' ? 'unavailable' : response.status === 'degraded' ? 'degraded' : undefined
  if (status) {
    return <section className="grid gap-4" data-testid="marketplace-catalog">
      <Status state={status} title={status === 'unavailable' ? 'Catálogo no disponible' : 'Catálogo degradado'} description={response.reason ?? 'La respuesta no permite afirmar disponibilidad actual.'} source="Agronautas marketplace BFF" freshness={status === 'degraded' ? 'degraded' : 'missing'} mode={mode} retryable={response.retryable || Boolean(onRetry)} onRetry={onRetry} retryLabel="Reintentar catálogo" />
      {response.items.length === 0 ? <p role="status" className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">No hay publicaciones actuales verificables.</p> : null}
    </section>
  }

  return <section className="grid gap-5" data-testid="marketplace-catalog" aria-labelledby="marketplace-catalog-heading">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Descubrimiento acotado al workspace</p>
        <h2 id="marketplace-catalog-heading" className="font-serif text-2xl font-semibold text-stone-950">Publicaciones verificables</h2>
        <p className="mt-1 text-sm text-stone-600">Disponibilidad informada por fuente local; la publicación informa una vigencia y no representa precio, oferta, pedido ni disponibilidad garantizada.</p>
      </div>
      {response.staleListingCount > 0 ? <p role="status" className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">{response.staleListingCount} publicación(es) vencida(s) omitida(s)</p> : null}
    </div>
    <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_16rem]">
      <label className="grid gap-1 text-sm font-medium" htmlFor="marketplace-search">Buscar publicaciones<input id="marketplace-search" aria-label="Buscar publicaciones" className="min-h-11 rounded-xl border border-stone-300 px-3 py-2" value={search} onChange={(event) => setSearch(event.target.value)} onInput={(event) => setSearch(event.currentTarget.value)} /></label>
      <label className="grid gap-1 text-sm font-medium" htmlFor="marketplace-market">Mercado<select id="marketplace-market" aria-label="Filtrar por mercado" className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 py-2" value={marketId} onChange={(event) => setMarketId(event.target.value)}><option value="all">Todos los mercados</option>{markets.map((market) => <option value={market} key={market}>{market}</option>)}</select></label>
    </div>
    {!scopedListings.length ? <Status state="empty" title="No hay publicaciones actuales verificables" description="El workspace no tiene filas de catálogo que puedan mostrarse con la autorización actual." source="Agronautas marketplace BFF" freshness="missing" mode={mode} /> : !visibleListings.length ? <p role="status" className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">No hay publicaciones que coincidan con los filtros del workspace.</p> : <div className="grid gap-4 md:grid-cols-2">{visibleListings.map((listing) => <MarketplaceListingCard key={listing.listingId} listing={listing} mode={mode} onSelect={onSelectListing} />)}</div>}
  </section>
}

function MarketplaceListingCard({ listing, mode, onSelect }: { listing: AgronautasMarketplaceListing; mode: SourceMode; onSelect: (listing: AgronautasMarketplaceListing) => void }) {
  return <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm" aria-label={`Publicación ${listing.title}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{listing.marketId}</p><h3 className="mt-1 text-xl font-semibold text-stone-950">{listing.title}</h3><p className="text-sm text-stone-600">{listing.itemName} · {listing.quantity === null ? 'Cantidad no informada' : `${listing.quantity} ${listing.unit ?? 'unidad no informada'}`}</p></div><span className="rounded-full border border-stone-300 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">Estado informado: {listing.availabilityStatus}</span></div>
    <Evidence title={`Proveniencia de ${listing.listingId}`} state={{ mode, freshness: listing.qualityStatus === 'unknown' ? 'degraded' : 'fresh', source: listing.provenance.sourceKey, observedAt: listing.provenance.recordedAt, reason: listing.qualityStatus === 'unknown' ? 'Calidad no informada por la fuente.' : undefined }} />
    <dl className="grid gap-1 text-sm text-stone-600"><div><dt className="inline font-medium text-stone-800">Vigencia de la fuente: </dt><dd className="inline">{listing.freshnessExpiresAt}</dd></div><div><dt className="inline font-medium text-stone-800">Actualizado: </dt><dd className="inline">{listing.updatedAt}</dd></div></dl>
    <button type="button" className="min-h-11 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" onClick={() => onSelect(listing)}>Solicitar revisión humana</button>
  </article>
}
