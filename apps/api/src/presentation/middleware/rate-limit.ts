import type { Request } from 'express'
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { getRedisClient } from '../../infrastructure/database/redis/client'

type SkipPredicate = (req: Request) => boolean

function shouldUseMemoryStore(): boolean {
  return process.env['RATE_LIMIT_STORE'] === 'memory'
}

function createRedisStore(prefix = 'rl:') {
  if (shouldUseMemoryStore()) return undefined

  return new RedisStore({
    sendCommand: (command: string, ...args: string[]) => getRedisClient().call(command, ...args) as Promise<any>,
    prefix,
  })
}

function createBaseRateLimit(options: {
  windowMs: number
  max: number
  message: { error: string }
  skip?: SkipPredicate
  prefix?: string
}) {
  const store = createRedisStore(options.prefix)
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
    skip: (req: Request) => req.path === '/health' || req.path === '/ready' || isSessionMutation(req),
  })
}

function isSessionMutation(req: Request): boolean {
  return ['/agronautas/auth/login', '/agronautas/auth/refresh', '/agronautas/auth/logout'].includes(req.path)
}

export function createAuthRateLimitMiddleware() {
  return createBaseRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    prefix: 'rl:auth:',
    message: { error: 'Too many authentication requests. Please try again later.' },
    skip: (req) => !isSessionMutation(req),
  })
}

export function createChatRateLimitMiddleware() {
  return createBaseRateLimit({
    prefix: 'rl:chat:',
    windowMs: 60 * 1000,
    max: 10,
    message: {
      error: 'Too many chat requests from this IP, please retry in one minute.',
    },
  })
}
