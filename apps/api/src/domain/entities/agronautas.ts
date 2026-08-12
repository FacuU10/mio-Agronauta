import type { AlertSnapshot as AlertSnapshotContract, RiskSnapshot as RiskSnapshotContract } from '@repo/zod-schemas'

export type RiskLevel = 'low' | 'medium' | 'high'
export type SnapshotFreshness = 'fresh' | 'stale' | 'degraded'
export type SignalFreshness = SnapshotFreshness | 'missing'
export type DegradationReason =
  | 'weather_data_unavailable'
  | 'weather_data_stale'
  | 'satellite_data_unavailable'
  | 'satellite_data_stale'
  | 'boundary_source_pending_verification'
  | 'locality_unverified'
  | 'manual_context_missing'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface FieldBoundaryMetadata {
  sourceName: string
  sourceUrl: string
  sourceVersion: string
  normalizationStatus: string
  notes?: string
}

export interface FieldProps {
  id: string
  externalFieldId: string
  cropCategory?: string
  crop: string
  hectares: number
  localityName: string
  provinceCode: string
  centroid: GeoPoint
  polygonWkt?: string
  geometrySource?: 'operator' | 'google' | 'fallback'
  boundaryMetadata: FieldBoundaryMetadata
}

export interface FieldContextProps {
  fieldId: string
  growthStage?: string
  localityCanonical: string
  localityConfidence: number
  nearestStationId?: string
  contextPayload: Record<string, unknown>
}

export interface SignalSummary {
  provider: string
  observedAt: Date
  runId?: string
  sourceRunId?: string
  acquiredAt?: Date
  freshnessHours: number
  confidence: number
  freshness?: SignalFreshness
  staleCause?: string
  degradationReasons?: DegradationReason[]
  provenance: string[]
}

export interface ClimateSummary extends SignalSummary {
  temperatureC: number
  rainfallMm7d: number
  humidityPct?: number
}

export interface SatelliteSummary extends SignalSummary {
  ndvi?: number
  evi?: number
  waterStressIndex?: number
}

export interface RiskDriver {
  key: string
  label: string
  weight: number
  value: number
}

export interface RiskSnapshotFoundationProps {
  snapshotId: string
  fieldId: string
  runId: string
  score: number
  confidence: number
  computedAt: Date
  validUntil: Date
  ruleVersion: string
  engineId?: string
  engineVersion?: string
  sourceRunIds?: string[]
  acquisitionTimes?: Date[]
  alertSnapshotIds?: string[]
  drivers: RiskDriver[]
  evidenceRefs: string[]
  degradationReasons: DegradationReason[]
  staleCause?: string
}

export class Field {
  constructor(public readonly props: FieldProps) {
    if (props.provinceCode !== 'AR-W') {
      throw new Error('OUT_OF_SUPPORTED_AREA')
    }

    if (!isSupportedCrop(props.crop, props.cropCategory)) {
      throw new Error('UNSUPPORTED_CROP')
    }

    if (props.hectares <= 0) {
      throw new Error('Field hectares must be positive')
    }

    assertCoordinateRange(props.centroid)
  }
}

export class FieldContext {
  constructor(public readonly props: FieldContextProps) {
    if (props.localityConfidence < 0 || props.localityConfidence > 1) {
      throw new Error('localityConfidence must be between 0 and 1')
    }
  }
}

export class RiskSnapshotFoundation {
  constructor(public readonly props: RiskSnapshotFoundationProps) {
    if (props.confidence < 0 || props.confidence > 1) {
      throw new Error('confidence must be between 0 and 1')
    }

    if (props.score < 0 || props.score > 100) {
      throw new Error('score must be between 0 and 100')
    }

    if (props.validUntil <= props.computedAt) {
      throw new Error('validUntil must be after computedAt')
    }

    if (props.evidenceRefs.length === 0) {
      throw new Error('risk snapshots require at least one evidence reference')
    }
  }

  get level(): RiskLevel {
    if (this.props.score >= 70) return 'high'
    if (this.props.score >= 40) return 'medium'
    return 'low'
  }

  get freshness(): SnapshotFreshness {
    return deriveSnapshotFreshness(this.props)
  }

