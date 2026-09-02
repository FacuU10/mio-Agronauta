import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react/pure'
import { DemoContactForm } from './demo-contact-form'

const doms: Array<InstanceType<typeof JSDOM>> = []

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/probar-demo' })
  doms.push(dom)
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLInputElement = dom.window.HTMLInputElement
  globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.HTMLFormElement = dom.window.HTMLFormElement
  globalThis.Event = dom.window.Event
  globalThis.FormData = dom.window.FormData
  Object.assign(dom.window.HTMLElement.prototype, {
    attachEvent: () => undefined,
    detachEvent: () => undefined,
  })
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
}

beforeEach(() => {
  setupDom()
  cleanup()
})

afterEach(() => {
  cleanup()
  for (const dom of doms.splice(0)) dom.window.close()
  Reflect.deleteProperty(globalThis, 'window')
  Reflect.deleteProperty(globalThis, 'document')
  Reflect.deleteProperty(globalThis, 'HTMLElement')
  Reflect.deleteProperty(globalThis, 'HTMLInputElement')
  Reflect.deleteProperty(globalThis, 'HTMLTextAreaElement')
  Reflect.deleteProperty(globalThis, 'HTMLButtonElement')
  Reflect.deleteProperty(globalThis, 'HTMLFormElement')
  Reflect.deleteProperty(globalThis, 'Event')
  Reflect.deleteProperty(globalThis, 'FormData')
  Reflect.deleteProperty(globalThis, 'navigator')
})

test('demo form muestra validación y no envía payload inválido', async () => {
  let calls = 0
  const view = render(<DemoContactForm submitAction={async () => { calls += 1; return { contractVersion: '1.0.0', submissionId: 'unused', status: 'received' } }} />)

  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.ok(view.getByRole('alert').textContent?.match(/revisá los campos marcados/i))
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

test('demo form no duplica una solicitud mientras la respuesta sigue pendiente', async () => {
  let calls = 0
  let resolveSubmission: ((value: { contractVersion: '1.0.0'; submissionId: string; status: 'received' }) => void) | undefined
  const submission = new Promise<{ contractVersion: '1.0.0'; submissionId: string; status: 'received' }>((resolve) => {
    resolveSubmission = resolve
  })
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => {
    calls += 1
    return submission
  }} />)

  const button = view.getByRole('button', { name: 'Solicitar demo' })
  fireEvent.click(button)
  fireEvent.click(button)

  await waitFor(() => {
    assert.equal(calls, 1)
     assert.equal((button as HTMLButtonElement).disabled, true)
  })

  resolveSubmission?.({ contractVersion: '1.0.0', submissionId: 'demo-pending', status: 'received' })
  await waitFor(() => assert.ok(view.getByText(/recibimos tu solicitud/i)))
})

test('demo form muestra error genérico cuando la API falla', async () => {
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => { throw new Error('boom') }} />)
  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.ok(view.getByRole('alert').textContent?.includes('El servidor no pudo aceptar la solicitud'))
     assert.equal((view.getByLabelText('Email') as HTMLInputElement).value, 'ada@example.com')
  })
})

test('demo form distingue una entrega abortada, conserva el borrador y permite reintentar', async () => {
  let calls = 0
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => {
    calls += 1
    if (calls === 1) throw Object.assign(new Error('request aborted'), { name: 'AbortError', code: 'ERR_ABORTED' })
    return { contractVersion: '1.0.0', submissionId: 'demo-2', status: 'received' }
  }} />)

  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.match(view.getByRole('alert').textContent ?? '', /solicitud fue cancelada/i)
     assert.equal((view.getByLabelText('Nombre') as HTMLInputElement).value, 'Ada')
     assert.equal((view.getByRole('button', { name: 'Reintentar solicitud' }) as HTMLButtonElement).disabled, false)
  })

  fireEvent.click(view.getByRole('button', { name: 'Reintentar solicitud' }))

  await waitFor(() => assert.ok(view.getByText(/recibimos tu solicitud/i)))
  assert.equal(calls, 2)
})

test('demo form distingue una falla de red y conserva los valores', async () => {
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => {
    throw new TypeError('Failed to fetch')
  }} />)

  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.match(view.getByRole('alert').textContent ?? '', /no pudimos conectar/i)
     assert.equal((view.getByLabelText('Nombre') as HTMLInputElement).value, 'Ada')
  })
})

test('demo form no confirma una respuesta no aceptada', async () => {
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => ({
    contractVersion: '1.0.0',
    submissionId: 'demo-rejected',
    status: 'rejected',
  } as unknown as { contractVersion: '1.0.0'; submissionId: string; status: 'received' })} />)

  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.match(view.getByRole('alert').textContent ?? '', /servidor no pudo aceptar/i)
     assert.equal((view.getByLabelText('Nombre') as HTMLInputElement).value, 'Ada')
    assert.equal(view.queryByText(/recibimos tu solicitud/i), null)
  })
})

