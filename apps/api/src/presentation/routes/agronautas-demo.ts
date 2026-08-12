import { alertSnapshotSchema, copilotContextSchema, dashboardSnapshotSchema, fieldIntakeSchema, riskSnapshotSchema, type FieldIntake } from '@repo/zod-schemas'

const AGRONAUTAS_CONTRACT_VERSION = '1.0.0'

export function createDemoField(input: FieldIntake) {
  const boundedLat = clamp(input.location.lat, -32, -27)
  const boundedLng = clamp(input.location.lng, -60.5, -56)

  return {
    fieldId: `demo-${input.fieldId}`,
    externalFieldId: input.fieldId,
    crop: input.crop,
    hectares: input.hectares,
    locality: input.locality,
    provinceCode: input.provinceCode,
    centroid: { lat: boundedLat, lng: boundedLng },
  }
}

export function createDemoFieldOverview(fieldId: string) {
  return {
    ...createDemoField({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    fieldId: fieldId.replace(/^demo-/, ''),
    cropCategory: 'cereal',
    crop: 'rice',
    hectares: 42.5,
    locality: 'Mercedes',
    provinceCode: 'AR-W',
    countryCode: 'AR',
    location: { lat: -29.1846, lng: -58.0759 },
    }),
    fieldId,
  }
}

export function createDemoFieldCreated(input: FieldIntake) {
  return {
    fieldId: `demo-${input.fieldId}`,
    crop: input.crop,
    coverage: {
      locality: input.locality,
      provinceCode: input.provinceCode,
      boundaryVersion: 'demo-v1',
      status: 'supported' as const,
    },
  }
}

export function createDemoRiskSnapshot(fieldId: string) {
  return riskSnapshotSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    snapshotId: `${fieldId}-risk-001`,
    fieldId,
    score: 74,
    level: 'high',
    confidence: 0.63,
    computedAt: '2026-06-03T00:00:00.000Z',
    validUntil: '2026-06-03T01:00:00.000Z',
    ruleVersion: 'risk-v0',
    degradationReasons: ['satellite_data_stale'],
    evidenceRefs: ['demo:weather:open-meteo:2026-06-03T00:00:00Z', 'demo:satellite:sentinel:2026-06-02T12:00:00Z'],
    drivers: [
      { key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.42, value: 0.82 },
      { key: 'heat_pressure', label: 'Presión térmica', weight: 0.28, value: 0.77 },
      { key: 'satellite_stress', label: 'Estrés satelital', weight: 0.3, value: 0.69 },
    ],
  })
}

export function createDemoAlerts(fieldId: string) {
  const snapshot = createDemoRiskSnapshot(fieldId)
  return [
    alertSnapshotSchema.parse({
      contractVersion: AGRONAUTAS_CONTRACT_VERSION,
      alertId: `${fieldId}-alert-flood`,
      fieldId,
      basedOnSnapshotId: snapshot.snapshotId,
      type: 'flood',
      priority: 1,
      confidence: 0.71,
      freshness: 'stale',
      degradationReasons: ['satellite_data_stale'],
    }),
  ]
}

export function createDemoCopilotContext(fieldId: string) {
  const snapshot = createDemoRiskSnapshot(fieldId)
  const alerts = createDemoAlerts(fieldId)

  return copilotContextSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    fieldId,
    crop: 'rice',
    growthStage: 'tillering',
    latestSnapshotId: snapshot.snapshotId,
    alertIds: alerts.map((alert) => alert.alertId),
    degradationReasons: snapshot.degradationReasons,
    snapshot: {
      snapshotId: snapshot.snapshotId,
      score: snapshot.score,
      level: snapshot.level,
      confidence: snapshot.confidence,
      freshness: 'stale',
      computedAt: snapshot.computedAt,
      validUntil: snapshot.validUntil,
      ruleVersion: snapshot.ruleVersion,
      degradationReasons: snapshot.degradationReasons,
      evidenceRefs: snapshot.evidenceRefs,
    },
    alerts: alerts.map((alert) => ({
      alertId: alert.alertId,
      basedOnSnapshotId: alert.basedOnSnapshotId,
      type: alert.type,
      priority: alert.priority,
      confidence: alert.confidence,
      freshness: alert.freshness,
      degradationReasons: alert.degradationReasons,
    })),
  })
}

export function createDemoDashboardSnapshot(fieldId: string) {
  const field = createDemoFieldOverview(fieldId)
  const snapshot = createDemoRiskSnapshot(fieldId)
  const alerts = createDemoAlerts(fieldId)
  const observedAt = '2026-06-03T00:00:00.000Z'

  return dashboardSnapshotSchema.parse({
    contractVersion: AGRONAUTAS_CONTRACT_VERSION,
    snapshotId: snapshot.snapshotId,
    field: { fieldId, cropCategory: 'cereal', crop: field.crop, provinceCode: field.provinceCode, locality: field.locality },
    status: 'degraded',
    freshness: 'degraded',
    signals: [{ signalType: 'weather', status: 'degraded', evidenceRefs: snapshot.evidenceRefs, confidence: 0.64, degradationReasons: ['weather_data_stale'] }],
    risk: { score: snapshot.score, level: snapshot.level, confidence: snapshot.confidence, drivers: snapshot.drivers },
    alerts,
    provenance: [{
      evidenceId: 'open-meteo:weather:2026-06-03T00:00:00.000Z',
      provider: 'open-meteo',
      signalType: 'weather',
      observedAt,
      ingestedAt: snapshot.computedAt,
      sourceUrl: 'https://api.open-meteo.com/',
      rawHash: 'demo-open-meteo',
      confidence: 0.64,
      freshness: 'degraded',
      providerMode: 'mock',
      lastSuccessfulObservedAt: observedAt,
      nextDueAt: snapshot.validUntil,
      failureReason: 'demo_mode',
      degradationReasons: ['weather_data_stale'],
    }],
    scheduler: { lastRunAt: snapshot.computedAt, nextRunAt: snapshot.validUntil, lockStatus: 'available', failures: [], nextDueBySource: [] },
    generatedAt: '2026-06-03T00:05:00.000Z',
    lastDataFetchedAt: observedAt,
    presentation: {
      disclaimer: 'Los indicadores son soporte operativo y no reemplazan criterio agronómico local.',
      confidenceLabel: 'media',
      sourcesUnavailable: true,
      staleFlags: ['satellite_data_stale', 'weather_data_stale'],
    },
  })
}

export function isSupportedDemoFieldIntake(input: unknown) {
  const parsed = fieldIntakeSchema.safeParse(input)
  if (!parsed.success) {
    return parsed
  }

  const { lat, lng } = parsed.data.location
  const insideCorrientesBounds = lat >= -32 && lat <= -27 && lng >= -60.5 && lng <= -56

  if (!insideCorrientesBounds) {
    return {
      success: false as const,
    reason: 'outside_supported_corrientes_area',
    }
  }

  return parsed
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
