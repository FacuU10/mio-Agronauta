# Delta for ibera-alerta

## ADDED Requirements

### Requirement: Canonical INA CSV queries

INA observation requests for series `6764`, `33988`, and `38469` MUST use `getObservaciones` URLs with `series_id={id}&format=csv`. They MUST NOT request `format=mnemos`.

#### Scenario: All fixed INA series use CSV

- GIVEN an INA ingest is requested
- WHEN the client builds queries for the three fixed series
- THEN each URL contains its series ID and `format=csv`
- AND none contains `format=mnemos`

### Requirement: INA CSV header fallback

The system MUST parse INA CSV using a supplied header. When the first row is data, it MUST apply this exact column order: `id`, `tipo`, `series_id`, `timestart`, `timeend`, `nombre`, `descripcion`, `unit_id`, `timeupdate`, `valor`. Rows without the expected columns or valid mapped values MUST be rejected without creating telemetry.

#### Scenario: Headered CSV is mapped

- GIVEN a valid INA CSV response with its header row
- WHEN the response is ingested
- THEN its valid observation is mapped using the supplied header

#### Scenario: Headerless CSV is mapped

- GIVEN a valid headerless INA CSV response
- WHEN the response is ingested
- THEN the documented fallback columns produce a valid observation

#### Scenario: Malformed headerless row is rejected

- GIVEN a headerless row with missing columns or invalid mapped data
- WHEN the response is ingested
- THEN no telemetry is created from that row

### Requirement: Municipal INA rendering acceptance

Local acceptance MUST prove distinct INA telemetry renders for Corrientes, Paso de los Libres, and Bella Vista from series `6764`, `33988`, and `38469`, respectively.

#### Scenario: Three municipalities render INA telemetry

- GIVEN valid INA fixtures for all three fixed series
- WHEN the municipal dashboard data is rendered locally
- THEN Corrientes, Paso de los Libres, and Bella Vista each show their distinct INA record

### Requirement: INA change isolation, tests, and rollback

The change MUST have strict-TDD evidence for query selection, headered and headerless parsing, malformed-row rejection, and three-municipality rendering. It MUST NOT change PNA endpoints or behavior, or INMET/SMN geo-block handling, browser ingest, proxies, or deployment behavior. Rollback MUST revert the INA query, parser, and related tests together; it MUST require no migration or persisted-data rewrite and preserve last known telemetry.

#### Scenario: Unrelated source behavior remains unchanged

- GIVEN the INA standardization test suite and regression suite run
- WHEN assertions inspect PNA, INMET, and SMN contracts
- THEN their existing behavior and endpoints remain unchanged

#### Scenario: Rollback preserves existing data

- GIVEN the INA change is rolled back as one change set
- WHEN the prior queries and parser are restored
- THEN no migration or telemetry rewrite occurs
- AND last known telemetry remains available