test('demo form expone nombres y autocomplete semánticos para sus controles', () => {
  const view = render(<DemoContactForm />)

  assert.equal(view.getByLabelText('Nombre').getAttribute('name'), 'name')
  assert.equal(view.getByLabelText('Nombre').getAttribute('autocomplete'), 'name')
  assert.equal(view.getByLabelText('Email').getAttribute('name'), 'email')
  assert.equal(view.getByLabelText('Email').getAttribute('autocomplete'), 'email')
  assert.equal(view.getByLabelText('Organización').getAttribute('name'), 'organization')
  assert.equal(view.getByLabelText('Organización').getAttribute('autocomplete'), 'organization')
  assert.equal(view.getByLabelText('Teléfono').getAttribute('name'), 'phone')
  assert.equal(view.getByLabelText('Teléfono').getAttribute('autocomplete'), 'tel')
  assert.equal(view.getByLabelText('Teléfono').getAttribute('type'), 'tel')
  assert.equal(view.getByLabelText('¿Qué necesitás resolver?').getAttribute('name'), 'message')
  assert.equal(view.getByLabelText('¿Qué necesitás resolver?').getAttribute('autocomplete'), 'off')
  assert.equal(view.getByLabelText('Website').getAttribute('name'), 'website')
  assert.equal(view.getByLabelText('Website').getAttribute('autocomplete'), 'off')
})

test('demo form asocia errores inline, anuncia validación y enfoca el primer campo inválido', async () => {
  const view = render(<DemoContactForm />)
  const form = view.container.querySelector('form')

  assert.ok(form)
  fireEvent.submit(form as HTMLFormElement)

  await waitFor(() => {
    const name = view.getByLabelText('Nombre')
    const nameError = document.getElementById('name-error')
    const summary = view.getByRole('alert')

    assert.ok(nameError)
    assert.equal(name.getAttribute('aria-describedby'), nameError.id)
    assert.equal(name.getAttribute('aria-invalid'), 'true')
    assert.equal(summary.getAttribute('aria-live'), 'assertive')
    assert.equal(document.activeElement, name)
  })
})

test('demo form anuncia fallas de entrega en una región asertiva y conserva el borrador', async () => {
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => { throw new Error('boom') }} />)
  const form = view.container.querySelector('form')

  assert.ok(form)
  fireEvent.submit(form as HTMLFormElement)

  await waitFor(() => {
    const alert = view.getByRole('alert')
    assert.equal(alert.getAttribute('aria-live'), 'assertive')
    assert.equal(alert.getAttribute('aria-atomic'), 'true')
     assert.equal((view.getByLabelText('Nombre') as HTMLInputElement).value, 'Ada')
     assert.equal((view.getByLabelText('Email') as HTMLInputElement).value, 'ada@example.com')
  })
})

test('demo form permite enviar con la ruta semántica de submit del teclado', async () => {
  let calls = 0
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => {
    calls += 1
    return { contractVersion: '1.0.0', submissionId: 'keyboard-1', status: 'received' }
  }} />)
  const form = view.container.querySelector('form')

  assert.ok(form)
  fireEvent.submit(form as HTMLFormElement)

  await waitFor(() => {
    assert.equal(calls, 1)
    assert.ok(view.getByText(/recibimos tu solicitud/i))
  })
})

test('demo form ofrece foco visible en controles de entrada y acción', () => {
  const view = render(<DemoContactForm />)

  for (const control of [
    view.getByLabelText('Nombre'),
    view.getByLabelText('Email'),
    view.getByLabelText('Organización'),
    view.getByLabelText('Teléfono'),
    view.getByLabelText('¿Qué necesitás resolver?'),
    view.getByRole('button', { name: 'Solicitar demo' }),
  ]) {
    assert.match(control.getAttribute('class') ?? '', /focus-visible:/)
  }
})

test('demo form declara requeridos los datos mínimos y limpia el error al corregirlo', async () => {
  const view = render(<DemoContactForm />)
  const form = view.container.querySelector('form')

  assert.equal(view.getByLabelText('Nombre').getAttribute('aria-required'), 'true')
  assert.equal(view.getByLabelText('Email').getAttribute('aria-required'), 'true')
  assert.ok(form)

  fireEvent.submit(form as HTMLFormElement)

  await waitFor(() => assert.equal(view.getByLabelText('Nombre').getAttribute('aria-invalid'), 'true'))
  fireEvent.input(view.getByLabelText('Nombre'), { target: { value: 'Ada' } })

  await waitFor(() => {
    assert.equal(view.getByLabelText('Nombre').getAttribute('aria-invalid'), null)
    assert.equal(document.getElementById('name-error'), null)
  })
})

test('demo form trata un timeout como entrega no confirmada y conserva el borrador', async () => {
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => {
    throw Object.assign(new Error('request timed out'), { name: 'TimeoutError', code: 'ETIMEDOUT' })
  }} />)

  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.match(view.getByRole('alert').textContent ?? '', /cancelada|tiempo/i)
     assert.equal((view.getByLabelText('Nombre') as HTMLInputElement).value, 'Ada')
    assert.equal(view.queryByText(/recibimos tu solicitud/i), null)
  })
})

test('demo form muestra el siguiente paso después de una aceptación confirmada', async () => {
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => ({ contractVersion: '1.0.0', submissionId: 'demo-next-step', status: 'received' })} />)

  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.match(view.getByRole('status').textContent ?? '', /coordinaremos|próximo paso/i)
    assert.equal(view.getByRole('status').getAttribute('tabindex'), '-1')
  })
})

test('demo form no confirma una respuesta con contrato incorrecto', async () => {
  const view = render(<DemoContactForm initialValues={{ name: 'Ada', email: 'ada@example.com' }} submitAction={async () => ({ contractVersion: '0.0.0', submissionId: 'wrong-contract', status: 'received' } as unknown as { contractVersion: '1.0.0'; submissionId: string; status: 'received' })} />)

  fireEvent.click(view.getByRole('button', { name: 'Solicitar demo' }))

  await waitFor(() => {
    assert.match(view.getByRole('alert').textContent ?? '', /no pudo aceptar|no confirmada/i)
    assert.equal(view.queryByText(/recibimos tu solicitud/i), null)
  })
})
