# Agronautas Evidence Visibility Specification

## Purpose

Define the first non-repetitive, data-first evidence layer over the applied Agronautas journey. It exposes verified evidence and its limits without claiming acquisition that the current runtime has not proven.

## Requirements

### Requirement: Contract-to-screen evidence inventory

The change MUST retain `contract-to-screen-matrix.md` as an acceptance artifact. Each row SHALL identify the verified route/schema, rendered screen/use, required content, proof status, state label, and acceptance assertion. A proposed typed field MUST be marked conditional until its route/schema and source evidence are verified.

#### Scenario: Matrix gates an unproven value

- GIVEN a screen wants a scheduler, geometry, or live-acquisition value not returned by a verified contract
- WHEN the matrix is reviewed
- THEN the row is marked missing or conditional
- AND the UI does not present the value as live or authoritative

### Requirement: Agronautas evidence is visible without a second shell

The existing field and workspace journeys MUST expose available field context, dashboard/risk indicators, weather and hydrology observations/forecasts, alerts, risk/weather timelines, provenance, freshness, diagnostics/degradation, and the evidence actually supplied to each Copilot path. Existing contracts are authoritative; additions SHALL be limited to repository-proven fields.

#### Scenario: Complete evidence renders with source state

- GIVEN verified field, dashboard, hydrology, timeline, provenance, and Copilot payloads
- WHEN the workspace or detail journey renders
- THEN each value has its source/freshness/state context and Copilot evidence references are shown when returned

#### Scenario: Partial evidence remains honest

- GIVEN a current payload lacks geometry, durable scheduler state, or complete Copilot context
- WHEN the journey renders
- THEN available evidence remains usable and the absent item is labeled missing/degraded
- AND no fallback or presentation projection is described as acquired evidence

### Requirement: Evidence states are explicit

Every displayed value MUST use only these semantics: `observed`, `forecast`, `cached/latest-good`, `stale`, `degraded`, `missing`, or `mock/seam`. Cached/latest-good MAY also be stale. `observed` or `forecast` MUST include source and timestamp evidence; mock/seam MUST identify the seam or mode. The UI MUST NOT claim live acquisition without a proven source, mode, timestamp, and request/run trace.

#### Scenario: Stale or mock data is displayed

- GIVEN the latest successful value is outside its freshness expectation or comes from a mock/unconfigured seam
- WHEN it is rendered
- THEN it is labeled stale or mock/seam respectively
- AND the UI preserves the last-known value without implying a new provider request

### Requirement: Accessible deterministic states and baseline preservation

Loading, empty, error, and degraded states MUST be keyboard/screen-reader understandable and deterministic from fixtures. Tests MUST cover happy, missing, stale/degraded, mock/seam, and error states using stable semantic selectors. The applied UI baseline MUST remain intact, including the known pre-existing `government-ui.spec.js:78` locator failure.

#### Scenario: No evidence is available

- GIVEN a valid field has no verified evidence for a requested panel
- WHEN the panel renders
- THEN it shows an explicit empty/missing state and remains navigable
- AND the known baseline locator failure is not reclassified as caused by this change

### Requirement: On-demand work is a gated evidence plan

This change SHALL document, but MUST NOT implement, a later single-field slice: one centroid, one proven source, request/run identifiers, bounded rate and timeout behavior, cache/latest-good fallback, durable persistence/history, freshness, and an end-to-end Copilot trace. The slice MUST remain one PR-sized follow-on until measured evidence proves otherwise.

#### Scenario: Follow-on readiness is evaluated

- GIVEN the matrix identifies a missing acquisition trace
- WHEN a later design evaluates on-demand acquisition
- THEN it requires the single-centroid/source proof sequence and external Postgres/Redis prerequisites
- AND it does not infer Corrientes-wide feasibility

### Requirement: Explicit non-goals constrain acceptance

Acceptance MUST exclude Docker, Google Maps, WhatsApp, durable editable polygons, Corrientes-wide precomputation, scheduler rewrite, Risk Engine consolidation, hydraulic simulation, and official municipality-map implementation without verified geometry and impact semantics.

#### Scenario: A non-goal is proposed during review

- GIVEN implementation review proposes one of the excluded capabilities
- WHEN scope is checked
- THEN it is rejected or routed to a separate gated change
- AND this slice remains evidence visibility only
