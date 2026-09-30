'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { createAgronautasAuthClient } from '@/lib/agronautas/auth-client'
import type { ProductNavItem } from './product-shell'

const React = { createElement }

export function AccountMenu({
  items,
  loginHref,
}: {
  items: readonly ProductNavItem[]
  loginHref: string
}) {
  const [label, setLabel] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    let active = true
    const client = createAgronautasAuthClient()
    void client
      .status()
      .then(() => {
        if (!active) return
        setLabel('Mi cuenta')
      })
      .catch(() => {
        if (active) setLabel(null)
      })
    const dismiss = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) {
        ref.current.open = false
        ref.current.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      active = false
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [])

  if (!label)
    return (
      <a
        href={loginHref}
        className="inline-flex rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg"
      >
        Login
      </a>
    )
  return (
    <details ref={ref} className="relative">
      <summary className="flex max-w-[120px] sm:max-w-[230px] cursor-pointer list-none items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
        <span className="truncate" title={label}>
          {label}
        </span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0" />
      </summary>
      <div className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white text-slate-700 shadow-xl">
        <nav aria-label="Menú de tu cuenta" className="grid max-h-[60dvh] overflow-y-auto p-2">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              onClick={() => {
                if (ref.current) ref.current.open = false
              }}
              className={
                'rounded-lg px-4 py-2.5 text-sm hover:bg-emerald-50 hover:text-emerald-700 ' +
                (item.active ? 'bg-emerald-50 font-semibold text-emerald-700' : '')
              }
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-stone-200 p-2">
          <button
            type="button"
            disabled={pending}
            className="w-full rounded-lg px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            onClick={async () => {
              setPending(true)
              setError('')
              try {
                await createAgronautasAuthClient().logout()
                try {
                  for (const key of Object.keys(sessionStorage)) {
                    if (key.startsWith('agronautas-account-email:')) sessionStorage.removeItem(key)
                  }
                } catch {
                  /* Storage is optional. */
                }
                window.location.assign(
                  window.location.pathname === '/agronautas/marketplace'
                    ? '/agronautas/marketplace'
                    : loginHref
                )
              } catch {
                setError('No pudimos cerrar la sesión. Volvé a intentar.')
                setPending(false)
              }
            }}
          >
            {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
          {error && (
            <p role="alert" className="px-4 pb-3 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </details>
  )
}
