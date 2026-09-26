import type { QueryResult } from 'pg'
import type { HydrologyDenseContextV1, HydrologyIberaRunStatus, HydrologyIberaSourceProvenance, HydrologyIberaSourceResult, HydrologyStationReference, HydrologyTelemetry, HydrologySource } from '@repo/zod-schemas'
import { forecastConfidenceForHorizon, getIberaCoverageStatus, referencePortsByZone, type FieldHydrologyMapping, type IberaEvidenceQuery, type IberaEvidenceTimeline, type IberaIngestRunInput, type IberaIngestRunRecord, type IberaIngestRunPage, type IngestionRunInput, type NormalizedHydrologyTelemetry } from './types.js'

interface DbExecutor { query(sql: string, params?: unknown[]): Promise<QueryResult> }
interface Db extends DbExecutor { connect?: () => Promise<DbClient> }
interface DbClient extends DbExecutor { release(): void }

interface IberaIngestRunRow extends Record<string, unknown> {
  id: string
  proof_run_id: string
  status: HydrologyIberaRunStatus
  requested_sources: HydrologySource[]
  scheduled_slot: string | null
  lease_owner: string | null
  lease_expires_at: Date | string | null
  source_results: HydrologyIberaSourceResult[] | string
  diagnostics: Record<string, unknown> | string
  reason: string | null
  started_at: Date | string
  finished_at: Date | string | null
  expires_at: Date | string
  created_at?: Date | string
  updated_at?: Date | string
}

function parseJson<T>(value: T | string): T {
  return typeof value === 'string' ? JSON.parse(value) as T : value
}

function toIberaIngestRunRecord(row: IberaIngestRunRow): IberaIngestRunRecord {
  return {
    id: row.id,
    proofRunId: row.proof_run_id,
    status: row.status,
    requestedSources: row.requested_sources,
    sourceResults: parseJson(row.source_results),
    diagnostics: parseJson(row.diagnostics),
    ...(row.scheduled_slot ? { scheduledSlot: row.scheduled_slot } : {}),
    ...(row.lease_owner ? { leaseOwner: row.lease_owner } : {}),
    ...(row.lease_expires_at ? { leaseExpiresAt: new Date(row.lease_expires_at) } : {}),
    ...(row.reason ? { reason: row.reason } : {}),
    startedAt: new Date(row.started_at),
    ...(row.finished_at ? { finishedAt: new Date(row.finished_at) } : {}),
    expiresAt: new Date(row.expires_at),
    ...(row.created_at ? { createdAt: new Date(row.created_at) } : {}),
    ...(row.updated_at ? { updatedAt: new Date(row.updated_at) } : {}),
  }
}

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

