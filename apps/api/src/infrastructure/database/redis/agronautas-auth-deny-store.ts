import type Redis from 'ioredis'
import { getRedisClient } from './client'
import type { AgronautasAuthDenyMarkerPort } from '../../../domain/auth/ports'

const KEY_PREFIX = 'agronautas:auth:deny:'

export class RedisAgronautasAuthDenyStore implements AgronautasAuthDenyMarkerPort {
  constructor(private readonly redis: Pick<Redis, 'get' | 'set'> = getRedisClient()) {}

  async isDenied(key: string): Promise<boolean> {
    return (await this.redis.get(`${KEY_PREFIX}${key}`)) === '1'
  }

  async deny(key: string, ttlSeconds: number): Promise<void> {
    const ttl = Math.max(1, Math.ceil(ttlSeconds))
    await this.redis.set(`${KEY_PREFIX}${key}`, '1', 'EX', ttl)
  }
}
