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
  campaignPlanningContextRequestSchema,
  assumptionSimulationRequestSchema,
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
  assert.equal(schema.$defs.SignalEvidence.properties.sourceRunId.type, 'string')
  assert.equal(schema.$defs.SignalEvidence.properties.acquiredAt.format, 'date-time')
  assert.equal(schema.$defs.RiskSnapshot.properties.engineId.type, 'string')
  assert.equal(schema.$defs.AlertSnapshot.properties.basedOnSnapshotId.type, 'string')
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
  assert.match(persistedFieldColumns, /\bboundary\b/i)
  assert.match(persistedFieldColumns, /\bcentroid\b/i)
  assert.match(persistedFieldColumns, /\bboundary_area_m2\b/i)
  assert.match(persistedFieldColumns, /\bboundary_perimeter_m\b/i)
  for (const query of persistedFieldReads) {
    assert.match(query, /ST_AsText\(boundary\)\s+AS\s+polygon_wkt/i)
  }
  assert.match(workspace, /no promete análisis poligonal/i)
  assert.match(workspace, /evita controles hidráulicos personalizados/i)
  assert.match(municipalDetail, /sin convertir mapeos en impacto hidráulico/i)
})

test('risk-engine vectors record divergence and keep canonical selection undecided', () => {
  const riskEngineSchema = JSON.parse(readFileSync(join(contractsRoot, 'schemas', 'risk-engine-contract.v1.schema.json'), 'utf8')) as {
    $defs: {
      CanonicalEngineGate: { properties: { status: { const: string }; engineId: { const: string | null } } }
    }
  }
  const vectors = JSON.parse(readFileSync(join(contractsRoot, 'risk-engine', 'golden-vectors.json'), 'utf8')) as {
    canonicalEngine: { status: string; engineId: string | null }
    vectors: Array<{
      id: string
      expectedByEngine: Record<string, { score: number; confidence: number; validityHours: number; freshness: string }>
      comparison: { status: string; differences: string[]; parityClaim: boolean }
    }>
  }

  assert.equal(riskEngineSchema.$defs.CanonicalEngineGate.properties.status.const, 'undecided')
  assert.equal(riskEngineSchema.$defs.CanonicalEngineGate.properties.engineId.const, null)
  assert.deepEqual(vectors.canonicalEngine, { status: 'undecided', engineId: null })
  assert.ok(vectors.vectors.length >= 2)

  for (const vector of vectors.vectors) {
    assert.deepEqual(Object.keys(vector.expectedByEngine).sort(), ['open-meteo-basic-v1', 'risk-v0'])
    assert.equal(vector.comparison.status, 'divergent', vector.id)
    assert.equal(vector.comparison.parityClaim, false, vector.id)
    assert.ok(vector.comparison.differences.length > 0, vector.id)
  }
})

test('campaign planning JSON catalog mirrors namespaced schemas and unavailable economic states', () => {
  assert.deepEqual(schema.$defs.CampaignPlanningContextRequest.properties.workspaceId.const, 'agronautas-default-workspace')
  assert.deepEqual(schema.$defs.AssumptionSimulationRequest.properties.units.properties.area.const, 'ha')
  assert.deepEqual(schema.$defs.PlanningAvailability.properties.state.enum, ['available', 'unavailable', 'insufficient_evidence'])
  assert.deepEqual(schema.$defs.AssumptionSimulationResponse.oneOf.map((item: { properties?: { status?: { const?: string } } }) => item.properties?.status?.const).filter(Boolean), ['complete', 'insufficient_evidence'])
  assert.equal(campaignPlanningContextRequestSchema.safeParse({ contractVersion: 'agronautas-campaign-planning-context-v1', workspaceId: 'agronautas-default-workspace', campaignName: 'C', season: '2026', fieldIds: ['field-1'] }).success, true)
  assert.equal(assumptionSimulationRequestSchema.safeParse({ contractVersion: 'agronautas-assumption-simulation-v1', areaHa: 1, expectedYieldKgPerHa: 1, pricePerKg: 1, variableCostPerHa: 1, fixedCost: 1, currency: 'ARS', precision: 2, units: { area: 'ha', expectedYield: 'kg/ha', price: 'currency/kg', variableCost: 'currency/ha', fixedCost: 'currency' }, assumptions: ['manual'] }).success, true)
})
