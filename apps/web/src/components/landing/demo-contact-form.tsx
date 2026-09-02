'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AGRONAUTAS_CONTRACT_VERSION, demoContactSubmissionResponseSchema, demoContactSubmissionSchema, type DemoContactSubmission, type DemoContactSubmissionResponse } from '@/lib/agronautas/schemas'
import { submitDemoContact } from '@/lib/agronautas/service'

type DemoContactFormProps = {
  submitAction?: (input: DemoContactSubmission) => Promise<DemoContactSubmissionResponse>
  initialValues?: Partial<FormState>
}

type FormState = Omit<DemoContactSubmission, 'contractVersion'>

const FORM_STATUS = {
  IDLE: 'idle',
  VALIDATION_ERROR: 'validation-error',
  PENDING: 'pending',
  SUCCESS: 'success',
  ABORTED: 'aborted',
  NETWORK_ERROR: 'network-error',
  SERVER_ERROR: 'server-error',
} as const

type FormStatus = (typeof FORM_STATUS)[keyof typeof FORM_STATUS]

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

const controlClassName = 'w-full rounded-xl border border-slate-300 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600'

export function DemoContactForm({ submitAction = submitDemoContact, initialValues }: DemoContactFormProps) {
  const [form, setForm] = useState<FormState>({ ...initialState, ...initialValues })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<FormStatus>(FORM_STATUS.IDLE)
  const submissionInFlight = useRef(false)
  const confirmationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === FORM_STATUS.SUCCESS) confirmationRef.current?.focus()
  }, [status])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionInFlight.current) return
    setStatus(FORM_STATUS.IDLE)

    const payload: DemoContactSubmission = { contractVersion: AGRONAUTAS_CONTRACT_VERSION, ...form }
    const parsed = demoContactSubmissionSchema.safeParse(payload)
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && !nextErrors[field]) nextErrors[field] = issue.message
      }
      setErrors(nextErrors)
      setStatus(FORM_STATUS.VALIDATION_ERROR)
      const firstInvalidField = Object.keys(nextErrors)[0]
      if (firstInvalidField) document.getElementById(firstInvalidField)?.focus()
      return
    }

    setErrors({})
    submissionInFlight.current = true
    setStatus(FORM_STATUS.PENDING)
    try {
      const response = await submitAction(parsed.data)
      const confirmedResponse = demoContactSubmissionResponseSchema.safeParse(response)
      if (!confirmedResponse.success) {
        throw new Error('demo_contact_not_accepted')
      }

      setStatus(FORM_STATUS.SUCCESS)
      setForm(initialState)
    } catch (error) {
      setStatus(classifySubmissionFailure(error))
    } finally {
      submissionInFlight.current = false
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  if (status === FORM_STATUS.SUCCESS) {
    return <div ref={confirmationRef} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"><h2 className="text-2xl font-bold">Recibimos tu solicitud</h2><p className="mt-2">La entrega fue confirmada por el servicio. Te contactaremos para coordinar el próximo paso.</p></div>
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block font-medium" htmlFor="name">Nombre</label>
         <input id="name" name="name" autoComplete="name" aria-required="true" aria-invalid={errors['name'] ? true : undefined} aria-describedby={errors['name'] ? 'name-error' : undefined} value={form.name} onInput={(event) => update('name', event.currentTarget.value)} className={controlClassName} />
        {errors['name'] ? <p id="name-error" className="mt-1 text-sm text-red-600">{errors['name']}</p> : null}
      </div>
      <div>
        <label className="mb-1 block font-medium" htmlFor="email">Email</label>
         <input id="email" name="email" type="email" autoComplete="email" spellCheck={false} aria-required="true" aria-invalid={errors['email'] ? true : undefined} aria-describedby={errors['email'] ? 'email-error' : undefined} value={form.email} onInput={(event) => update('email', event.currentTarget.value)} className={controlClassName} />
        {errors['email'] ? <p id="email-error" className="mt-1 text-sm text-red-600">{errors['email']}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
         <div><label className="mb-1 block font-medium" htmlFor="organization">Organización</label><input id="organization" name="organization" autoComplete="organization" value={form.organization} onInput={(event) => update('organization', event.currentTarget.value)} className={controlClassName} /></div>
         <div><label className="mb-1 block font-medium" htmlFor="phone">Teléfono</label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onInput={(event) => update('phone', event.currentTarget.value)} className={controlClassName} /></div>
      </div>
       <div><label className="mb-1 block font-medium" htmlFor="message">¿Qué necesitás resolver?</label><textarea id="message" name="message" autoComplete="off" value={form.message} onInput={(event) => update('message', event.currentTarget.value)} className={`${controlClassName} min-h-32`} /></div>
       <div className="hidden" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onInput={(event) => update('website', event.currentTarget.value)} /></div>
      {status === FORM_STATUS.VALIDATION_ERROR ? <p role="alert" aria-live="assertive" aria-atomic="true" className="text-sm text-red-600">Revisá los campos marcados antes de enviar la solicitud.</p> : null}
      {status === FORM_STATUS.ABORTED || status === FORM_STATUS.NETWORK_ERROR || status === FORM_STATUS.SERVER_ERROR ? <p role="alert" aria-live="assertive" aria-atomic="true" className="text-sm text-red-600">{submissionFailureMessage(status)}</p> : null}
      {status === FORM_STATUS.PENDING ? <p role="status" aria-live="polite" className="text-sm text-slate-600">Enviando la solicitud…</p> : null}
      <button type="submit" disabled={status === FORM_STATUS.PENDING} className="rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60">{status === FORM_STATUS.PENDING ? 'Enviando…' : status === FORM_STATUS.ABORTED || status === FORM_STATUS.NETWORK_ERROR || status === FORM_STATUS.SERVER_ERROR ? 'Reintentar solicitud' : 'Solicitar demo'}</button>
    </form>
  )
}

function classifySubmissionFailure(error: unknown): FormStatus {
  const details = errorRecord(error)
  if (details.name === 'AbortError' || details.name === 'TimeoutError' || details.code === 'ERR_ABORTED' || details.code === 'ABORT_ERR' || details.code === 'ETIMEDOUT' || /timed out|timeout/i.test(details.message ?? '')) return FORM_STATUS.ABORTED
  if (details.name === 'TypeError' || details.name === 'NetworkError' || details.code === 'ERR_NETWORK' || /failed to fetch|network/i.test(details.message ?? '')) return FORM_STATUS.NETWORK_ERROR
  return FORM_STATUS.SERVER_ERROR
}

function errorRecord(error: unknown): { name?: string; code?: string; message?: string } {
  if (error instanceof Error) {
    const errorWithDetails = error as Error & { code?: unknown }
    return {
      name: error.name,
      code: typeof errorWithDetails.code === 'string' ? errorWithDetails.code : undefined,
      message: error.message,
    }
  }

  if (error !== null && typeof error === 'object') {
    const record = error as Record<string, unknown>
    return {
      name: typeof record['name'] === 'string' ? record['name'] : undefined,
      code: typeof record['code'] === 'string' ? record['code'] : undefined,
      message: typeof record['message'] === 'string' ? record['message'] : undefined,
    }
  }

  return {}
}

function submissionFailureMessage(status: FormStatus): string {
  if (status === FORM_STATUS.ABORTED) return 'No pudimos confirmar la entrega: la solicitud fue cancelada o superó el tiempo de espera. Tus datos siguen cargados; podés reintentar.'
  if (status === FORM_STATUS.NETWORK_ERROR) return 'No pudimos conectar con el servicio. La entrega no fue confirmada. Tus datos siguen cargados; podés reintentar.'
  return 'El servidor no pudo aceptar la solicitud. La entrega no fue confirmada. Tus datos siguen cargados; podés reintentar.'
}
