# agronautas-signal-ingestion Specification

## Purpose

Define truthful production behavior for Agronautas environmental provider ingestion and source claims.

## Requirements

### Requirement: Agronautas provider truth matrix is authoritative

Every Agronautas provider or adapter (climate, soil, satellite, fire, radar, Sentinel, SMN, Open-Meteo, FIRMS, and similar sources) MUST be classified as `live`, `seam`, `mock`, or `unavailable` with current evidence before launch claims use it.

#### Scenario: Provider is marked live
- GIVEN a provider is labeled `live`
- WHEN release evidence is reviewed
- THEN it MUST include real outbound request proof, response summary, DB insert or no-write reason, API payload proof, browser/UI proof, and timestamp
- AND the provider key/config source MUST be present in the env manifest without exposing values.

#### Scenario: Provider evidence is stale or absent
- GIVEN evidence is missing, fixture-only, seam-only, or older than the accepted launch window
- WHEN the API/dashboard describes the provider
- THEN it MUST be `seam`, `mock`, or `unavailable`, not `live`
- AND release readiness MUST fail if copy still claims live data.

### Requirement: Ingestion boundaries and adapters fail safely

Provider adapters MUST return typed success/degraded/failure results across explicit backend boundaries: API/application use case, provider port, infrastructure adapter, persistence port, and observability event. Unsupported provider responses MUST NOT be fabricated as success.

#### Scenario: Provider returns unsupported HTML or invalid JSON
- GIVEN a configured provider endpoint returns unsupported content
- WHEN ingestion runs
- THEN the adapter MUST produce a safe failed/empty result with provider host/path and no secrets
- AND existing field/risk data MUST remain readable.

#### Scenario: Provider credentials are missing
- GIVEN a provider requires a key that is absent in production
- WHEN ingestion or readiness evaluates that provider
- THEN the provider MUST be unavailable/degraded
- AND startup/readiness MUST fail only when that provider is launch-blocking by config.

### Requirement: Ingestion is idempotent and traceable

Ingestion MUST persist trace ids, source, mode, observed window, attempt count, records written, and safe diagnostics. Re-running the same source/window MUST not duplicate records or overwrite live data with lower-trust mock/fixture data.

#### Scenario: Duplicate ingestion window runs
- GIVEN the same provider/window is ingested twice
- WHEN persistence commits results
- THEN records MUST be upserted or skipped idempotently
- AND trace evidence MUST show duplicate handling.

#### Scenario: Mock attempts to overwrite live data
- GIVEN live data exists for a source/window
- WHEN mock, fixture, or seam data is processed
- THEN it MUST NOT replace live production claims
- AND the result MUST be marked degraded or skipped.

### Requirement: Provider rollback preserves truthful degradation

Rollback MAY disable individual providers or scheduled ingestion, but MUST preserve existing data and mark disabled providers degraded/unavailable.

#### Scenario: Provider is disabled during rollback
- GIVEN a provider incident occurs
- WHEN its env flag/config disables it
- THEN ingestion MUST skip the provider safely
- AND UI/API MUST show degraded status with last known successful time if available.
