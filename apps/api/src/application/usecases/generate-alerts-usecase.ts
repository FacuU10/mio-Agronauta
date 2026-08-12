import { RiskSnapshotFoundation, toAlertSnapshotContract, type AlertSnapshotFoundation } from '../../domain/entities/agronautas'
import type { AlertSnapshotRecord, AlertSnapshotRepository, RiskSnapshotRepository } from '../../domain/repositories/agronautas'

export interface GenerateAlertsInput {
  fieldId: string
  triggeredBy: 'api' | 'scheduler'
}

export interface GenerateAlertsResult {
  status: 'generated' | 'stale-snapshot' | 'degraded-snapshot' | 'missing-snapshot'
  alerts: AlertSnapshotFoundation[]
  snapshot: RiskSnapshotFoundation | null
  lineage: GenerateAlertsLineage | null
}

export interface GenerateAlertsLineage {
  riskSnapshotId: string
  sourceRunIds: string[]
  acquisitionTimes: string[]
  engineId: string
  engineVersion: string
  alertSnapshotIds: string[]
}

interface GenerateAlertsOptions {
  now?: () => Date
}

export class GenerateAlertsUseCase {
  constructor(
    private readonly riskSnapshotRepository: RiskSnapshotRepository,
    private readonly alertSnapshotRepository: AlertSnapshotRepository,
    private readonly options: GenerateAlertsOptions = {},
  ) {}

  async execute(input: GenerateAlertsInput): Promise<GenerateAlertsResult> {
    const snapshot = await this.riskSnapshotRepository.getLatest(input.fieldId)
    if (!snapshot) return { status: 'missing-snapshot', alerts: [], snapshot: null, lineage: null }

    const reference = this.now()
    if (snapshot.isExpired(reference)) {
      return { status: 'stale-snapshot', alerts: [], snapshot, lineage: buildLineage(snapshot, []) }
    }

    if (snapshot.props.degradationReasons.length > 0) {
      return { status: 'degraded-snapshot', alerts: [], snapshot, lineage: buildLineage(snapshot, []) }
    }

    const alerts = deriveAlerts(snapshot, reference)
    await this.alertSnapshotRepository.saveMany(
      alerts.map((alert) => ({
        alertId: alert.alertId,
        fieldId: alert.fieldId,
        basedOnSnapshotId: alert.basedOnSnapshotId,
        runId: snapshot.props.runId,
        type: alert.type,
        priority: alert.priority,
        confidence: alert.confidence,
        freshness: alert.freshness,
        degradationReasons: [...alert.degradationReasons],
        staleCause: snapshot.props.staleCause,
        sourceRunIds: alert.sourceRunIds,
        acquisitionTimes: alert.acquisitionTimes,
        engineId: alert.engineId,
        engineVersion: alert.engineVersion,
      })),
    )

    const snapshotWithAlerts = alerts.length > 0
      ? new RiskSnapshotFoundation({ ...snapshot.props, alertSnapshotIds: alerts.map((alert) => alert.alertId) })
      : snapshot
    if (alerts.length > 0) await this.riskSnapshotRepository.save(snapshotWithAlerts)

    return { status: 'generated', alerts, snapshot: snapshotWithAlerts, lineage: buildLineage(snapshotWithAlerts, alerts) }
  }

  private now(): Date {
    return this.options.now?.() ?? new Date()
  }
}

