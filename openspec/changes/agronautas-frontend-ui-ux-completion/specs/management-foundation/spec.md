# Delta for Agronautas Management Foundation

## MODIFIED Requirements

### Requirement: Workspace and Field Index Navigation

The system MUST provide a typed read contract for the selected Agronautas workspace and a paginated field index. Workspace context MUST identify workspace, name, status, field count, timestamps, provenance, and freshness. Field summaries MUST include existing identity, crop, hectares, locality, geometry status/source, update timestamp, and permitted next actions. Navigation MUST reject or clearly report invalid, forbidden, or unavailable identifiers.
(Previously: workspace and field summaries exposed identity, status, counts, geometry, and timestamps.)

#### Scenario: User opens the default workspace
- GIVEN the default workspace is available
- WHEN the user opens management
- THEN context and paginated fields render with provenance/freshness and selecting a field reaches its existing detail context

#### Scenario: Workspace has no fields
- GIVEN a valid workspace contains zero fields
- WHEN the field index is requested
- THEN an empty list with pagination metadata is returned and the UI renders an explicit empty state

### Requirement: Read-Only Activity and History Projection

The system MUST expose a read-only projection derived only from existing field lifecycle, risk, alert, ingestion, and recompute records. Each item MUST identify source type, timestamp, provenance, and freshness where known. The projection MUST NOT create an audit ledger, actor, decision, responsibility, or authored operational event.
(Previously: activity was source-labeled and read-only but did not require visible provenance/freshness.)

#### Scenario: Field activity is available
- GIVEN a valid field has source-backed records
- WHEN activity/history is requested
- THEN chronological items with source, timestamp, provenance, and safe next action render without mutation

#### Scenario: Activity has no source records
- GIVEN a valid field has no qualifying records
- WHEN activity/history is requested
- THEN an explicit empty state is shown and no activity, ownership, or collaboration is inferred

### Requirement: Truthful Access and Failure States

The system MUST represent loading, unavailable-storage, invalid-identifier, unauthorized, forbidden, maintenance, and degraded states using typed contracts appropriate to the existing auth boundary. Global role tokens MUST NOT be treated as identity, tenant membership, ownership, or collaboration authority.
(Previously: loading, unavailable-storage, invalid-identifier, and unauthorized/forbidden states were required.)

#### Scenario: Read data is unavailable
- GIVEN workspace or activity storage cannot be read
- WHEN the request is made
- THEN the established typed unavailable or maintenance state appears with an actionable recovery path and no fabricated data

#### Scenario: No ownership contract exists
- GIVEN the caller has only the existing global role scope
- WHEN workspace or field navigation is performed
- THEN the documented default workspace is used without claiming ownership, assignment, membership, or collaboration
