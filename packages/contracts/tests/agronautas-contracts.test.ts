import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  agronautasContractErrorCodes,
  agronautasAlertTypes,
  agronautasGrowthStages,
  agronautasRiskLevels,
  alertSnapshotSchema,
  copilotContextSchema,
  corrientesRiceZoneBoundarySource,
  dashboardSnapshotSchema,
  degradationReasons,
  fieldIntakeSchema,
  groundedChatRequestSchema,
  pdfReportRequestSchema,
  riskSnapshotSchema,
  schedulerStatusSchema,
  signalEvidenceSchema,
  sourceCadenceSchema,
} from '../../zod-schemas/src/agronautas.js'

const contractsRoot = join(import.meta.dirname, '..')
const schema = JSON.parse(readFileSync(join(contractsRoot, 'schemas', 'agronautas-contracts.v1.schema.json'), 'utf8'))
const matrix = JSON.parse(readFileSync(join(contractsRoot, 'fixtures', 'agronautas', 'validation-matrix.v1.json'), 'utf8'))

const validators = {
  FieldIntake: fieldIntakeSchema,
  RiskSnapshot: riskSnapshotSchema,
  AlertSnapshot: alertSnapshotSchema,
  CopilotContext: copilotContextSchema,
  SignalEvidence: signalEvidenceSchema,
  SourceCadence: sourceCadenceSchema,
  SchedulerStatus: schedulerStatusSchema,
  DashboardSnapshot: dashboardSnapshotSchema,
  PdfReportRequest: pdfReportRequestSchema,
  GroundedChatRequest: groundedChatRequestSchema,
} as const

test('mantiene enums y metadata compartida alineados con el catálogo JSON Schema', () => {
  assert.deepEqual(schema.$defs.DegradationReason.enum, [...degradationReasons])
  assert.deepEqual(schema.$defs.FieldIntake.properties.growthStage.enum, [...agronautasGrowthStages])
  assert.deepEqual(schema.$defs.RiskSnapshot.properties.level.enum, [...agronautasRiskLevels])
  assert.deepEqual(schema.$defs.AlertSnapshot.properties.type.enum, [...agronautasAlertTypes])
  assert.deepEqual(schema.$defs.AgronautasContractError.properties.code.enum, [...agronautasContractErrorCodes])
  assert.equal(schema.$defs.CorrientesRiceZoneBoundaryMetadata.properties.sourceName.type, 'string')
  assert.deepEqual(schema.$defs.FieldIntake.properties.crop.enum, ['rice', 'maize', 'soybean', 'wheat', 'sunflower', 'pasture', 'citrus', 'other'])
  assert.equal(schema.$defs.SignalEvidence.properties.rawHash.type, 'string')
  assert.equal(schema.$defs.SchedulerStatus.properties.nextDueBySource.items.properties.cadence.$ref, '#/$defs/SourceCadence')
  assert.equal(corrientesRiceZoneBoundarySource.normalizationStatus, 'placeholder-pending-ingest')
})

test('acepta y rechaza fixtures de contratos de forma consistente en TypeScript', () => {
  for (const contractCase of matrix.cases) {
    const validator = validators[contractCase.contract as keyof typeof validators]
    const result = validator.safeParse(contractCase.payload)
    assert.equal(result.success, contractCase.valid, contractCase.name)
  }
})
