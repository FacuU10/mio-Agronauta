'use client'

import { useEffect } from 'react'
import { getRouteContract } from '@/lib/route-contracts'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const route = getRouteContract('/')

  useEffect(() => {
    // Keep the boundary observable without exposing server error details.
    document.title = route?.errorTitle ?? 'No pudimos cargar Agronautas'
  }, [route?.errorTitle])

  return (
    <main id={route?.mainId ?? 'main-content'} className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section role="alert" className="w-full max-w-2xl rounded-3xl border border-red-300/20 bg-white/5 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-200">Error de carga</p>
        <h1 className="mt-3 text-3xl font-black">{route?.errorTitle ?? 'No pudimos cargar Agronautas'}</h1>
        <p className="mt-4 text-slate-300">{route?.errorDescription ?? 'La aplicación no mostró datos operativos sin confirmación.'}</p>
        <button type="button" onClick={reset} className="mt-8 rounded-full bg-amber-200 px-5 py-3 font-semibold text-stone-950 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">
          Reintentar carga
        </button>
      </section>
    </main>
  )
}
