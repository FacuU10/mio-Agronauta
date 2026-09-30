'use client'
import { createElement, Fragment, useState } from 'react'
import { Search, Sprout, ArrowRight, MapPin } from 'lucide-react'
import type {
  AgronautasMarketplaceDiscoveryResponse,
  AgronautasMarketplaceListing,
} from '@/lib/agronautas/schemas'
import type { SourceMode } from '@/components/ui/evidence'
import { MarketplaceNotice } from './notice'
const React = { createElement, Fragment }
export interface MarketplaceCatalogProps {
  workspaceId: string
  response: AgronautasMarketplaceDiscoveryResponse
  isLoading?: boolean
  mode?: SourceMode
  accessState?: 'unauthorized' | 'forbidden' | 'maintenance'
  accessReason?: string
  onRetry?: () => void
  onSelectListing: (listing: AgronautasMarketplaceListing) => void
  selectedId?: string
}
export function MarketplaceCatalog({
  workspaceId,
  response,
  isLoading,
  accessState,
  onRetry,
  onSelectListing,
  selectedId,
}: MarketplaceCatalogProps) {
  const [search, setSearch] = useState('')
  const [marketId, setMarketId] = useState('all')
  if (accessState)
    return (
      <MarketplaceNotice
        title={
          accessState === 'unauthorized'
            ? 'Entrá para ver las publicaciones'
            : accessState === 'forbidden'
              ? 'Tu cuenta no tiene acceso'
              : 'No podemos verificar tu cuenta'
        }
        error={accessState !== 'unauthorized'}
        onRetry={accessState === 'maintenance' ? onRetry : undefined}
      >
        {accessState === 'unauthorized' ? (
          <>
            Usá tu correo y contraseña para consultar y enviar solicitudes.
            <a className="mkt-button" href="/login?next=marketplace">
              Iniciar sesión
            </a>
          </>
        ) : accessState === 'forbidden' ? (
          'Pedile acceso al administrador de tu cuenta.'
        ) : (
          <>
            <p>No pudimos comprobar tu sesión. Podés abrir el login o volver a intentar.</p>
            <a className="mkt-button" href="/login?next=marketplace">
              Iniciar sesión
            </a>
          </>
        )}
      </MarketplaceNotice>
    )
  if (isLoading)
    return (
      <MarketplaceNotice title="Buscando publicaciones…">
        Esperá un momento mientras cargamos el catálogo.
      </MarketplaceNotice>
    )
  if (response.status === 'unavailable' || response.status === 'degraded')
    return (
      <MarketplaceNotice error title="No pudimos cargar las publicaciones" onRetry={onRetry}>
        Hubo un problema al consultar el catálogo. Volvé a intentar en unos minutos.
      </MarketplaceNotice>
    )
  const scoped = response.items.filter((item) => item.workspaceId === workspaceId)
  if (!scoped.length)
    return (
      <div className="mkt-empty-catalog">
        <div className="mkt-empty-art" aria-hidden="true">
          <Sprout size={76} strokeWidth={1} />
          <span>Un lugar para encontrarnos</span>
        </div>
        <MarketplaceNotice title="Todavía no hay publicaciones">
          Cuando se carguen productos en tu cuenta, los vas a encontrar acá. Podrás ver los detalles
          y pedir una cotización.
        </MarketplaceNotice>
      </div>
    )
  const markets = [...new Set(scoped.map((item) => item.marketId))]
  const visible = scoped.filter(
    (item) =>
      (marketId === 'all' || item.marketId === marketId) &&
      `${item.title} ${item.itemName}`.toLowerCase().includes(search.trim().toLowerCase())
  )
  return (
    <section
      className="mkt-catalog"
      aria-label="Publicaciones disponibles"
      data-testid="marketplace-catalog"
    >
      <div className="mkt-section-heading">
        <h2>Publicaciones disponibles</h2>
        <span>
          {scoped.length} {scoped.length === 1 ? 'publicación' : 'publicaciones'}
        </span>
      </div>
      <div className="mkt-filters">
        <label>
          <span>¿Qué estás buscando?</span>
          <div className="mkt-search">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Buscar publicaciones"
              placeholder="Por ejemplo: arroz, terneros…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onInput={(event) => setSearch(event.currentTarget.value)}
            />
          </div>
        </label>
        <label>
          <span>Zona o mercado</span>
          <select
            aria-label="Filtrar por mercado"
            value={marketId}
            onChange={(event) => setMarketId(event.target.value)}
          >
            <option value="all">Todos los mercados</option>
            {markets.map((market) => (
              <option key={market} value={market}>
                {marketName(market)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {response.staleListingCount > 0 ? (
        <p className="mkt-muted">Las publicaciones vencidas ya no aparecen en este listado.</p>
      ) : null}
      {!visible.length ? (
        <MarketplaceNotice title="No encontramos coincidencias">
          Probá con otro nombre o eleg? otro mercado.
        </MarketplaceNotice>
      ) : (
        <div className="mkt-cards">
          {visible.map((item) => (
            <button
              type="button"
              key={item.listingId}
              className={`mkt-card ${selectedId === item.listingId ? 'mkt-card-selected' : ''}`}
              onClick={() => onSelectListing(item)}
              aria-pressed={selectedId === item.listingId}
              aria-label={`Ver publicación: ${item.title}`}
            >
              <div className="mkt-card-image">
                <Sprout size={44} strokeWidth={1.25} aria-hidden="true" />
                <span>Sin foto cargada</span>
              </div>
              <div className="mkt-card-body">
                <h3>{item.title}</h3>
                <strong>
                  {item.quantity === null
                    ? 'Cantidad a consultar'
                    : `${item.quantity.toLocaleString('es-AR')} ${item.unit ?? ''}`}
                </strong>
                <p>
                  <MapPin size={14} aria-hidden="true" />
                  {marketName(item.marketId)}
                </p>
                <span className="mkt-card-link">
                  Ver detalles y consultar <ArrowRight size={15} aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
export function marketName(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase())
}
export function marketDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
