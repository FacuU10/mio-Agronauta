import Link from 'next/link'
import { getRouteContract } from '@/lib/route-contracts'

export default function NotFound() {
  const route = getRouteContract('/')

  return (
    <main id={route?.mainId ?? 'main-content'} className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">404 · Ruta no encontrada</p>
        <h1 className="mt-3 text-3xl font-black">{route?.notFoundTitle ?? 'La página no existe'}</h1>
        <p className="mt-4 text-slate-300">{route?.notFoundDescription ?? 'No encontramos la página solicitada y no mostramos contenido inventado.'}</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-amber-200 px-5 py-3 font-semibold text-stone-950 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">
          {route?.recoveryLabel ?? 'Volver al inicio'}
        </Link>
      </section>
    </main>
  )
}
