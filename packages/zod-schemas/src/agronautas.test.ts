import test from 'node:test'
import assert from 'node:assert/strict'
import { AGRONAUTAS_CONTRACT_VERSION, demoContactSubmissionSchema, groundedChatRequestSchema } from './agronautas'

test('demo contact schema acepta payload válido y trimmea campos', () => {
  const parsed = demoContactSubmissionSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: '  Ada Lovelace  ',
    email: '  ada@example.com ',
    organization: '  Agronautas  ',
    message: '  Necesito una demo para el equipo.  ',
    website: '',
  })

  assert.equal(parsed.name, 'Ada Lovelace')
  assert.equal(parsed.email, 'ada@example.com')
  assert.equal(parsed.organization, 'Agronautas')
  assert.equal(parsed.message, 'Necesito una demo para el equipo.')
})

test('demo contact schema rechaza email inválido y nombre faltante', () => {
  const invalidEmail = demoContactSubmissionSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: 'Ada',
    email: 'no-es-email',
    website: '',
  })
  const missingName = demoContactSubmissionSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: '   ',
    email: 'ada@example.com',
    website: '',
  })

  assert.equal(invalidEmail.success, false)
  assert.equal(missingName.success, false)
})

test('demo contact schema rechaza mensaje oversized y acepta honeypot poblado contractual', () => {
  const oversized = demoContactSubmissionSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: 'Ada',
    email: 'ada@example.com',
    message: 'x'.repeat(1001),
    website: '',
  })
  const honeypot = demoContactSubmissionSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    name: 'Ada',
    email: 'ada@example.com',
    website: 'bot-value',
  })

  assert.equal(oversized.success, false)
  assert.equal(honeypot.website, 'bot-value')
})

test('grounded chat schema trimmea y limita el mensaje a 500 caracteres', () => {
  const parsed = groundedChatRequestSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    message: '  Riesgo actual del lote  ',
  })
  const oversized = groundedChatRequestSchema.safeParse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    message: 'x'.repeat(501),
  })

  assert.equal(parsed.message, 'Riesgo actual del lote')
  assert.equal(oversized.success, false)
})
