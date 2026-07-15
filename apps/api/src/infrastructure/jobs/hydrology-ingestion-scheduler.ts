export type HydrologyIngestionSource = 'PNA' | 'INMET' | 'SMN' | 'INA'

type IntervalCadence = { kind: 'interval'; everyMs: number }
type DailyUtcCadence = { kind: 'daily-utc'; hour: number; minute: number }
type HydrologyIngestionCadence = IntervalCadence | DailyUtcCadence

export const hydrologyIngestionCadences: Record<HydrologyIngestionSource, HydrologyIngestionCadence> = {
  PNA: { kind: 'interval', everyMs: 60 * 60 * 1000 },
  INMET: { kind: 'interval', everyMs: 60 * 60 * 1000 },
  SMN: { kind: 'interval', everyMs: 60 * 60 * 1000 },
  INA: { kind: 'daily-utc', hour: 18, minute: 30 },
}

export interface HydrologyIngestionRunResult {
  inserted: number
  unchanged: number
}

export interface HydrologyIngestionRunner {
  run(source: HydrologyIngestionSource, metadata: { attempt: number; scheduledFor: Date; proofRunId?: string }): Promise<HydrologyIngestionRunResult>
}

type TimerCallback = (() => void) & { source: HydrologyIngestionSource }

interface HydrologyIngestionSchedulerOptions {
  now?: () => Date
  setInterval?: (callback: TimerCallback, ms: number) => NodeJS.Timeout
  setTimeout?: (callback: TimerCallback, ms: number) => NodeJS.Timeout
  onBackgroundError?: (error: unknown, metadata: { source: HydrologyIngestionSource; attempt: number }) => void
  onRunResult?: (metadata: { source: HydrologyIngestionSource; attempt: number; scheduledFor: Date; result: HydrologyIngestionRunResult & { retry: null; skipped: boolean } }) => void
}

const dayMs = 24 * 60 * 60 * 1000

export class HydrologyIngestionScheduler {
  private readonly intervals: NodeJS.Timeout[] = []
  private readonly timeouts = new Set<NodeJS.Timeout>()
  private readonly runningSources = new Set<HydrologyIngestionSource>()
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

  async runSource(source: HydrologyIngestionSource, metadata: { attempt?: number; scheduledFor?: Date; proofRunId?: string } = {}): Promise<HydrologyIngestionRunResult & { retry: null; skipped: boolean }> {
    if (this.runningSources.has(source)) {
      const result = { inserted: 0, unchanged: 0, retry: null, skipped: true }
      this.options.onRunResult?.({ source, attempt: metadata.attempt ?? 0, scheduledFor: metadata.scheduledFor ?? this.now(), result })
      return result
    }
    const attempt = metadata.attempt ?? 0
    const scheduledFor = metadata.scheduledFor ?? this.now()
    this.runningSources.add(source)
    try {
      const result = await this.runner.run(source, { attempt, scheduledFor, proofRunId: metadata.proofRunId })
      const observedResult = { ...result, retry: null, skipped: false }
      this.options.onRunResult?.({ source, attempt, scheduledFor, result: observedResult })
      return observedResult
    } finally {
      this.runningSources.delete(source)
    }
  }

  msUntilNextUtcTime(hour: number, minute: number): number {
    const now = this.now()
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0))
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
    return next.getTime() - now.getTime()
  }

  private scheduleDaily(source: HydrologyIngestionSource, cadence: DailyUtcCadence, delayMs: number): void {
    if (!this.active) return
    // eslint-disable-next-line prefer-const -- assigned after callback creation so the callback can delete its own timeout handle.
    let timeout: NodeJS.Timeout
    const callback = Object.assign((() => {
      void (async () => {
        try {
          await this.runSource(source)
        } catch (error) {
          this.reportBackgroundError(error, source, 0)
        } finally {
          this.timeouts.delete(timeout)
          clearTimeout(timeout)
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
