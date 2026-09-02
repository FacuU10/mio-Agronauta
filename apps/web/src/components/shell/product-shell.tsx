import { createElement, type ReactNode } from 'react'

const React = { createElement }

export type ProductKey = 'agronautas' | 'ibera'

export interface ProductNavItem {
  href: string
  label: string
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

export function ProductShell({ product, title, description, navItems, children }: ProductShellProps) {
  const copy = productCopy[product]

  return (
    <div className="responsive-shell min-h-screen bg-stone-100 text-stone-950" data-product={product}>
      <header className="border-b border-stone-200 bg-stone-950 text-stone-100" data-product={product}>
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div>
            <a className="font-serif text-2xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200" href={product === 'agronautas' ? '/demo' : '/municipalities'}>
              {copy.name}
            </a>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">{copy.kicker}</p>
          </div>
          <div className="text-right text-xs uppercase tracking-[0.16em] text-amber-200">{copy.accent}</div>
        </div>
        <nav aria-label={`Navegación de ${copy.name}`} className="border-t border-white/10">
          <div className="responsive-nav mx-auto flex max-w-[90rem] gap-1 overflow-x-auto px-4 py-2 sm:px-8">
            {navItems.map((item) => (
              <a className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-stone-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200" href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="responsive-main mx-auto max-w-[90rem] scroll-mt-24 px-4 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:px-8">
        <div className="mb-6 border-l-4 border-emerald-700 pl-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">{copy.name}</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  )
}
