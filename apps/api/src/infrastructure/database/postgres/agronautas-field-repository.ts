import type { Pool, QueryResult } from 'pg'
import { corrientesRiceZoneBoundarySource } from '@repo/zod-schemas'
import { Field, FieldContext } from '../../../domain/entities/agronautas'
import type { FieldContextRepository, FieldRepository, SupportedCoverageResult } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'

export const CORRIENTES_COVERAGE_QUERY = `
SELECT
  ST_Contains(zone.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS inside_supported_area,
  locality.name AS locality,
  locality.province_code,
  zone.boundary_version,
  CASE WHEN locality.name IS NULL THEN 0 ELSE 1 END::float AS locality_confidence,
  CASE WHEN ST_Contains(zone.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)) THEN NULL ELSE 'outside_corrientes_rice_zone' END AS stale_cause
FROM agronautas_boundaries zone
LEFT JOIN agronautas_localities locality
  ON ST_Contains(locality.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
WHERE zone.scope = 'corrientes_rice'
LIMIT 1
`

function normalizeCoverage(result?: QueryResult['rows'][number]): SupportedCoverageResult {
  if (!result) {
    return {
      insideSupportedArea: false,
      staleCause: 'coverage_not_loaded',
    }
  }

  return {
    insideSupportedArea: Boolean(result.inside_supported_area),
    locality: result.locality ?? undefined,
    provinceCode: result.province_code ?? undefined,
    boundaryVersion: result.boundary_version ?? undefined,
    localityConfidence: result.locality_confidence == null ? undefined : Number(result.locality_confidence),
    staleCause: result.stale_cause ?? undefined,
  }
}

export class PostgresFieldRepository implements FieldRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async save(field: Field): Promise<void> {
    await this.pool.query(
      `INSERT INTO fields (
        id, external_field_id, crop, hectares, locality_name, province_code,
        centroid_lat, centroid_lng, boundary_source, boundary_version
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
      ON CONFLICT (id) DO UPDATE SET
        hectares = EXCLUDED.hectares,
        locality_name = EXCLUDED.locality_name,
        province_code = EXCLUDED.province_code,
        centroid_lat = EXCLUDED.centroid_lat,
        centroid_lng = EXCLUDED.centroid_lng,
        boundary_source = EXCLUDED.boundary_source,
        boundary_version = EXCLUDED.boundary_version,
        updated_at = NOW()`,
      [
        field.props.id,
        field.props.externalFieldId,
        field.props.crop,
        field.props.hectares,
        field.props.localityName,
        field.props.provinceCode,
        field.props.centroid.lat,
        field.props.centroid.lng,
        JSON.stringify(field.props.boundaryMetadata),
        field.props.boundaryMetadata.sourceVersion,
      ],
    )
  }

  async findByExternalFieldId(fieldId: string): Promise<Field | null> {
    const result = await this.pool.query(
      `SELECT id, external_field_id, crop, hectares, locality_name, province_code, centroid_lat, centroid_lng, boundary_source
       FROM fields WHERE external_field_id = $1 LIMIT 1`,
      [fieldId],
    )

    const row = result.rows[0]
    if (!row) return null

    return new Field({
      id: row.id,
      externalFieldId: row.external_field_id,
      crop: row.crop,
      hectares: Number(row.hectares),
      localityName: row.locality_name,
      provinceCode: row.province_code,
      centroid: { lat: Number(row.centroid_lat), lng: Number(row.centroid_lng) },
      boundaryMetadata: (row.boundary_source as typeof corrientesRiceZoneBoundarySource) ?? corrientesRiceZoneBoundarySource,
    })
  }

  async findById(fieldId: string): Promise<Field | null> {
    const result = await this.pool.query(
      `SELECT id, external_field_id, crop, hectares, locality_name, province_code, centroid_lat, centroid_lng, boundary_source
       FROM fields WHERE id = $1 LIMIT 1`,
      [fieldId],
    )

    const row = result.rows[0]
    if (!row) return null

    return new Field({
      id: row.id,
      externalFieldId: row.external_field_id,
      crop: row.crop,
      hectares: Number(row.hectares),
      localityName: row.locality_name,
      provinceCode: row.province_code,
      centroid: { lat: Number(row.centroid_lat), lng: Number(row.centroid_lng) },
      boundaryMetadata: (row.boundary_source as typeof corrientesRiceZoneBoundarySource) ?? corrientesRiceZoneBoundarySource,
    })
  }

  async resolveCoverage(point: { lat: number; lng: number }): Promise<SupportedCoverageResult> {
    const result = await this.pool.query(CORRIENTES_COVERAGE_QUERY, [point.lng, point.lat])
    return normalizeCoverage(result.rows[0])
  }
}

export class PostgresFieldContextRepository implements FieldContextRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async save(context: FieldContext): Promise<void> {
    await this.pool.query(
      `INSERT INTO field_contexts (
        id, field_id, growth_stage, nearest_station_id, locality_canonical, locality_confidence, context_payload
      ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::jsonb)`,
      [
        context.props.fieldId,
        context.props.growthStage ?? null,
        context.props.nearestStationId ?? null,
        context.props.localityCanonical,
        context.props.localityConfidence,
        JSON.stringify(context.props.contextPayload),
      ],
    )
  }

  async getLatest(fieldId: string): Promise<FieldContext | null> {
    const result = await this.pool.query(
      `SELECT field_id, growth_stage, nearest_station_id, locality_canonical, locality_confidence, context_payload
       FROM field_contexts WHERE field_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [fieldId],
    )

    const row = result.rows[0]
    if (!row) return null

    return new FieldContext({
      fieldId: row.field_id,
      growthStage: row.growth_stage ?? undefined,
      nearestStationId: row.nearest_station_id ?? undefined,
      localityCanonical: row.locality_canonical,
      localityConfidence: Number(row.locality_confidence),
      contextPayload: (row.context_payload as Record<string, unknown>) ?? {},
    })
  }
}

export { normalizeCoverage }
