import type { QueryResult } from 'pg'
import type { HydrologyDenseContextV1, HydrologyStationReference, HydrologyTelemetry } from '@repo/zod-schemas'
import { forecastConfidenceForHorizon, referencePortsByZone, type FieldHydrologyMapping, type IngestionRunInput, type NormalizedHydrologyTelemetry } from './types'

interface Db { query(sql: string, params?: unknown[]): Promise<QueryResult> }

export interface MunicipalityGaugeMappings {
  primaryPnaPortId: string | null
  secondaryPnaPortIds: string[]
  inaStationIds: string[]
  smnRegionIds: string[]
  inmetStationIds: string[]
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
}

export interface MunicipalityTelemetryDashboard {
  municipality: Omit<MunicipalityTelemetryView, 'gaugeMappings' | 'latestTelemetry'>
  gaugeMappings: MunicipalityGaugeMappings
  latestTelemetry: HydrologyTelemetry[]
}

export class HydrologyRepository {
  constructor(private readonly db: Db) {}

  async saveTelemetryDeduped(records: NormalizedHydrologyTelemetry[], run: IngestionRunInput): Promise<{ inserted: number; unchanged: number }> {
    let inserted = 0
    let unchanged = 0
    const eligibleRecords = records.filter((item) => item.forecastHorizonDays === undefined || item.forecastHorizonDays <= 30)
    for (const record of eligibleRecords) {
      const latest = await this.db.query(
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
      await this.saveTelemetry([record])
      inserted += 1
    }
    await this.saveIngestionRun(run)
    return { inserted, unchanged }
  }

  async saveTelemetry(records: NormalizedHydrologyTelemetry[]): Promise<void> {
    for (const record of records.filter((item) => item.forecastHorizonDays === undefined || item.forecastHorizonDays <= 30)) {
      await this.db.query(
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
        [record.stationId, record.source, record.metric, record.observedAt, record.ingestedAt ?? new Date(), record.lastSuccessfulObservedAt, record.value, record.unit, record.tendency ?? null, record.forecastHorizonDays ?? null, record.confidence ?? forecastConfidenceForHorizon(record.forecastHorizonDays) ?? null, record.quality, record.freshness, record.sourceUrl ?? null, record.raw ?? {}],
      )
    }
  }

  async saveIngestionRun(run: IngestionRunInput): Promise<void> {
    await this.db.query(
      `INSERT INTO hydrology_ingestion_runs (source, station_id, status, started_at, finished_at, observed_from, observed_to, last_successful_observed_at, records_ingested, excluded_metrics, error_message, provenance_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [run.source, run.stationId ?? null, run.status, run.startedAt, run.finishedAt ?? null, run.observedFrom ?? null, run.observedTo ?? null, run.lastSuccessfulObservedAt ?? null, run.recordsIngested, run.excludedMetrics ?? [], run.errorMessage ?? null, run.provenanceUrl ?? null],
    )
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
    ) as QueryResult<{ locality_name: keyof typeof referencePortsByZone }>
    const zone = result.rows[0]?.locality_name ?? null
    return { fieldId, zone, referencePorts: zone ? referencePortsByZone[zone] : [] }
  }

  async getDenseContextForField(fieldId: string, fieldBoundaryWkt: string): Promise<HydrologyDenseContextV1> {
    const mapping = await this.mapFieldToHydrologyZone(fieldBoundaryWkt, fieldId)
    if (!mapping.zone) return { contractVersion: 'hydrology-dense-context-v1', fieldId, zone: null, sources: [], stations: [], snapshot: { riskLevel: 'unknown', freshness: 'degraded', quality: 'missing', recommendation: 'Sin datos oficiales disponibles para este lote.', lastSuccessfulObservedAt: null }, telemetry: [] }

    const stationResult = await this.db.query(
      `SELECT id, source, station_name, river_name, zone, source_url FROM hydrology_stations WHERE id = ANY($1) AND is_active = true`,
      [mapping.referencePorts],
    ) as QueryResult<{ id: string; source: HydrologyStationReference['source']; station_name: string; river_name: string | null; zone: HydrologyStationReference['zone']; source_url: string | null }>
    const telemetryResult = await this.db.query(
      `SELECT source, station_id, observed_at, ingested_at, last_successful_observed_at, value, unit, metric, quality, freshness, tendency, forecast_horizon_days, confidence, source_url
         FROM hydrology_telemetry
        WHERE station_id = ANY($1) AND (forecast_horizon_days IS NULL OR forecast_horizon_days <= 30)
        ORDER BY observed_at DESC`,
      [mapping.referencePorts],
    ) as QueryResult<Record<string, unknown>>

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
    const { gaugeMappings, latestTelemetry, ...municipality } = view
    return { municipality, gaugeMappings, latestTelemetry }
  }

  async pruneOldData(retentionDays = 30, now = new Date()): Promise<{ telemetryDeleted: number; snapshotsDeleted: number }> {
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)
    const telemetry = await this.db.query('DELETE FROM hydrology_telemetry WHERE observed_at < $1', [cutoff])
    const snapshots = await this.db.query('DELETE FROM hydrology_field_risk_snapshots WHERE computed_at < $1', [cutoff])
    return { telemetryDeleted: telemetry.rowCount ?? 0, snapshotsDeleted: snapshots.rowCount ?? 0 }
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
}

const municipalityTelemetrySql = (where: string) => `SELECT
    m.id AS municipality_id,
    m.locality_id,
    m.name AS municipality_name,
    m.province_code,
    m.alert_height_m,
    m.evacuation_height_m,
    mgm.primary_pna_port_id,
    COALESCE(mgm.secondary_pna_port_ids, '{}') AS secondary_pna_port_ids,
    COALESCE(mgm.ina_station_ids, '{}') AS ina_station_ids,
    COALESCE(mgm.smn_region_ids, '{}') AS smn_region_ids,
    COALESCE(mgm.inmet_station_ids, '{}') AS inmet_station_ids,
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
    latest.source_url
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
      ARRAY[mgm.primary_pna_port_id]
        || COALESCE(mgm.secondary_pna_port_ids, '{}')
        || COALESCE(mgm.ina_station_ids, '{}')
        || COALESCE(mgm.smn_region_ids, '{}')
        || COALESCE(mgm.inmet_station_ids, '{}'),
      NULL
    ))
      AND (ht.forecast_horizon_days IS NULL OR ht.forecast_horizon_days <= 30)
    ORDER BY ht.source, ht.station_id, ht.metric, ht.unit, ht.forecast_horizon_days, ht.observed_at DESC, ht.ingested_at DESC
  ) latest ON true
  WHERE ${where}
  ORDER BY m.name, latest.source, latest.station_id, latest.metric`

const asNumber = (value: unknown): number | undefined => value === null || value === undefined ? undefined : Number(value)
const asTextArray = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : []
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
    }
    if (!byId.has(row.municipality_id)) byId.set(row.municipality_id, current)
    if (row.station_id) current.latestTelemetry.push(toTelemetry(row))
  }
  return [...byId.values()]
}

const toIso = (value: unknown): string => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString()
const toTelemetry = (row: Record<string, unknown>): HydrologyTelemetry => ({
  source: row['source'] as HydrologyTelemetry['source'],
  stationId: String(row['station_id']),
  observedAt: toIso(row['observed_at']),
  ingestedAt: toIso(row['ingested_at']),
  lastSuccessfulObservedAt: toIso(row['last_successful_observed_at']),
  value: row['value'] === null ? null : Number(row['value']),
  unit: String(row['unit']),
  metric: row['metric'] as HydrologyTelemetry['metric'],
  quality: row['quality'] as HydrologyTelemetry['quality'],
  freshness: row['freshness'] as HydrologyTelemetry['freshness'],
  tendency: row['tendency'] ? String(row['tendency']) : undefined,
  forecastHorizonDays: row['forecast_horizon_days'] === null ? undefined : Number(row['forecast_horizon_days']),
  confidence: row['confidence'] as HydrologyTelemetry['confidence'],
  sourceUrl: row['source_url'] ? String(row['source_url']) : undefined,
})
