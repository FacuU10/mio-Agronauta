import type Redis from 'ioredis'
import type { RecomputeLockAcquireResult, RecomputeLockMetadata, RecomputeLockRepository } from '../../../domain/repositories/agronautas'
import { getRedisClient } from './client'
import { createAgronautasTelemetry } from '../../observability/agronautas-telemetry'

const telemetry = createAgronautasTelemetry()

export function buildRecomputeLockKey(fieldId: string): string {
  return `agronautas:risk-recompute:${fieldId}`
}

export class RedisRecomputeLockRepository implements RecomputeLockRepository {
  constructor(private readonly redis: Pick<Redis, 'set' | 'del' | 'get'> = getRedisClient()) {}

  async acquire(fieldId: string, ttlSeconds: number, metadata: RecomputeLockMetadata): Promise<RecomputeLockAcquireResult> {
    const key = buildRecomputeLockKey(fieldId)
    const payload = JSON.stringify({ fieldId, ...metadata })
    const result = await this.redis.set(key, payload, 'EX', ttlSeconds, 'NX')
    const acquired = result === 'OK'

    telemetry.onLockAcquired({ fieldId, ttlSeconds, acquired })
    if (acquired) {
      return { acquired: true, metadata }
    }

    const existing = await this.redis.get(key)
    if (!existing) {
      return { acquired: false, metadata }
    }

    return { acquired: false, metadata: JSON.parse(existing) as RecomputeLockMetadata }
  }

  async release(fieldId: string): Promise<void> {
    await this.redis.del(buildRecomputeLockKey(fieldId))
  }
}
