import 'dotenv/config'
import { basename } from 'node:path'
import { Field, FieldContext, RiskSnapshotFoundation, type DegradationReason, type RiskDriver } from '../domain/entities/agronautas'
import type { AlertSnapshotRecord, SignalIngestionRunRecord } from '../domain/repositories/agronautas'
import { PostgresAlertSnapshotRepository } from '../infrastructure/database/postgres/agronautas-alert-snapshot-repository'
import { PostgresFieldContextRepository, PostgresFieldRepository } from '../infrastructure/database/postgres/agronautas-field-repository'
import { getPostgresPool, closePostgresPool } from '../infrastructure/database/postgres/pool'
import { PostgresRiskSnapshotRepository } from '../infrastructure/database/postgres/agronautas-risk-snapshot-repository'
import { PostgresSignalIngestionRepository } from '../infrastructure/database/postgres/agronautas-signal-ingestion-repository'
import { corrientesDemoLocalities, type CorrientesDemoLocality } from './corrientes-demo-localities'

interface SeedOptions {
  cleanup: boolean
  offlineFixtures: boolean
  mode: 'fetch' | 'offline-fixtures'
}

interface TimelinePoint {
  observedAt: string
  temperatureC: number
  precipitationMm: number
  humidityPct: number
  weatherCode: number
  windSpeedKph: number
}

interface ClimateDataset {
  source: 'open-meteo' | 'offline-fixture'
  fetchedAt: string
  observedAt: string
  current: TimelinePoint
  history: TimelinePoint[]
  forecast: TimelinePoint[]
  rainfallMm7d: number
  humidityPct: number
  weatherSummary: string
  sourceUrl: string
  staleCause?: string
}

interface SeedResultRow {
  fieldId: string
  locality: string
  source: string
  observedAt: string
  riskScore: number
  alertCount: number
}

const DEMO_PREFIX = 'corrientes-demo-'
const NOW = () => new Date()

export function parseSeedOptions(args: string[]): SeedOptions {
  const cleanup = args.includes('--cleanup')
  const offlineFixtures = args.includes('--offline-fixtures')
  const modeArg = args.find((arg) => arg.startsWith('--mode='))?.split('=')[1]
  const mode = modeArg === 'offline-fixtures' || offlineFixtures ? 'offline-fixtures' : 'fetch'

  return {
    cleanup,
    offlineFixtures,
    mode,
  }
}

export async function runSeed(options: SeedOptions): Promise<SeedResultRow[]> {
  const pool = getPostgresPool()
  await ensureSchema(pool)

  if (options.cleanup) {
    await cleanupSeed(pool)
    return []
  }

  const fieldRepository = new PostgresFieldRepository(pool)
  const fieldContextRepository = new PostgresFieldContextRepository(pool)
  const signalRepository = new PostgresSignalIngestionRepository(pool)
  const riskRepository = new PostgresRiskSnapshotRepository(pool)
  const alertRepository = new PostgresAlertSnapshotRepository(pool)

  const results: SeedResultRow[] = []

  for (const locality of corrientesDemoLocalities) {
    const climate = options.mode === 'offline-fixtures'
      ? buildOfflineFixture(locality)
      : await fetchClimateDataset(locality).catch(() => buildOfflineFixture(locality))

    const field = new Field({
      id: locality.fieldId,
      externalFieldId: locality.externalFieldId,
      crop: 'rice',
      hectares: locality.hectares,
      localityName: locality.localityName,
      provinceCode: locality.provinceCode,
      centroid: { lat: locality.lat, lng: locality.lng },
      boundaryMetadata: {
        sourceName: 'Corrientes demo locality seed',
        sourceUrl: climate.sourceUrl,
        sourceVersion: 'corrientes-demo-v1',
        normalizationStatus: 'verified-demo-centroid',
        notes: locality.coordinateSource,
      },
    })

    await fieldRepository.save(field)

    const context = new FieldContext({
      fieldId: locality.fieldId,
      growthStage: locality.growthStage,
      localityCanonical: locality.localityName,
      localityConfidence: 1,
      nearestStationId: `open-meteo:${locality.slug}`,
      contextPayload: {
        province: 'Corrientes',
        countryCode: locality.countryCode,
        riceRelevanceNotes: locality.riceRelevanceNotes,
        demoTags: locality.demoTags,
        demoBoundary: 'demo-only: locality/weather/risk context, not parcel advice or yield prediction',
        openMeteo: climate,
      },
    })

    await fieldContextRepository.save(context)

    const runRecord = buildSignalRun(locality, climate)
    await signalRepository.saveRun(runRecord)

    const riskSnapshot = buildRiskSnapshot(locality, climate, runRecord.runId)
    await riskRepository.save(riskSnapshot)

    const alerts = buildAlerts(locality, riskSnapshot)
    await alertRepository.saveMany(alerts)

    results.push({
      fieldId: locality.fieldId,
      locality: locality.localityName,
      source: climate.source,
      observedAt: climate.observedAt,
      riskScore: riskSnapshot.props.score,
      alertCount: alerts.length,
    })
  }

  return results
}

