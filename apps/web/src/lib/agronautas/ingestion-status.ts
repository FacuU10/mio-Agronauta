import type { DashboardSnapshot } from './schemas'

const MODE_LABEL = {
  live: 'Live',
  seam: 'Seam',
  mock: 'Mock',
  unavailable: 'Fallback',
} as const

const SOURCE_LABEL = {
  weather: 'Clima',
  hydric_soil: 'Suelo',
  satellite_vegetation: 'Satélite',
  alert: 'Alertas',
  fire: 'Fuego',
  hydrology: 'Hidrología',
} as const

export interface IngestionAdminRow {
  provider: string
  signalType: string
  modeLabel: string
  nextRunLabel: string
  currentState: 'Running' | 'Idle' | 'Failed' | 'Stale'
  triggerEnabled: boolean
  triggerLabel: string
  reason: string
}

export interface SourceFreshnessCard {
  sourceLabel: string
  freshnessLabel: 'fresh' | 'stale' | 'unavailable'
  lastSuccessLabel: string
  nextDueLabel: string
  slaLabel: string
}

export interface OperationalAlertIndicator {
  label: string
  stateLabel: string
  safetyLabel: string
}

export function buildIngestionAdminRows(dashboard: DashboardSnapshot): IngestionAdminRow[] {
  return dashboard.provenance.map((evidence) => {
    const due = dashboard.scheduler.nextDueBySource.find((item) => item.provider === evidence.provider && item.signalType === evidence.signalType)
    const failed = dashboard.scheduler.failures.some((failure) => failure.provider === evidence.provider && failure.signalType === evidence.signalType)
    const stale = evidence.freshness === 'stale' || due?.overdue === true
    const safeToTrigger = evidence.providerMode === 'live' && !failed && !stale && dashboard.scheduler.lockStatus === 'available'

    return {
      provider: evidence.provider,
      signalType: evidence.signalType,
      modeLabel: MODE_LABEL[evidence.providerMode],
      nextRunLabel: formatNextRun(due?.dueAt ?? evidence.nextDueAt ?? dashboard.scheduler.nextRunAt),
      currentState: dashboard.scheduler.lockStatus === 'locked' ? 'Running' : failed || evidence.freshness === 'missing' ? 'Failed' : stale ? 'Stale' : 'Idle',
      triggerEnabled: safeToTrigger,
      triggerLabel: safeToTrigger ? 'Trigger seguro disponible' : 'Trigger seguro deshabilitado',
      reason: evidence.failureReason ?? due?.cadence.rateLimit ?? 'Sin fallas reportadas',
    }
  })
}

export function buildSourceFreshnessCards(dashboard: DashboardSnapshot): SourceFreshnessCard[] {
  return dashboard.signals.map((signal) => {
    const evidence = dashboard.provenance.find((item) => item.signalType === signal.signalType)
    const due = evidence ? dashboard.scheduler.nextDueBySource.find((item) => item.provider === evidence.provider && item.signalType === signal.signalType) : undefined
    return {
      sourceLabel: SOURCE_LABEL[signal.signalType] ?? signal.signalType,
      freshnessLabel: signal.status === 'fresh' ? 'fresh' : signal.status === 'stale' || signal.status === 'degraded' ? 'stale' : 'unavailable',
      lastSuccessLabel: formatNextRun(evidence?.lastSuccessfulObservedAt ?? null),
      nextDueLabel: formatNextRun(due?.dueAt ?? evidence?.nextDueAt ?? null),
      slaLabel: due?.cadence.freshnessSla ? `SLA ${due.cadence.freshnessSla}` : 'SLA no verificado',
    }
  })
}

export function deriveSafeOperationalAlerts(dashboard: DashboardSnapshot): OperationalAlertIndicator[] {
  const hasFlood = dashboard.risk.drivers.some((driver) => driver.key.includes('rainfall') && driver.value >= 0.75) || dashboard.alerts.length > 0
  const hasHeat = dashboard.risk.drivers.some((driver) => driver.key.includes('heat') && driver.value >= 0.7)
  const canTrustProduction = dashboard.freshness === 'fresh' && dashboard.presentation.sourcesUnavailable === false

  return [
    { label: 'Anegamiento', stateLabel: hasFlood ? 'riesgo detectado' : 'sin señal crítica', safetyLabel: canTrustProduction ? 'producción segura' : 'alerta no producción · revisar evidencia' },
    { label: 'Estrés térmico', stateLabel: hasHeat ? 'riesgo detectado' : 'sin señal crítica', safetyLabel: canTrustProduction ? 'producción segura' : 'alerta no producción · revisar evidencia' },
    { label: 'Heladas', stateLabel: 'monitoreo sin señal crítica', safetyLabel: canTrustProduction ? 'producción segura' : 'alerta no producción · revisar evidencia' },
  ]
}

export function formatNextRun(value: string | null | undefined): string {
  if (!value) return 'Sin corrida programada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date)
}
