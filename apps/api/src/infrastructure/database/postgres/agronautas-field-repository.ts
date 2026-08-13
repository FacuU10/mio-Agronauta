import type { Pool, QueryResult } from 'pg'
import { corrientesRiceZoneBoundarySource } from '@repo/zod-schemas'
import { Field, FieldContext } from '../../../domain/entities/agronautas'
import type { FieldContextRepository, FieldRepository, SupportedCoverageResult } from '../../../domain/repositories/agronautas'
import { getPostgresPool } from './pool'
import { normalizeFieldGeometryInput, polygonMetrics, type FieldGeometry, type FieldGeometryInput } from '../../../domain/geometry/field-geometry'
import type { FieldGeometryRepository } from '../../../domain/repositories/agronautas'

export const CORRIENTES_COVERAGE_QUERY = `
SELECT
  ST_Contains(zone.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS inside_supported_area,
  locality.name AS locality,
  locality.province_code,
  zone.boundary_version,
  CASE WHEN locality.name IS NULL THEN 0 ELSE 1 END::float AS locality_confidence,
  CASE
    WHEN NOT ST_Contains(zone.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)) THEN 'outside_corrientes_rice_zone'
    WHEN locality.name IS NULL THEN 'unsupported_locality'
    ELSE NULL
  END AS stale_cause
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

export class PostgresFieldRepository implements FieldRepository, FieldGeometryRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async save(field: Field): Promise<void> {
    const geometry = field.props.polygonWkt ? normalizeFieldGeometryInput({ polygonWkt: field.props.polygonWkt }) : null
    const metrics = geometry ? polygonMetrics(geometry.coordinates) : null
    await this.pool.query(
      `INSERT INTO fields (
        id, external_field_id, crop, hectares, locality_name, province_code,
        centroid_lat, centroid_lng, boundary_source, boundary_version, boundary, centroid, boundary_area_m2, boundary_perimeter_m, geometry_source, geometry_updated_at,
        "externalFieldId", "localityName", "provinceCode", "centroidLat", "centroidLng", "boundarySource", "boundaryVersion", "updatedAt"
      ) VALUES ($1,$2,$3,CASE WHEN $11 IS NULL THEN $4 ELSE ST_Area(ST_GeomFromText($11,4326)::geography) / 10000 END,$5,$6,CASE WHEN $11 IS NULL THEN $7 ELSE ST_Y(ST_Centroid(ST_GeomFromText($11,4326))) END,CASE WHEN $11 IS NULL THEN $8 ELSE ST_X(ST_Centroid(ST_GeomFromText($11,4326))) END,$9::jsonb,$10,CASE WHEN $11 IS NULL THEN NULL ELSE ST_Multi(ST_GeomFromText($11,4326)) END,CASE WHEN $11 IS NULL THEN NULL ELSE ST_Centroid(ST_GeomFromText($11,4326)) END,CASE WHEN $11 IS NULL THEN NULL ELSE ST_Area(ST_GeomFromText($11,4326)::geography) END,CASE WHEN $11 IS NULL THEN NULL ELSE ST_Perimeter(ST_GeomFromText($11,4326)::geography) END,$14,$15,$2,$5,$6,$7,$8,$9::jsonb,$10,NOW())
      ON CONFLICT (id) DO UPDATE SET
        hectares = EXCLUDED.hectares,
        locality_name = EXCLUDED.locality_name,
        province_code = EXCLUDED.province_code,
        centroid_lat = EXCLUDED.centroid_lat,
        centroid_lng = EXCLUDED.centroid_lng,
        boundary_source = EXCLUDED.boundary_source,
        boundary_version = EXCLUDED.boundary_version,
        boundary = EXCLUDED.boundary,
        centroid = EXCLUDED.centroid,
        boundary_area_m2 = EXCLUDED.boundary_area_m2,
        boundary_perimeter_m = EXCLUDED.boundary_perimeter_m,
        geometry_source = EXCLUDED.geometry_source,
        geometry_updated_at = EXCLUDED.geometry_updated_at,
        crop = EXCLUDED.crop,
        "externalFieldId" = EXCLUDED."externalFieldId",
        "localityName" = EXCLUDED."localityName",
        "provinceCode" = EXCLUDED."provinceCode",
        "centroidLat" = EXCLUDED."centroidLat",
        "centroidLng" = EXCLUDED."centroidLng",
        "boundarySource" = EXCLUDED."boundarySource",
        "boundaryVersion" = EXCLUDED."boundaryVersion",
        "updatedAt" = NOW(),
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
        geometry?.polygonWkt ?? null,
        metrics?.areaM2 ?? null,
        metrics?.perimeterM ?? null,
        field.props.geometrySource ?? null,
        geometry ? new Date() : null,
      ],
    )
  }

  async findByExternalFieldId(fieldId: string): Promise<Field | null> {
    const result = await this.pool.query(
       `SELECT id, external_field_id, crop, hectares, locality_name, province_code, centroid_lat, centroid_lng, boundary_source, ST_AsText(boundary) AS polygon_wkt, geometry_source
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
      polygonWkt: row.polygon_wkt ?? undefined,
      geometrySource: row.geometry_source ?? undefined,
    })
  }

  async list(input: { limit: number; cursor?: string }): Promise<{ items: Array<{ field: Field; createdAt: Date; updatedAt: Date; geometryUpdatedAt: Date | null }>; nextCursor: string | null }> {
    const limit = Math.min(100, Math.max(1, Math.floor(input.limit)))
    const result = await this.pool.query(
       `SELECT id, external_field_id, crop, hectares, locality_name, province_code, centroid_lat, centroid_lng, boundary_source, boundary_version, ST_AsText(boundary) AS polygon_wkt, geometry_source, geometry_updated_at, created_at, updated_at
         FROM fields
        WHERE ($2::timestamptz IS NULL OR updated_at < $2::timestamptz)
        ORDER BY updated_at DESC, id DESC
        LIMIT $1`,
      [limit + 1, input.cursor ? new Date(input.cursor) : null],
    )
    const rows = result.rows.slice(0, limit)
    return {
     items: rows.map((row) => ({ field: new Field({ id: row.id, externalFieldId: row.external_field_id, crop: row.crop, hectares: Number(row.hectares), localityName: row.locality_name, provinceCode: row.province_code, centroid: { lat: Number(row.centroid_lat), lng: Number(row.centroid_lng) }, boundaryMetadata: (row.boundary_source as typeof corrientesRiceZoneBoundarySource) ?? corrientesRiceZoneBoundarySource, polygonWkt: row.polygon_wkt ?? undefined, geometrySource: row.geometry_source ?? undefined }), createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at), geometryUpdatedAt: row.geometry_updated_at ? new Date(row.geometry_updated_at) : null })),
      nextCursor: result.rows.length > limit ? rows.at(-1)?.updated_at?.toISOString() ?? null : null,
    }
  }

  async findById(fieldId: string): Promise<Field | null> {
    const result = await this.pool.query(
       `SELECT id, external_field_id, crop, hectares, locality_name, province_code, centroid_lat, centroid_lng, boundary_source, ST_AsText(boundary) AS polygon_wkt, geometry_source
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
      polygonWkt: row.polygon_wkt ?? undefined,
      geometrySource: row.geometry_source ?? undefined,
    })
  }

  async resolveCoverage(point: { lat: number; lng: number }): Promise<SupportedCoverageResult> {
    const result = await this.pool.query(CORRIENTES_COVERAGE_QUERY, [point.lng, point.lat])
    return normalizeCoverage(result.rows[0])
  }

  async getGeometry(fieldId: string): Promise<FieldGeometry | null> {
    const result = await this.pool.query(
      `SELECT ST_AsText(boundary) AS polygon_wkt, ST_Y(ST_Centroid(boundary)) AS centroid_lat, ST_X(ST_Centroid(boundary)) AS centroid_lng,
              boundary_area_m2, boundary_perimeter_m, geometry_source, geometry_updated_at
         FROM fields WHERE id = $1 LIMIT 1`,
      [fieldId],
    )
    const row = result.rows[0]
    if (!row?.polygon_wkt) return null
    const normalized = normalizeFieldGeometryInput({ polygonWkt: row.polygon_wkt })
    const metrics = polygonMetrics(normalized.coordinates)
    return {
      polygonWkt: normalized.polygonWkt,
      centroid: { lat: Number(row.centroid_lat ?? metrics.centroid.lat), lng: Number(row.centroid_lng ?? metrics.centroid.lng) },
      areaM2: Number(row.boundary_area_m2 ?? metrics.areaM2),
      hectares: Number(row.boundary_area_m2 ?? metrics.areaM2) / 10_000,
      perimeterM: Number(row.boundary_perimeter_m ?? metrics.perimeterM),
      status: 'saved',
      source: row.geometry_source ?? 'operator',
      updatedAt: row.geometry_updated_at ? new Date(row.geometry_updated_at) : null,
    }
  }

  async updateGeometry(fieldId: string, geometry: FieldGeometryInput & { source: 'operator' | 'google' | 'fallback'; expectedUpdatedAt?: string }): Promise<FieldGeometry> {
    const normalized = normalizeFieldGeometryInput(geometry)
    const metrics = polygonMetrics(normalized.coordinates)
    const existing = await this.getGeometry(fieldId)
    if (existing && existing.polygonWkt === normalized.polygonWkt) {
      if (geometry.expectedUpdatedAt && existing.updatedAt?.toISOString() !== geometry.expectedUpdatedAt) throw new Error('STALE_GEOMETRY_VERSION')
      return existing
    }
    const result = await this.pool.query(
      `UPDATE fields
          SET boundary = ST_Multi(ST_GeomFromText($2,4326)), centroid = ST_Centroid(ST_GeomFromText($2,4326)),
              centroid_lat = ST_Y(ST_Centroid(ST_GeomFromText($2,4326))), centroid_lng = ST_X(ST_Centroid(ST_GeomFromText($2,4326))),
              hectares = ST_Area(ST_GeomFromText($2,4326)::geography) / 10000,
              boundary_area_m2 = ST_Area(ST_GeomFromText($2,4326)::geography),
              boundary_perimeter_m = ST_Perimeter(ST_GeomFromText($2,4326)::geography),
              geometry_source = $8, geometry_updated_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND ($9::timestamptz IS NULL OR geometry_updated_at = $9::timestamptz)
        RETURNING geometry_updated_at, centroid_lat, centroid_lng, hectares, boundary_area_m2, boundary_perimeter_m`,
      [fieldId, normalized.polygonWkt, metrics.centroid.lat, metrics.centroid.lng, metrics.hectares, metrics.areaM2, metrics.perimeterM, geometry.source, geometry.expectedUpdatedAt ?? null],
    )
    if (!result.rows[0]) {
      const exists = await this.pool.query('SELECT id FROM fields WHERE id = $1 LIMIT 1', [fieldId])
      if (!exists.rows[0]) throw new Error('FIELD_NOT_FOUND')
      throw new Error('STALE_GEOMETRY_VERSION')
    }
    const row = result.rows[0]
    return {
      polygonWkt: normalized.polygonWkt,
      centroid: { lat: Number(row.centroid_lat), lng: Number(row.centroid_lng) },
      areaM2: Number(row.boundary_area_m2),
      hectares: Number(row.hectares),
      perimeterM: Number(row.boundary_perimeter_m),
      status: 'saved',
      source: geometry.source,
      updatedAt: new Date(row.geometry_updated_at),
    }
  }
}

export class PostgresFieldContextRepository implements FieldContextRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async save(context: FieldContext): Promise<void> {
    await this.pool.query(
      `INSERT INTO field_contexts (
        id, field_id, growth_stage, nearest_station_id, locality_canonical, locality_confidence, context_payload,
        "fieldId", "growthStage", "nearestStationId", "localityCanonical", "localityConfidence", "contextPayload", "updatedAt"
      ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::jsonb, $1, $2, $3, $4, $5, $6::jsonb, NOW())
      ON CONFLICT (field_id) DO UPDATE SET
        growth_stage = EXCLUDED.growth_stage,
        nearest_station_id = EXCLUDED.nearest_station_id,
        locality_canonical = EXCLUDED.locality_canonical,
        locality_confidence = EXCLUDED.locality_confidence,
        context_payload = EXCLUDED.context_payload,
        "growthStage" = EXCLUDED."growthStage",
        "nearestStationId" = EXCLUDED."nearestStationId",
        "localityCanonical" = EXCLUDED."localityCanonical",
        "localityConfidence" = EXCLUDED."localityConfidence",
        "contextPayload" = EXCLUDED."contextPayload",
        "updatedAt" = NOW(),
        updated_at = NOW()`,
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