export function buildSignalRun(locality: CorrientesDemoLocality, climate: ClimateDataset): SignalIngestionRunRecord {
  return {
    fieldId: locality.fieldId,
    runId: `${DEMO_PREFIX}climate-${locality.slug}`,
    provider: 'open-meteo',
    signalType: 'climate',
    status: climate.source === 'offline-fixture' ? 'degraded' : 'succeeded',
    startedAt: new Date(climate.fetchedAt),
    finishedAt: new Date(climate.fetchedAt),
    observedAt: new Date(climate.observedAt),
    staleCause: climate.staleCause,
    degradationReason: climate.source === 'offline-fixture' ? 'weather_data_unavailable' : undefined,
    evidencePayload: {
      temperatureC: climate.current.temperatureC,
      rainfallMm7d: climate.rainfallMm7d,
      humidityPct: climate.humidityPct,
      confidence: climate.source === 'offline-fixture' ? 0.55 : 0.82,
      weatherCode: climate.current.weatherCode,
      weatherSummary: climate.weatherSummary,
      source: climate.source,
      sourceUrl: climate.sourceUrl,
      history: climate.history,
      forecast: climate.forecast,
      localityMetadata: {
        locality: locality.localityName,
        provinceCode: locality.provinceCode,
        tags: locality.demoTags,
      },
    },
  }
}

export function buildRiskSnapshot(locality: CorrientesDemoLocality, climate: ClimateDataset, runId: string): RiskSnapshotFoundation {
  const rainfallPressure = clamp(climate.rainfallMm7d / 120)
  const humidityPressure = clamp(climate.humidityPct / 100)
  const heatPressure = clamp(Math.max(climate.current.temperatureC - 28, 0) / 12)
  const score = Math.round((rainfallPressure * 0.45 + humidityPressure * 0.2 + heatPressure * 0.35) * 100)
  const degradationReasons: DegradationReason[] = climate.source === 'offline-fixture' ? ['weather_data_unavailable'] : []
  const drivers: RiskDriver[] = [
    { key: 'rainfall_load', label: 'Carga de lluvia', weight: 0.45, value: Number(rainfallPressure.toFixed(2)) },
    { key: 'ambient_humidity', label: 'Humedad ambiente', weight: 0.2, value: Number(humidityPressure.toFixed(2)) },
    { key: 'heat_pressure', label: 'Presión térmica', weight: 0.35, value: Number(heatPressure.toFixed(2)) },
  ]

  const computedAt = new Date(climate.observedAt)
  const validUntil = new Date(computedAt.getTime() + 6 * 3_600_000)

  return new RiskSnapshotFoundation({
    snapshotId: `${DEMO_PREFIX}risk-${locality.slug}`,
    fieldId: locality.fieldId,
    runId,
    score,
    confidence: climate.source === 'offline-fixture' ? 0.58 : 0.79,
    computedAt,
    validUntil,
    ruleVersion: 'corrientes-demo-risk-v1',
    drivers,
    evidenceRefs: [
      `signal_ingestion_runs:open-meteo:climate:${runId}`,
      `field_contexts:${locality.fieldId}`,
    ],
    degradationReasons,
    staleCause: climate.staleCause,
  })
}

export function buildAlerts(locality: CorrientesDemoLocality, snapshot: RiskSnapshotFoundation): AlertSnapshotRecord[] {
  const alerts: AlertSnapshotRecord[] = []

  if (snapshot.props.score >= 55) {
    alerts.push({
      alertId: `${DEMO_PREFIX}flood-${locality.slug}`,
      fieldId: locality.fieldId,
      basedOnSnapshotId: snapshot.props.snapshotId,
      runId: snapshot.props.runId,
      type: 'flood',
      priority: snapshot.props.score >= 75 ? 1 : 2,
      confidence: Number(Math.max(0.55, snapshot.props.confidence - 0.05).toFixed(2)),
      freshness: snapshot.freshness,
      degradationReasons: snapshot.props.degradationReasons,
      staleCause: snapshot.props.staleCause,
    })
  }

  if (snapshot.props.drivers.find((driver) => driver.key === 'heat_pressure')?.value && snapshot.props.drivers.find((driver) => driver.key === 'heat_pressure')!.value >= 0.65) {
    alerts.push({
      alertId: `${DEMO_PREFIX}thermal-${locality.slug}`,
      fieldId: locality.fieldId,
      basedOnSnapshotId: snapshot.props.snapshotId,
      runId: snapshot.props.runId,
      type: 'thermal_stress',
      priority: 2,
      confidence: Number(Math.max(0.5, snapshot.props.confidence - 0.08).toFixed(2)),
      freshness: snapshot.freshness,
      degradationReasons: snapshot.props.degradationReasons,
      staleCause: snapshot.props.staleCause,
    })
  }

  return alerts
}

