# Delta for Iberá-Alerta

## MODIFIED Requirements

### Requirement: Hydrology and Copilot states reconcile in the view

Iberá-Alerta views MUST derive one consistent status from telemetry, provenance, freshness, forecast presence, ingest recovery, geometry/coverage truth, and Copilot metadata. Source registration MUST NOT be presented as a latest observation; empty forecasts MUST be explicit; citation-unavailable Copilot output MUST be non-actionable.
(Previously: views reconciled telemetry, provenance, freshness, forecast presence, and Copilot metadata.)

#### Scenario: Current source cards conflict with missing telemetry
- GIVEN a source is registered but its latest telemetry is missing or stale
- WHEN a municipality detail renders
- THEN it labels the observation missing/stale, explains the reason and timestamp, and does not call the source evidence current

#### Scenario: Copilot has no verified citation
- GIVEN Copilot returns `citationMode:none` or `citationUnavailable:true`
- WHEN the user reads the result
- THEN the UI says citation unavailable and does not imply grounded operational advice

#### Scenario: Ingest recovers after lease or provider failure
- GIVEN a municipality run is retryable or lease-recovered and a later official response is persisted
- WHEN status and timeline reload
- THEN the recovered run, source freshness, and prior failure are distinct and no duplicate event is shown

## ADDED Requirements

### Requirement: Geometry and coverage remain truthful

Municipality geometry MUST expose reviewed, unverified, partial, or unavailable state and coverage MUST be tied to approved official identifiers and source mappings. Generated or seeded geometry MUST NOT create official territorial or alert claims.

#### Scenario: Geometry is unverified
- GIVEN only a generated or unreviewed boundary exists
- WHEN a municipality detail or map renders
- THEN geometry is labeled unverified and geometry-derived impact is unavailable

#### Scenario: Official source Copilot boundary
- GIVEN a user asks Iberá Copilot about Agronautas fields, marketplace data, or unsupported hydraulic impact
- WHEN the request is processed
- THEN only approved official municipal context is used and the answer is refused or marked unavailable

## Non-goals

Do not merge Iberá ownership with Agronautas, add incident case management, publish hydraulic routing/evacuation authority, or alter auth security isolation.
