import type { GeoPoint } from '../entities/agronautas'
import type { FieldGeometrySource } from './types'

const POLYGON_WKT_PATTERN = /^POLYGON\s*\(\((.*)\)\)$/is
const MAX_POLYGON_POINTS = 1_000

export interface PolygonCoordinate {
  lng: number
  lat: number
}

export interface FieldGeometry {
  polygonWkt: string
  centroid: GeoPoint
  areaM2: number
  hectares: number
  perimeterM: number
  status: 'saved' | 'point_only' | 'unavailable'
  source: FieldGeometrySource
  updatedAt: Date | null
}

export interface FieldGeometryInput {
  polygonWkt?: string
  geoJson?: { type: 'Polygon'; coordinates: number[][][] }
}

export function normalizeFieldGeometryInput(input: FieldGeometryInput): { polygonWkt: string; coordinates: PolygonCoordinate[] } {
  const polygonWkt = input.polygonWkt ?? toPolygonWkt(input.geoJson?.coordinates)
  const match = POLYGON_WKT_PATTERN.exec(polygonWkt.trim())
  if (!match) throw new Error('Only POLYGON WKT is supported')

  const coordinates = match[1]!.split(',').map((pair): PolygonCoordinate => {
    const values = pair.trim().split(/\s+/).map(Number)
    if (values.length !== 2 || values.some((value) => !Number.isFinite(value))) throw new Error('Invalid polygon coordinate')
    const lng = values[0]
    const lat = values[1]
    if (lng === undefined || lat === undefined) throw new Error('Invalid polygon coordinate')
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) throw new Error('coordinates out of range')
    return { lng, lat }
  })

  if (coordinates.length < 4) throw new Error('closed polygon requires at least four points')
  if (!sameCoordinate(coordinates[0], coordinates.at(-1))) throw new Error('closed polygon requires first and last points to match')
  if (coordinates.length > MAX_POLYGON_POINTS) throw new Error('polygon has too many points')
  if (hasSelfIntersection(coordinates)) throw new Error('self-intersecting polygon is not supported')
  if (Math.abs(signedArea(coordinates)) === 0) throw new Error('polygon must have non-zero area')

  return { polygonWkt: toPolygonWkt([coordinates.map((point) => [point.lng, point.lat])]), coordinates }
}

export function polygonMetrics(coordinates: PolygonCoordinate[]): Pick<FieldGeometry, 'centroid' | 'areaM2' | 'hectares' | 'perimeterM'> {
  const earthRadiusM = 6_378_137
  const meanLat = coordinates.reduce((sum, point) => sum + point.lat, 0) / coordinates.length
  const metersPerDegreeLat = Math.PI * earthRadiusM / 180
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(meanLat * Math.PI / 180)
  const planar = coordinates.slice(0, -1).map((point) => ({ x: point.lng * metersPerDegreeLng, y: point.lat * metersPerDegreeLat }))
  const area = Math.abs(planar.reduce((sum, point, index) => {
    const next = planar[(index + 1) % planar.length]!
    return sum + point.x * next.y - next.x * point.y
  }, 0) / 2)
  const centroid = centroidOf(coordinates, area, metersPerDegreeLat, metersPerDegreeLng)
  const perimeterM = coordinates.slice(0, -1).reduce((sum, point, index) => sum + distanceM(point, coordinates[index + 1]!, meanLat), 0)
  return { centroid, areaM2: area, hectares: area / 10_000, perimeterM }
}

function centroidOf(coordinates: PolygonCoordinate[], areaM2: number, metersPerDegreeLat: number, metersPerDegreeLng: number): GeoPoint {
  const planar = coordinates.slice(0, -1).map((point) => ({ x: point.lng * metersPerDegreeLng, y: point.lat * metersPerDegreeLat }))
  const crossSum = planar.reduce((sum, point, index) => {
    const next = planar[(index + 1) % planar.length]!
    return sum + point.x * next.y - next.x * point.y
  }, 0)
  if (areaM2 === 0 || crossSum === 0) return coordinates[0]!
  const factor = 1 / (3 * crossSum)
  const x = planar.reduce((sum, point, index) => {
    const next = planar[(index + 1) % planar.length]!
    return sum + (point.x + next.x) * (point.x * next.y - next.x * point.y)
  }, 0) * factor
  const y = planar.reduce((sum, point, index) => {
    const next = planar[(index + 1) % planar.length]!
    return sum + (point.y + next.y) * (point.x * next.y - next.x * point.y)
  }, 0) * factor
  return { lat: y / metersPerDegreeLat, lng: x / metersPerDegreeLng }
}

function distanceM(left: PolygonCoordinate, right: PolygonCoordinate, meanLat: number): number {
  const latScale = 111_320
  const lngScale = latScale * Math.cos(meanLat * Math.PI / 180)
  return Math.hypot((right.lat - left.lat) * latScale, (right.lng - left.lng) * lngScale)
}

function signedArea(coordinates: PolygonCoordinate[]): number {
  return coordinates.slice(0, -1).reduce((sum, point, index) => {
    const next = coordinates[index + 1]!
    return sum + point.lng * next.lat - next.lng * point.lat
  }, 0) / 2
}

function hasSelfIntersection(coordinates: PolygonCoordinate[]): boolean {
  const edges = coordinates.slice(0, -1).map((point, index) => [point, coordinates[index + 1]!] as const)
  for (let first = 0; first < edges.length; first += 1) {
    for (let second = first + 1; second < edges.length; second += 1) {
      if (second === first + 1 || (first === 0 && second === edges.length - 1)) continue
      if (segmentsIntersect(edges[first]![0], edges[first]![1], edges[second]![0], edges[second]![1])) return true
    }
  }
  return false
}

function segmentsIntersect(a: PolygonCoordinate, b: PolygonCoordinate, c: PolygonCoordinate, d: PolygonCoordinate): boolean {
  const orient = (p: PolygonCoordinate, q: PolygonCoordinate, r: PolygonCoordinate) => (q.lng - p.lng) * (r.lat - p.lat) - (q.lat - p.lat) * (r.lng - p.lng)
  const abC = orient(a, b, c)
  const abD = orient(a, b, d)
  const cdA = orient(c, d, a)
  const cdB = orient(c, d, b)
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))
}

function sameCoordinate(left: PolygonCoordinate | undefined, right: PolygonCoordinate | undefined): boolean {
  return Boolean(left && right && left.lng === right.lng && left.lat === right.lat)
}

function toPolygonWkt(coordinates: number[][][] | undefined): string {
  if (!coordinates?.[0]) throw new Error('A Polygon geometry is required')
  return `POLYGON ((${coordinates[0].map((point) => `${point[0]} ${point[1]}`).join(', ')}))`
}
