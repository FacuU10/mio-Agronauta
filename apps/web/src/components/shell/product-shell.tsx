import { createElement, type ReactNode } from 'react'
import { ScrollHeader } from './scroll-header'
import { AccountMenu } from './account-menu'

const React = { createElement }

export type ProductKey = 'agronautas' | 'ibera'

export interface ProductNavItem {
  href: string
  label: string
  active?: boolean
}

interface ProductShellProps {
  product: ProductKey
  title: string
  description?: string
  navItems: readonly ProductNavItem[]
  children: ReactNode
}

const productCopy: Record<ProductKey, { name: string; kicker: string; accent: string }> = {
  agronautas: {
    name: 'Agronautas',
    kicker: 'Cartografía operativa · evidencia editorial',
    accent: 'Cultivo / Corrientes',
  },
  ibera: {
    name: 'Iberá-Alerta',
    kicker: 'Monitoreo institucional · fuentes oficiales',
    accent: 'Agua / territorio',
  },
}

export function ProductShell({
  product,
  title,
  description,
  navItems,
  children,
}: ProductShellProps) {
  const copy = productCopy[product]

  return (
    <div
      className="responsive-shell min-h-screen bg-stone-100 text-stone-950"
      data-product={product}
    >
      <ProductHeader product={product} navItems={navItems} />
      <main
        id="main-content"
        tabIndex={-1}
        className="responsive-main mx-auto max-w-[90rem] scroll-mt-24 px-4 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:px-8"
      >
        <div className="mb-6 border-l-4 border-emerald-700 pl-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
            {copy.name}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  )
}

export function ProductHeader({
  product,
  navItems,
  variant = 'default',
}: {
  product: ProductKey
  navItems: readonly ProductNavItem[]
  variant?: 'default' | 'landing'
}) {
  const copy = productCopy[product]
  const resolvedNavItems =
    product === 'agronautas' && !navItems.some((item) => item.href === '/agronautas/marketplace')
      ? [...navItems, { href: '/agronautas/marketplace', label: 'Marketplace' }]
      : navItems
  if (variant === 'landing') {
    const loginHref = resolvedNavItems.some((item) => item.active && item.href === '/agronautas/marketplace')
      ? '/login?next=marketplace'
      : resolvedNavItems.some((item) => item.active && item.href.includes('view=livestock'))
        ? '/login?next=livestock'
        : '/login'
    const links = resolvedNavItems.map((item) => (
      <a
        key={item.href}
        href={item.href}
        aria-current={item.active ? 'page' : undefined}
        className={`whitespace-nowrap rounded-lg px-2 py-3 text-sm font-medium transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-emerald-600 ${item.active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'}`}
      >
        {item.label}
      </a>
    ))
    return (
      <ScrollHeader product={product}>
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <a href="/" aria-label="Agronautas, inicio" className="flex items-center gap-3 rounded-lg focus-visible:outline-emerald-600">
            <img src="/landing/source/logo.webp" alt="" width={40} height={40} className="h-9 w-9 rounded-full object-contain sm:h-10 sm:w-10" />
            <span className="bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl">AGRONAUTAS</span>
          </a>
          <nav aria-label="Navegación de Agronautas" className="hidden items-center gap-1 min-[1400px]:flex group-data-[scrolled=false]/navbar:[&>a:not([aria-current]):not(:last-child)]:text-white">
            {links}
            <AccountMenu items={resolvedNavItems} loginHref={loginHref} />
          </nav>

          <div className="min-[1400px]:hidden"><AccountMenu items={resolvedNavItems} loginHref={loginHref} /></div>
        </div>
      </ScrollHeader>
    )
  }
  return (
    <header
      className="border-b border-stone-200 bg-stone-950 text-stone-100"
      data-product={product}
    >
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <div>
          <a
            className="font-serif text-2xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            href={product === 'agronautas' ? '/demo' : '/municipalities'}
          >
            {copy.name}
          </a>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
            {copy.kicker}
          </p>
        </div>
        <div className="text-right text-xs uppercase tracking-[0.16em] text-amber-200">
          {copy.accent}
        </div>
      </div>
      <nav aria-label={`Navegación de ${copy.name}`} className="border-t border-white/10">
        <div className="responsive-nav mx-auto flex max-w-[90rem] gap-1 overflow-x-auto px-4 py-2 sm:px-8">
          {resolvedNavItems.map((item) => (
            <a
              aria-current={item.active ? 'page' : undefined}
              className={`min-h-11 whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${item.active ? 'bg-white/15 text-white' : 'text-stone-300'}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  )
}
