# Delta for ibera-alerta

## MODIFIED Requirements

### Requirement: Production-safe hydrology ingest

`POST /api/hydrology/ingest` MUST process all requested sources independently and return HTTP 202 with `status`, `runId?`, `requestedSources[]`, and per-source `results[] { source, status, recordsIngested, errorMessage?, provenanceUrl?, observedFrom?, observedTo?, diagnostic? }`. Diagnostics MUST be public-safe and include enough provider/timeout evidence to distinguish client failures from runner deadlines. The endpoint MUST continue after source failures, MUST preserve existing official data, MUST NOT write fixtures, and MUST use at most one attempt per source with no retries, polling, or repeated scraping. PNA MUST default to `https://contenidosweb.prefecturanaval.gob.ar/alturas/` unless overridden, parse official HTML rows when possible, and insert real river-height telemetry for parseable mapped rows. INMET MUST use the actual API when configured/default feasible and treat 204/no-data as `empty`. INA/SMN MUST either parse a confirmed real official source or return clear degraded diagnostics; they MUST NOT report fake success.
(Previously: ingest returned structured diagnostics and independent source results, but did not require the fast PNA endpoint, real HTML/API parsing, runner/client timeout alignment, or explicit INA/SMN no-fake-success behavior.)

#### Scenario: PNA official HTML inserts real records

- GIVEN PNA official HTML contains parseable mapped river-height rows
- WHEN all-source ingest runs once
- THEN PNA result is `success` with `recordsIngested > 0`
- AND inserted records use official provenance and real observed values

#### Scenario: Source failure does not abort all-source ingest

- GIVEN one source fails, times out, returns 204, or has unsupported content
- WHEN `/api/hydrology/ingest` processes all sources
- THEN HTTP is 202 with per-source diagnostics for every requested source
- AND prior data remains readable and unchanged for failed/empty sources

#### Scenario: Runner and source timeouts are aligned

- GIVEN a source timeout is configured within the allowed cap
- WHEN the source runs once
- THEN runner timeout does not mask client diagnostics prematurely
- AND the result exposes safe elapsed/timeout/provider diagnostics

#### Scenario: Anti-DDoS single attempt

- GIVEN an upstream is slow, empty, or unavailable
- WHEN ingest processes that source
- THEN exactly one network attempt is made for that source
- AND no retry loop, polling, or repeated scrape is performed

### Requirement: Bounded deployed smoke verification

Before push, verification MUST run the local backend/API against the production database for all sources and capture the HTTP 202 contract plus per-source diagnostics. If PNA official rows are available and parseable, this proof MUST show `recordsIngested > 0` for PNA. After push/deploy, production smoke MUST remain bounded and MUST include production API/proxy evidence without retries or polling.
(Previously: post-deploy smoke was bounded and PNA-scoped, but pre-push local API plus production DB all-source proof was not mandatory.)

#### Scenario: Pre-push local production DB proof

- GIVEN production DB credentials are configured locally
- WHEN local API all-source ingest is executed before push
- THEN the result is HTTP 202 with diagnostics for PNA, INA, INMET, and SMN
- AND PNA `recordsIngested > 0` is proven when official rows are parseable

#### Scenario: Production smoke remains bounded

- GIVEN the change is deployed
- WHEN smoke calls production ingest and municipalities endpoints once per planned check
- THEN responses prove structured behavior and preserved data
- AND no repeated POSTs, polling loops, or retry-after-timeout behavior occur
