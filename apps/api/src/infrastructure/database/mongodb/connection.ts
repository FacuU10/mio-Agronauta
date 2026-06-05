import mongoose from 'mongoose'
import { logger } from '../../observability/logger'

let isConnected = false

export async function connectMongoDB(): Promise<void> {
  if (isConnected) {
    return
  }

  try {
    await mongoose.connect(process.env['MONGODB_URL'] || 'mongodb://localhost:27017/appdb', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    isConnected = true
    logger.info('MongoDB connected successfully')

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error')
      isConnected = false
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
      isConnected = false
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to MongoDB')
    throw error
  }
}

export async function checkMongoDB(): Promise<boolean> {
  try {
    if (!isConnected) {
      await connectMongoDB()
    }
    return mongoose.connection.readyState === 1
  } catch (error) {
    logger.error({ err: error }, 'MongoDB health check failed')
    return false
  }
}

export async function disconnectMongoDB(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect()
    isConnected = false
  }
}
