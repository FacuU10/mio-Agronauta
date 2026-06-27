export type HydrologyIngestionSource = 'PNA' | 'INMET' | 'SMN_ALERTS' | 'SMN_RAINFALL' | 'INA'

type IntervalCadence = { kind: 'interval'; everyMs: number }
type DailyUtcCadence = { kind: 'daily-utc'; hour: number; minute: number }
type HydrologyIngestionCadence = IntervalCadence | DailyUtcCadence

export const hydrologyIngestionCadences: Record<HydrologyIngestionSource, HydrologyIngestionCadence> = {
  PNA: { kind: 'interval', everyMs: 60 * 60 * 1000 },
  INMET: { kind: 'interval', everyMs: 60 * 60 * 1000 },
  SMN_ALERTS: { kind: 'interval', everyMs: 60 * 60 * 1000 },
  SMN_RAINFALL: { kind: 'interval', everyMs: 3 * 60 * 60 * 1000 },
  INA: { kind: 'daily-utc', hour: 18, minute: 30 },
}

export interface HydrologyIngestionRunResult {
  inserted: number
  unchanged: number
}

export interface HydrologyIngestionRunner {
  run(source: HydrologyIngestionSource, metadata: { attempt: number; scheduledFor: Date }): Promise<HydrologyIngestionRunResult>
}

export interface HydrologyRetryDecision {
  source: 'PNA' | 'INA'
  runAt: Date
  attempt: 1
  status: 'delayed_retry_scheduled'
  reason: 'unchanged_pna_heights' | 'unchanged_ina_forecast'
}

export interface HydrologyRetryInput {
  source: HydrologyIngestionSource
  inserted: number
  unchanged: number
  attempt: number
  now: Date
}

type TimerCallback = (() => void) & { source: HydrologyIngestionSource }

interface HydrologyIngestionSchedulerOptions {
  now?: () => Date
  setInterval?: (callback: TimerCallback, ms: number) => NodeJS.Timeout
  setTimeout?: (callback: TimerCallback, ms: number) => NodeJS.Timeout
  enqueueDelayedRetry?: (retry: Omit<HydrologyRetryDecision, 'status'>) => Promise<void> | void
  onBackgroundError?: (error: unknown, metadata: { source: HydrologyIngestionSource; attempt: number }) => void
}

const minuteMs = 60 * 1000
const hourMs = 60 * minuteMs
const dayMs = 24 * hourMs

export const shouldScheduleHydrologyRetry = (input: HydrologyRetryInput): HydrologyRetryDecision | null => {
  if (input.inserted > 0 || input.unchanged === 0 || input.attempt >= 1) return null
  if (input.source === 'PNA') {
    return {
      source: 'PNA',
      runAt: new Date(input.now.getTime() + 15 * minuteMs),
      attempt: 1,
      status: 'delayed_retry_scheduled',
      reason: 'unchanged_pna_heights',
    }
  }
  if (input.source === 'INA') {
    return {
      source: 'INA',
      runAt: new Date(input.now.getTime() + 2 * hourMs),
      attempt: 1,
      status: 'delayed_retry_scheduled',
      reason: 'unchanged_ina_forecast',
    }
  }
  return null
}

export class HydrologyIngestionScheduler {
  private readonly intervals: NodeJS.Timeout[] = []
  private readonly timeouts = new Set<NodeJS.Timeout>()
  private active = false

  constructor(private readonly runner: HydrologyIngestionRunner, private readonly options: HydrologyIngestionSchedulerOptions = {}) {}

  start(): void {
    this.stop()
    this.active = true
    for (const source of Object.keys(hydrologyIngestionCadences) as HydrologyIngestionSource[]) {
      const cadence = hydrologyIngestionCadences[source]
      if (cadence.kind === 'interval') {
        this.intervals.push(this.setInterval(this.toCallback(source), cadence.everyMs))
      } else {
        this.scheduleDaily(source, cadence, this.msUntilNextUtcTime(cadence.hour, cadence.minute))
      }
    }
  }

  stop(): void {
    this.active = false
    for (const interval of this.intervals) clearInterval(interval)
    for (const timeout of this.timeouts) clearTimeout(timeout)
    this.intervals.length = 0
    this.timeouts.clear()
  }

  async runSource(source: HydrologyIngestionSource, metadata: { attempt?: number; scheduledFor?: Date } = {}): Promise<HydrologyIngestionRunResult & { retry: HydrologyRetryDecision | null }> {
    const attempt = metadata.attempt ?? 0
    const scheduledFor = metadata.scheduledFor ?? this.now()
    const result = await this.runner.run(source, { attempt, scheduledFor })
    const retry = shouldScheduleHydrologyRetry({ source, inserted: result.inserted, unchanged: result.unchanged, attempt, now: this.now() })
    if (retry) await this.options.enqueueDelayedRetry?.({ source: retry.source, runAt: retry.runAt, attempt: retry.attempt, reason: retry.reason })
    return { ...result, retry }
  }

  msUntilNextUtcTime(hour: number, minute: number): number {
    const now = this.now()
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0))
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
    return next.getTime() - now.getTime()
  }

  private scheduleDaily(source: HydrologyIngestionSource, cadence: DailyUtcCadence, delayMs: number): void {
    if (!this.active) return
    let timeout: NodeJS.Timeout
    const callback = Object.assign((() => {
      void (async () => {
        try {
          await this.runSource(source)
        } catch (error) {
          this.reportBackgroundError(error, source, 0)
        } finally {
          this.timeouts.delete(timeout)
          if (this.active) this.scheduleDaily(source, cadence, dayMs)
        }
      })()
    }) as () => void, { source })
    timeout = this.setTimeout(callback, delayMs)
    this.timeouts.add(timeout)
  }

  private toCallback(source: HydrologyIngestionSource): TimerCallback {
    return Object.assign((() => {
      void this.runSource(source).catch((error) => this.reportBackgroundError(error, source, 0))
    }) as () => void, { source })
  }

  private reportBackgroundError(error: unknown, source: HydrologyIngestionSource, attempt: number): void {
    this.options.onBackgroundError?.(error, { source, attempt })
  }

  private setInterval(callback: TimerCallback, ms: number): NodeJS.Timeout {
    return (this.options.setInterval ?? setInterval)(callback, ms)
  }

  private setTimeout(callback: TimerCallback, ms: number): NodeJS.Timeout {
    return (this.options.setTimeout ?? setTimeout)(callback, ms)
  }

  private now(): Date {
    return this.options.now?.() ?? new Date()
  }
}
