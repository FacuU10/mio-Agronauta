import type { Pool } from 'pg'
import { getPostgresPool } from './pool'

export interface AgronautasWorkerReadiness {
  workerHealthy: boolean
  latestHeartbeatAt: string | null
  latestLeaseExpiresAt: string | null
  latestJobId: string | null
  latestRunId: string | null
}

export class PostgresAgronautasRuntimeReadinessRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async getWorkerReadiness(maxHeartbeatAgeSeconds: number, now: Date = new Date()): Promise<AgronautasWorkerReadiness> {
    const result = await this.pool.query(
      `SELECT job_id, run_id, heartbeat_at, lease_expires_at
         FROM agronautas_job_runs
        WHERE heartbeat_at IS NOT NULL
        ORDER BY heartbeat_at DESC
        LIMIT 1`,
    )

    const latest = result.rows[0]
    if (!latest) {
      return {
        workerHealthy: false,
        latestHeartbeatAt: null,
        latestLeaseExpiresAt: null,
        latestJobId: null,
        latestRunId: null,
      }
    }

    const heartbeatAt = latest['heartbeat_at'] instanceof Date ? latest['heartbeat_at'] : new Date(String(latest['heartbeat_at']))
    const leaseExpiresAt = latest['lease_expires_at'] == null
      ? null
      : latest['lease_expires_at'] instanceof Date
        ? latest['lease_expires_at']
        : new Date(String(latest['lease_expires_at']))
    const maxAgeMs = maxHeartbeatAgeSeconds * 1000
    const workerHealthy = Number.isFinite(heartbeatAt.getTime())
      && now.getTime() - heartbeatAt.getTime() <= maxAgeMs
      && (leaseExpiresAt == null || leaseExpiresAt.getTime() >= now.getTime())

    return {
      workerHealthy,
      latestHeartbeatAt: heartbeatAt.toISOString(),
      latestLeaseExpiresAt: leaseExpiresAt?.toISOString() ?? null,
      latestJobId: latest['job_id'] == null ? null : String(latest['job_id']),
      latestRunId: latest['run_id'] == null ? null : String(latest['run_id']),
    }
  }
}
