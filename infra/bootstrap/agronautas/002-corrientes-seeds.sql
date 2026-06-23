INSERT INTO agronautas_boundaries (id, scope, province_code, locality_name, boundary_version, boundary)
VALUES (
  'corrientes-rice-zone-v1',
  'corrientes_rice',
  'AR-W',
  'Mercedes',
  'corrientes-rice-zone-v1',
  ST_Multi(ST_GeomFromText('POLYGON((-58.45 -29.55,-57.65 -29.55,-57.65 -28.95,-58.45 -28.95,-58.45 -29.55))', 4326))
)
ON CONFLICT (id) DO UPDATE SET
  scope = EXCLUDED.scope,
  province_code = EXCLUDED.province_code,
  locality_name = EXCLUDED.locality_name,
  boundary_version = EXCLUDED.boundary_version,
  boundary = EXCLUDED.boundary;

INSERT INTO agronautas_localities (id, province_code, name, boundary)
VALUES (
  'mercedes-ar-w',
  'AR-W',
  'Mercedes',
  ST_Multi(ST_GeomFromText('POLYGON((-58.35 -29.42,-57.82 -29.42,-57.82 -29.03,-58.35 -29.03,-58.35 -29.42))', 4326))
)
ON CONFLICT (id) DO UPDATE SET
  province_code = EXCLUDED.province_code,
  name = EXCLUDED.name,
  boundary = EXCLUDED.boundary;

INSERT INTO hydrology_stations (
  id,
  source,
  station_code,
  station_name,
  river_name,
  zone,
  province_code,
  country_code,
  location,
  source_url
)
VALUES
  (
    'ituzaingo',
    'PNA',
    'ituzaingo',
    'Puerto Ituzaingó',
    'Río Paraná',
    'Ituzaingó',
    'AR-W',
    'AR',
    ST_SetSRID(ST_MakePoint(-56.685, -27.590), 4326),
    'https://www.argentina.gob.ar/prefecturanaval'
  ),
  (
    'paso_de_la_patria',
    'PNA',
    'paso_de_la_patria',
    'Puerto Paso de la Patria',
    'Río Paraná',
    'Mercedes',
    'AR-W',
    'AR',
    ST_SetSRID(ST_MakePoint(-58.572, -27.317), 4326),
    'https://www.argentina.gob.ar/prefecturanaval'
  ),
  (
    'corrientes',
    'PNA',
    'corrientes',
    'Puerto Corrientes',
    'Río Paraná',
    'Mercedes',
    'AR-W',
    'AR',
    ST_SetSRID(ST_MakePoint(-58.834, -27.469), 4326),
    'https://www.argentina.gob.ar/prefecturanaval'
  ),
  (
    'santo_tome',
    'PNA',
    'santo_tome',
    'Puerto Santo Tomé',
    'Río Uruguay',
    'Virasoro',
    'AR-W',
    'AR',
    ST_SetSRID(ST_MakePoint(-56.040, -28.550), 4326),
    'https://www.argentina.gob.ar/prefecturanaval'
  )
ON CONFLICT (id) DO UPDATE SET
  source = EXCLUDED.source,
  station_code = EXCLUDED.station_code,
  station_name = EXCLUDED.station_name,
  river_name = EXCLUDED.river_name,
  zone = EXCLUDED.zone,
  province_code = EXCLUDED.province_code,
  country_code = EXCLUDED.country_code,
  location = EXCLUDED.location,
  source_url = EXCLUDED.source_url,
  is_active = true,
  updated_at = now();
