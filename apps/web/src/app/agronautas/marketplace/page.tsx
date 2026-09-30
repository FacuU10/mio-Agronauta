import type { Metadata } from 'next'
import { ProductHeader } from '@/components/shell/product-shell'
import {
  OPERATIONAL_WORKSPACE_VIEWS,
  buildWorkspaceHref,
} from '@/components/agronautas/workspace-navigation'
import { MarketplaceRouteClient } from '@/components/marketplace/route-client'
import { buildRouteMetadata } from '@/lib/route-contracts'
import '@/components/marketplace/marketplace.css'
export function generateMetadata(): Metadata {
  return buildRouteMetadata('/agronautas/marketplace')
}
export default function AgronautasMarketplacePage() {
  return (
    <div
      className="responsive-shell min-h-screen bg-stone-100 text-stone-950"
      data-product="agronautas"
    >
      <ProductHeader
        product="agronautas"
        variant="landing"
        navItems={[
          ...OPERATIONAL_WORKSPACE_VIEWS.map((view) => ({
            href: buildWorkspaceHref(view.key),
            label: view.label,
          })),
          { href: '/agronautas/marketplace', label: 'Marketplace', active: true },
        ]}
      />
      <main id="main-content" tabIndex={-1}>
        <header className="relative isolate overflow-hidden bg-emerald-950 pt-20 text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(12,35,25,.8), rgba(12,35,25,.35)), url('/marketplace/marketplace-hero.jpg')",
              backgroundPosition: 'center 65%',
            }}
          />
          <div className="mx-auto flex min-h-[320px] max-w-[1440px] flex-col justify-center px-4 py-12 sm:min-h-[360px] sm:px-8 sm:py-16">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              EL CAMPO, MÁS CERCA
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-6xl">
              Marketplace Agronautas
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-100 sm:text-lg">
              Encontrá productos para tu campo y consultá lo que necesitás.
            </p>
          </div>
        </header>
        <div className="marketplace-view">
          <div className="mkt-container">
            <MarketplaceRouteClient />
          </div>
          <footer className="mkt-footer">
            <strong>Agronautas</strong>
            <span>Un punto de encuentro para el campo.</span>
          </footer>
        </div>
      </main>
    </div>
  )
}
