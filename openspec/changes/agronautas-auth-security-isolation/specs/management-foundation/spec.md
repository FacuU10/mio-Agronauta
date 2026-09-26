# Delta for Management Foundation

## MODIFIED Requirements

### Requirement: Explicit Default Workspace and Backfill

The system MUST expose one persisted, named Agronautas pilot/default workspace with a stable identifier and name. It MUST idempotently associate existing fields only through explicit approved mappings, without inferring ownership from the default workspace. It MUST preserve field identifiers, field evidence, risk, alert, ingestion, and recompute records; unmapped records MUST remain non-writable until explicitly assigned, and new fields MUST retain the declared association behavior.
(Previously: every existing field was associated with the default workspace, without an ownership or membership boundary.)

#### Scenario: Explicitly mapped fields become visible
- GIVEN existing Agronautas fields have approved workspace mappings
- WHEN the ordered initialization/backfill runs
- THEN mapped fields are associated with the named workspace and their identity/evidence relationships remain unchanged

#### Scenario: Backfill is repeated
- GIVEN the pilot workspace and approved associations already exist
- WHEN initialization/backfill runs again
- THEN no duplicate workspace or association is created and no field data or evidence timestamp changes

#### Scenario: Field has no approved mapping
- GIVEN an existing field has no explicit ownership mapping
- WHEN a write or admin operation targets the field
- THEN the operation is denied as unmapped and the default workspace does not grant authority

### Requirement: Truthful Access and Failure States

The system MUST represent loading, unavailable-storage, invalid-identifier, unauthorized, and forbidden states using typed contracts. Membership for `(actorId, workspaceId)` MUST authorize writes and admin operations; the default workspace and global role tokens MUST NOT establish identity, ownership, membership, or collaboration. Iberá-Alerta routes, schemas, persistence, navigation, and vocabulary MUST remain unchanged.
(Previously: callers with a global role scope could use the documented default workspace context without a per-user membership contract.)

#### Scenario: Read data is unavailable
- GIVEN workspace or activity storage cannot be read
- WHEN the corresponding request is made
- THEN the API returns the established typed unavailable error and the UI renders no fabricated data

#### Scenario: No membership exists
- GIVEN the caller lacks membership for the requested workspace
- WHEN a write or admin operation is performed
- THEN the API returns `403` and does not mutate or reveal protected data

#### Scenario: No ownership or collaboration contract exists
- GIVEN a record has no explicit mapping or the caller has only a global role scope
- WHEN workspace or field navigation is performed
- THEN the system reports the bounded read context and MUST NOT claim ownership, membership, assignment, or collaboration

## ADDED Requirements

### Requirement: Read projections remain source-backed

Read-only activity and field projections MUST remain derived from existing records and MUST NOT become evidence of membership, authorship, or write authority.

#### Scenario: Projection is rendered after auth
- GIVEN a permitted read has source-backed records
- WHEN the projection is returned
- THEN source labels and timestamps remain intact and no actor-authored history is invented
