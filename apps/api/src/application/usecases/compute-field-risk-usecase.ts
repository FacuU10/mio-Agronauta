import { randomUUID } from 'node:crypto'
import { RiskSnapshotFoundation, type ClimateSummary, type DegradationReason, type FieldContext, type RiskDriver, type SatelliteSummary } from '../../domain/entities/agronautas'
import type { FieldContextRepository, RecomputeLockRepository, RiskSnapshotRepository, SignalSummaryRepository } from '../../domain/repositories/agronautas'

const RISK_RULE_VERSION = 'risk-v0'
const RECOMPUTE_LOCK_TTL_SECONDS = 120
const SNAPSHOT_TTL_HOURS = 6

export interface ComputeFieldRiskInput {
  fieldId: string
  triggeredBy: 'scheduler' | 'api' | 'alert-refresh'
}

export interface ComputeFieldRiskResult {
  snapshot: RiskSnapshotFoundation
  status: 'computed' | 'reused-existing'
  lockAcquired: boolean
}

interface ComputeFieldRiskUseCaseOptions {
  now?: () => Date
  idGenerator?: () => string
}

export class ComputeFieldRiskUseCase {
  constructor(
    private readonly signalSummaryRepository: SignalSummaryRepository,
    private readonly fieldContextRepository: FieldContextRepository,
    private readonly riskSnapshotRepository: RiskSnapshotRepository,
    private readonly recomputeLockRepository: RecomputeLockRepository,
    private readonly options: ComputeFieldRiskUseCaseOptions = {},
  ) {}

  async execute(input: ComputeFieldRiskInput): Promise<ComputeFieldRiskResult> {
    const computedAt = this.now()
    const runId = this.idGenerator()
    const lockAcquired = await this.recomputeLockRepository.acquire(input.fieldId, RECOMPUTE_LOCK_TTL_SECONDS, {
      runId,
      triggeredBy: input.triggeredBy,
    })

    if (!lockAcquired) {
      const existingSnapshot = await this.riskSnapshotRepository.getLatest(input.fieldId)
      if (!existingSnapshot) {
        throw new Error(`No snapshot available while recompute is already in progress for field ${input.fieldId}`)
      }

      return {
        snapshot: existingSnapshot,
        status: 'reused-existing',
        lockAcquired: false,
      }
    }

    try {
      const [climate, satellite, context] = await Promise.all([
        this.signalSummaryRepository.getLatestClimateSummary(input.fieldId),
        this.signalSummaryRepository.getLatestSatelliteSummary(input.fieldId),
        this.fieldContextRepository.getLatest(input.fieldId),
      ])

      const degradationReasons = collectDegradationReasons({ climate, satellite, context })
      const drivers = buildDrivers({ climate, satellite, context })
      const score = calculateScore(drivers)
      const confidence = calculateConfidence({ climate, satellite, context, degradationReasons })
      const evidenceRefs = collectEvidenceRefs(climate, satellite, context)

      const snapshot = new RiskSnapshotFoundation({
        snapshotId: this.idGenerator(),
        fieldId: input.fieldId,
        runId,
        score,
        confidence,
        computedAt,
        validUntil: new Date(computedAt.getTime() + SNAPSHOT_TTL_HOURS * 3_600_000),
        ruleVersion: RISK_RULE_VERSION,
        drivers,
        evidenceRefs,
        degradationReasons,
        staleCause: degradationReasons[0],
      })

      await this.riskSnapshotRepository.save(snapshot)

      return {
        snapshot,
        status: 'computed',
        lockAcquired: true,
      }
    } finally {
      await this.recomputeLockRepository.release(input.fieldId)
    }
  }

  private now(): Date {
    return this.options.now?.() ?? new Date()
  }

  private idGenerator(): string {
    return this.options.idGenerator?.() ?? randomUUID()
  }
}

