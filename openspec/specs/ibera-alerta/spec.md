# Spec: ibera-alerta production hydrology

## Requirements

### Requirement: Canonical municipal hydrology response

`GET /api/hydrology/municipalities` MUST return the canonical backend contract, not the legacy frontend view model. Response body MUST include `province { provinceCode, name }`, `sourceFreshness[] { source, freshness, label, lastSuccessfulObservedAt? }`, `provinceAlerts[] { zone?, source, message, observedAt, severity? }`, and `municipalities[] { id, name, slug, provinceCode, centroid?, gaugeMappings[], latestTelemetry[], officialAlerts[] }`. Each telemetry item MUST expose source/metric/value/unit/observedAt/lastSuccessfulObservedAt and MAY include alert/evacuation thresholds. It MUST NOT require `riskLevel`, `localizedWarning`, `latest`, `sourceFreshness.status`, or `provinceAlerts.title`.

#### Scenario: Overview receives canonical data

- GIVEN backend municipalities include canonical `latestTelemetry`
- WHEN `overview.tsx` renders `/municipalities`
- THEN it maps PNA height from latest `source=PNA, metric=river_height_m`
- AND maps rain from latest `metric=rain_mm` without reading `municipality.latest`

#### Scenario: Municipality has no telemetry

- GIVEN a municipality has `latestTelemetry: []`
- WHEN `overview.tsx` renders the municipality
- THEN it still displays the municipality row/card
- AND shows `Sin datos oficiales recientes` instead of crashing or infinite loading

### Requirement: Frontend canonical dashboard mapping

`detail.tsx` MUST consume the backend dashboard contract directly: municipality metadata, telemetry arrays, `inaPredictions30d`, `alerts`, and `provenance[] { source, freshness, label, lastSuccessfulObservedAt? }`. It MUST NOT depend on `inaForecast30Days`, nested `smn`/`inmet`, or `provenance.lastRunStatus/errorMessage`.

#### Scenario: Detail page renders dashboard

- GIVEN `/api/hydrology/municipalities/{id}/dashboard` returns telemetry, alerts, forecasts, and provenance
- WHEN `detail.tsx` loads it
- THEN telemetry cards, INA 30-day forecast, alerts, and provenance render from canonical fields
- AND degraded state is derived from any `provenance.freshness !== "fresh"`

### Requirement: Hydrology frontend proxy routing

The Next.js app MUST route `/api/hydrology/*` to the Express backend `/api/hydrology/*` in production. This MAY be implemented as `apps/web/src/app/api/hydrology/[...path]/route.ts` or a `next.config.js/mjs` rewrite, but the deployed frontend MUST NOT return a web-origin 404 for hydrology API calls. The proxy MUST support GET and POST, preserve upstream status/body/content-type, use no-store semantics, and forward request body and essential headers.

#### Scenario: Municipalities proxy succeeds

- GIVEN the browser calls `/api/hydrology/municipalities` on the web origin
- WHEN the Express API returns 200 JSON
- THEN Next.js returns the same status and JSON contract
- AND `/municipalities` exits loading and renders data or explicit empty/error state

#### Scenario: Ingest proxy preserves method and body

- GIVEN the browser/admin client posts JSON to `/api/hydrology/ingest`
- WHEN Next.js forwards the request
- THEN the Express endpoint receives the same method/body
- AND the client receives the upstream structured ingest response

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

### Requirement: Bounded deployed smoke verification

Post-deploy verification for this change MUST be source-scoped and bounded: exactly one backend-origin `POST /api/hydrology/ingest` for `source=PNA`, exactly one frontend-proxy `POST /api/hydrology/ingest` for `source=PNA`, and one `GET /api/hydrology/municipalities` to confirm preserved data. Manual smoke MUST NOT include repeated POSTs, polling loops, browser automation retries, or retry-after-timeout behavior.

#### Scenario: Real smoke confirms safe degradation

- GIVEN the change is deployed to production
- WHEN verification performs the two allowed PNA POSTs and the municipalities GET
- THEN each POST returns a structured ingest contract, even if PNA is `failed` or `skipped`
- AND the GET confirms municipalities remain readable with preserved previous data
- AND no additional production PNA ingest requests are made for this smoke

### Requirement: Source configuration and runtime DB safety

Official source clients MUST use configurable provider URLs and mark unverified/unparseable providers as failed/degraded rather than fabricated success. Runtime ingest/seeding MUST NOT require privileged `CREATE EXTENSION` execution; municipality seed data MUST be idempotent and update authoritative fields when they change.

#### Scenario: Provider endpoint is not machine-readable

- GIVEN a configured provider URL returns unsupported HTML or invalid JSON
- WHEN ingest processes that source
- THEN the source result is `failed` or `empty` with an error/provenance URL
- AND existing municipal data remains visible to frontend users

### Requirement: Reviewed municipal alert coverage

The system MUST persist reviewed, versioned active coverage associations containing municipality, source, and official coverage key. The migration and seed MUST be additive and idempotent, enforce one active key per municipality/source/key, and MUST NOT map dynamic `alert-*` IDs or infer coverage from geometry.

#### Scenario: Seed is safely repeatable

