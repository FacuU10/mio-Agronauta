import dotenv from 'dotenv'
import { resolve } from 'node:path'

// Load configuration before imported routes construct database clients.
dotenv.config({ path: resolve(__dirname, '../../../.env') })
