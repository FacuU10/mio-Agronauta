# Delta for ibera-alerta

## ADDED Requirements

### Requirement: Municipal evidence states are explicit

Municipal overview and dashboard views MUST render canonical telemetry, INA forecasts where present, alerts, source freshness, provenance, and local mappings with explicit `observed`, `forecast`, `cached/latest-good`, `stale`, `degraded`, `missing`, or `mock/seam` labels. A threshold comparison MUST be described as mapped/threshold-based, never hydraulic impact.

#### Scenario: Canonical municipal data is fresh

- GIVEN telemetry, alerts, mappings, and provenance are returned by the existing canonical contracts
- WHEN an overview or dashboard renders
- THEN the values, source, timestamp/freshness, and applicable status are visible
- AND INA is shown as forecast only when present in the contract

#### Scenario: Mapped or stale evidence is incomplete

- GIVEN telemetry is stale, absent, or only a mapped threshold association exists
- WHEN the municipality renders
- THEN the view shows stale/missing/degraded and preserves available last-good data
- AND it does not imply official geometry, causal influence, or hydraulic simulation

### Requirement: Ingestion diagnostics and status remain observable

The existing protected ingest flow MUST expose its verified request/run metadata, bounded status, per-source outcome, freshness/provenance, and safe diagnostics without changing acquisition behavior. In-memory status limitations (TTL/process lifetime) MUST be visible when relevant; no fixture data MAY be presented as official telemetry.

#### Scenario: Partial ingest is reported

- GIVEN one requested source succeeds and another fails or is empty
- WHEN the ingest status is displayed
- THEN the top-level partial state and independent source outcomes are visible
- AND existing last-successful data remains readable

### Requirement: Local context and geometry claims are bounded

Municipality names, gauge mappings, alert coverage keys, thresholds, and local source context MUST be visible when supplied. Because the current contract omits geometry and seeded polygons are approximate, the UI MUST prefer list/table evidence and MUST NOT implement or imply an official municipality map in this change.

#### Scenario: User requests territorial impact

- GIVEN only mapped telemetry/threshold evidence is available
- WHEN the user views municipal context
- THEN the mapping and its evidence state are shown
- AND the request is explicitly bounded as non-hydraulic and non-official geometry

### Requirement: Municipal Copilot trace is evidence-bounded

Copilot request/response metadata, stream status, limits, and evidence references MUST be shown when returned by the existing SSE contract. Missing references MUST be labeled missing rather than invented; the view MUST preserve explicit out-of-scope, degraded, and error responses.

#### Scenario: Copilot responds with bounded context

- GIVEN a municipal Copilot stream emits metadata and completion/error events
- WHEN the response is rendered
- THEN request/status metadata and returned evidence references are visible
- AND no unsupported source, geometry, or live-acquisition claim is added

### Requirement: Accessible degraded and empty presentation

The modified views MUST preserve keyboard/screen-reader access and deterministic loading, empty, error, and degraded states. Focused tests SHALL use canonical fields and stable semantic selectors; the known pre-existing `government-ui.spec.js:78` locator failure remains recorded and is not attributed to this delta.

#### Scenario: Municipality has no current telemetry

- GIVEN `latestTelemetry` is empty or all sources are degraded
- WHEN the overview or dashboard renders
- THEN the municipality remains usable with an explicit empty/degraded message
- AND no infinite loading or fabricated value appears
