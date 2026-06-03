INSERT INTO agronautas_boundaries (id, province_code, locality_name, boundary_version, boundary)
VALUES (
  'corrientes-rice-zone-v1',
  'AR-W',
  'Mercedes',
  'corrientes-rice-zone-v1',
  ST_Multi(ST_GeomFromText('POLYGON((-58.45 -29.55,-57.65 -29.55,-57.65 -28.95,-58.45 -28.95,-58.45 -29.55))', 4326))
)
ON CONFLICT (id) DO UPDATE SET
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
