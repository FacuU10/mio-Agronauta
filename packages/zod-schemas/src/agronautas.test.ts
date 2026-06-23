import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AGRONAUTAS_CONTRACT_VERSION,
  demoContactSubmissionSchema,
  groundedChatRequestSchema,
  hydrologyDenseContextV1Schema,
  hydrologyProviderPayloadGuardSchema,
  hydrologyTelemetrySchema,
} from './agronautas'

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

test('hydrology telemetry exige fuentes oficiales y timestamp de último dato exitoso', () => {
  const parsed = hydrologyTelemetrySchema.parse({
    source: 'PNA',
    stationId: 'ituzaingo',
    observedAt: '2026-06-23T10:30:00.000Z',
    lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z',
    value: 4.2,
    unit: 'm',
    metric: 'river_height_m',
    quality: 'ok',
    freshness: 'fresh',
    forecastHorizonDays: 7,
    confidence: 'normal',
  })
  const invalidSource = hydrologyTelemetrySchema.safeParse({ ...parsed, source: 'DMH_PARAGUAY' })

  assert.equal(parsed.lastSuccessfulObservedAt, '2026-06-23T10:30:00.000Z')
  assert.equal(invalidSource.success, false)
})

test('hydrology forecast de 15 a 30 días debe ser especulativo y no supera un mes', () => {
  const speculative = hydrologyTelemetrySchema.safeParse({
    source: 'INA',
    stationId: 'corrientes',
    observedAt: '2026-06-23T10:30:00.000Z',
    lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z',
    value: 5.1,
    unit: 'm',
    metric: 'river_height_m',
    quality: 'estimated',
    freshness: 'fresh',
    forecastHorizonDays: 20,
    confidence: 'speculative',
  })
  const overHorizon = hydrologyTelemetrySchema.safeParse({
    source: 'INA',
    stationId: 'corrientes',
    observedAt: '2026-06-23T10:30:00.000Z',
    lastSuccessfulObservedAt: '2026-06-23T10:30:00.000Z',
    value: 5.1,
    unit: 'm',
    metric: 'river_height_m',
    quality: 'estimated',
    freshness: 'fresh',
    forecastHorizonDays: 31,
    confidence: 'speculative',
  })

  assert.equal(speculative.success, true)
  assert.equal(overHorizon.success, false)
})

test('hydrology dense context deja vacías fuentes y estaciones fuera de zonas objetivo', () => {
  const outsideZone = hydrologyDenseContextV1Schema.parse({
    contractVersion: 'hydrology-dense-context-v1',
    fieldId: 'field-outside',
    zone: null,
    sources: [],
    stations: [],
    snapshot: {
      riskLevel: 'unknown',
      freshness: 'degraded',
      quality: 'missing',
      recommendation: 'No hay datos oficiales disponibles para este lote en Fase 1.',
      lastSuccessfulObservedAt: null,
    },
    telemetry: [],
  })
  const invalidOutsideZone = hydrologyDenseContextV1Schema.safeParse({
    ...outsideZone,
    sources: ['PNA'],
  })

  assert.equal(outsideZone.zone, null)
  assert.equal(invalidOutsideZone.success, false)
})

test('hydrology phase 1 rechaza DMH Paraguay, descargas de represas y modelos hidráulicos', () => {
  const dmh = hydrologyProviderPayloadGuardSchema.safeParse({ source: 'DMH_PARAGUAY' })
  const damDischarge = hydrologyProviderPayloadGuardSchema.safeParse({
    source: 'PNA',
    excludedInputs: ['itaipu_discharge'],
  })
  const customModel = hydrologyProviderPayloadGuardSchema.safeParse({
    source: 'SMN',
    excludedInputs: ['custom_hydraulic_model'],
  })

  assert.equal(dmh.success, false)
  assert.equal(damDischarge.success, false)
  assert.equal(customModel.success, false)
})
