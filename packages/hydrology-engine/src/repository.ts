import type { QueryResult } from 'pg'
import type { HydrologyDenseContextV1, HydrologyStationReference, HydrologyTelemetry } from '@repo/zod-schemas'
import { forecastConfidenceForHorizon, referencePortsByZone, type FieldHydrologyMapping, type IngestionRunInput, type NormalizedHydrologyTelemetry } from './types.js'

interface DbExecutor { query(sql: string, params?: unknown[]): Promise<QueryResult> }
interface Db extends DbExecutor { connect?: () => Promise<DbClient> }
interface DbClient extends DbExecutor { release(): void }

export interface MunicipalityGaugeMappings {
  primaryPnaPortId: string | null
  secondaryPnaPortIds: string[]
  inaStationIds: string[]
  smnRegionIds: string[]
  inmetStationIds: string[]
}

export interface MunicipalityOfficialAlert {
  source: Extract<HydrologyTelemetry['source'], 'SMN' | 'INMET'>
  coverageKey: string
  message: string
  observedAt: string
  lastSuccessfulObservedAt: string
  freshness: Extract<HydrologyTelemetry['freshness'], 'fresh' | 'degraded'>
  sourceUrl?: string
}

export interface MunicipalityTelemetryView {
  id: string
  localityId: string
  name: string
  provinceCode: string
  alertHeightM?: number
  evacuationHeightM?: number
  gaugeMappings: MunicipalityGaugeMappings
  latestTelemetry: HydrologyTelemetry[]
  officialAlerts?: MunicipalityOfficialAlert[]
}

export interface MunicipalityTelemetryDashboard {
  municipality: Omit<MunicipalityTelemetryView, 'gaugeMappings' | 'latestTelemetry' | 'officialAlerts'>
  gaugeMappings: MunicipalityGaugeMappings
  latestTelemetry: HydrologyTelemetry[]
  officialAlerts?: MunicipalityOfficialAlert[]
}

export class HydrologyRepository {
  constructor(private readonly db: Db) {}

  async saveTelemetryDeduped(records: NormalizedHydrologyTelemetry[], run: IngestionRunInput): Promise<{ inserted: number; unchanged: number }> {
    let inserted = 0
    let unchanged = 0
    const eligibleRecords = records.filter((item) => item.forecastHorizonDays === undefined || item.forecastHorizonDays <= 30)
    let telemetryError: unknown
    const client = this.db.connect ? await this.db.connect() : undefined
    const transactionDb = client ?? this.db
    try {
      await transactionDb.query('BEGIN')
      for (const record of eligibleRecords) {
        const latest = await transactionDb.query(
          `SELECT value
             FROM hydrology_telemetry
            WHERE station_id = $1
              AND source = $2
              AND metric = $3
              AND unit = $4
              AND forecast_horizon_days IS NOT DISTINCT FROM $5
            ORDER BY observed_at DESC, ingested_at DESC
            LIMIT 1`,
          [record.stationId, record.source, record.metric, record.unit, record.forecastHorizonDays ?? null],
        ) as QueryResult<{ value: string | number | null }>
        if (isTelemetryValueUnchanged(latest.rows[0]?.value, record.value)) {
          unchanged += 1
          continue
        }
        await this.saveTelemetry([record], transactionDb)
        inserted += 1
      }
      await transactionDb.query('COMMIT')
    } catch (error) {
      await transactionDb.query('ROLLBACK').catch(() => undefined)
      telemetryError = error
    } finally {
      client?.release()
    }
    if (telemetryError !== undefined) {
      await this.saveIngestionRun({ ...run, status: 'failed', finishedAt: run.finishedAt ?? new Date(), recordsIngested: inserted, errorMessage: 'Telemetry persistence failed before ingestion run completed' }).catch(() => undefined)
      throw telemetryError
    }
    await this.saveIngestionRun(run)
    return { inserted, unchanged }
  }

