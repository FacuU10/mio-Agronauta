import { createElement } from 'react'

const React = { createElement }

export type FutureCapabilitiesProduct = 'agronautas' | 'ibera-alerta'

type FutureCapability = {
  title: string
  description: string
}

const FUTURE_CAPABILITIES: Record<FutureCapabilitiesProduct, readonly FutureCapability[]> = {
  agronautas: [
    { title: 'Precios y tendencias de mercado', description: 'Comparación de precios y señales de mercado cuando exista un contrato verificable.' },
    { title: 'Decisiones y recomendaciones de cultivo', description: 'Recomendaciones adicionales sólo con reglas, evidencia y contrato agronómico aprobados.' },
    { title: 'Marketplace de exportación', description: 'Oportunidades de exportación y trazabilidad comercial pendientes de contrato.' },
    { title: 'Conexiones del sector', description: 'Integración con actores del sector sin directorio ni disponibilidad publicados todavía.' },
    { title: 'Gestión, tareas y expansión del workspace', description: 'Más espacios de trabajo, tareas y seguimiento cuando se defina el alcance operativo.' },
    { title: 'Satélite avanzado y simulaciones', description: 'Capacidades avanzadas fuera del MVP hasta contar con contratos y límites claros.' },
  ],
  'ibera-alerta': [
    { title: 'Integraciones institucionales', description: 'Nuevas conexiones entre organismos sólo cuando exista un contrato operativo verificable.' },
    { title: 'Operaciones compartidas', description: 'Expansión de tareas y coordinación pendiente de definición institucional.' },
    { title: 'Cobertura territorial ampliada', description: 'Más localidades y fuentes únicamente con cobertura, procedencia y estados publicados.' },
  ],
}

const PRODUCT_COPY: Record<FutureCapabilitiesProduct, { eyebrow: string; title: string; description: string; className: string }> = {
  agronautas: {
    eyebrow: 'Hoja de ruta · Agronautas',
    title: 'Lo que sigue, sin vender humo',
    description: 'Estas capacidades están visibles para orientar la conversación, pero no forman parte del contrato operativo de este MVP.',
    className: 'border-emerald-900/20 bg-emerald-950 text-emerald-50',
  },
  'ibera-alerta': {
    eyebrow: 'Hoja de ruta · Iberá-Alerta',
    title: 'Expansión institucional pendiente',
    description: 'Iberá-Alerta conserva su identidad de monitoreo hídrico; estas ideas no son datos ni operaciones disponibles hoy.',
    className: 'border-sky-200/20 bg-slate-900 text-slate-50',
  },
}

export function getFutureCapabilities(product: FutureCapabilitiesProduct) {
  return FUTURE_CAPABILITIES[product]
}

export function FutureCapabilities({ product }: { product: FutureCapabilitiesProduct }) {
  const copy = PRODUCT_COPY[product]
  const capabilities = getFutureCapabilities(product)

  return (
    <section aria-labelledby={`${product}-future-heading`} data-testid={`${product}-future-capabilities`} className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-xl md:p-7 ${copy.className}`}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-current/20 opacity-50" aria-hidden="true" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-75">{copy.eyebrow}</p>
        <div className="mt-3 max-w-3xl">
          <h2 id={`${product}-future-heading`} className="font-serif text-3xl font-semibold leading-tight">{copy.title}</h2>
          <p className="mt-3 text-sm leading-6 opacity-80 md:text-base">{copy.description}</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((capability) => {
            const headingId = `${product}-${capability.title.toLocaleLowerCase('es-AR').replaceAll(/[^a-z0-9]+/g, '-')}`
            return (
              <article key={capability.title} aria-labelledby={headingId} className="rounded-3xl border border-current/15 bg-black/15 p-5 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 id={headingId} className="text-lg font-semibold leading-snug">{capability.title}</h3>
                  <span role="status" aria-label="Próximamente" className="shrink-0 rounded-full border border-amber-200/50 bg-amber-200/15 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-amber-100">Próximamente</span>
                </div>
                <p className="mt-4 text-sm leading-6 opacity-80">{capability.description}</p>
                <p className="mt-4 border-t border-current/15 pt-3 text-xs font-semibold uppercase tracking-wide text-amber-100/90">Contrato pendiente</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