export interface HydrologySourceFreshness {
  source: HydrologyTelemetry['source']
  latestStatus: 'success' | 'failed' | 'partial' | 'excluded'
  latestRecordsIngested: number
  lastSuccessfulObservedAt: string | null
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
      await this.ensureStation(record, db)
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
        [record.stationId, record.source, record.metric, record.observedAt, record.ingestedAt ?? new Date(), record.lastSuccessfulObservedAt, record.metric === 'storm_alert' ? null : record.value, record.unit, record.tendency ?? null, record.forecastHorizonDays ?? null, record.confidence ?? forecastConfidenceForHorizon(record.forecastHorizonDays) ?? null, record.quality, record.freshness, record.sourceUrl ?? null, { ...record.raw, ...(record.providerAlertId ? { providerAlertId: record.providerAlertId } : {}), ...(record.coverageKey ? { coverageKey: record.coverageKey } : {}) }],
      )
    }
  }

  private async ensureStation(record: NormalizedHydrologyTelemetry, db: DbExecutor = this.db): Promise<void> {
    const stationName = typeof record.raw?.['title'] === 'string' ? record.raw['title'].slice(0, 160) : `${record.source} ${record.stationId}`
    await db.query(
      `INSERT INTO hydrology_stations (id, source, station_code, station_name, river_name, zone, source_url, is_active, country_code)
       VALUES ($1,$2,$1,$3,null,null,$4,true,'AR')
       ON CONFLICT (id) DO UPDATE SET station_name = EXCLUDED.station_name, source_url = EXCLUDED.source_url, is_active = true, updated_at = now()`,
      [record.stationId, record.source, stationName, record.sourceUrl ?? null],
    )
  }

  async saveIngestionRun(run: IngestionRunInput): Promise<void> {
    await this.db.query(
      `INSERT INTO hydrology_ingestion_runs (source, proof_run_id, station_id, status, started_at, finished_at, observed_from, observed_to, last_successful_observed_at, records_ingested, excluded_metrics, error_message, provenance_url, ibera_run_id, diagnostics)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [run.source, run.proofRunId ?? null, run.stationId ?? null, run.status, run.startedAt, run.finishedAt ?? null, run.observedFrom ?? null, run.observedTo ?? null, run.lastSuccessfulObservedAt ?? null, run.recordsIngested, run.excludedMetrics ?? [], run.errorMessage ?? null, run.provenanceUrl ?? null, run.iberaRunId ?? null, run.diagnostics ?? {}],
    )
  }

  async createIberaIngestRun(input: IberaIngestRunInput): Promise<{ record: IberaIngestRunRecord; created: boolean }> {
    const result = await this.db.query(
      `INSERT INTO ibera_ingest_runs (id, proof_run_id, status, requested_sources, scheduled_slot, lease_owner, lease_expires_at, source_results, diagnostics, reason, started_at, finished_at, expires_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,now())
       ON CONFLICT (id) DO NOTHING
       RETURNING id, proof_run_id, status, requested_sources, scheduled_slot, lease_owner, lease_expires_at, source_results, diagnostics, reason, started_at, finished_at, expires_at, created_at, updated_at`,
      [input.id, input.proofRunId, input.status, input.requestedSources, input.scheduledSlot ?? null, input.leaseOwner ?? null, input.leaseExpiresAt ?? null, JSON.stringify(input.sourceResults), JSON.stringify(input.diagnostics), input.reason ?? null, input.startedAt, input.finishedAt ?? null, input.expiresAt],
    ) as QueryResult<IberaIngestRunRow>
    if (result.rows[0]) return { record: toIberaIngestRunRecord(result.rows[0]), created: true }
    const existing = await this.getIberaIngestRun(input.id)
    if (!existing) throw new Error('Iberá ingest ledger admission did not return a record')
    return { record: existing, created: false }
  }

  async updateIberaIngestRun(id: string, patch: Partial<Pick<IberaIngestRunInput, 'status' | 'sourceResults' | 'diagnostics' | 'leaseOwner' | 'leaseExpiresAt' | 'finishedAt'>>): Promise<void> {
    const result = await this.db.query(
      `UPDATE ibera_ingest_runs
          SET status = COALESCE($2, status), source_results = COALESCE($3::jsonb, source_results), diagnostics = COALESCE($4::jsonb, diagnostics), lease_owner = COALESCE($5, lease_owner), lease_expires_at = COALESCE($6, lease_expires_at), finished_at = COALESCE($7, finished_at), updated_at = now()
        WHERE id = $1`,
      [id, patch.status ?? null, patch.sourceResults ? JSON.stringify(patch.sourceResults) : null, patch.diagnostics ? JSON.stringify(patch.diagnostics) : null, patch.leaseOwner ?? null, patch.leaseExpiresAt ?? null, patch.finishedAt ?? null],
    )
    if ((result.rowCount ?? 0) === 0) throw new Error('Iberá ingest ledger run not found')
  }

  async claimIberaIngestLease(id: string, owner: string, now = new Date(), leaseMs = 120_000): Promise<IberaIngestRunRecord | null> {
    const result = await this.db.query(
      `UPDATE ibera_ingest_runs
          SET status = CASE WHEN status = 'queued' THEN 'started' ELSE status END,
              lease_owner = $2,
              lease_expires_at = $3 + ($4::bigint * interval '1 millisecond'),
              updated_at = now()
        WHERE id = $1
          AND (lease_owner IS NULL OR lease_expires_at <= $3)
          AND status IN ('queued', 'started', 'partial')
        RETURNING id, proof_run_id, status, requested_sources, scheduled_slot, lease_owner, lease_expires_at, source_results, diagnostics, reason, started_at, finished_at, expires_at, created_at, updated_at`,
      [id, owner, now, leaseMs],
    ) as QueryResult<IberaIngestRunRow>
    return result.rows[0] ? toIberaIngestRunRecord(result.rows[0]) : null
  }

  async getIberaIngestRun(id: string): Promise<IberaIngestRunRecord | null> {
    const result = await this.db.query(
      `SELECT id, proof_run_id, status, requested_sources, scheduled_slot, lease_owner, lease_expires_at, source_results, diagnostics, reason, started_at, finished_at, expires_at, created_at, updated_at
         FROM ibera_ingest_runs
        WHERE id = $1 AND expires_at > now()`,
      [id],
    ) as QueryResult<IberaIngestRunRow>
    return result.rows[0] ? toIberaIngestRunRecord(result.rows[0]) : null
  }

  async listIberaIngestRuns(input: { limit: number; cursor?: string }): Promise<IberaIngestRunPage> {
    const limit = Math.min(100, Math.max(1, Math.floor(input.limit)))
    const result = await this.db.query(
      `SELECT id, proof_run_id, status, requested_sources, scheduled_slot, lease_owner, lease_expires_at, source_results, diagnostics, reason, started_at, finished_at, expires_at, created_at, updated_at
         FROM ibera_ingest_runs
        WHERE expires_at > now() AND ($2::timestamptz IS NULL OR started_at < $2::timestamptz)
        ORDER BY started_at DESC, id DESC
        LIMIT $1`,
      [limit + 1, input.cursor ? new Date(input.cursor) : null],
    ) as QueryResult<IberaIngestRunRow>
    const rows = result.rows.slice(0, limit)
    return { items: rows.map(toIberaIngestRunRecord), nextCursor: result.rows.length > limit ? rows.at(-1)?.started_at ? new Date(rows.at(-1)!.started_at).toISOString() : null : null }
  }

  async getSourceFreshness(): Promise<HydrologySourceFreshness[]> {
    const result = await this.db.query(
      `SELECT source,
              (array_agg(status ORDER BY started_at DESC))[1] AS latest_status,
              (array_agg(records_ingested ORDER BY started_at DESC))[1] AS latest_records_ingested,
              MAX(CASE WHEN status = 'success' THEN COALESCE(last_successful_observed_at, observed_to, finished_at, started_at) END) AS last_successful_observed_at
         FROM hydrology_ingestion_runs
        GROUP BY source
        ORDER BY source`,
    ) as QueryResult<{ source: HydrologyTelemetry['source']; latest_status: HydrologySourceFreshness['latestStatus']; latest_records_ingested: number | string | null; last_successful_observed_at: Date | string | null }>
    return result.rows.map((row) => ({
      source: row.source,
      latestStatus: row.latest_status,
      latestRecordsIngested: Number(row.latest_records_ingested ?? 0),
      lastSuccessfulObservedAt: toIsoOrNull(row.last_successful_observed_at),
    }))
  }

  async findUnmappedAlertCoverageKeys(source: Extract<HydrologyTelemetry['source'], 'SMN' | 'INMET'>, coverageKeys: string[]): Promise<string[]> {
    const keys = [...new Set(coverageKeys.filter(Boolean))]
    if (keys.length === 0) return []
    const result = await this.db.query(
      `SELECT DISTINCT requested.requested_key
         FROM unnest($2::text[]) AS requested(requested_key)
        WHERE NOT EXISTS (
          SELECT 1 FROM municipality_alert_coverage coverage
           WHERE coverage.source = $1
             AND coverage.official_coverage_key = requested.requested_key
             AND coverage.active = true
        )`,
      [source, keys],
    ) as QueryResult<{ requested_key: string }>
    return result.rows.map((row) => row.requested_key)
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

  async getIberaEvidenceTimeline(input: IberaEvidenceQuery): Promise<IberaEvidenceTimeline> {
    const limit = Math.min(50, Math.max(1, Math.floor(input.limit)))
    const result = await this.db.query(
      `SELECT id, kind, occurred_at, source, source_url, evidence_state, title, detail
         FROM ibera_evidence_events
        WHERE municipality_id = $1
          AND ($2::timestamptz IS NULL OR occurred_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR occurred_at <= $3::timestamptz)
          AND ($4::timestamptz IS NULL OR occurred_at < $4::timestamptz)
        ORDER BY occurred_at DESC, id DESC
        LIMIT $5`,
      [input.municipalityId, input.from, input.to, input.cursor, limit + 1],
    ) as QueryResult<{ id: string; kind: 'telemetry' | 'official_alert'; occurred_at: Date | string; source: HydrologySource; source_url: string | null; evidence_state: 'observed' | 'forecast' | 'degraded' | 'missing'; title: string; detail: string }>
    const rows = result.rows.slice(0, limit)
    const events = rows.map((row) => ({ id: row.id, kind: row.kind, occurredAt: new Date(row.occurred_at).toISOString(), source: row.source, sourceUrl: row.source_url, evidenceState: row.evidence_state, title: row.title, detail: boundEvidenceDetail(row.detail) }))
    return { events, nextCursor: result.rows.length > limit && rows.at(-1) ? new Date(rows.at(-1)!.occurred_at).toISOString() : null, currentStatus: getIberaCoverageStatus(events.length ? events.map((event) => ({ status: event.evidenceState === 'observed' || event.evidenceState === 'forecast' ? 'supported' as const : 'partial' as const })) : []), lastKnownEvidence: events[0]?.occurredAt ?? null }
  }

  async getIberaSourceRegistry(municipalityId: string): Promise<HydrologyIberaSourceProvenance[]> {
    const result = await this.db.query(
      `SELECT source, station_id, coverage_key, source_url, freshness_policy, registry_version, review_status, reviewed_at, geometry_status
          FROM ibera_source_registry
        WHERE municipality_id = $1 AND review_status = 'reviewed'
        ORDER BY source, station_id, coverage_key`,
      [municipalityId],
    ) as QueryResult<{ source: HydrologySource; station_id: string | null; coverage_key: string | null; source_url: string; freshness_policy: string; registry_version: string; review_status: 'reviewed' | 'pending' | 'blocked'; reviewed_at: Date | string | null; geometry_status: 'verified' | 'unverified' | 'partial' | 'unavailable' }>
    return result.rows.map((row) => ({ source: row.source, stationId: row.station_id, coverageKey: row.coverage_key, sourceUrl: row.source_url, freshnessPolicy: row.freshness_policy, registryVersion: row.registry_version, reviewStatus: row.review_status, reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null, geometryStatus: row.geometry_status }))
  }

  async pruneOldData(retentionDays = 30, now = new Date()): Promise<{ telemetryDeleted: number; snapshotsDeleted: number; ledgerDeleted: number }> {
    const days = Number.isFinite(retentionDays) && retentionDays > 0 ? Math.floor(retentionDays) : 30
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const result = await this.db.query(
      `WITH expired AS (
         SELECT id FROM ibera_ingest_runs
          WHERE expires_at <= $1
          ORDER BY expires_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT $2
       )
       DELETE FROM ibera_ingest_runs run USING expired
        WHERE run.id = expired.id
       RETURNING run.id`,
      [cutoff, 100],
    )
    return { telemetryDeleted: 0, snapshotsDeleted: 0, ledgerDeleted: result.rows.length }
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
  raw?: unknown
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
  raw?: unknown
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
    latest.raw,
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
      ht.source_url,
      ht.raw
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
       AND (
         (ht.station_id NOT LIKE 'alert-%' AND ht.station_id = coverage.official_coverage_key)
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
    const message = typeof item['message'] === 'string' ? sanitizeOfficialAlertMessage(item['message']) : ''
    const observedAt = toIsoOrNull(item['observedAt'])
    const lastSuccessfulObservedAt = toIsoOrNull(item['lastSuccessfulObservedAt'])
    if ((source !== 'SMN' && source !== 'INMET') || typeof coverageKey !== 'string' || !coverageKey || typeof message !== 'string' || !message || !observedAt || !lastSuccessfulObservedAt) return []
    const freshness = item['freshness'] === 'fresh' ? 'fresh' : item['freshness'] === 'degraded' ? 'degraded' : undefined
    if (!freshness) return []
    return [{ source, coverageKey, message, observedAt, lastSuccessfulObservedAt, freshness, sourceUrl: typeof item['sourceUrl'] === 'string' && item['sourceUrl'] ? item['sourceUrl'] : undefined }]
  })
}

export function sanitizeOfficialAlertMessage(message: string): string {
  const sanitized = message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim()
  return sanitized.length > 300 ? `${sanitized.slice(0, 299).trimEnd()}…` : sanitized
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
  const raw = isRecord(row['raw']) ? row['raw'] : undefined
  const providerAlertId = typeof raw?.['providerAlertId'] === 'string' ? raw['providerAlertId'] : undefined
  const coverageKey = typeof raw?.['coverageKey'] === 'string' ? raw['coverageKey'] : undefined
  return {
    source: row['source'] as HydrologyTelemetry['source'],
    stationId: String(row['station_id']),
    ...(providerAlertId ? { providerAlertId } : {}),
    ...(coverageKey ? { coverageKey } : {}),
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

function boundEvidenceDetail(value: string): string {
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim()
  return normalized.length > 300 ? `${normalized.slice(0, 299).trimEnd()}…` : normalized
}
