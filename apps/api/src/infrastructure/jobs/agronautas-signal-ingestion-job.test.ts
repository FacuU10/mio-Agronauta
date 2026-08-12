import test from 'node:test'
import assert from 'node:assert/strict'
import { ClimateIngestionJob, SatelliteIngestionJob } from './agronautas-signal-ingestion-job'
import type { ClimateSummary, SatelliteSummary } from '../../domain/entities/agronautas'

test('SatelliteIngestionJob falls back to latest valid evidence when adapter fails', async () => {
  const savedRuns: Record<string, unknown>[] = []
  const job = new SatelliteIngestionJob(
    {
      provider: 'sentinel-proxy',
      async fetch() {
        throw new Error('timeout contacting sentinel-proxy')
      },
    },
    {
      async getLatestClimateSummary() { return null },
      async getLatestSatelliteSummary(): Promise<SatelliteSummary> {
        return {
          provider: 'sentinel-proxy',
          observedAt: new Date('2026-06-01T00:00:00.000Z'),
          freshnessHours: 30,
          confidence: 0.82,
          provenance: ['signal_ingestion_runs:sentinel-proxy:satellite:prev'],
          ndvi: 0.42,
          waterStressIndex: 0.66,
        }
      },
    },
    { async saveRun(record) { savedRuns.push(record as unknown as Record<string, unknown>) } },
    { now: () => new Date('2026-06-03T06:00:00.000Z') },
  )

  const result = await job.run('field-1', 'run-sat-1')

  assert.equal(result.status, 'degraded')
  assert.equal(result.degradationReason, 'satellite_data_stale')
  assert.equal(savedRuns[0]?.['status'], 'degraded')
  assert.equal(savedRuns[0]?.['degradationReason'], 'satellite_data_stale')
  assert.equal(savedRuns[0]?.['staleCause'], 'timeout contacting sentinel-proxy')
})

test('ClimateIngestionJob persists normalized successful evidence', async () => {
  const savedRuns: Record<string, unknown>[] = []
  const job = new ClimateIngestionJob(
    {
      provider: 'weather-api',
      async fetch() {
        return {
          observedAt: new Date('2026-06-03T05:00:00.000Z'),
          acquiredAt: new Date('2026-06-03T05:01:00.000Z'),
          sourceRunId: 'weather-provider-run-1',
          temperatureC: 33,
          rainfallMm7d: 90,
          humidityPct: 74,
          confidence: 0.88,
        }
      },
    },
    {
      async getLatestClimateSummary(): Promise<ClimateSummary | null> { return null },
      async getLatestSatelliteSummary(): Promise<SatelliteSummary | null> { return null },
    },
    { async saveRun(record) { savedRuns.push(record as unknown as Record<string, unknown>) } },
    { now: () => new Date('2026-06-03T06:00:00.000Z') },
  )

  const result = await job.run('field-2', 'run-climate-1')

  assert.equal(result.status, 'succeeded')
  assert.equal(savedRuns[0]?.['status'], 'succeeded')
  assert.deepEqual(savedRuns[0]?.['evidencePayload'], {
    temperatureC: 33,
    rainfallMm7d: 90,
    humidityPct: 74,
    confidence: 0.88,
    provenance: ['adapter:weather-api:climate'],
    sourceRunId: 'weather-provider-run-1',
    acquiredAt: '2026-06-03T05:01:00.000Z',
  })
  assert.deepEqual(result.lineage, {
    sourceRunIds: ['weather-provider-run-1'],
    acquisitionTimes: ['2026-06-03T05:01:00.000Z'],
    freshness: 'fresh',
    degradationReasons: [],
  })
})
