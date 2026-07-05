import { rmSync } from 'node:fs'

rmSync('node_modules', { recursive: true, force: true })
