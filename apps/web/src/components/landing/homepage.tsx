import React from 'react'
import Link from 'next/link'

const capabilities = [
  {
    title: 'Risk Engine para arroz en Corrientes',
    description:
      'Combina señales satelitales, contexto territorial y trazabilidad operativa para convertir incertidumbre climática en decisiones accionables.',
  },
  {
    title: 'Alertas auditables y listas para operar',
    description:
      'Cada alerta expone evidencia, estado de frescura y ruta de recompute para equipos técnicos, comerciales y de seguros.',
  },
  {
    title: 'Entrada simple al MVP existente',
    description:
      'La experiencia productiva actual sigue intacta detrás de /demo para validar el flujo sin tocar contratos backend.',
  },
]

const pillars = [
  'Cobertura pensada para productores arroceros y equipos de riesgo regional.',
  'Trazabilidad operacional desde intake hasta snapshots, drivers y alertas.',
  'Arquitectura preparada para convivir con el MVP sin duplicar lógica de negocio.',
]

const metrics = [
  { value: '79', label: 'municipios monitoreados' },
  { value: '1.2M', label: 'hectáreas bajo análisis' },
  { value: '24/7', label: 'lectura operativa del riesgo' },
]

export function LandingHomepage() {
  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <div className="landing-hero__bg" aria-hidden="true" />
        <header className="landing-nav">
          <div className="landing-brand">
            <img src="/landing/brand-mark.svg" alt="Agronauta" className="landing-brand__mark" />
            <div>
              <p className="landing-brand__eyebrow">Agronauta</p>
              <p className="landing-brand__caption">Inteligencia de riesgo productivo</p>
            </div>
          </div>
          <Link href="/demo" className="landing-nav__cta">
            prueba la version demo
          </Link>
        </header>

        <div className="landing-hero__content">
          <div className="landing-hero__copy">
            <span className="landing-badge">Landing entry · Next.js App Router</span>
            <h1>Reduce la incertidumbre productiva antes de entrar al MVP.</h1>
            <p>
              Adaptamos la landing pública de Agronauta para que el sitio abra con contexto comercial,
              visión de producto y una transición clara hacia la demo operativa existente.
            </p>
            <div className="landing-hero__actions">
              <Link href="/demo" className="landing-primary-cta">
                prueba la version demo
              </Link>
              <a href="#capacidades" className="landing-secondary-cta">
                ver capacidades
              </a>
            </div>
            <ul className="landing-metrics" aria-label="Indicadores de Agronauta">
              {metrics.map((metric) => (
                <li key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-hero__panel">
            <img
              src="/landing/hero-rice.svg"
              alt="Mapa y señales de monitoreo agrícola"
              className="landing-hero__image"
            />
            <div className="landing-hero__signal-card">
              <img src="/landing/signal-tile.svg" alt="" aria-hidden="true" />
              <div>
                <p>Risk snapshot</p>
                <strong>Stale detectable + evidencia trazable</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capacidades" className="landing-section landing-section--light">
        <div className="landing-section__heading">
          <span className="landing-badge landing-badge--soft">Soluciones</span>
          <h2>Una portada pública alineada con el producto real.</h2>
          <p>
            El nuevo entry muestra el posicionamiento de Agronauta sin romper el flujo actual del
            dashboard ni los contratos existentes de demo.
          </p>
        </div>

        <div className="landing-card-grid">
          {capabilities.map((item) => (
            <article key={item.title} className="landing-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--dark">
        <div className="landing-section__split">
          <div>
            <span className="landing-badge">Arquitectura</span>
            <h2>Sin cambios backend, con rutas más claras.</h2>
            <ul className="landing-list">
              {pillars.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <aside className="landing-proof">
            <img src="/landing/proof-grid.svg" alt="" aria-hidden="true" />
            <div>
              <p className="landing-proof__label">Demo estable</p>
              <strong>/demo conserva el MVP actual</strong>
              <span>La landing actúa como nueva puerta de entrada y no reemplaza la lógica existente.</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-section landing-section--cta">
        <div className="landing-cta-panel">
          <div>
            <span className="landing-badge landing-badge--soft">Entrar al producto</span>
            <h2>¿Querés validar el flujo operativo?</h2>
            <p>
              Accedé a la misma experiencia MVP desde una ruta dedicada para demos, pruebas E2E y
              verificación funcional.
            </p>
          </div>
          <Link href="/demo" className="landing-primary-cta landing-primary-cta--dark">
            prueba la version demo
          </Link>
        </div>
      </section>
    </main>
  )
}
