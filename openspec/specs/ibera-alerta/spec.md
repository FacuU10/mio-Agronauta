# Spec: ibera-alerta production hydrology

## Requirements

### Requirement: Canonical municipal hydrology response

`GET /api/hydrology/municipalities` MUST return the canonical backend contract, not the legacy frontend view model. Response body MUST include `province { provinceCode, name }`, `sourceFreshness[] { source, freshness, label, lastSuccessfulObservedAt? }`, `provinceAlerts[] { zone?, source, message, observedAt, severity? }`, and `municipalities[] { id, name, slug, provinceCode, centroid?, gaugeMappings[], latestTelemetry[] }`. Each telemetry item MUST expose source/metric/value/unit/observedAt/lastSuccessfulObservedAt and MAY include alert/evacuation thresholds. It MUST NOT require `riskLevel`, `localizedWarning`, `latest`, `sourceFreshness.status`, or `provinceAlerts.title`.

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

## Production Notes

- The frontend source of truth is the canonical hydrology payload, not legacy presentation fields.
- Manual ingest is safe to expose only with configured production provider URLs and existing deployment controls; unsupported providers must degrade explicitly and preserve last known data.
- Local verification passed, but a final deployed smoke remains required against the real web/API URLs and provider environment variables.
