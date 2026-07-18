# Delta for ibera-alerta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Canonical municipal hydrology response

`GET /api/hydrology/municipalities` MUST return the canonical backend contract, not the legacy frontend view model. Response body MUST include `province { provinceCode, name }`, `sourceFreshness[] { source, freshness, label, lastSuccessfulObservedAt? }`, `provinceAlerts[] { zone?, source, message, observedAt, severity? }`, and `municipalities[] { id, name, slug, provinceCode, centroid?, gaugeMappings[], latestTelemetry[], officialAlerts[] }`. Each telemetry item MUST expose source/metric/value/unit/observedAt/lastSuccessfulObservedAt and MAY include alert/evacuation thresholds. It MUST NOT require `riskLevel`, `localizedWarning`, `latest`, `sourceFreshness.status`, or `provinceAlerts.title`.
(Previously: municipalities exposed canonical telemetry but no coverage-scoped official alerts.)

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

#### Scenario: Contract includes official alerts
- GIVEN a coverage-matched current alert
- WHEN municipalities are requested
- THEN only its matching municipality includes the canonical `officialAlerts` item