function collectDegradationReasons(input: {
  climate: ClimateSummary | null
  satellite: SatelliteSummary | null
  context: FieldContext | null
}): DegradationReason[] {
  const reasons = new Set<DegradationReason>()

  if (!input.climate) {
    reasons.add('weather_data_unavailable')
  } else if (input.climate.freshnessHours > 12 || input.climate.staleCause) {
    reasons.add('weather_data_stale')
  }

  if (!input.satellite) {
    reasons.add('satellite_data_unavailable')
  } else if (input.satellite.freshnessHours > 72 || input.satellite.staleCause) {
    reasons.add('satellite_data_stale')
  }

  if (!input.context?.props.growthStage) {
    reasons.add('manual_context_missing')
  }

  if ((input.context?.props.localityConfidence ?? 1) < 0.6) {
    reasons.add('locality_unverified')
  }

  return [...reasons]
}

function buildDrivers(input: {
  climate: ClimateSummary | null
  satellite: SatelliteSummary | null
  context: FieldContext | null
}): RiskDriver[] {
  const stageFactor = growthStageFactor(input.context?.props.growthStage)
  const heatRisk = input.climate ? Math.min(1, Math.max(0, (input.climate.temperatureC - 24) / 12)) : 0.45
  const rainfallRisk = input.climate ? Math.min(1, input.climate.rainfallMm7d / 140) : 0.4
  const vegetationStress = input.satellite
    ? Math.min(
        1,
        Math.max(
          0,
          input.satellite.waterStressIndex ??
            (input.satellite.ndvi != null ? 1 - input.satellite.ndvi : input.satellite.evi != null ? 1 - input.satellite.evi : 0.45),
        ),
      )
    : 0.5

  return [
    { key: 'heat_pressure', label: 'Heat pressure', weight: 0.35, value: Number(heatRisk.toFixed(3)) },
    { key: 'rainfall_load', label: 'Rainfall load', weight: 0.3, value: Number(rainfallRisk.toFixed(3)) },
    { key: 'satellite_stress', label: 'Satellite stress', weight: 0.25, value: Number(vegetationStress.toFixed(3)) },
    { key: 'growth_stage_sensitivity', label: 'Growth stage sensitivity', weight: 0.1, value: Number(stageFactor.toFixed(3)) },
  ]
}

function growthStageFactor(growthStage?: string): number {
  switch (growthStage) {
    case 'flowering':
      return 0.95
    case 'panicle_initiation':
      return 0.8
    case 'tillering':
      return 0.6
    case 'maturity':
      return 0.4
    case 'emergence':
      return 0.55
    default:
      return 0.5
  }
}

function calculateScore(drivers: RiskDriver[]): number {
  const weighted = drivers.reduce((sum, driver) => sum + driver.weight * driver.value, 0)
  return Number(Math.min(100, Math.max(0, weighted * 100)).toFixed(2))
}

function calculateConfidence(input: {
  climate: ClimateSummary | null
  satellite: SatelliteSummary | null
  context: FieldContext | null
  degradationReasons: DegradationReason[]
}): number {
  const sourceConfidence = [input.climate?.confidence ?? 0.45, input.satellite?.confidence ?? 0.4, input.context ? 0.9 : 0.55]
  const average = sourceConfidence.reduce((sum, value) => sum + value, 0) / sourceConfidence.length
  const penalty = input.degradationReasons.length * 0.08
  return Number(Math.max(0.2, Math.min(1, average - penalty)).toFixed(3))
}

function collectEvidenceRefs(
  climate: ClimateSummary | null,
  satellite: SatelliteSummary | null,
  context: FieldContext | null,
): string[] {
  const refs = new Set<string>()
  climate?.provenance.forEach((entry) => refs.add(entry))
  satellite?.provenance.forEach((entry) => refs.add(entry))
  if (context) refs.add(`field_contexts:${context.props.fieldId}`)
  if (refs.size === 0) refs.add('risk-engine:no-evidence')
  return [...refs]
}

export { RISK_RULE_VERSION, RECOMPUTE_LOCK_TTL_SECONDS, SNAPSHOT_TTL_HOURS, buildDrivers, calculateConfidence, calculateScore, collectDegradationReasons }
