# Delta for Agronautas Management Foundation

## MODIFIED Requirements

### Requirement: Truthful Access and Failure States

The system MUST represent loading, unavailable-storage, invalid-identifier, maintenance, and unauthorized/forbidden states using typed contracts appropriate to the existing Agronautas auth boundary. Current global role tokens MUST NOT be treated as user identity, tenant membership, ownership, collaboration authority, or management permission unless an explicit permission contract proves it. Iberá-Alerta routes, schemas, persistence, navigation, and vocabulary MUST remain unchanged.
(Previously: global role tokens were not treated as identity, tenant membership, ownership, or collaboration authority.)

#### Scenario: Read data is unavailable
- GIVEN workspace or activity storage cannot be read
- WHEN the corresponding request is made
- THEN the API returns the established typed unavailable error
- AND the UI renders an actionable error state without fabricated data

#### Scenario: Mutation lacks permission
- GIVEN the caller has only the existing global Agronautas role scope
- WHEN a campaign, operation, or task mutation is attempted
- THEN the API returns `403`, creates no record, and records no false success

#### Scenario: No ownership or collaboration contract exists
- GIVEN the caller has only the existing global Agronautas role scope
- WHEN workspace or field navigation is performed
- THEN the system uses the documented default workspace context
- AND it MUST NOT claim per-user ownership, membership, assignment, or collaboration

## ADDED Requirements

### Requirement: Durable management extends the foundation without rewriting history

New campaign, operation, and task records MUST reference existing workspace/field identities without mutating existing field evidence, risk, alert, ingestion, recompute, or read-only activity records. Accepted mutations MUST be auditable and idempotent.

#### Scenario: Operation references an existing field
- GIVEN a valid existing field and an explicit permitted actor
- WHEN an operation is created
- THEN the operation is durable and linked to the field while prior evidence and activity remain unchanged

#### Scenario: Existing read model remains empty or unchanged
- GIVEN no qualifying source activity exists or a management write is retried
- WHEN the foundation read model is requested
- THEN it remains an explicit empty/read-only projection and no duplicate or authored historical event is inferred

## Non-goals

No payments, payouts, Checkout Pro, Money Out, settlement, escrow, custody, copied product behavior, or Iberá-Alerta mutation is included.