- GIVEN the approved coverage seed is applied twice
- WHEN active associations are queried
- THEN each approved association exists once with its seed version

#### Scenario: Association is disabled for rollback

- GIVEN a coverage association is inactive
- WHEN a matching provider alert exists
- THEN it is not projected while stored telemetry remains intact

### Requirement: Coverage-scoped official-alert projection and rendering

The backend MUST join current SMN/INMET `storm_alert` telemetry only through active coverage and project `officialAlerts[]` with source, coverageKey, message, observedAt, lastSuccessfulObservedAt, freshness, and optional sourceUrl. Views MUST render this supplied state and provenance without filtering policy. Matching and unrelated municipalities MUST receive distinct results.

#### Scenario: Current alert is rendered

- GIVEN a municipality has active matching coverage and a current alert
- WHEN its overview or dashboard loads
- THEN the alert message, freshness, and provenance are visible

#### Scenario: No matching alert exists

- GIVEN coverage has no current matching alert
- WHEN either view loads
- THEN `officialAlerts` is empty and the existing no-data state remains usable

### Requirement: Single authenticated Cron ingress

Only the protected `POST /api/hydrology/ingest` path MAY receive the ingest token and act as the external Cron entry. Render MUST schedule one Cron; application instances MUST NOT run an in-process worker scheduler. Missing or invalid authorization MUST return 401 without forwarding; source failures MUST remain independent and preserve last-known data.

#### Scenario: Unauthorized Cron is rejected

- GIVEN an ingest request lacks a valid token
- WHEN it reaches the proxy or API
- THEN it returns 401 and performs no provider request

#### Scenario: One source fails

- GIVEN one requested source fails during an authorized Cron run
- WHEN other sources complete
- THEN the result is structured `partial` and successful source data is retained

### Requirement: Bounded production acceptance receipts

Each release slice MUST retain RED/GREEN test, migration/rollback, build, contract, and applicable local plus post-main production evidence. One bounded receipt per Cron, regional proxy/runner, AI-chat stream, and source proof MUST record redacted revision/config inventory, request ID, timestamp, source/status, and response shape. Receipts MUST NOT contain secrets, tokens, raw chat, or repeated probes; degraded upstream/AI states MUST be explicit.

#### Scenario: Render and source proof succeeds

- GIVEN approved Render configuration and one authorized scheduled run
- WHEN the operator captures the receipt
- THEN it proves one Cron path, source result, and redacted configuration

#### Scenario: Chat or regional path degrades

- GIVEN Groq or the configured proxy/runner is unavailable
- WHEN one bounded verification occurs
- THEN a redacted request-ID receipt and explicit degraded response are retained

### Requirement: Deferred timeline and long-range detail

Historical municipal timelines and long-range forecast detail are deferred capabilities. This change MUST NOT add their API, UI, provider expansion, dynamic-ID mapping, or infrastructure.

#### Scenario: Deferred request is evaluated

- GIVEN a timeline or long-range detail request
- WHEN this change is implemented
- THEN no new endpoint, view, or data projection is introduced

## Production Notes

- The frontend source of truth is the canonical hydrology payload, not legacy presentation fields.
- Manual ingest is safe to expose only with configured production provider URLs and existing deployment controls; unsupported providers must degrade explicitly and preserve last known data.
- Local verification passed, but a final deployed smoke remains required against the real web/API URLs and provider environment variables.

### Requirement: Canonical INA CSV queries

INA observation requests for series `6764`, `33988`, and `38469` MUST use `getObservaciones` URLs with `series_id={id}&format=csv`. They MUST NOT request `format=mnemos`.

#### Scenario: All fixed INA series use CSV

- GIVEN an INA ingest is requested
- WHEN the client builds queries for the three fixed series
- THEN each URL contains its series ID and `format=csv`
- AND none contains `format=mnemos`

### Requirement: INA CSV header fallback

The system MUST parse INA CSV using a supplied header. When the first row is data, it MUST apply this exact column order: `id`, `tipo`, `series_id`, `timestart`, `timeend`, `nombre`, `descripcion`, `unit_id`, `timeupdate`, `valor`. Headerless rows MUST contain exactly ten columns and rows without valid mapped values MUST be rejected without creating telemetry.

#### Scenario: Headered and headerless CSV are mapped

- GIVEN valid headered and headerless INA CSV responses
- WHEN the responses are ingested
- THEN each valid observation is mapped to normalized INA telemetry

#### Scenario: Malformed headerless rows are rejected

- GIVEN a headerless row with missing columns or invalid mapped data
- WHEN the response is ingested
- THEN no telemetry is created from that row

### Requirement: Municipal INA rendering acceptance

Local acceptance MUST prove distinct INA telemetry renders for Corrientes, Paso de los Libres, and Bella Vista from series `6764`, `33988`, and `38469`, respectively.

### Requirement: INA change isolation and rollback

The INA standardization MUST NOT change PNA endpoints or behavior, INMET/SMN geo-block handling, browser ingest, proxies, deployment behavior, or persisted telemetry. Rolling back the INA client, adapter, and focused tests together MUST require no migration or telemetry rewrite.
