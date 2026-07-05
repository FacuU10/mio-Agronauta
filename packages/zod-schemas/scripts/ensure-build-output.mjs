import { access } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const requiredOutputs = ['dist/index.js', 'dist/example.js', 'dist/agronautas.js']

let missingOutput = false

for (const output of requiredOutputs) {
  try {
    await access(join(process.cwd(), output))
  } catch {
    missingOutput = true
    break
  }
}

if (missingOutput) {
  execFileSync('pnpm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' })
}