function deriveAlerts(snapshot: RiskSnapshotFoundation, reference: Date): AlertSnapshotFoundation[] {
  const alerts: AlertSnapshotFoundation[] = []
  const driverMap = new Map(snapshot.props.drivers.map((driver) => [driver.key, driver.value]))
  const freshness = snapshot.isExpired(reference) ? 'stale' : snapshot.props.degradationReasons.length > 0 ? 'degraded' : 'fresh'
  const degradationReasons = [...snapshot.props.degradationReasons]
  const baseConfidence = snapshot.props.confidence

  const heat = driverMap.get('heat_pressure') ?? 0
  const rainfall = driverMap.get('rainfall_load') ?? 0
  const satelliteStress = driverMap.get('satellite_stress') ?? 0

  if (snapshot.props.score >= 70 || rainfall >= 0.7) {
      alerts.push({
        alertId: buildDeterministicAlertId(snapshot, 'flood'),
        fieldId: snapshot.props.fieldId,
      basedOnSnapshotId: snapshot.props.snapshotId,
      type: 'flood',
      priority: snapshot.props.score >= 80 ? 1 : 2,
      confidence: Number(Math.min(1, Math.max(0.3, baseConfidence)).toFixed(3)),
      freshness,
      degradationReasons,
      ...buildAlertMetadata(snapshot),
      runId: snapshot.props.runId,
      sourceRunIds: snapshot.props.sourceRunIds,
      acquisitionTimes: snapshot.props.acquisitionTimes,
      engineId: snapshot.props.engineId ?? snapshot.props.ruleVersion,
      engineVersion: snapshot.props.engineVersion ?? snapshot.props.ruleVersion,
    })
  }

  if (satelliteStress >= 0.65) {
      alerts.push({
        alertId: buildDeterministicAlertId(snapshot, 'water_stress'),
        fieldId: snapshot.props.fieldId,
      basedOnSnapshotId: snapshot.props.snapshotId,
      type: 'water_stress',
      priority: satelliteStress >= 0.8 ? 1 : 2,
      confidence: Number(Math.max(0.25, (baseConfidence - 0.04)).toFixed(3)),
      freshness,
      degradationReasons,
      ...buildAlertMetadata(snapshot),
    })
  }

  if (heat >= 0.75) {
      alerts.push({
        alertId: buildDeterministicAlertId(snapshot, 'thermal_stress'),
        fieldId: snapshot.props.fieldId,
      basedOnSnapshotId: snapshot.props.snapshotId,
      type: 'thermal_stress',
      priority: heat >= 0.9 ? 1 : 2,
      confidence: Number(Math.max(0.25, (baseConfidence - 0.02)).toFixed(3)),
      freshness,
      degradationReasons,
      ...buildAlertMetadata(snapshot),
    })
  }

  return alerts.sort((left, right) => left.priority - right.priority || right.confidence - left.confidence)
}

function buildDeterministicAlertId(
  snapshot: RiskSnapshotFoundation,
  type: AlertSnapshotFoundation['type'],
): string {
  return `${snapshot.props.fieldId}:${snapshot.props.snapshotId}:${type}`
}

export function toAlertContracts(alerts: AlertSnapshotFoundation[]) {
  return alerts.map((alert) => toAlertSnapshotContract(alert))
}

export function toStaleAlertContracts(alerts: AlertSnapshotRecord[]) {
  return alerts.map((alert) =>
    toAlertSnapshotContract({
      alertId: alert.alertId,
      fieldId: alert.fieldId,
      basedOnSnapshotId: alert.basedOnSnapshotId,
      type: alert.type,
      priority: alert.priority,
      confidence: alert.confidence,
      freshness: 'stale',
      degradationReasons: alert.degradationReasons as AlertSnapshotFoundation['degradationReasons'],
      runId: alert.runId,
      sourceRunIds: alert.sourceRunIds,
      acquisitionTimes: alert.acquisitionTimes,
      engineId: alert.engineId,
      engineVersion: alert.engineVersion,
    }),
  )
}

export function toStoredAlertContracts(alerts: AlertSnapshotRecord[]) {
  return alerts.map((alert) =>
    toAlertSnapshotContract({
      alertId: alert.alertId,
      fieldId: alert.fieldId,
      basedOnSnapshotId: alert.basedOnSnapshotId,
      type: alert.type,
      priority: alert.priority,
      confidence: alert.confidence,
      freshness: alert.freshness,
      degradationReasons: alert.degradationReasons as AlertSnapshotFoundation['degradationReasons'],
      runId: alert.runId,
      sourceRunIds: alert.sourceRunIds,
      acquisitionTimes: alert.acquisitionTimes,
      engineId: alert.engineId,
      engineVersion: alert.engineVersion,
    }),
  )
}

function buildLineage(snapshot: RiskSnapshotFoundation, alerts: AlertSnapshotFoundation[]): GenerateAlertsLineage {
  return {
    riskSnapshotId: snapshot.props.snapshotId,
    sourceRunIds: snapshot.props.sourceRunIds ?? [snapshot.props.runId],
    acquisitionTimes: (snapshot.props.acquisitionTimes ?? []).map((value) => value.toISOString()),
    engineId: snapshot.props.engineId ?? snapshot.props.ruleVersion,
    engineVersion: snapshot.props.engineVersion ?? snapshot.props.ruleVersion,
    alertSnapshotIds: alerts.map((alert) => alert.alertId),
  }
}

function buildAlertMetadata(snapshot: RiskSnapshotFoundation) {
  return {
    runId: snapshot.props.runId,
    sourceRunIds: snapshot.props.sourceRunIds,
    acquisitionTimes: snapshot.props.acquisitionTimes,
    engineId: snapshot.props.engineId ?? snapshot.props.ruleVersion,
    engineVersion: snapshot.props.engineVersion ?? snapshot.props.ruleVersion,
  }
}
