# Agronautas Management Foundation Specification

## Purpose

Provide Agronautas with one explicit, source-backed management context for existing fields. The capability MUST remain read-oriented except for deterministic workspace seeding/backfill, and MUST NOT imply users, tenants, ownership, collaboration, or operator-authored history.

## Requirements

### Requirement: Explicit Default Workspace and Backfill

The system MUST expose one persisted Agronautas default workspace with a stable identifier and name. It MUST idempotently associate every existing field with that workspace without changing field identifiers, field evidence, risk, alert, ingestion, or recompute records. The association MUST be safe to repeat and MUST preserve fields created after the initial backfill.

#### Scenario: Existing fields become visible

- GIVEN existing Agronautas fields have no workspace association
- WHEN the default workspace initialization/backfill runs
- THEN every existing field is associated with the default workspace
- AND each field retains its existing identity and evidence relationships

#### Scenario: Backfill is repeated

- GIVEN the default workspace and field associations already exist
- WHEN initialization/backfill runs again
- THEN no duplicate workspace or field association is created
- AND no field data or evidence timestamp is changed

### Requirement: Workspace and Field Index Navigation

The system MUST provide a typed read contract for the selected Agronautas workspace and a paginated field index. Workspace context MUST identify the workspace, name, status, field count, and timestamps. Field summaries MUST include existing field identity, crop, hectares, locality, geometry status/source, and update timestamp. Navigation MUST reject or clearly report an invalid workspace or field identifier.

#### Scenario: User opens the default workspace

- GIVEN the Agronautas default workspace is available
- WHEN the user opens the management workspace
- THEN the workspace context and paginated field index are rendered
- AND selecting a field navigates to that field's existing detail context

#### Scenario: Workspace has no fields

- GIVEN a valid workspace contains zero fields
- WHEN the field index is requested
- THEN the system returns an empty list with pagination metadata
- AND the UI renders an explicit empty state rather than invented records

### Requirement: Read-Only Activity and History Projection

The system MUST expose a read-only projection derived only from existing field lifecycle, risk, alert, ingestion, and recompute records. Each item MUST identify its source type and timestamp. The projection MUST NOT create an audit ledger, operator-history record, actor, decision, responsibility, or new operational event, and MUST NOT be presented as authored history.

#### Scenario: Field activity is available

- GIVEN a valid field has source-backed lifecycle or evidence records
- WHEN activity/history is requested
- THEN the system returns chronologically interpretable, source-labeled items
- AND no source record is mutated

#### Scenario: Activity has no source records

- GIVEN a valid field has no qualifying source records
- WHEN activity/history is requested
- THEN the system returns an explicit empty state
- AND the response does not infer activity, ownership, or collaboration

### Requirement: Truthful Access and Failure States

The system MUST represent loading, unavailable-storage, invalid-identifier, and unauthorized/forbidden states using typed contracts appropriate to the existing Agronautas auth boundary. Current global role tokens MUST NOT be treated as user identity, tenant membership, ownership, or collaboration authority. Iberá-Alerta routes, schemas, persistence, navigation, and vocabulary MUST remain unchanged.

#### Scenario: Read data is unavailable

- GIVEN workspace or activity storage cannot be read
- WHEN the corresponding request is made
- THEN the API returns the established typed unavailable error
- AND the UI renders an actionable error state without fabricated data

#### Scenario: No ownership or collaboration contract exists

- GIVEN the caller has only the existing global Agronautas role scope
- WHEN workspace or field navigation is performed
- THEN the system uses the documented default workspace context
- AND it MUST NOT claim per-user ownership, membership, assignment, or collaboration
