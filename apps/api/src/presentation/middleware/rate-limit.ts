import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { getRedisClient } from '../../infrastructure/database/redis/client'

const shouldUseMemoryStore = process.env['RATE_LIMIT_STORE'] === 'memory'

const redisStore = shouldUseMemoryStore
  ? undefined
  : new RedisStore({
      sendCommand: (command: string, ...args: string[]) => getRedisClient().call(command, ...args) as Promise<any>,
      prefix: 'rl:',
    })

export const rateLimitMiddleware = rateLimit({
  ...(redisStore ? { store: redisStore } : {}),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ready'
  },
})