  async saveTelemetry(records: NormalizedHydrologyTelemetry[], db: DbExecutor = this.db): Promise<void> {
    for (const record of records.filter((item) => item.forecastHorizonDays === undefined || item.forecastHorizonDays <= 30)) {
      if ((record.source === 'INMET' || record.source === 'SMN') && record.metric === 'storm_alert') await this.ensureAlertStation(record, db)
      await db.query(
        `INSERT INTO hydrology_telemetry (station_id, source, metric, observed_at, ingested_at, last_successful_observed_at, value, unit, tendency, forecast_horizon_days, confidence, quality, freshness, source_url, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (station_id, source, metric, observed_at, forecast_horizon_days) DO UPDATE SET
           ingested_at = EXCLUDED.ingested_at,
           last_successful_observed_at = EXCLUDED.last_successful_observed_at,
           value = EXCLUDED.value,
           tendency = EXCLUDED.tendency,
           confidence = EXCLUDED.confidence,
           quality = EXCLUDED.quality,
           freshness = EXCLUDED.freshness,
           source_url = EXCLUDED.source_url,
           raw = EXCLUDED.raw`,
        [record.stationId, record.source, record.metric, record.observedAt, record.ingestedAt ?? new Date(), record.lastSuccessfulObservedAt, record.metric === 'storm_alert' ? null : record.value, record.unit, record.tendency ?? null, record.forecastHorizonDays ?? null, record.confidence ?? forecastConfidenceForHorizon(record.forecastHorizonDays) ?? null, record.quality, record.freshness, record.sourceUrl ?? null, record.raw ?? {}],
      )
    }
  }

  private async ensureAlertStation(record: NormalizedHydrologyTelemetry, db: DbExecutor = this.db): Promise<void> {
    const stationName = typeof record.raw?.['title'] === 'string' ? record.raw['title'].slice(0, 160) : `${record.source} alerta oficial`
    await db.query(
      `INSERT INTO hydrology_stations (id, source, station_code, station_name, river_name, zone, source_url, is_active, country_code)
       VALUES ($1,$2,$1,$3,null,null,$4,true,'AR')
       ON CONFLICT (id) DO UPDATE SET station_name = EXCLUDED.station_name, source_url = EXCLUDED.source_url, is_active = true, updated_at = now()`,
      [record.stationId, record.source, stationName, record.sourceUrl ?? null],
    )
  }

