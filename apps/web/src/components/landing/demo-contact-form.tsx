'use client'

import React, { useState } from 'react'
import { AGRONAUTAS_CONTRACT_VERSION, demoContactSubmissionSchema, type DemoContactSubmission, type DemoContactSubmissionResponse } from '@/lib/agronautas/schemas'
import { submitDemoContact } from '@/lib/agronautas/service'

type DemoContactFormProps = {
  submitAction?: (input: DemoContactSubmission) => Promise<DemoContactSubmissionResponse>
  initialValues?: Partial<FormState>
}

type FormState = Omit<DemoContactSubmission, 'contractVersion'>

const initialState: FormState = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  role: '',
  hectaresRange: '',
  locality: '',
  message: '',
  website: '',
}

export function DemoContactForm({ submitAction = submitDemoContact, initialValues }: DemoContactFormProps) {
  const [form, setForm] = useState<FormState>({ ...initialState, ...initialValues })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('idle')

    const payload: DemoContactSubmission = { contractVersion: AGRONAUTAS_CONTRACT_VERSION, ...form }
    const parsed = demoContactSubmissionSchema.safeParse(payload)
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && !nextErrors[field]) nextErrors[field] = issue.message
      }
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setStatus('pending')
    try {
      await submitAction(parsed.data)
      setStatus('success')
      setForm(initialState)
    } catch {
      setStatus('error')
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  if (status === 'success') {
    return <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"><h2 className="text-2xl font-bold">Recibimos tu solicitud</h2><p className="mt-2">Te vamos a contactar pronto para coordinar la demo.</p></div>
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block font-medium" htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(event) => update('name', event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        {errors['name'] ? <p className="mt-1 text-sm text-red-600">{errors['name']}</p> : null}
      </div>
      <div>
        <label className="mb-1 block font-medium" htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        {errors['email'] ? <p className="mt-1 text-sm text-red-600">{errors['email']}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="mb-1 block font-medium" htmlFor="organization">Organización</label><input id="organization" value={form.organization} onChange={(event) => update('organization', event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></div>
        <div><label className="mb-1 block font-medium" htmlFor="phone">Teléfono</label><input id="phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></div>
      </div>
      <div><label className="mb-1 block font-medium" htmlFor="message">¿Qué necesitás resolver?</label><textarea id="message" value={form.message} onChange={(event) => update('message', event.target.value)} className="min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3" /></div>
      <div className="hidden" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update('website', event.target.value)} /></div>
      {status === 'error' ? <p role="alert" className="text-sm text-red-600">No pudimos recibir tu solicitud. Intentá nuevamente en unos minutos.</p> : null}
      <button type="submit" disabled={status === 'pending'} className="rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white disabled:opacity-60">{status === 'pending' ? 'Enviando…' : 'Solicitar demo'}</button>
    </form>
  )
}
