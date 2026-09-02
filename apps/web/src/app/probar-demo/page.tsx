import React from 'react'
import { DemoContactForm } from '@/components/landing/demo-contact-form'
import type { Metadata } from 'next'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/probar-demo')
}

export default function ProbarDemoPage() {
  return (
    <main id="main-content" className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Agronautas</p>
          <h1 className="text-4xl font-black text-slate-900">Probá una demo guiada</h1>
          <p className="text-lg text-slate-600">Contanos tu contexto y coordinamos una demo del Risk Engine.</p>
          <p role="status" aria-live="polite" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Esta es una demo ilustrativa: los datos live no están disponibles ni hay una conexión seam/mock en esta ruta. Si el servicio no confirma la solicitud, tus datos quedan cargados para reintentar.</p>
        </div>
        <DemoContactForm />
      </div>
    </main>
  )
}
