'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body className="m-0 bg-slate-950 text-white">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Sistema no disponible</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Hubo una falla inesperada.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
              El equipo puede reintentar la carga de la aplicación. Si vuelve a ocurrir, recargá la página para restablecer el estado global.
            </p>
            {error.digest ? <p className="mt-4 text-xs text-slate-500">Referencia: {error.digest}</p> : null}
            <button type="button" onClick={() => reset()} className="mt-8 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Reintentar aplicación
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
