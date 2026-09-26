import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthFailure, AUTH_FAILURE_CODES, type BootstrapInput, type BootstrapResult } from '../../domain/auth/contracts'
import { runAgronautasAuthBootstrapFromEnv } from './agronautas-auth-bootstrap'

const BOOTSTRAP_SECRET = 'bootstrap-secret-for-startup-tests-1234567890'

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    AGRONAUTAS_AUTH_BOOTSTRAP_ENABLED: 'true',
    AGRONAUTAS_AUTH_BOOTSTRAP_SECRET: BOOTSTRAP_SECRET,
    AGRONAUTAS_AUTH_BOOTSTRAP_IDEMPOTENCY_KEY: 'startup-bootstrap-1',
    AGRONAUTAS_AUTH_BOOTSTRAP_WORKSPACE_NAME: 'Agronautas Pilot',
    AGRONAUTAS_AUTH_BOOTSTRAP_ADMIN_EMAIL: 'admin@example.test',
    AGRONAUTAS_AUTH_BOOTSTRAP_ADMIN_PASSWORD: 'safe-password-123',
    AGRONAUTAS_AUTH_BOOTSTRAP_ADMIN_DISPLAY_NAME: 'Pilot Admin',
    AGRONAUTAS_AUTH_BOOTSTRAP_FIELD_MAPPINGS: JSON.stringify([{ fieldId: 'field-1', workspaceKey: 'agronautas-pilot' }]),
  }
}

test('startup bootstrap is disabled by default and does not construct or call a service', async () => {
  let calls = 0
  const result = await runAgronautasAuthBootstrapFromEnv({}, { serviceFactory: () => { calls += 1; throw new Error('must not construct') } })

  assert.deepEqual(result, { status: 'disabled' })
  assert.equal(calls, 0)
})

test('enabled startup bootstrap parses exact env inputs and invokes the internal service', async () => {
  let captured: BootstrapInput | null = null
  const service = {
    async bootstrap(input: BootstrapInput): Promise<BootstrapResult> {
      captured = input
      return { status: 'created', workspaceId: 'workspace-1', adminUserId: 'admin-1', mappedFieldIds: ['field-1'], unmappedFieldIds: [] }
    },
  }

  const result = await runAgronautasAuthBootstrapFromEnv(validEnvironment(), { service })

  assert.equal(result.status, 'completed')
  const capturedInput = captured as unknown as BootstrapInput
  assert.equal(capturedInput.pilotWorkspace.name, 'Agronautas Pilot')
  assert.equal(capturedInput.admin.email, 'admin@example.test')
  assert.deepEqual(capturedInput.fieldMappings, [{ fieldId: 'field-1', workspaceKey: 'agronautas-pilot' }])
})

test('enabled startup bootstrap rejects missing or malformed inputs as a typed failure', async () => {
  await assert.rejects(
    () => runAgronautasAuthBootstrapFromEnv({ ...validEnvironment(), AGRONAUTAS_AUTH_BOOTSTRAP_ADMIN_PASSWORD: undefined }, { service: { async bootstrap() { throw new Error('must not call') } } }),
    (error: unknown) => error instanceof AuthFailure && error.code === AUTH_FAILURE_CODES.INVALID_INPUT && error.statusCode === 400,
  )
  await assert.rejects(
    () => runAgronautasAuthBootstrapFromEnv({ ...validEnvironment(), AGRONAUTAS_AUTH_BOOTSTRAP_FIELD_MAPPINGS: '{invalid' }, { service: { async bootstrap() { throw new Error('must not call') } } }),
    (error: unknown) => error instanceof AuthFailure && error.code === AUTH_FAILURE_CODES.INVALID_INPUT,
  )
})

test('startup bootstrap propagates conflicts without logging or exposing credentials', async () => {
  const service = { async bootstrap(): Promise<BootstrapResult> { throw new AuthFailure(AUTH_FAILURE_CODES.ALREADY_INITIALIZED_CONFLICT, 'Agronautas bootstrap is already initialized') } }

  await assert.rejects(() => runAgronautasAuthBootstrapFromEnv(validEnvironment(), { service }), (error: unknown) => error instanceof AuthFailure && error.code === AUTH_FAILURE_CODES.ALREADY_INITIALIZED_CONFLICT)
})

test('startup bootstrap can be invoked repeatedly and preserves the service idempotency result', async () => {
  let calls = 0
  const service = {
    async bootstrap(): Promise<BootstrapResult> {
      calls += 1
      return calls === 1
        ? { status: 'created', workspaceId: 'workspace-1', adminUserId: 'admin-1', mappedFieldIds: [], unmappedFieldIds: ['field-1'] }
        : { status: 'already_initialized', workspaceId: 'workspace-1', adminUserId: 'admin-1', mappedFieldIds: [], unmappedFieldIds: ['field-1'] }
    },
  }

  const first = await runAgronautasAuthBootstrapFromEnv(validEnvironment(), { service })
  const second = await runAgronautasAuthBootstrapFromEnv(validEnvironment(), { service })

  assert.equal(first.status, 'completed')
  assert.equal(first.result?.status, 'created')
  assert.equal(second.result?.status, 'already_initialized')
  assert.equal(calls, 2)
})
