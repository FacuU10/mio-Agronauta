import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { DemoContactForm } from './demo-contact-form'

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/probar-demo' })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLInputElement = dom.window.HTMLInputElement
  globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.Event = dom.window.Event
  globalThis.FormData = dom.window.FormData
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
}

beforeEach(() => {
  setupDom()
  cleanup()
})

test('demo form muestra validación y no envía payload inválido', async () => {
  let calls = 0
  const view = render(<DemoContactForm submitAction={async () => { calls += 1; return { contractVersion: '1.0.0', submissionId: 'unused', status: 'received' } }} />)

  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.ok(view.getByText(/string must contain at least 1 character/i))
    assert.equal(calls, 0)
  })
})

test('demo form renderiza éxito cuando submitDemoContact responde recibido', async () => {
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => ({ contractVersion: '1.0.0', submissionId: 'demo-1', status: 'received' })} />)
  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.ok(view.getByText(/recibimos tu solicitud/i))
  })
})

test('demo form muestra error genérico cuando la API falla', async () => {
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => { throw new Error('boom') }} />)
  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.ok(view.getByRole('alert').textContent?.includes('No pudimos recibir tu solicitud'))
  })
})