export function buildOfflineFixture(locality: CorrientesDemoLocality): ClimateDataset {
  const now = NOW()
  const current = {
    observedAt: new Date(now.getTime() - 3_600_000).toISOString(),
    temperatureC: Number((24 + locality.lat * -0.08).toFixed(1)),
    precipitationMm: Number((8 + locality.hectares / 12).toFixed(1)),
    humidityPct: Math.round(72 + locality.hectares % 8),
    weatherCode: 61,
    windSpeedKph: Number((12 + locality.lng % 4).toFixed(1)),
  }

  const history = Array.from({ length: 7 }, (_, index) => {
    const day = 7 - index
    return {
      observedAt: new Date(now.getTime() - day * 24 * 3_600_000).toISOString(),
      temperatureC: Number((current.temperatureC - 1 + index * 0.3).toFixed(1)),
      precipitationMm: Number((6 + (index % 3) * 4.2).toFixed(1)),
      humidityPct: Math.max(60, current.humidityPct - 4 + index),
      weatherCode: index % 2 === 0 ? 61 : 3,
      windSpeedKph: Number((current.windSpeedKph + index * 0.4).toFixed(1)),
    }
  })

  const forecast = Array.from({ length: 3 }, (_, index) => ({
    observedAt: new Date(now.getTime() + (index + 1) * 24 * 3_600_000).toISOString(),
    temperatureC: Number((current.temperatureC + 0.8 + index * 0.6).toFixed(1)),
    precipitationMm: Number((4 + index * 2.5).toFixed(1)),
    humidityPct: Math.max(58, current.humidityPct - 3 + index),
    weatherCode: index === 0 ? 3 : 1,
    windSpeedKph: Number((current.windSpeedKph + 0.7 * index).toFixed(1)),
  }))

  return {
    source: 'offline-fixture',
    fetchedAt: now.toISOString(),
    observedAt: current.observedAt,
    current,
    history,
    forecast,
    rainfallMm7d: Number(history.reduce((sum, item) => sum + item.precipitationMm, 0).toFixed(1)),
    humidityPct: current.humidityPct,
    weatherSummary: 'Cached demo fixture used because live Open-Meteo fetch was unavailable.',
    sourceUrl: 'offline-fixture://corrientes-demo',
    staleCause: 'weather_api_unavailable_during_seed',
  }
}

