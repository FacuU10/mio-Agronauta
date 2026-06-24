export function formatOfficialTime(value?: string | null) {
  if (!value) return 'Último dato obtenido: no disponible'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Último dato obtenido: no disponible'

  const parts = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).formatToParts(date)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `Último dato obtenido: ${byType['day']}/${byType['month']}/${byType['year']} ${byType['hour']}:${byType['minute']}`
}

export function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    fresh: 'actualizada',
    stale: 'demorada',
    degraded: 'degradada',
    missing: 'sin datos',
    success: 'correcta',
  }
  return labels[status ?? ''] ?? 'sin confirmar'
}

export function riskLabel(risk?: string | null) {
  const labels: Record<string, string> = {
    low: 'Bajo',
    moderate: 'Moderado',
    high: 'Alto',
    unknown: 'Sin clasificar',
  }
  return labels[risk ?? ''] ?? 'Sin clasificar'
}
