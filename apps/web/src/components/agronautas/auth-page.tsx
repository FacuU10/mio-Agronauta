'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ProductShell } from '@/components/shell/product-shell'
import { createAgronautasAuthClient, normalizeAgronautasAuthClientError, type AgronautasAuthClient, type AgronautasAuthClientErrorOutcome, type AgronautasAuthSession, type AgronautasAuthStatus } from '@/lib/agronautas/auth-client'
import { clearAgronautasProtectedState } from '@/lib/query-client'
import { buildWorkspaceHref, DEMO_WORKSPACE_VIEWS } from './workspace-navigation'

const AUTH_PAGE_STATES = {
  LOADING: 'loading',
  SIGNED_OUT: 'signed_out',
  AUTHENTICATED: 'authenticated',
  ERROR: 'error',
} as const

type AuthPageState = (typeof AUTH_PAGE_STATES)[keyof typeof AUTH_PAGE_STATES]

interface AgronautasAuthPageProps {
  client?: AgronautasAuthClient
  destination?: '/agronautas' | '/agronautas/marketplace' | '/agronautas?view=livestock'
}

export function AgronautasAuthPage({ client, destination = '/agronautas' }: AgronautasAuthPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [defaultClient] = useState<AgronautasAuthClient>(() => createAgronautasAuthClient())
  const resolvedClient = client ?? defaultClient
  const [pageState, setPageState] = useState<AuthPageState>(AUTH_PAGE_STATES.LOADING)
  const [session, setSession] = useState<AgronautasAuthSession | AgronautasAuthStatus | null>(null)
  const [outcome, setOutcome] = useState<AgronautasAuthClientErrorOutcome | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [retryAt, setRetryAt] = useState(0)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!retryAt) return
    const update = () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [retryAt])

  useEffect(() => {
    let active = true
    void resolvedClient.status().then((status) => {
      if (!active) return
      setSession(status)
      setPageState(AUTH_PAGE_STATES.AUTHENTICATED)
    }).catch((error: unknown) => {
      if (!active) return
      clearAgronautasProtectedState(queryClient)
      const nextOutcome = normalizeAgronautasAuthClientError(error)
      setOutcome(nextOutcome.state === 'unauthorized' ? null : nextOutcome)
      setPageState(nextOutcome.state === 'unauthorized' ? AUTH_PAGE_STATES.SIGNED_OUT : AUTH_PAGE_STATES.ERROR)
    })
    return () => { active = false }
  }, [resolvedClient, queryClient])

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending || Date.now() < retryAt) return
    const form = new FormData(event.currentTarget)
    clearAgronautasProtectedState(queryClient)
    setPending(true)
    setOutcome(null)
    try {
      const nextSession = await resolvedClient.login({ email: String(form.get('email') ?? email).trim(), password: String(form.get('password') ?? password) })
      clearAgronautasProtectedState(queryClient)
      setSession(nextSession)
      setPageState(AUTH_PAGE_STATES.AUTHENTICATED)
      setPassword('')
      router.replace(destination)
    } catch (error: unknown) {
      const nextOutcome = normalizeAgronautasAuthClientError(error)
      setOutcome(nextOutcome)
      if (nextOutcome.retryAfterMs) {
        setRetryAt(Date.now() + nextOutcome.retryAfterMs)
        setRemaining(Math.ceil(nextOutcome.retryAfterMs / 1000))
      }
      setPageState(AUTH_PAGE_STATES.ERROR)
    } finally {
      setPending(false)
    }
  }

  const refresh = async () => {
    setPending(true)
    setOutcome(null)
    clearAgronautasProtectedState(queryClient)
    try {
      const nextSession = await resolvedClient.refresh()
      clearAgronautasProtectedState(queryClient)
      setSession(nextSession)
      setPageState(AUTH_PAGE_STATES.AUTHENTICATED)
    } catch (error: unknown) {
      clearAgronautasProtectedState(queryClient)
      setSession(null)
      setOutcome(normalizeAgronautasAuthClientError(error))
      setPageState(AUTH_PAGE_STATES.ERROR)
    } finally {
      setPending(false)
    }
  }

  const logout = async () => {
    setPending(true)
    clearAgronautasProtectedState(queryClient)
    try {
      await resolvedClient.logout()
      clearAgronautasProtectedState(queryClient)
      setSession(null)
      setOutcome(null)
      setPageState(AUTH_PAGE_STATES.SIGNED_OUT)
    } catch (error: unknown) {
      setOutcome(normalizeAgronautasAuthClientError(error))
      setPageState(AUTH_PAGE_STATES.ERROR)
    } finally {
      setPending(false)
    }
  }

  return (
    <ProductShell product="agronautas" title="Iniciar sesión" headerVariant="landing" description="Entrá a tu cuenta para gestionar tu campo y tus consultas." navItems={DEMO_WORKSPACE_VIEWS.map((view) => ({ href: buildWorkspaceHref(view.key, null, '/demo'), label: view.label }))}>
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr,0.8fr]" aria-label="Autenticación Agronautas">
        <div className="rounded-[2rem] bg-stone-950 p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Sesión server-managed</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold">Entrá a tu workspace</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">El navegador recibe sólo el estado público de la sesión. Los tokens de acceso y refresh permanecen en cookies HttpOnly del BFF.</p>
          {pageState === AUTH_PAGE_STATES.LOADING ? <p className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm" role="status">Verificando si existe una sesión…</p> : null}
          {pageState === AUTH_PAGE_STATES.AUTHENTICATED && session ? <AuthenticatedState destination={destination} session={session} pending={pending} onRefresh={() => void refresh()} onLogout={() => void logout()} /> : null}
          {pageState === AUTH_PAGE_STATES.SIGNED_OUT || pageState === AUTH_PAGE_STATES.ERROR ? <SignInForm email={email} password={password} remaining={remaining} pending={pending} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={signIn} outcome={outcome} onRecovery={() => { setOutcome(null); setPageState(AUTH_PAGE_STATES.SIGNED_OUT) }} /> : null}
        </div>
        <aside className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8" aria-label="Límites de la sesión">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Estado honesto</p>
          <h2 className="mt-3 font-serif text-2xl font-semibold text-stone-950">Sin acceso, no hay datos</h2>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-stone-600">
            <li><strong className="text-stone-950">401</strong> solicita una sesión y no muestra contenido protegido.</li>
            <li><strong className="text-stone-950">403</strong> mantiene el workspace fuera de alcance para esta membresía.</li>
            <li><strong className="text-stone-950">409</strong> por replay revoca la familia y requiere volver a iniciar sesión.</li>
            <li><strong className="text-stone-950">503</strong> conserva la protección durante mantenimiento; no declara disponibilidad.</li>
          </ul>
        </aside>
      </section>
    </ProductShell>
  )
}

