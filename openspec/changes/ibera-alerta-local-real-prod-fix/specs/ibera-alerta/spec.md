# Delta for ibera-alerta

## MODIFIED Requirements

### Requirement: Production-safe hydrology ingest

`POST /api/hydrology/ingest` MUST process requested sources independently and return HTTP 202 with `status`, `runId?`, `requestedSources[]`, and `results[] { source, status, recordsIngested, errorMessage?, provenanceUrl?, observedFrom?, observedTo?, diagnostic? }`. Provider failures for all-source ingest MUST be represented as per-source `failed`/`empty`/`skipped` diagnostics, not as a top-level 503 `startup_failure`, unless true config, startup, or database failure occurs before source execution. Diagnostics MUST be safe and MAY include `reason`, `attempts`, `timeoutMs`, `elapsedMs`, `providerHost`, `providerPath`, and `upstreamStatus`; they MUST NOT expose secrets, raw stacks, credentials, or internal network details. PNA, INA, INMET, and SMN MUST continue independently. Manual endpoint and scheduler/cron behavior MUST remain compatible. Production MUST NOT write offline fixture telemetry.

(Previously: ingest required independent structured results, but local API could collapse provider failures into startup failure.)

#### Scenario: All providers fail after execution starts

- GIVEN PNA, INA, INMET, and SMN are requested
- WHEN every provider times out, returns HTML, 403, or invalid content after source execution starts
- THEN the response is HTTP 202 with each source marked failed and diagnostic-rich
- AND top-level status is `failed`, not HTTP 503 `startup_failure`

#### Scenario: Source failure isolation

- GIVEN PNA fails and INA, INMET, or SMN can still run
- WHEN all-source ingest executes
- THEN one source failure MUST NOT abort remaining sources
- AND persisted run data records independent source outcomes

#### Scenario: True startup failure

- GIVEN configuration, token gating, runner construction, or database access fails before any source executes
- WHEN ingest is called
- THEN the endpoint returns a contract error response appropriate to startup/config/db failure
- AND no fixture fallback is written in production

#### Scenario: Anti-DDoS single attempt

- GIVEN a manual or scheduled ingest request includes one or more sources
- WHEN a source fails, times out, or returns unsupported content
- THEN the system MUST perform at most one network attempt per source for that request
- AND it MUST NOT retry, loop, poll, scrape repeatedly, or expand scheduled cadence

#### Scenario: Manual and scheduler compatibility

- GIVEN existing manual endpoint clients and scheduler/cron jobs use the ingest contract
- WHEN this change is deployed
- THEN request shape, authorization expectations, and scheduled invocation semantics remain valid
- AND only diagnostics/error classification become more explicit

### Requirement: Bounded deployed smoke verification

Post-deploy verification for this change MUST be bounded: exactly one backend-origin or production API `POST /api/hydrology/ingest` requesting all sources, and one `GET /api/hydrology/municipalities` to confirm preserved data. Manual smoke MUST NOT include repeated POSTs, polling loops, browser automation retries, or retry-after-timeout behavior.

(Previously: smoke allowed two PNA-scoped POSTs plus municipalities GET.)

#### Scenario: Production all-source smoke confirms safe degradation

- GIVEN the change is deployed to production
- WHEN verification performs one all-source POST and one municipalities GET
- THEN POST returns the structured ingest contract with per-source outcomes
- AND GET confirms municipalities remain readable with preserved previous data

### Requirement: Source configuration and runtime DB safety

Official source clients MUST use explicit provider URL defaults and documented env overrides for PNA, INA, INMET, and SMN. Configured URLs that return HTML, 403, time out, or are otherwise not machine-readable MUST fail safely with per-source diagnostics that identify source, host/path, status/content/timeout class, and elapsed/attempt metadata where available. Runtime ingest/seeding MUST NOT require privileged `CREATE EXTENSION`; municipality seed data MUST remain idempotent.

(Previously: configurable provider URLs and degradation were required, but defaults/overrides and diagnostic expectations were less explicit.)

#### Scenario: Provider endpoint is not machine-readable

- GIVEN a default or override provider URL returns unsupported HTML or invalid JSON
- WHEN ingest processes that source
- THEN the source result is failed or empty with safe provider diagnostics
- AND existing municipal data remains visible

#### Scenario: Local-real verification uses production-like DB

- GIVEN local code points at the remote/prod-like database
- WHEN verification runs one local all-source POST or one direct runner call
- THEN no mocks, fixtures, DDoS retries, or polling are accepted as proof
- AND diagnostics are compared against the same source contract
