import cluster from 'cluster'
import os from 'os'
import dotenv from 'dotenv'
import { logger } from './infrastructure/observability/logger'
import { startServer } from './server'
import { ProductionEnvValidatorPort } from './infrastructure/config/validator'

dotenv.config()
ProductionEnvValidatorPort.validate()

const numCPUs = os.cpus().length
const WORKERS = process.env['NODE_ENV'] === 'production' ? numCPUs : 1

if (cluster.isPrimary) {
  logger.info({ pid: process.pid }, 'Cluster primary started')
  logger.info({ workers: WORKERS }, 'Spawning API workers')

  // Fork workers
  for (let i = 0; i < WORKERS; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn({ workerPid: worker.process.pid, code, signal }, 'API worker exited, restarting')
    cluster.fork()
  })
} else {
  // Workers can share TCP connection
  startServer()
  logger.info({ pid: process.pid }, 'API worker started')
}