function SignInForm({ email, password, remaining, pending, outcome, onEmailChange, onPasswordChange, onSubmit, onRecovery }: { email: string; password: string; remaining: number; pending: boolean; outcome: AgronautasAuthClientErrorOutcome | null; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onRecovery: () => void }) {
  return (
    <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
      {outcome ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert" aria-live="assertive"><p className="font-semibold">{outcome.title}</p><p className="mt-1">{outcome.description}</p>{outcome.state === 'recovery' ? <button type="button" className="mt-3 font-semibold underline underline-offset-4" onClick={onRecovery}>Volver a iniciar sesión</button> : null}</div> : null}
      <label className="grid gap-2 text-sm font-semibold" htmlFor="agronautas-email">Correo
        <input id="agronautas-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => onEmailChange(event.target.value)} className="min-h-12 rounded-xl border border-stone-300 bg-white px-4 text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200" />
      </label>
      <label className="grid gap-2 text-sm font-semibold" htmlFor="agronautas-password">Contraseña
        <input id="agronautas-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => onPasswordChange(event.target.value)} className="min-h-12 rounded-xl border border-stone-300 bg-white px-4 text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200" />
      </label>
      <button type="submit" disabled={pending || remaining > 0} className="min-h-12 rounded-xl bg-emerald-500 px-5 font-semibold text-stone-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">{pending ? 'Verificando…' : remaining > 0 ? `Reintentar en ${remaining} s` : 'Iniciar sesión'}</button>
    </form>
  )
}

function AuthenticatedState({ destination, session, pending, onRefresh, onLogout }: { destination: string; session: AgronautasAuthSession | AgronautasAuthStatus; pending: boolean; onRefresh: () => void; onLogout: () => void }) {
  return <div className="mt-8 rounded-2xl border border-emerald-300/30 bg-emerald-900/50 p-5" role="status"><p className="font-semibold text-emerald-100">Sesión activa</p><p className="mt-2 text-sm text-stone-200">Workspace autorizado: <strong>{session.principal.workspaceKey}</strong></p><p className="mt-1 text-xs text-stone-400">Expira: {new Date(session.principal.expiresAt).toLocaleString('es-AR')}</p><div className="mt-5 flex flex-wrap gap-3"><a href={destination} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-stone-950">Abrir workspace</a><button type="button" disabled={pending} onClick={onRefresh} className="rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">Actualizar sesión</button><button type="button" disabled={pending} onClick={onLogout} className="rounded-xl border border-rose-300/50 px-4 py-3 text-sm font-semibold text-rose-100 disabled:opacity-60">Cerrar sesión</button></div></div>
}
