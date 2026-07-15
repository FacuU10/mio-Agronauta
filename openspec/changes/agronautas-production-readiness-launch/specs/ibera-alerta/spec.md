# Delta for ibera-alerta

## MODIFIED Requirements

### Requirement: Production-safe hydrology ingest

`POST /api/hydrology/ingest` MUST be a production endpoint that processes requested sources independently and returns HTTP 202 with top-level `status` (`completed`, `partial`, or `failed`), `runId?`, `requestedSources[]`, and `results[] { source, status, recordsIngested, errorMessage?, provenanceUrl?, observedFrom?, observedTo?, diagnostic?, mode }`, where per-source status is `success`, `failed`, `empty`, or `skipped`, and `mode` is `live`, `seam`, `mock`, or `unavailable`. `diagnostic` MUST be safe for public clients and MUST NOT expose secrets, raw stack traces, credentials, or internal network details. Production MUST NOT write offline fixture data as official telemetry, and fixture/offline/unverified providers MUST be unavailable or visibly degraded, never fresh/live.

(Previously: ingest returned structured source results and prohibited production fixture writes, but did not require explicit provider mode truth in ingest output or production launch proof.)

#### Scenario: PNA upstream is slow or unreachable
- GIVEN `source=PNA` is requested and the PNA upstream times out or is unreachable
- WHEN `/api/hydrology/ingest` runs within the configured source timeout budget
- THEN HTTP 202 includes PNA `failed` or `skipped` with `mode` not `live`
- AND last known municipality/telemetry data remains available and unchanged.

#### Scenario: Anti-DDoS single attempt
- GIVEN a manual ingest request includes one or more sources
- WHEN a source fails, times out, or returns unsupported content
- THEN the system MUST perform at most one network attempt per source for that request
- AND it MUST NOT retry, loop, poll, scrape repeatedly, or expand scheduled retry cadence.

#### Scenario: Partial source failure
- GIVEN PNA fails and another requested source succeeds
- WHEN ingest completes
- THEN the response includes independent source results and top-level `partial`
- AND failed runs are persisted while last known successful data remains available.

#### Scenario: Unrecoverable ingest startup error
- GIVEN ingest cannot start because configuration or database access fails before source processing
- WHEN `/api/hydrology/ingest` is called
- THEN it returns a contract error response, not an unhandled Express 500
- AND no fixture fallback is written in production.

#### Scenario: Fixture/offline provider appears in production payload
- GIVEN production API data includes `offline-fixture://`, stale provider timestamps, or unverified URLs
- WHEN hydrology UI/API renders freshness
- THEN that source MUST be shown as degraded/unavailable, not fresh/live
- AND release readiness MUST fail unless explicit degraded claims are documented.

## ADDED Requirements

### Requirement: Hydrology provider truth matrix is launch evidence

Each hydrology provider (PNA, INA, INMET, SMN) MUST have launch evidence for current mode: outbound request proof, safe response summary, DB insert or explicit no-write reason, API payload proof, browser proof, and last successful observed timestamp when live.

#### Scenario: Provider is claimed live
- GIVEN a provider is marked `live`
- WHEN release evidence is reviewed
- THEN the matrix MUST include real request, response summary, DB/API/browser proof, and current timestamp
- AND missing evidence MUST fail readiness.

#### Scenario: Provider is unavailable or seam-only
- GIVEN a provider lacks current real proof
- WHEN UI/API reports it
- THEN it MUST display degraded/unavailable/seam status
- AND user-facing copy MUST NOT imply official fresh data.
