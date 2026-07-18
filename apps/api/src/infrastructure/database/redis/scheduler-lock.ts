import type Redis from 'ioredis'
import { getRedisClient } from './client'
import { getPostgresPool } from '../postgres/pool'
import { SourceWindow, ScheduledWindowLock } from '../../jobs/agronautas-scheduler'
import { createAgronautasTelemetry } from '../../observability/agronautas-telemetry'
import { logger } from '../../observability/logger'

const telemetry = createAgronautasTelemetry()

export interface SchedulerWindowLockPort extends ScheduledWindowLock {
  acquireWindow(window: SourceWindow, ttlSeconds: number): Promise<boolean>
  releaseWindow?(window: SourceWindow): Promise<void>
}

export class RedisSchedulerWindowLock implements SchedulerWindowLockPort {
  constructor(
    private redis?: Pick<Redis, 'set' | 'del' | 'get'>,
    private pool = getPostgresPool()
  ) {}

  private getRedis(): Pick<Redis, 'set' | 'del' | 'get'> {
    this.redis ??= getRedisClient()
    return this.redis
  }

  async acquireWindow(window: SourceWindow, ttlSeconds: number): Promise<boolean> {
    const key = `agronautas:scheduler:lock:${window.runId}`
    const redis = this.getRedis()

    // 1. Try to acquire Redis lock
    let redisAcquired = false
    try {
      const result = await redis.set(key, 'locked', 'EX', ttlSeconds, 'NX')
      redisAcquired = result === 'OK'
    } catch (err) {
      logger.warn({ err, runId: window.runId }, 'Redis scheduler lock acquisition failed, falling back to Postgres')
    }

    // 2. Try to acquire/trace in Postgres to enforce global single ownership and prevent concurrent runs
    let postgresAcquired = false
    try {
      const existingQuery = await this.pool.query(
        'SELECT status FROM signal_ingestion_runs WHERE run_id = $1',
        [window.runId]
      )

      if (existingQuery.rowCount && existingQuery.rowCount > 0) {
        postgresAcquired = false
      } else {
        try {
          await this.pool.query(
            `INSERT INTO signal_ingestion_runs (
              id, field_id, provider, signal_type, run_id, status, started_at, evidence_payload
            ) VALUES (gen_random_uuid()::text, NULL, $1, $2, $3, 'queued', NOW(), '{}'::jsonb)`,
            [window.provider, window.signalType, window.runId]
          )
          postgresAcquired = true
        } catch (insertErr: any) {
          if (insertErr.code === '23505') { // unique_violation
            postgresAcquired = false
          } else {
            logger.error({ err: insertErr, runId: window.runId }, 'Postgres scheduler lock insert failed')
            postgresAcquired = redisAcquired
          }
        }
      }
    } catch (dbErr) {
      logger.error({ err: dbErr, runId: window.runId }, 'Postgres scheduler lock check failed')
      postgresAcquired = redisAcquired
    }

    const acquired = redisAcquired || postgresAcquired

    telemetry.onLockAcquired({ fieldId: 'global-scheduler', ttlSeconds, acquired })
    logger.info({ runId: window.runId, redisAcquired, postgresAcquired, acquired }, 'Scheduler window lock acquisition attempt completed')

    return acquired
  }

  async releaseWindow(window: SourceWindow): Promise<void> {
    const key = `agronautas:scheduler:lock:${window.runId}`
    try {
      await this.getRedis().del(key)
    } catch (err) {
      logger.error({ err, runId: window.runId }, 'Failed to release Redis scheduler lock')
    }
  }
}