  async saveIngestionRun(run: IngestionRunInput): Promise<void> {
    await this.db.query(
      `INSERT INTO hydrology_ingestion_runs (source, proof_run_id, station_id, status, started_at, finished_at, observed_from, observed_to, last_successful_observed_at, records_ingested, excluded_metrics, error_message, provenance_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [run.source, run.proofRunId ?? null, run.stationId ?? null, run.status, run.startedAt, run.finishedAt ?? null, run.observedFrom ?? null, run.observedTo ?? null, run.lastSuccessfulObservedAt ?? null, run.recordsIngested, run.excludedMetrics ?? [], run.errorMessage ?? null, run.provenanceUrl ?? null],
    )
  }

  async getIngestionProofRows(proofRunId: string, source?: string): Promise<Array<{ id: string; source: string; recordsIngested: number; status: string; startedAt: string; finishedAt: string | null }>> {
    const result = await this.db.query(
      `SELECT id::text, source, records_ingested, status, started_at, finished_at
         FROM hydrology_ingestion_runs
        WHERE proof_run_id = $1
          AND ($2::text IS NULL OR source = $2)
        ORDER BY started_at DESC`,
      [proofRunId, source ?? null],
    ) as QueryResult<{ id: string; source: string; records_ingested: number; status: string; started_at: Date | string; finished_at: Date | string | null }>
    return result.rows.map((row) => ({ id: row.id, source: row.source, recordsIngested: Number(row.records_ingested), status: row.status, startedAt: toIsoOrNull(row.started_at) ?? '', finishedAt: toIsoOrNull(row.finished_at) }))
  }

  async mapFieldToHydrologyZone(fieldBoundaryWkt: string, fieldId = 'unknown'): Promise<FieldHydrologyMapping> {
    const result = await this.db.query(
      `SELECT locality_name
         FROM agronautas_boundaries
        WHERE scope = 'corrientes_rice'
          AND locality_name IN ('Mercedes', 'Ituzaingó', 'Virasoro')
          AND ST_Intersects(boundary, ST_Multi(ST_GeomFromText($1, 4326)))
        ORDER BY locality_name
        LIMIT 1`,
      [fieldBoundaryWkt],
    ) as QueryResult<FieldHydrologyZoneRow>
    const zone = result.rows[0]?.locality_name ?? null
    return { fieldId, zone, referencePorts: zone ? referencePortsByZone[zone] : [] }
  }

  async getDenseContextForField(fieldId: string, fieldBoundaryWkt: string): Promise<HydrologyDenseContextV1> {
    const mapping = await this.mapFieldToHydrologyZone(fieldBoundaryWkt, fieldId)
    if (!mapping.zone) return { contractVersion: 'hydrology-dense-context-v1', fieldId, zone: null, sources: [], stations: [], snapshot: { riskLevel: 'unknown', freshness: 'degraded', quality: 'missing', recommendation: 'Sin datos oficiales disponibles para este lote.', lastSuccessfulObservedAt: null }, telemetry: [] }

    const stationResult = await this.db.query(
      `SELECT id, source, station_name, river_name, zone, source_url FROM hydrology_stations WHERE id = ANY($1) AND is_active = true`,
      [mapping.referencePorts],
    ) as QueryResult<HydrologyStationRow>
    const telemetryResult = await this.db.query(
      `SELECT source, station_id, observed_at, ingested_at, last_successful_observed_at, value, unit, metric, quality, freshness, tendency, forecast_horizon_days, confidence, source_url
         FROM hydrology_telemetry
        WHERE station_id = ANY($1) AND (forecast_horizon_days IS NULL OR forecast_horizon_days <= 30)
        ORDER BY observed_at DESC`,
      [mapping.referencePorts],
    ) as QueryResult<HydrologyTelemetryRow>

    const telemetry = telemetryResult.rows.map(toTelemetry)
    const last = telemetry.map((item) => item.lastSuccessfulObservedAt).sort().at(-1) ?? null
    return {
      contractVersion: 'hydrology-dense-context-v1',
      fieldId,
      zone: mapping.zone,
      sources: [...new Set(stationResult.rows.map((row) => row.source))],
      stations: stationResult.rows.map((row) => ({ stationId: row.id, source: row.source, name: row.station_name, river: row.river_name, zone: row.zone, sourceUrl: row.source_url ?? undefined })),
      snapshot: { riskLevel: 'unknown', freshness: telemetry.length > 0 ? 'fresh' : 'degraded', quality: telemetry.length > 0 ? 'ok' : 'missing', recommendation: 'Revisar alturas, lluvia y alertas oficiales asociadas a la zona.', lastSuccessfulObservedAt: last },
      telemetry,
    }
  }

  async getMunicipalityTelemetryOverview(provinceCode = 'AR-W'): Promise<MunicipalityTelemetryView[]> {
    const result = await this.db.query(municipalityTelemetrySql('m.province_code = $1'), [provinceCode]) as QueryResult<MunicipalityTelemetryRow>
    return toMunicipalityTelemetryViews(result.rows)
  }

  async getMunicipalityTelemetryDashboard(municipalityId: string): Promise<MunicipalityTelemetryDashboard | null> {
    const result = await this.db.query(municipalityTelemetrySql('m.id = $1'), [municipalityId]) as QueryResult<MunicipalityTelemetryRow>
    const view = toMunicipalityTelemetryViews(result.rows)[0]
    if (!view) return null
    const { gaugeMappings, latestTelemetry, officialAlerts, ...municipality } = view
    return { municipality, gaugeMappings, latestTelemetry, officialAlerts }
  }

  async pruneOldData(retentionDays = 30, now = new Date()): Promise<{ telemetryDeleted: number; snapshotsDeleted: number }> {
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)
    const telemetry = await this.db.query('DELETE FROM hydrology_telemetry WHERE observed_at < $1', [cutoff])
    return { telemetryDeleted: telemetry.rowCount ?? 0, snapshotsDeleted: 0 }
  }
}

interface MunicipalityTelemetryRow extends Record<string, unknown> {
  municipality_id: string
  locality_id: string
  municipality_name: string
  province_code: string
  alert_height_m: string | number | null
  evacuation_height_m: string | number | null
  primary_pna_port_id: string | null
  secondary_pna_port_ids: string[] | null
  ina_station_ids: string[] | null
  smn_region_ids: string[] | null
  inmet_station_ids: string[] | null
  station_id: string | null
  official_alerts: unknown
}

interface FieldHydrologyZoneRow extends Record<string, unknown> {
  locality_name: keyof typeof referencePortsByZone
}

interface HydrologyStationRow extends Record<string, unknown> {
  id: string
  source: HydrologyStationReference['source']
  station_name: string
  river_name: string | null
  zone: HydrologyStationReference['zone']
  source_url: string | null
}

interface HydrologyTelemetryRow extends Record<string, unknown> {
  source: HydrologyTelemetry['source']
  station_id: string
  observed_at: Date | string
  ingested_at: Date | string
  last_successful_observed_at: Date | string
  value: string | number | null
  unit: string
  metric: HydrologyTelemetry['metric']
  quality: HydrologyTelemetry['quality']
  freshness: HydrologyTelemetry['freshness']
  tendency: string | null
  forecast_horizon_days: string | number | null
  confidence: HydrologyTelemetry['confidence']
  source_url: string | null
}

const municipalityTelemetrySql = (where: string) => `SELECT
    m.id AS municipality_id,
    m.locality_id,
    m.name AS municipality_name,
    m.province_code,
    m.alert_height_m,
    m.evacuation_height_m,
    mgm.primary_pna_port_id,
    COALESCE(mgm.secondary_pna_port_ids, ARRAY[]::text[]) AS secondary_pna_port_ids,
    COALESCE(mgm.ina_station_ids, ARRAY[]::text[]) || CASE lower(m.locality_id)
      WHEN 'corrientes-capital' THEN ARRAY['6764']::text[]
      WHEN 'paso-de-los-libres' THEN ARRAY['33988']::text[]
      WHEN 'bella-vista' THEN ARRAY['38469']::text[]
      ELSE ARRAY[]::text[]
    END AS ina_station_ids,
    COALESCE(mgm.smn_region_ids, ARRAY[]::text[]) AS smn_region_ids,
    COALESCE(mgm.inmet_station_ids, ARRAY[]::text[]) AS inmet_station_ids,
    latest.source,
    latest.station_id,
    latest.observed_at,
    latest.ingested_at,
    latest.last_successful_observed_at,
    latest.value,
    latest.unit,
    latest.metric,
    latest.quality,
    latest.freshness,
    latest.tendency,
    latest.forecast_horizon_days,
    latest.confidence,
    latest.source_url,
    COALESCE(official_alerts.official_alerts, '[]'::jsonb) AS official_alerts
  FROM agronautas_municipalities m
  LEFT JOIN municipality_gauge_mappings mgm ON mgm.municipality_id = m.id
  LEFT JOIN LATERAL (
    SELECT DISTINCT ON (ht.source, ht.station_id, ht.metric, ht.unit, ht.forecast_horizon_days)
      ht.source,
      ht.station_id,
      ht.observed_at,
      ht.ingested_at,
      ht.last_successful_observed_at,
      ht.value,
      ht.unit,
      ht.metric,
      ht.quality,
      ht.freshness,
      ht.tendency,
      ht.forecast_horizon_days,
      ht.confidence,
      ht.source_url
    FROM hydrology_telemetry ht
    WHERE ht.station_id = ANY(array_remove(
      ARRAY[mgm.primary_pna_port_id]::text[]
        || COALESCE(mgm.secondary_pna_port_ids, ARRAY[]::text[])
        || COALESCE(mgm.ina_station_ids, ARRAY[]::text[])
        || CASE lower(m.locality_id)
          WHEN 'corrientes-capital' THEN ARRAY['6764']::text[]
          WHEN 'paso-de-los-libres' THEN ARRAY['33988']::text[]
          WHEN 'bella-vista' THEN ARRAY['38469']::text[]
          ELSE ARRAY[]::text[]
        END
        || COALESCE(mgm.smn_region_ids, ARRAY[]::text[])
        || COALESCE(mgm.inmet_station_ids, ARRAY[]::text[]),
      NULL
    ))
      AND (ht.forecast_horizon_days IS NULL OR ht.forecast_horizon_days <= 30)
      AND (ht.source_url IS NULL OR ht.source_url NOT LIKE 'offline-fixture://%')
    ORDER BY ht.source, ht.station_id, ht.metric, ht.unit, ht.forecast_horizon_days, ht.observed_at DESC, ht.ingested_at DESC
  ) latest ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'source', current_alert.source,
      'coverageKey', current_alert.official_coverage_key,
      'message', current_alert.message,
      'observedAt', current_alert.observed_at,
      'lastSuccessfulObservedAt', current_alert.last_successful_observed_at,
      'freshness', current_alert.freshness,
      'sourceUrl', current_alert.source_url
    ) ORDER BY current_alert.observed_at DESC), '[]'::jsonb) AS official_alerts
    FROM (
      SELECT DISTINCT ON (coverage.source, coverage.official_coverage_key)
        coverage.source,
        coverage.official_coverage_key,
        COALESCE(
          NULLIF(ht.raw->>'message', ''),
          NULLIF(ht.raw->>'title', ''),
          NULLIF(ht.raw->>'description', ''),
          'Alerta oficial ' || ht.source
        ) AS message,
        ht.observed_at,
        ht.last_successful_observed_at,
        CASE WHEN ht.freshness = 'fresh' THEN 'fresh' ELSE 'degraded' END AS freshness,
        ht.source_url
      FROM municipality_alert_coverage coverage
      JOIN hydrology_telemetry ht
        ON ht.source = coverage.source
       AND ht.metric = 'storm_alert'
       AND ht.station_id NOT LIKE 'alert-%'
       AND (
         ht.station_id = coverage.official_coverage_key
         OR ht.raw->>'coverageKey' = coverage.official_coverage_key
         OR ht.raw->>'coverage_key' = coverage.official_coverage_key
       )
      WHERE coverage.municipality_id = m.id
        AND coverage.active = true
        AND (ht.forecast_horizon_days IS NULL OR ht.forecast_horizon_days <= 30)
        AND (ht.source_url IS NULL OR ht.source_url NOT LIKE 'offline-fixture://%')
      ORDER BY coverage.source, coverage.official_coverage_key, ht.observed_at DESC, ht.ingested_at DESC
    ) current_alert
  ) official_alerts ON true
  WHERE ${where}
  ORDER BY m.name, latest.source, latest.station_id, latest.metric`

const asNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
const asTextArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined && item !== '').map(String)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '{}') return []
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed.slice(1, -1).split(',').map((item) => item.trim().replace(/^"|"$/g, '')).filter(Boolean)
    return [trimmed]
  }
  return []
}
const TELEMETRY_VALUE_EPSILON = 0.0001
const isTelemetryValueUnchanged = (stored: string | number | null | undefined, next: number | null): boolean => {
  if (stored === undefined) return false
  if (stored === null && next === null) return true
  if (stored === null || next === null) return false
  return Math.abs(Number(stored) - next) <= TELEMETRY_VALUE_EPSILON
}

const toMunicipalityTelemetryViews = (rows: MunicipalityTelemetryRow[]): MunicipalityTelemetryView[] => {
  const byId = new Map<string, MunicipalityTelemetryView>()
  for (const row of rows) {
    const current = byId.get(row.municipality_id) ?? {
      id: row.municipality_id,
      localityId: row.locality_id,
      name: row.municipality_name,
      provinceCode: row.province_code,
      alertHeightM: asNumber(row.alert_height_m),
      evacuationHeightM: asNumber(row.evacuation_height_m),
      gaugeMappings: {
        primaryPnaPortId: row.primary_pna_port_id ?? null,
        secondaryPnaPortIds: asTextArray(row.secondary_pna_port_ids),
        inaStationIds: asTextArray(row.ina_station_ids),
        smnRegionIds: asTextArray(row.smn_region_ids),
        inmetStationIds: asTextArray(row.inmet_station_ids),
      },
      latestTelemetry: [],
      officialAlerts: toOfficialAlerts(row.official_alerts),
    }
    if (!byId.has(row.municipality_id)) byId.set(row.municipality_id, current)
    const telemetry = toTelemetryOrNull(row)
    if (telemetry && !telemetry.sourceUrl?.startsWith('offline-fixture://')) current.latestTelemetry.push(telemetry)
  }
  return [...byId.values()]
}

const toOfficialAlerts = (value: unknown): MunicipalityOfficialAlert[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const source = item['source']
    const coverageKey = item['coverageKey']
    const message = item['message']
    const observedAt = toIsoOrNull(item['observedAt'])
    const lastSuccessfulObservedAt = toIsoOrNull(item['lastSuccessfulObservedAt'])
    if ((source !== 'SMN' && source !== 'INMET') || typeof coverageKey !== 'string' || !coverageKey || typeof message !== 'string' || !message || !observedAt || !lastSuccessfulObservedAt) return []
    const freshness = item['freshness'] === 'fresh' ? 'fresh' : item['freshness'] === 'degraded' ? 'degraded' : undefined
    if (!freshness) return []
    return [{ source, coverageKey, message, observedAt, lastSuccessfulObservedAt, freshness, sourceUrl: typeof item['sourceUrl'] === 'string' && item['sourceUrl'] ? item['sourceUrl'] : undefined }]
  })
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const toIsoOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(String(value))
  const time = date.getTime()
  return Number.isFinite(time) ? date.toISOString() : null
}
const toTelemetryOrNull = (row: Record<string, unknown>): HydrologyTelemetry | null => {
  if (!row['station_id']) return null
  const observedAt = toIsoOrNull(row['observed_at'])
  const ingestedAt = toIsoOrNull(row['ingested_at'])
  const lastSuccessfulObservedAt = toIsoOrNull(row['last_successful_observed_at'])
  if (!row['source'] || !observedAt || !ingestedAt || !lastSuccessfulObservedAt || !row['unit'] || !row['metric'] || !row['quality'] || !row['freshness']) return null
  const value = row['value'] === null ? null : Number(row['value'])
  if (value !== null && !Number.isFinite(value)) return null
  const forecastHorizonDays = asNumber(row['forecast_horizon_days'])
  return {
    source: row['source'] as HydrologyTelemetry['source'],
    stationId: String(row['station_id']),
    observedAt,
    ingestedAt,
    lastSuccessfulObservedAt,
    value,
    unit: String(row['unit']),
    metric: row['metric'] as HydrologyTelemetry['metric'],
    quality: row['quality'] as HydrologyTelemetry['quality'],
    freshness: row['freshness'] as HydrologyTelemetry['freshness'],
    tendency: row['tendency'] ? String(row['tendency']) : undefined,
    forecastHorizonDays,
    confidence: row['confidence'] as HydrologyTelemetry['confidence'],
    sourceUrl: row['source_url'] ? String(row['source_url']) : undefined,
  }
}
const toTelemetry = (row: Record<string, unknown>): HydrologyTelemetry => {
  const telemetry = toTelemetryOrNull(row)
  if (!telemetry) throw new Error('Invalid hydrology telemetry row')
  return telemetry
}
