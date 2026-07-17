# Delta for ibera-alerta

## MODIFIED Requirements

### Requirement: Production-safe hydrology ingest

`POST /api/hydrology/ingest` MUST require a valid `x-hydrology-ingest-token` in every environment; it MUST reject missing or invalid authorization and MUST NOT run ingestion. Anonymous tokenless direct writes are prohibited. On valid authorization, it MUST process requested sources independently and return HTTP 202 with a structured response containing top-level `status` (`completed`, `partial`, or `failed`), `runId?`, `requestedSources[]`, and `results[] { source, status, recordsIngested, errorMessage?, provenanceUrl?, observedFrom?, observedTo?, diagnostic? }`, where per-source status is `success`, `failed`, `empty`, or `skipped`. `diagnostic` MUST be safe for public clients and MAY include `reason`, `attempts`, `timeoutMs`, `elapsedMs`, `providerHost`, `providerPath`, and `upstreamStatus`; it MUST NOT expose secrets, raw stack traces, credentials, or internal network details. PNA failures MUST NOT be hidden behind a generic timeout when a bounded source diagnostic can be returned. One source failure MUST NOT abort remaining sources. Production MUST NOT write offline fixture data as official telemetry.

(Previously: the endpoint defined structured source results and safety behavior, but authorization was not an explicit all-environment production requirement.)

#### Scenario: Missing authorization

- GIVEN no ingest token is supplied
- WHEN the endpoint is called in any environment
- THEN it rejects the request and performs no ingestion

#### Scenario: Invalid authorization

- GIVEN an incorrect ingest token is supplied
- WHEN the endpoint is called
- THEN it rejects the request without source processing or secret disclosure

#### Scenario: Valid authorization

- GIVEN a valid ingest token and requested sources
- WHEN the endpoint is called
- THEN it performs the independent ingest contract and returns HTTP 202

#### Scenario: PNA upstream is slow or unreachable

- GIVEN `source=PNA` is requested and PNA times out or is unreachable
- WHEN ingest runs within its configured source timeout budget
- THEN the HTTP response is `202` with PNA `failed` or `skipped`
- AND the PNA result includes a safe diagnostic with `attempts=1`, reason, timeout/provenance fields, and no secret data
- AND last known municipality/telemetry data remains available and unchanged

#### Scenario: Anti-DDoS single attempt

- GIVEN an authorized request includes one or more sources
- WHEN a source fails, times out, or returns unsupported content
- THEN the system MUST perform at most one network attempt per source for that request
- AND it MUST NOT retry, loop, poll, scrape repeatedly, or expand scheduled retry cadence

#### Scenario: Partial source failure

- GIVEN PNA fails and another requested source succeeds
- WHEN ingest completes
- THEN the response includes independent source results and top-level `partial`
- AND failed runs are persisted while last known successful data remains available

#### Scenario: Unrecoverable ingest startup error

- GIVEN configuration or database access prevents source processing
- WHEN the endpoint is called with valid authorization
- THEN it returns a contract error response, not an unhandled Express 500
- AND no fixture fallback is written in production

### Requirement: Bounded deployed smoke verification

Post-deploy verification MUST be source-scoped and bounded: exactly one authorized scheduled `POST /api/hydrology/ingest` for `source=PNA` and one `GET /api/hydrology/municipalities` to confirm preserved data. It MUST retain a redacted structured receipt and MUST NOT include repeated POSTs, polling loops, browser automation retries, or retry-after-timeout behavior.

(Previously: verification required one backend POST, one frontend-proxy POST, and one municipalities GET.)

#### Scenario: Authorized scheduled smoke confirms safe degradation

- GIVEN the change is deployed to production
- WHEN the scheduler performs its single authorized PNA run and bounded reads
- THEN the POST returns a structured ingest contract, even if PNA is `failed` or `skipped`
- AND the GET confirms municipalities remain readable with preserved previous data
- AND the redacted receipt records the deployment revision, run outcome, and available run identifier
- AND no additional production PNA ingest request is made for this smoke
