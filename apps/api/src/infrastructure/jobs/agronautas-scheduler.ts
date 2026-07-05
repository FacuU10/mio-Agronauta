import type { AgronautasSignalType, SourceCadenceRecord } from '../../domain/repositories/agronautas'

export interface SourceWindow {
  provider: string
  signalType: AgronautasSignalType
  windowStart: Date
  windowEnd: Date
  runId: string
}

export interface RetryBackoffDecision {
  attempt: number
  retryAt: Date
  delayMs: number
  desistUntilNextHourlyRun: boolean
}

const RETRY_BACKOFF_MS = new Map<number, number>([
  [1, 45_000],
  [2, 5 * 60_000],
  [3, 10 * 60_000],
  [4, 15 * 60_000],
])

export function calculateRetryBackoff(attempt: number, now: Date): RetryBackoffDecision {
  const delayMs = RETRY_BACKOFF_MS.get(attempt)
  if (delayMs !== undefined) {
    return { attempt, retryAt: new Date(now.getTime() + delayMs), delayMs, desistUntilNextHourlyRun: false }
  }

  const nextHourlyRun = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000 + 3_600_000)
  return { attempt, retryAt: nextHourlyRun, delayMs: nextHourlyRun.getTime() - now.getTime(), desistUntilNextHourlyRun: true }
}

export const AGRONAUTAS_SOURCE_CADENCES: SourceCadenceRecord[] = [
  { provider: 'open-meteo', signalType: 'climate', updateCadenceMinutes: 60, freshnessSlaMinutes: 120, rateLimit: 'public-api-fair-use', sourceRef: 'Open-Meteo forecast/soil hourly; ERA5 daily', researchedAt: new Date('2026-07-04T00:00:00.000Z'), enabled: true },
  { provider: 'smn-alerts', signalType: 'weather_alert', updateCadenceMinutes: 30, freshnessSlaMinutes: 120, rateLimit: 'circuit-breaker-on-503', sourceRef: 'SMN short-term warnings 15-30m; general alerts 1-2h', researchedAt: new Date('2026-07-04T00:00:00.000Z'), enabled: true },
  { provider: 'nasa-firms', signalType: 'fire', updateCadenceMinutes: 180, freshnessSlaMinutes: 360, rateLimit: 'api-key-required', sourceRef: 'NASA FIRMS NRT within ~3h; poll every 3-6h', researchedAt: new Date('2026-07-04T00:00:00.000Z'), enabled: true },
  { provider: 'sentinel-stac', signalType: 'satellite', updateCadenceMinutes: 1440, freshnessSlaMinutes: 10080, rateLimit: 'prefer-ard-stac-provider', sourceRef: 'Daily AOI check; S2 revisit ~5d, S1 6-12d', researchedAt: new Date('2026-07-04T00:00:00.000Z'), enabled: true },
  { provider: 'radar-sinarame', signalType: 'weather_alert', updateCadenceMinutes: 10, freshnessSlaMinutes: 30, rateLimit: 'feature-flag-future-no-clean-public-api', sourceRef: 'SINARAME imagery about 10m in storm season; fallback pending', researchedAt: new Date('2026-07-04T00:00:00.000Z'), enabled: false },
]

export function dueSourceWindows(cadences: SourceCadenceRecord[], lastSuccess: Map<string, Date>, now: Date): SourceWindow[] {
  return cadences.filter((cadence) => cadence.enabled).filter((cadence) => {
    const key = `${cadence.provider}:${cadence.signalType}`
    const previous = lastSuccess.get(key)
    return !previous || now.getTime() - previous.getTime() >= cadence.updateCadenceMinutes * 60_000
  }).map((cadence) => {
    const windowStart = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000)
    return {
      provider: cadence.provider,
      signalType: cadence.signalType,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 3_600_000),
      runId: `${cadence.provider}:${cadence.signalType}:${windowStart.toISOString()}`,
    }
  })
}

export interface ScheduledWindowLock {
  acquireWindow(window: SourceWindow, ttlSeconds: number): Promise<boolean>
  releaseWindow?(window: SourceWindow): Promise<void>
}

export interface ScheduledWindowDispatcher {
  enqueue(window: SourceWindow): Promise<void>
  deadLetter(window: SourceWindow, error: Error): Promise<void>
}

export class AgronautasSignalScheduler {
  constructor(private readonly lock: ScheduledWindowLock, private readonly dispatcher: ScheduledWindowDispatcher) {}

  async tick(windows: SourceWindow[]): Promise<{ enqueued: SourceWindow[]; skipped: SourceWindow[]; deadLettered: SourceWindow[] }> {
    const enqueued: SourceWindow[] = []
    const skipped: SourceWindow[] = []
    const deadLettered: SourceWindow[] = []

    for (const window of windows) {
      if (!(await this.lock.acquireWindow(window, 55 * 60))) {
        skipped.push(window)
        continue
      }
      try {
        await this.dispatcher.enqueue(window)
        enqueued.push(window)
      } catch (error) {
        await this.dispatcher.deadLetter(window, error instanceof Error ? error : new Error('enqueue_failed'))
        deadLettered.push(window)
      }
    }

    return { enqueued, skipped, deadLettered }
  }
}

export interface AgronautasSchedulerRuntimeOptions {
  enabled: boolean
  scheduler: Pick<AgronautasSignalScheduler, 'tick'>
  getLastSuccess: () => Promise<Map<string, Date>>
  getCadences?: () => Promise<SourceCadenceRecord[]>
  cadences?: SourceCadenceRecord[]
  now?: () => Date
  setInterval?: typeof setInterval
  clearInterval?: typeof clearInterval
}

export function createAgronautasSchedulerRuntime(options: AgronautasSchedulerRuntimeOptions) {
  const intervalMs = 60 * 60 * 1000
  let timer: NodeJS.Timeout | undefined
  let started = false
  const resolveCadences = async () => options.cadences ?? await options.getCadences?.() ?? AGRONAUTAS_SOURCE_CADENCES
  const runOnce = async () => options.scheduler.tick(dueSourceWindows(await resolveCadences(), await options.getLastSuccess(), options.now?.() ?? new Date()))
  const runtime = {
    intervalMs,
    get started() { return started },
    runOnce,
    start() {
      if (!options.enabled || started) return runtime
      started = true
      const schedule = options.setInterval ?? setInterval
      timer = schedule(() => { void runOnce() }, intervalMs)
      return runtime
    },
    stop() {
      if (timer) (options.clearInterval ?? clearInterval)(timer)
      timer = undefined
      started = false
    },
  }
  return options.enabled ? runtime.start() : runtime
}
