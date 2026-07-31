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
  }
}

function latestMetric(telemetry: OverviewTelemetry[], metric: string, source: string) {
  return telemetry
    .filter((item) => item.metric === metric && item.source === source)
    .sort((a, b) => a.lastSuccessfulObservedAt.localeCompare(b.lastSuccessfulObservedAt))
    .at(-1)
}
