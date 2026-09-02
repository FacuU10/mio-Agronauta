import { getRouteContract } from '@/lib/route-contracts'

export default function Loading() {
  const route = getRouteContract('/')

  return (
    <main id={route?.mainId ?? 'main-content'} className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section aria-live="polite" className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">Agronautas</p>
        <h1 className="mt-3 text-3xl font-black">{route?.loadingLabel ?? 'Cargando…'}</h1>
        <p className="mt-3 text-slate-300">Estamos preparando la superficie solicitada sin mostrar datos que todavía no fueron confirmados.</p>
      </section>
    </main>
  )
}
