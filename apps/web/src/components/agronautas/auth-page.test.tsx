import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { JSDOM } from 'jsdom'
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react/pure'
import { QueryProvider } from '@/lib/query-client'
import { ApiError } from '@/lib/api-client'
import type { AgronautasAuthClient, AgronautasAuthSession, AgronautasAuthStatus } from '@/lib/agronautas/auth-client'

const React = { createElement }

const session: AgronautasAuthSession = {
  principal: {
    actorId: 'operator-1',
    sessionId: 'session-1',
    membershipId: 'membership-1',
    workspaceId: 'workspace-1',
    workspaceKey: 'agronautas-pilot',
    role: 'operator',
    scopes: ['read', 'write'],
    expiresAt: '2026-09-15T15:00:00.000Z',
  },
  accessExpiresAt: '2026-09-15T15:00:00.000Z',
  refreshExpiresAt: '2026-10-15T15:00:00.000Z',
}

const statusUnauthorized = async (): Promise<AgronautasAuthStatus> => {
  throw new ApiError(401, 'Missing session')
}

test('successful operator sign-in replaces /login with the protected workspace route', async () => {
  const routerCalls: string[] = []
  const router = {
    push: () => { throw new Error('sign-in must replace the login history entry') },
    replace: (path: string) => { routerCalls.push(path) },
  }
  const { AgronautasAuthPage } = await import('./auth-page')
  let loginCalls = 0
  const client: AgronautasAuthClient = {
    status: statusUnauthorized,
    login: async () => { loginCalls += 1; return session },
    refresh: async () => session,
    logout: async () => undefined,
  }
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/login' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.FormData = dom.window.FormData
  globalThis.Event = dom.window.Event
  Object.defineProperty(globalThis, 'React', { value: React, configurable: true })
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })

  try {
    const view = render(<AppRouterContext.Provider value={router as unknown as AppRouterInstance}><QueryProvider><AgronautasAuthPage client={client} /></QueryProvider></AppRouterContext.Provider>)
    await waitFor(() => assert.ok(view.getByRole('button', { name: 'Iniciar sesión' })))
    const form = view.container.querySelector('form')
    assert.ok(form)
    fireEvent.submit(form)

    await waitFor(() => {
      assert.equal(loginCalls, 1)
      assert.deepEqual(routerCalls, ['/agronautas'])
      assert.ok(view.getByText('Sesión activa'))
    })

    cleanup()
    routerCalls.length = 0
    const forbiddenClient: AgronautasAuthClient = {
      status: statusUnauthorized,
      login: async () => { throw new ApiError(403, 'Workspace forbidden') },
      refresh: async () => session,
      logout: async () => undefined,
    }
    const forbiddenView = render(<AppRouterContext.Provider value={router as unknown as AppRouterInstance}><QueryProvider><AgronautasAuthPage client={forbiddenClient} /></QueryProvider></AppRouterContext.Provider>)
    await waitFor(() => assert.ok(forbiddenView.getByRole('button', { name: 'Iniciar sesión' })))
    const forbiddenForm = forbiddenView.container.querySelector('form')
    assert.ok(forbiddenForm)
    fireEvent.submit(forbiddenForm)

    await waitFor(() => {
      assert.equal(routerCalls.length, 0)
      assert.ok(forbiddenView.getByRole('alert').textContent?.includes('Workspace restringido'))
    })
  } finally {
    cleanup()
    dom.window.close()
  }
})
