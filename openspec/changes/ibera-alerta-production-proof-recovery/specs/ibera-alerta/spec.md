# Delta for ibera-alerta

## ADDED Requirements

### Requirement: Strict all-provider runtime proof gate

Iberá-Alerta completion MUST require current, correlated, sanitized evidence for every configured hydrology source: PNA, INA, INMET, and SMN. For each source, the same verification run MUST prove all layers in both local runtime and production at `https://www.agronauta.com.ar`: one safe real provider request, HTTP result, remote production DB rows tied to the run, API payload, and browser-rendered state. Tests, lint, build, mocks, historical artifacts, degraded source status, or partial-provider success MUST NOT satisfy this gate.

#### Scenario: All providers pass with correlated proof

- GIVEN a fresh verification run has a unique run ID and UTC timestamp window
- WHEN PNA, INA, INMET, and SMN are checked locally and after main/deployment approval in production
- THEN each source has redacted request, HTTP, production DB, API, and browser evidence correlated to that run
- AND the change MAY proceed only if every configured source passes every layer

#### Scenario: Missing or degraded proof blocks completion

- GIVEN any configured source lacks proof, returns degraded/empty/failed, or cannot be correlated to the run ID
- WHEN readiness, apply completion, or archive is evaluated
- THEN the result MUST be `BLOCKER`, not acceptance or readiness
- AND the failure MUST be classified source-specifically, not hidden behind a generic success

### Requirement: Bounded independent ingest and BFF recovery proof

Production ingest and the local BFF MUST expose enough safe behavior to prove recovery from production ingest timeout/no-body and local BFF `503`. Each source MUST be attempted independently so one source failure cannot abort or mask the remaining source results, but independence MUST NOT turn failed/degraded providers into acceptance.

#### Scenario: Production ingest timeout is observable

- GIVEN production ingest previously timed out or returned no usable body
- WHEN one bounded production ingest request is made for the configured sources
- THEN the HTTP response MUST include per-source status, elapsed/timeout diagnostics, upstream HTTP result when available, and run ID
- AND any timed-out or missing source remains a `BLOCKER` until passing proof exists

#### Scenario: Local BFF 503 is repaired by real runtime proof

- GIVEN the local web BFF previously returned `503` for hydrology routes
- WHEN local verification calls the BFF and renders the browser hydrology page
- THEN the BFF MUST return the backend hydrology contract or a classified upstream error with no secret leakage
- AND browser evidence MUST show the resulting provider state for PNA, INA, INMET, and SMN

### Requirement: Safe evidence handling and archive prohibition

Verification MUST use exactly one bounded attempt per source/environment with no retries, polling, loops, or retry-after-timeout behavior. Evidence collection MUST redact secrets, credentials, raw connection strings, tokens, and internal network details. Remote production DB verification MUST be non-destructive: read-only correlation queries are allowed, and writes are limited to the approved official ingest side effect being verified. Archive/readiness MUST be prohibited until local and post-main production evidence both pass.

#### Scenario: Remote DB verification is safe and current

- GIVEN production DB evidence is collected for a run
- WHEN rows are inspected
- THEN queries MUST be read-only, timestamp-bounded, source-scoped, and correlated by run ID or unambiguous observed window
- AND evidence MUST expose row counts/identifiers safely without secrets or destructive mutation

#### Scenario: Archive is blocked until post-main proof passes

- GIVEN tests/build/lint pass but any local or `https://www.agronauta.com.ar` proof layer is missing
- WHEN the change is considered for readiness or archive
- THEN archive/readiness MUST be refused as `BLOCKER`
- AND the next phase MUST record the missing source, environment, layer, timestamp, and failure classification
