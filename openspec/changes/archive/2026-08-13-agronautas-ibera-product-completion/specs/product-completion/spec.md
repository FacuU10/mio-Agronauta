# Agronautas and Iberá-Alerta Product Completion Delta

Agronautas and Iberá-Alerta MUST remain separate namespaces, routes, authorization, and evidence vocabularies.

## ADDED Requirements

### Requirement: Pilot field index and evidence workflow

Agronautas SHALL expose a typed index over persisted `fields`, preserve APIs, and navigate an authorized field to detail. Records SHOULD retain ID, locality/crop, timestamps, and source/run IDs.

#### Scenario: Index states
- GIVEN an authorized request to the Agronautas entry route
- WHEN fields are loading, empty, returned, unauthorized, or unavailable
- THEN the UI renders the matching state without invented fields.

### Requirement: Geometry read-back and report evidence

Geometry SHALL use `GET`/authenticated `PATCH` contracts, read back server metrics, and expose updated-at/source/evidence. `GET /dashboard.pdf` SHALL identify snapshot time, field ID, evidence, and saved versus point-only geometry; stale writes SHALL remain rejected.

#### Scenario: Save, read, and report
- GIVEN a supported Corrientes rice field with valid geometry
- WHEN geometry is saved, re-read, and a report is requested
- THEN geometry/metrics and timestamps match persisted state, and the report identifies snapshot and evidence.

#### Scenario: Missing or stale geometry
- GIVEN geometry is absent, invalid, stale, or the provider-neutral editor is used
- WHEN detail or report renders
- THEN it labels point-only/unavailable/stale state and never implies Google availability.

### Requirement: Explained risk and climate evidence

Field detail SHALL explain score/level, drivers, valid window, weather/alert lineage, freshness, source/run IDs, review action, and engine metadata. It MUST distinguish observed, forecast, degraded, and missing evidence and MUST NOT select a new risk engine.

#### Scenario: Actionable explanation
- GIVEN current dashboard, risk, weather, and alert records exist
- WHEN the field detail loads
- THEN it presents traceable explanation with timestamps/provenance, or unavailable portions.

### Requirement: Durable operator ingest history

Iberá-Alerta SHALL provide an authenticated `/ingest` run view backed by `ibera_ingest_runs`, including IDs, requested sources, source results, safe diagnostics, proof ID, lifecycle timestamps, freshness, and last-successful data. Reads MUST survive restart and MUST NOT alter telemetry.

#### Scenario: History and authorization
- GIVEN durable runs exist or no runs exist
- WHEN an authorized operator opens history, or an unauthorized user requests it
- THEN running/terminal evidence or empty state is returned; unauthorized access is rejected without provider calls.

#### Scenario: Degraded run
- GIVEN one source failed, timed out, or is stale
- WHEN history renders
- THEN failure/staleness and IDs remain visible, last-known data is preserved, and secrets/raw traces are absent.

### Requirement: Municipality explanation and incident timeline

Municipality detail SHALL expose telemetry/official-alert explanations: thresholds, observed value, comparison, tendency/window, forecast horizon/confidence, freshness, source URL/time, last-successful time, and run ID where available. A timeline SHALL show dated events and empty/loading/error/degraded states. Relations MUST be labeled source mapping/threshold comparison, not territorial or hydraulic impact.

#### Scenario: Verifiable municipality state
- GIVEN telemetry, thresholds, forecasts, or alerts are present
- WHEN detail loads
- THEN each claim has source/time/freshness and the timeline is ordered.

#### Scenario: No or unsafe evidence
- GIVEN records are missing, stale, failed, unauthorized, or beyond supported forecast evidence
- WHEN overview/detail renders
- THEN it shows unavailable/degraded/citation limits and never invents values, incidents, geometry, evacuation advice, routing, lag, discharge, propagation, or hydraulic simulation.

## Deferred and Missing Domains

This change adds no official Iberá geometry, campaigns, tasks, responsibles, decisions, markets, productivity/economics, simulators, credit/insurance, Google runtime, or Render production proof. Seeded geometry, fixtures, manifests, and local tests are not external proof.

## MODIFIED Requirements

### Requirement: Deferred timeline and long-range detail

Historical municipal incident/alert timelines derived from persisted telemetry and official alerts MAY be added by this change. Long-range forecast detail, provider expansion, dynamic-ID mapping, and institutional case-management timelines remain deferred and MUST NOT be added.
(Previously: all historical municipal timelines and long-range detail were deferred.)

#### Scenario: Deferred request is evaluated
- GIVEN a request for long-range detail or human incident management
- WHEN this change is implemented
- THEN no corresponding endpoint, provider expansion, or case workflow is introduced.
