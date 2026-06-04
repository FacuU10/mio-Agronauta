import { DemoContactForm } from '@/components/landing/demo-contact-form'

export default function ProbarDemoPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Agronautas</p>
          <h1 className="text-4xl font-black text-slate-900">Probá una demo guiada</h1>
          <p className="text-lg text-slate-600">Contanos tu contexto y coordinamos una demo del Risk Engine sin romper el flujo actual de <code>/demo</code>.</p>
        </div>
        <DemoContactForm />
      </div>
    </main>
  )
}
