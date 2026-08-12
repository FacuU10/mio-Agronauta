import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(process.cwd(), 'prisma/migrations/20260805090000_agronautas_job_identifier_contract/migration.sql')

test('job identifier migration keeps Prisma jobId canonical and bridges legacy snake_case deployments additively', () => {
  const migration = readFileSync(migrationPath, 'utf8')

  assert.match(migration, /ADD COLUMN\s+"jobId"\s+text/i)
  assert.match(migration, /SET\s+"jobId"\s*=\s*job_id/i)
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS[\s\S]*\("jobId"\)/i)
  assert.doesNotMatch(migration, /DROP\s+COLUMN\s+job_id/i)
})
