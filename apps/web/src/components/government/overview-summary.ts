export interface OverviewTelemetry {
  source: string
  metric: string
  value: number | null
  unit: string
  observedAt: string
  lastSuccessfulObservedAt: string
  sourceUrl?: string
  freshness?: 'fresh' | 'stale' | 'degraded'
  forecastHorizonDays?: number | null
}

export interface MunicipalityTelemetrySummary {
  pnaHeightM: number | null
  inaHeightM: number | null
  inaObservedAt: string | null
  inaSourceUrl: string | null
  lastSuccessfulObservedAt: string | null
  coverageGaps: string[]
}

export function municipalityTelemetrySummary(telemetry: OverviewTelemetry[]): MunicipalityTelemetrySummary {
  const pna = latestMetric(telemetry, 'river_height_m', 'PNA')
  const ina = latestMetric(telemetry, 'river_height_m', 'INA')
  return {
    pnaHeightM: pna?.value ?? null,
    inaHeightM: ina?.value ?? null,
    inaObservedAt: ina?.lastSuccessfulObservedAt ?? null,
    inaSourceUrl: ina?.sourceUrl ?? null,
    lastSuccessfulObservedAt: telemetry.map((item) => item.lastSuccessfulObservedAt).filter(Boolean).sort().at(-1) ?? null,
    coverageGaps: telemetry.length === 0 ? ['Telemetría local no disponible'] : telemetry.filter((item) => item.value == null || item.freshness === 'degraded' || item.freshness === 'stale').map((item) => `${item.source}: ${item.metric}`).slice(0, 4),
  }
}

function latestMetric(telemetry: OverviewTelemetry[], metric: string, source: string) {
  return telemetry
    .filter((item) => item.metric === metric && item.source === source)
    .sort((a, b) => a.lastSuccessfulObservedAt.localeCompare(b.lastSuccessfulObservedAt))
    .at(-1)
}
