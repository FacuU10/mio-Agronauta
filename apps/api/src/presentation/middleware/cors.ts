import cors from 'cors'
import { parseAllowedOrigins } from '../../infrastructure/config/agronautas-runtime'

const allowedOrigins = parseAllowedOrigins()

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Agronautas-Mode'],
  exposedHeaders: ['X-Agronautas-Mode'],
  maxAge: 86400, // 24 hours
})
