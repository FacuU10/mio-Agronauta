import type { Pool } from 'pg'
import { getPostgresPool } from './pool'

export interface AgronautasWorkerReadiness {
  workerHealthy: boolean
  durableCapability?: 'available' | 'unavailable' | 'not_configured'
  latestHeartbeatAt: string | null
  latestLeaseExpiresAt: string | null
  latestJobId: string | null
  latestRunId: string | null
}

export class PostgresAgronautasRuntimeReadinessRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async getWorkerReadiness(maxHeartbeatAgeSeconds: number, now: Date = new Date()): Promise<AgronautasWorkerReadiness> {
    const result = await this.pool.query(
      `SELECT "jobId", "runId", "heartbeatAt", lease_expires_at
         FROM agronautas_job_runs
        WHERE status IN ('leased', 'running')
          AND "heartbeatAt" IS NOT NULL
          AND (lease_expires_at IS NULL OR lease_expires_at >= NOW())
        ORDER BY "heartbeatAt" DESC
        LIMIT 1`,
    )

    const latest = result.rows[0]
    if (!latest) {
      return {
        workerHealthy: false,
        durableCapability: 'unavailable',
        latestHeartbeatAt: null,
        latestLeaseExpiresAt: null,
        latestJobId: null,
        latestRunId: null,
      }
    }

    const heartbeatAt = latest['heartbeatAt'] instanceof Date ? latest['heartbeatAt'] : new Date(String(latest['heartbeatAt']))
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
      durableCapability: workerHealthy ? 'available' : 'unavailable',
      latestHeartbeatAt: heartbeatAt.toISOString(),
      latestLeaseExpiresAt: leaseExpiresAt?.toISOString() ?? null,
      latestJobId: latest['jobId'] == null ? null : String(latest['jobId']),
      latestRunId: latest['runId'] == null ? null : String(latest['runId']),
    }
  }
}
