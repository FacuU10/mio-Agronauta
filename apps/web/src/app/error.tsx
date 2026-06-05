'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 inline-flex rounded-2xl bg-amber-500/15 p-3 text-amber-300">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">Error de experiencia</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">No pudimos cargar esta sección.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
          Intentá nuevamente. Si el problema persiste, volvé al inicio o abrí la demo desde una ruta limpia.
        </p>
        {error.digest ? <p className="mt-4 text-xs text-slate-500">Código de referencia: {error.digest}</p> : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => reset()} className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
            Reintentar
          </button>
          <Link href="/" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Ir al inicio
          </Link>
          <Link href="/probar-demo" className="rounded-full border border-cyan-400/30 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/10">
            Abrir demo
          </Link>
        </div>
      </div>
    </div>
  )
}
