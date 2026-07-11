# Delta Spec: ibera-alerta-hydrology-ingest-scheduler

## ADDED Requirements

### Requirement: Hydrology ingest scheduling configuration

Deployments MUST document and support safe hydrology scheduling. `HYDROLOGY_SCHEDULER_ENABLED` MUST default to `false`; Render Free deployments MUST keep it `false` and use an external cron URL. Always-on environments MAY enable the in-process scheduler with `HYDROLOGY_SCHEDULER_ENABLED=true`. The scheduler MUST NOT run an ingest immediately at boot by default; it MUST wait for the first cadence or use a safe initial delay. Documentation MUST cover Render, Vercel/proxy, external cron configuration, `Authorization: Bearer`, safe cadence, and provider URL overrides: `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`.

#### Scenario: Render Free uses external cron

- GIVEN the API is deployed on Render Free
- WHEN deployment env is configured
- THEN `HYDROLOGY_SCHEDULER_ENABLED=false` is documented and used
- AND external cron calls `POST /api/hydrology/ingest` no more often than hourly for PNA

#### Scenario: Optional scheduler starts safely

- GIVEN an always-on environment sets `HYDROLOGY_SCHEDULER_ENABLED=true`
- WHEN the API boots
- THEN no ingest runs immediately by default
- AND the first run waits for cadence or safe initial delay

#### Scenario: Provider overrides are explicit

- GIVEN default provider URLs are unsuitable or blocked
- WHEN operators configure env overrides
- THEN ingest uses the documented source URL overrides and degrades safely if invalid

## MODIFIED Requirements

### Requirement: Production-safe hydrology ingest

`POST /api/hydrology/ingest` MUST be a production endpoint. Body `{ contractVersion: "1.0.0", reason: string }` without `source` MUST run PNA, INA, INMET, and SMN exactly once each; source-scoped requests MUST remain supported. In production, if `AGRONAUTAS_AUTH_ENABLED=true` or `HYDROLOGY_INGEST_TOKEN` is configured, the endpoint MUST require `Authorization: Bearer <token>`, including cron calls. Responses MUST remain HTTP 202 structured ingest results with independent per-source statuses and safe diagnostics. One source failure MUST NOT abort others. Production MUST NOT write offline fixture data as official telemetry. No run MAY retry, loop, poll, or scrape repeatedly; each source gets at most one attempt per run, and PNA cadence MUST be at least 1 hour.

(Previously: ingest returned safe per-source diagnostics, but all-source operator trigger shape, production token enforcement, scheduler cadence, and cron auth were not specified.)

#### Scenario: Manual all-source operator run

- GIVEN an authorized operator posts `{ contractVersion: "1.0.0", reason }`
- WHEN `/api/hydrology/ingest` accepts the request
- THEN it attempts PNA, INA, INMET, and SMN once each
- AND returns independent source results with top-level `completed`, `partial`, or `failed`

#### Scenario: Source-scoped run remains available

- GIVEN an authorized request includes one source
- WHEN ingest runs
- THEN only that source is attempted once
- AND unsupported or failed upstreams return safe diagnostics without fixture writes

#### Scenario: Production token enforcement

- GIVEN production auth is enabled or `HYDROLOGY_INGEST_TOKEN` exists
- WHEN the bearer token is missing or invalid
- THEN ingest is rejected before provider calls
- AND a valid cron bearer token is accepted

#### Scenario: Unrecoverable ingest startup error

- GIVEN ingest cannot start because configuration or database access fails
- WHEN `/api/hydrology/ingest` is called
- THEN it returns a contract error response, not an unhandled Express 500
- AND no provider retry loop starts

### Requirement: Bounded deployed smoke verification

Verification MUST include one local bounded all-source run and, after deploy, one production bounded smoke call. Smoke verification MUST NOT include repeated POSTs, polling loops, browser automation retries, or retry-after-timeout behavior.

(Previously: deployed smoke was source-scoped to PNA with two POSTs plus one municipalities GET.)

#### Scenario: Local bounded all-source verification

- GIVEN local env is configured with safe provider URLs or expected degraded results
- WHEN verification posts one all-source ingest request
- THEN each source is attempted at most once
- AND results prove no retry storm or immediate scheduler run

#### Scenario: Production bounded smoke after deploy

- GIVEN the change is deployed and cron/operator token is configured
- WHEN verification performs exactly one production ingest POST
- THEN the response follows the structured ingest contract
- AND no additional production ingest calls are made for this smoke