export async function fetchClimateDataset(locality: CorrientesDemoLocality): Promise<ClimateDataset> {
  const params = new URLSearchParams({
    latitude: String(locality.lat),
    longitude: String(locality.lng),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    past_days: '7',
    forecast_days: '4',
    timezone: 'auto',
  })
  const sourceUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`)

  const json = await response.json() as {
    current?: Record<string, unknown>
    hourly?: Record<string, unknown>
  }

  const current = json.current
  const hourly = json.hourly
  if (!current || !hourly) throw new Error('Open-Meteo payload missing required sections')

  const times = asStringArray(hourly['time'])
  const temperatures = asNumberArray(hourly['temperature_2m'])
  const humidity = asNumberArray(hourly['relative_humidity_2m'])
  const precipitation = asNumberArray(hourly['precipitation'])
  const weatherCodes = asNumberArray(hourly['weather_code'])
  const windSpeeds = asNumberArray(hourly['wind_speed_10m'])
  const now = new Date()

  const points: TimelinePoint[] = times.map((time, index) => ({
    observedAt: new Date(time).toISOString(),
    temperatureC: temperatures[index] ?? 0,
    precipitationMm: precipitation[index] ?? 0,
    humidityPct: humidity[index] ?? 0,
    weatherCode: weatherCodes[index] ?? 0,
    windSpeedKph: windSpeeds[index] ?? 0,
  }))

  const history = points.filter((point) => new Date(point.observedAt) <= now).slice(-7)
  const forecast = points.filter((point) => new Date(point.observedAt) > now).slice(0, 3)
  const currentPoint: TimelinePoint = {
    observedAt: new Date(String(current['time'])).toISOString(),
    temperatureC: Number(current['temperature_2m'] ?? 0),
    precipitationMm: history.at(-1)?.precipitationMm ?? 0,
    humidityPct: Number(current['relative_humidity_2m'] ?? 0),
    weatherCode: Number(current['weather_code'] ?? 0),
    windSpeedKph: Number(current['wind_speed_10m'] ?? 0),
  }

  return {
    source: 'open-meteo',
    fetchedAt: NOW().toISOString(),
    observedAt: currentPoint.observedAt,
    current: currentPoint,
    history,
    forecast,
    rainfallMm7d: Number(history.reduce((sum, point) => sum + point.precipitationMm, 0).toFixed(1)),
    humidityPct: currentPoint.humidityPct,
    weatherSummary: describeWeatherCode(currentPoint.weatherCode),
    sourceUrl,
  }
}

async function ensureSchema(pool: Pick<ReturnType<typeof getPostgresPool>, 'query'>): Promise<void> {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fields (
      id text PRIMARY KEY,
      external_field_id text NOT NULL UNIQUE,
      crop text NOT NULL,
      hectares numeric(10,2) NOT NULL,
      locality_name text NOT NULL,
      province_code text NOT NULL DEFAULT 'AR-W',
      centroid_lat numeric(10,7) NOT NULL,
      centroid_lng numeric(10,7) NOT NULL,
      boundary_source jsonb NOT NULL,
      boundary_version text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS field_contexts (
      id text PRIMARY KEY,
      field_id text NOT NULL UNIQUE REFERENCES fields(id) ON DELETE CASCADE,
      growth_stage text NULL,
      nearest_station_id text NULL,
      locality_canonical text NOT NULL,
      locality_confidence numeric(4,3) NOT NULL DEFAULT 1,
      context_payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS signal_ingestion_runs (
      id text PRIMARY KEY,
      field_id text NULL REFERENCES fields(id) ON DELETE SET NULL,
      provider text NOT NULL,
      signal_type text NOT NULL,
      run_id text NOT NULL UNIQUE,
      status text NOT NULL,
      stale_cause text NULL,
      started_at timestamptz NOT NULL,
      finished_at timestamptz NULL,
      observed_at timestamptz NULL,
      evidence_payload jsonb NOT NULL,
      degradation_reason text NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS risk_snapshots (
      id text PRIMARY KEY,
      field_id text NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
      run_id text NOT NULL,
      score numeric(5,2) NOT NULL,
      confidence numeric(4,3) NOT NULL,
      level text NOT NULL,
      freshness text NOT NULL DEFAULT 'fresh',
      computed_at timestamptz NOT NULL,
      valid_until timestamptz NOT NULL,
      rule_version text NOT NULL,
      stale_cause text NULL,
      degradation_reasons jsonb NOT NULL,
      drivers jsonb NOT NULL,
      evidence_refs jsonb NOT NULL,
      summary_payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alert_snapshots (
      id text PRIMARY KEY,
      field_id text NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
      risk_snapshot_id text NOT NULL REFERENCES risk_snapshots(id) ON DELETE CASCADE,
      run_id text NOT NULL,
      alert_type text NOT NULL,
      priority int NOT NULL,
      confidence numeric(4,3) NOT NULL,
      freshness text NOT NULL DEFAULT 'fresh',
      stale_cause text NULL,
      degradation_reasons jsonb NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(field_id, risk_snapshot_id, alert_type)
    )`)
}

async function cleanupSeed(pool: Pick<ReturnType<typeof getPostgresPool>, 'query'>): Promise<void> {
  await pool.query(`DELETE FROM alert_snapshots WHERE id LIKE '${DEMO_PREFIX}%'`)
  await pool.query(`DELETE FROM risk_snapshots WHERE id LIKE '${DEMO_PREFIX}%'`)
  await pool.query(`DELETE FROM signal_ingestion_runs WHERE run_id LIKE '${DEMO_PREFIX}%'`)
  await pool.query(`DELETE FROM field_contexts WHERE field_id LIKE '${DEMO_PREFIX}%'`)
  await pool.query(`DELETE FROM fields WHERE id LIKE '${DEMO_PREFIX}%'`)
}

function asStringArray(input: unknown): string[] {
  return Array.isArray(input) ? input.map((item) => String(item)) : []
}

function asNumberArray(input: unknown): number[] {
  return Array.isArray(input) ? input.map((item) => Number(item ?? 0)) : []
}

function describeWeatherCode(code: number): string {
  if ([61, 63, 65, 80, 81, 82].includes(code)) return 'Rainy conditions'
  if ([95, 96, 99].includes(code)) return 'Storm risk'
  if ([0, 1].includes(code)) return 'Clear to mostly clear'
  return 'Variable conditions'
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}

async function main() {
  const options = parseSeedOptions(process.argv.slice(2))
  try {
    const result = await runSeed(options)
    if (options.cleanup) {
      console.log('Corrientes demo seed cleanup completed.')
      return
    }

    console.table(result)
  } finally {
    await closePostgresPool()
  }
}

const scriptPath = process.argv[1]
  ? basename(process.argv[1]) === 'seed-corrientes-rice-demo.ts' || basename(process.argv[1]) === 'seed-corrientes-rice-demo.js'
  : false
if (scriptPath) {
  void main()
}
