# Delta Spec: ibera-alerta-pna-ingest-safe-fix

## MODIFIED Requirements

### Requirement: Production-safe hydrology ingest

`POST /api/hydrology/ingest` MUST be a production endpoint. It MUST process requested sources independently and return HTTP 202 with a structured response containing top-level `status` (`completed`, `partial`, or `failed`), `runId?`, `requestedSources[]`, and `results[] { source, status, recordsIngested, errorMessage?, provenanceUrl?, observedFrom?, observedTo?, diagnostic? }`, where per-source status is `success`, `failed`, `empty`, or `skipped`. `diagnostic` MUST be safe for public clients and MAY include `reason`, `attempts`, `timeoutMs`, `elapsedMs`, `providerHost`, `providerPath`, and `upstreamStatus`; it MUST NOT expose secrets, raw stack traces, credentials, or internal network details. PNA failures MUST NOT be hidden behind a generic timeout when a bounded source diagnostic can be returned. One source failure MUST NOT abort remaining sources. Production MUST NOT write offline fixture data as official telemetry.

(Previously: ingest returned structured source results, but PNA timeouts could be reported only as a generic timeout without safe per-source diagnostics.)

#### Scenario: PNA upstream is slow or unreachable

- GIVEN `source=PNA` is requested and the PNA upstream times out or is unreachable
- WHEN `/api/hydrology/ingest` runs within the configured source timeout budget
- THEN the HTTP response is `202` with PNA `failed` or `skipped`
- AND the PNA result includes a safe diagnostic with `attempts=1`, reason, timeout/provenance fields, and no secret data
- AND last known municipality/telemetry data remains available and unchanged

#### Scenario: Anti-DDoS single attempt

- GIVEN a manual ingest request includes one or more sources
- WHEN a source fails, times out, or returns unsupported content
- THEN the system MUST perform at most one network attempt per source for that request
- AND it MUST NOT retry, loop, poll, scrape repeatedly, or expand scheduled retry cadence

#### Scenario: Partial source failure

- GIVEN PNA fails and another requested source succeeds
- WHEN `/api/hydrology/ingest` completes
- THEN the response includes independent source results and top-level `partial`
- AND failed runs are persisted while last known successful data remains available

#### Scenario: Unrecoverable ingest startup error

- GIVEN ingest cannot start because configuration or database access fails before source processing
- WHEN `/api/hydrology/ingest` is called
- THEN it returns a contract error response, not an unhandled Express 500
- AND no fixture fallback is written in production

## ADDED Requirements

### Requirement: Bounded deployed smoke verification

Post-deploy verification for this change MUST be source-scoped and bounded: exactly one backend-origin `POST /api/hydrology/ingest` for `source=PNA`, exactly one frontend-proxy `POST /api/hydrology/ingest` for `source=PNA`, and one `GET /api/hydrology/municipalities` to confirm preserved data. Manual smoke MUST NOT include repeated POSTs, polling loops, browser automation retries, or retry-after-timeout behavior.

#### Scenario: Real smoke confirms safe degradation

- GIVEN the change is deployed to production
- WHEN verification performs the two allowed PNA POSTs and the municipalities GET
- THEN each POST returns a structured ingest contract, even if PNA is `failed` or `skipped`
- AND the GET confirms municipalities remain readable with preserved previous data
- AND no additional production PNA ingest requests are made for this smoke
