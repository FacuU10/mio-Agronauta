export interface CorrientesDemoLocality {
  slug: string
  fieldId: string
  externalFieldId: string
  localityName: string
  provinceCode: 'AR-W'
  countryCode: 'AR'
  lat: number
  lng: number
  hectares: number
  growthStage: 'tillering' | 'panicle_initiation' | 'flowering' | 'maturity'
  demoTags: string[]
  riceRelevanceNotes: string
  coordinateSource: string
}

export const corrientesDemoLocalities: CorrientesDemoLocality[] = [
  {
    slug: 'mercedes',
    fieldId: 'corrientes-demo-mercedes',
    externalFieldId: 'corrientes-demo-mercedes',
    localityName: 'Mercedes',
    provinceCode: 'AR-W',
    countryCode: 'AR',
    lat: -29.1846,
    lng: -58.0759,
    hectares: 42.5,
    growthStage: 'tillering',
    demoTags: ['corrientes-demo', 'rice-core', 'dashboard-demo'],
    riceRelevanceNotes: 'Mercedes aporta cobertura del centro-sur arrocero correntino para el demo del dashboard y del chat grounded.',
    coordinateSource: 'OpenStreetMap / municipal centroid verification',
  },
  {
    slug: 'curuzu-cuatio',
    fieldId: 'corrientes-demo-curuzu-cuatio',
    externalFieldId: 'corrientes-demo-curuzu-cuatio',
    localityName: 'Curuzú Cuatiá',
    provinceCode: 'AR-W',
    countryCode: 'AR',
    lat: -29.7917,
    lng: -58.0542,
    hectares: 36.2,
    growthStage: 'panicle_initiation',
    demoTags: ['corrientes-demo', 'rice-expansion-belt', 'chat-grounding'],
    riceRelevanceNotes: 'Curuzú Cuatiá cubre el corredor sur con contexto útil para variabilidad térmica y presión hídrica del arroz.',
    coordinateSource: 'OpenStreetMap / departmental centroid verification',
  },
  {
    slug: 'paso-de-los-libres',
    fieldId: 'corrientes-demo-paso-de-los-libres',
    externalFieldId: 'corrientes-demo-paso-de-los-libres',
    localityName: 'Paso de los Libres',
    provinceCode: 'AR-W',
    countryCode: 'AR',
    lat: -29.7125,
    lng: -57.0877,
    hectares: 51.8,
    growthStage: 'flowering',
    demoTags: ['corrientes-demo', 'uruguay-basin', 'alerts-demo'],
    riceRelevanceNotes: 'Paso de los Libres representa el borde oriental con sensibilidad a lluvias intensas y presión de anegamiento.',
    coordinateSource: 'OpenStreetMap / city centroid verification',
  },
  {
    slug: 'santo-tome',
    fieldId: 'corrientes-demo-santo-tome',
    externalFieldId: 'corrientes-demo-santo-tome',
    localityName: 'Santo Tomé',
    provinceCode: 'AR-W',
    countryCode: 'AR',
    lat: -28.5494,
    lng: -56.0408,
    hectares: 48.4,
    growthStage: 'maturity',
    demoTags: ['corrientes-demo', 'northeast-rice', 'weather-demo'],
    riceRelevanceNotes: 'Santo Tomé añade cobertura noreste para humedad alta y contraste entre historia reciente y pronóstico corto.',
    coordinateSource: 'OpenStreetMap / city centroid verification',
  },
  {
    slug: 'ituzaingo',
    fieldId: 'corrientes-demo-ituzaingo',
    externalFieldId: 'corrientes-demo-ituzaingo',
    localityName: 'Ituzaingó',
    provinceCode: 'AR-W',
    countryCode: 'AR',
    lat: -27.5899,
    lng: -56.6892,
    hectares: 44.1,
    growthStage: 'flowering',
    demoTags: ['corrientes-demo', 'yacyreta-influence', 'copilot-demo'],
    riceRelevanceNotes: 'Ituzaingó cubre el norte con señal climática útil para explicar riesgos de calor y humedad en el demo.',
    coordinateSource: 'OpenStreetMap / city centroid verification',
  },
]

export function getCorrientesDemoLocality(slug: string): CorrientesDemoLocality | undefined {
  return corrientesDemoLocalities.find((locality) => locality.slug === slug)
}
