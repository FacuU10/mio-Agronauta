import { type AgronautasIntelligence, type ObservationMetadata } from '@repo/zod-schemas'
import type { ClimateSummary, Field, FieldContext, RiskSnapshotFoundation } from '../../domain/entities/agronautas'

const RECOMMENDATION_INPUTS = ['soil', 'crop-history/yield', 'price', 'FX', 'cost'] as const

export interface BuildAgronautasIntelligenceInput {
  field: Field
  context: FieldContext | null
  climate: ClimateSummary | null
  climateTimeline: ClimateSummary[]
  risk: RiskSnapshotFoundation | null
  riskTimeline: RiskSnapshotFoundation[]
  now?: Date
}

export function buildAgronautasIntelligenceViewModel(input: BuildAgronautasIntelligenceInput): AgronautasIntelligence {
  const retrievedAt = (input.now ?? new Date()).toISOString()
  const climateTimeline = input.climateTimeline.map((item) => toClimateValue(item))
  const riskTimeline = input.riskTimeline.map((item) => toRiskValue(item))
  const climate = input.climate ? toClimateCapability(input.climate, retrievedAt) : unavailable('unavailable', 'No persisted climate observation exists.')
  const risk = input.risk ? toRiskCapability(input.risk, retrievedAt) : unavailable('unavailable', 'No persisted risk snapshot exists.')
  const economicsState = unavailable('insufficient_evidence', 'Economic calculation is blocked until qualified observations exist.', ['price', 'FX', 'cost'])

  return {
    contractVersion: 'agronautas-intelligence-v1',
    field: {
      fieldId: input.field.props.id,
      crop: input.field.props.crop,
      hectares: input.field.props.hectares,
      locality: input.field.props.localityName,
    },
    climate,
    risk,
    soil: unavailable('unavailable', 'No verified soil observation exists.'),
    prices: unavailable('unavailable', 'No verified price observation exists.'),
    dollar: unavailable('unavailable', 'No verified FX observation exists.'),
    economics: economicsState,
    recommendation: unavailable('insufficient_evidence', 'Planting recommendation is blocked until all required evidence is qualified.', [...RECOMMENDATION_INPUTS]),
    explanation: {
      context: input.context ? {
        locality: input.context.props.localityCanonical,
        growthStage: input.context.props.growthStage ?? null,
        localityConfidence: input.context.props.localityConfidence,
      } : null,
      climateTimeline,
      riskTimeline,
      evidenceRefs: [...new Set([
        ...(input.climate?.provenance ?? []),
        ...(input.risk?.props.evidenceRefs ?? []),
      ])],
    },
  } as AgronautasIntelligence
}

function toClimateCapability(item: ClimateSummary, retrievedAt: string) {
  return {
    state: 'available' as const,
    value: toClimateValue(item),
    metadata: climateMetadata(item, retrievedAt),
  }
}

function toClimateValue(item: ClimateSummary) {
  return {
    temperatureC: item.temperatureC,
    rainfallMm7d: item.rainfallMm7d,
    ...(item.humidityPct == null ? {} : { humidityPct: item.humidityPct }),
    freshness: item.freshness ?? (item.staleCause ? 'degraded' as const : 'fresh' as const),
    freshnessHours: item.freshnessHours,
    degradationReasons: item.degradationReasons ?? [],
  }
}

function climateMetadata(item: ClimateSummary, retrievedAt: string): ObservationMetadata {
  return {
    source: item.provider,
    unit: '°C; mm/7d',
    observedAt: item.observedAt.toISOString(),
    retrievedAt,
    lineage: {
      sourceRunIds: [item.sourceRunId ?? item.runId].filter((value): value is string => Boolean(value)),
      observationRefs: item.provenance,
    },
  }
}

function toRiskCapability(item: RiskSnapshotFoundation, retrievedAt: string) {
  return {
    state: 'available' as const,
    value: toRiskValue(item),
    metadata: {
      source: item.props.engineId ?? item.props.ruleVersion,
      unit: 'score/100',
      observedAt: item.props.computedAt.toISOString(),
      retrievedAt,
      lineage: {
        sourceRunIds: item.props.sourceRunIds ?? [item.props.runId],
        observationRefs: item.props.evidenceRefs,
      },
    },
  }
}

function toRiskValue(item: RiskSnapshotFoundation) {
  return {
    score: item.props.score,
    level: item.level,
    confidence: item.props.confidence,
    freshness: item.freshness,
    degradationReasons: item.props.degradationReasons,
    drivers: item.props.drivers,
    engine: {
      id: item.props.engineId ?? item.props.ruleVersion,
      version: item.props.engineVersion ?? item.props.ruleVersion,
      selectionStatus: 'undecided' as const,
    },
  }
}

function unavailable(state: 'unavailable' | 'insufficient_evidence', reason: string, missingInputs?: string[]) {
  return { state, reason, ...(missingInputs ? { missingInputs } : {}) }
}
