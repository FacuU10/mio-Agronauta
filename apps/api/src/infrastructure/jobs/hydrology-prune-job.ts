import { HydrologyRepository } from '@repo/hydrology-engine'

interface PruneJobOptions {
  now?: () => Date
  setTimeout?: typeof setTimeout
  setInterval?: typeof setInterval
}

const dayMs = 24 * 60 * 60 * 1000

export class HydrologyPruneJob {
  private interval: NodeJS.Timeout | null = null
  private timeout: NodeJS.Timeout | null = null

  constructor(private readonly repository: HydrologyRepository, private readonly options: PruneJobOptions = {}) {}

  start(): void {
    this.stop()
    const setTimeoutFn = this.options.setTimeout ?? setTimeout
    const setIntervalFn = this.options.setInterval ?? setInterval
    this.timeout = setTimeoutFn(() => {
      void this.run()
      this.interval = setIntervalFn(() => void this.run(), dayMs)
    }, this.msUntilNextUtcHour(3))
  }

  stop(): void {
    if (this.timeout) clearTimeout(this.timeout)
    if (this.interval) clearInterval(this.interval)
    this.timeout = null
    this.interval = null
  }

  async run(): Promise<{ telemetryDeleted: number; snapshotsDeleted: number; ledgerDeleted: number }> {
    const result = await this.repository.pruneOldData(30, this.now())
    return { ...result, ledgerDeleted: result.ledgerDeleted ?? 0 }
  }

  msUntilNextUtcHour(hour: number): number {
    const now = this.now()
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0))
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
    return next.getTime() - now.getTime()
  }

  private now(): Date {
    return this.options.now?.() ?? new Date()
  }
}