  isExpired(reference = new Date()): boolean {
    return this.props.validUntil.getTime() <= reference.getTime()
  }

  toContract(): RiskSnapshotContract {
    return {
      contractVersion: '1.0.0',
      snapshotId: this.props.snapshotId,
      fieldId: this.props.fieldId,
      score: this.props.score,
      level: this.level,
      confidence: this.props.confidence,
      computedAt: this.props.computedAt.toISOString(),
      validUntil: this.props.validUntil.toISOString(),
      ruleVersion: this.props.ruleVersion,
      ...(this.props.engineId ? { engineId: this.props.engineId } : {}),
      ...(this.props.engineVersion ? { engineVersion: this.props.engineVersion } : {}),
      ...(this.props.sourceRunIds ? { sourceRunIds: this.props.sourceRunIds } : {}),
      ...(this.props.acquisitionTimes ? { acquisitionTimes: this.props.acquisitionTimes.map((value) => value.toISOString()) } : {}),
      ...(this.props.alertSnapshotIds ? { alertSnapshotIds: this.props.alertSnapshotIds } : {}),
      degradationReasons: this.props.degradationReasons,
      evidenceRefs: this.props.evidenceRefs,
      drivers: this.props.drivers,
    }
  }
}

export interface AlertSnapshotFoundation {
  alertId: string
  fieldId: string
  basedOnSnapshotId: string
  type: 'flood' | 'water_stress' | 'thermal_stress'
  priority: 1 | 2 | 3
  confidence: number
  freshness: SnapshotFreshness
  degradationReasons: DegradationReason[]
  runId?: string
  sourceRunIds?: string[]
  acquisitionTimes?: Date[]
  engineId?: string
  engineVersion?: string
}

export function toAlertSnapshotContract(snapshot: AlertSnapshotFoundation): AlertSnapshotContract {
  return {
    contractVersion: '1.0.0',
    alertId: snapshot.alertId,
    fieldId: snapshot.fieldId,
    basedOnSnapshotId: snapshot.basedOnSnapshotId,
    type: snapshot.type,
    priority: snapshot.priority,
    confidence: snapshot.confidence,
    freshness: snapshot.freshness,
    degradationReasons: snapshot.degradationReasons,
    ...(snapshot.runId ? { runId: snapshot.runId } : {}),
    ...(snapshot.sourceRunIds ? { sourceRunIds: snapshot.sourceRunIds } : {}),
    ...(snapshot.acquisitionTimes ? { acquisitionTimes: snapshot.acquisitionTimes.map((value) => value.toISOString()) } : {}),
    ...(snapshot.engineId ? { engineId: snapshot.engineId } : {}),
    ...(snapshot.engineVersion ? { engineVersion: snapshot.engineVersion } : {}),
  }
}

export function estimateFreshnessHours(observedAt: Date, reference = new Date()): number {
  return Math.max(0, Number(((reference.getTime() - observedAt.getTime()) / 3_600_000).toFixed(2)))
}

export function deriveSnapshotFreshness(
  input: Pick<RiskSnapshotFoundationProps, 'validUntil' | 'degradationReasons'>,
  reference = new Date(),
): SnapshotFreshness {
  if (input.validUntil.getTime() <= reference.getTime()) return 'stale'
  return input.degradationReasons.length > 0 ? 'degraded' : 'fresh'
}

export function clampConfidence(value: number, floor = 0, precision = 3): number {
  const bounded = Math.max(floor, Math.min(1, value))
  return Number(bounded.toFixed(precision))
}

export function assertCoordinateRange(point: GeoPoint): void {
  if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
    throw new Error('coordinates out of range')
  }
}

const supportedCrops = new Set(['rice', 'maize', 'soybean', 'wheat', 'sunflower', 'pasture', 'citrus', 'other'])
const supportedCropCategories = new Set(['cereal', 'oilseed', 'horticulture', 'forage', 'fruit', 'other'])

function isSupportedCrop(crop: string, cropCategory = 'other'): boolean {
  return supportedCrops.has(crop) && supportedCropCategories.has(cropCategory)
}
