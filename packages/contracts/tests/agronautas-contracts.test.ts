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
const repositoryRoot = join(contractsRoot, '..', '..')
const changeRoot = join(repositoryRoot, 'openspec', 'changes', 'agronautas-ibera-data-first-ux-ondemand')
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

test('mantiene el límite ejecutable del plan on-demand en una sola fuente y un solo centroide', () => {
  const spec = readFileSync(join(changeRoot, 'specs', 'agronautas-evidence-visibility', 'spec.md'), 'utf8')
  const matrixDocument = readFileSync(join(changeRoot, 'contract-to-screen-matrix.md'), 'utf8')
  const requiredProof = [
    'one centroid',
    'one source',
    'request/run IDs',
    'timeout/rate behavior',
    'latest-good/cache',
    'persistence/history',
    'freshness',
    'Copilot trace',
  ]

  assert.match(spec, /SHALL document, but MUST NOT implement/)
  for (const requirement of requiredProof) {
    assert.match(matrixDocument, new RegExp(requirement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), requirement)
  }
  assert.match(matrixDocument, /external Postgres\/Redis prerequisites/i)
  assert.match(matrixDocument, /must not infer Corrientes-wide feasibility/i)
})

test('keeps explicit non-goals aligned with the actual evidence and map boundaries', () => {
  const proposal = readFileSync(join(changeRoot, 'proposal.md'), 'utf8')
  const design = readFileSync(join(changeRoot, 'design.md'), 'utf8')
  const tasks = readFileSync(join(changeRoot, 'tasks.md'), 'utf8')
  const mapSource = readFileSync(join(repositoryRoot, 'apps', 'web', 'src', 'lib', 'visibility', 'map.ts'), 'utf8')
  const webPackage = JSON.parse(readFileSync(join(repositoryRoot, 'apps', 'web', 'package.json'), 'utf8')) as { dependencies?: Record<string, string> }
  const fieldRepository = readFileSync(join(repositoryRoot, 'apps', 'api', 'src', 'infrastructure', 'database', 'postgres', 'agronautas-field-repository.ts'), 'utf8')
  const workspace = readFileSync(join(repositoryRoot, 'apps', 'web', 'src', 'components', 'agronautas', 'workspace.tsx'), 'utf8')
  const municipalDetail = readFileSync(join(repositoryRoot, 'apps', 'web', 'src', 'components', 'government', 'detail.tsx'), 'utf8')
  const scopeDocuments = `${proposal}\n${design}\n${tasks}`
  const nonGoals = [
    'Docker',
    'Google Maps',
    'WhatsApp',
    'durable/editable polygons',
    'scheduler rewrite',
    'Risk Engine',
    'hydraulic simulation',
  ]

  for (const nonGoal of nonGoals) {
    assert.match(scopeDocuments, new RegExp(nonGoal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), nonGoal)
  }

  assert.match(mapSource, /provider: 'unconfigured'/)
  assert.match(mapSource, /pointOnly: true/)
  assert.equal(Object.keys(webPackage.dependencies ?? {}).some((name) => /google.?maps/i.test(name)), false)
  const persistedFieldColumns = fieldRepository.match(/`INSERT INTO fields \(([\s\S]*?)\)\s+VALUES/i)?.[1]
  const persistedFieldReads = [...fieldRepository.matchAll(/`(SELECT[\s\S]*?FROM fields[\s\S]*?)`/gi)].map((match) => match[1])

  assert.ok(persistedFieldColumns)
  assert.ok(persistedFieldReads.length >= 2)
  assert.doesNotMatch(persistedFieldColumns, /\bboundary\b(?!_source|_version)/i)
  for (const query of persistedFieldReads) {
    assert.doesNotMatch(query, /\bboundary\b(?!_source|_version)/i)
  }
  assert.match(workspace, /no promete análisis poligonal/i)
  assert.match(workspace, /evita controles hidráulicos personalizados/i)
  assert.match(municipalDetail, /sin convertir mapeos en impacto hidráulico/i)
})
