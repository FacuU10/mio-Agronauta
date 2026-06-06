import type { Request } from 'express'
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { getRedisClient } from '../../infrastructure/database/redis/client'

type SkipPredicate = (req: Request) => boolean

function shouldUseMemoryStore(): boolean {
  return process.env['RATE_LIMIT_STORE'] === 'memory'
}

function createRedisStore() {
  if (shouldUseMemoryStore()) return undefined

  return new RedisStore({
    sendCommand: (command: string, ...args: string[]) => getRedisClient().call(command, ...args) as Promise<any>,
    prefix: 'rl:',
  })
}

function createBaseRateLimit(options: {
  windowMs: number
  max: number
  message: { error: string }
  skip?: SkipPredicate
}) {
  const store = createRedisStore()
  return rateLimit({
    ...(store ? { store } : {}),
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
    ...(options.skip ? { skip: options.skip } : {}),
  })
}

export function createRateLimitMiddleware() {
  return createBaseRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
    skip: (req: Request) => req.path === '/health' || req.path === '/ready',
  })
}

export function createChatRateLimitMiddleware() {
  return createBaseRateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
      error: 'Too many chat requests from this IP, please retry in one minute.',
    },
  })
}
