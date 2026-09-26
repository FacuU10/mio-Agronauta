# Management Workflows Specification

## Purpose

Add durable Agronautas management paths for campaigns, operations, and tasks while preserving explicit actor/workspace permissions and an auditable history.

## Requirements

### Requirement: Durable management entities

Campaigns, seasons, operations, and tasks MUST have stable identifiers, workspace/field scope, lifecycle state, timestamps, responsible actor or unassigned state, and source-backed links to affected locations. Writes MUST be persisted transactionally and survive restart.

#### Scenario: Authorized operation lifecycle
- GIVEN an actor has workspace permission and a valid field
- WHEN the actor creates and transitions an operation
- THEN the durable record and state transition are returned and visible after reload

#### Scenario: Empty or storage outage
- GIVEN a workspace has no operations or persistence is unavailable
- WHEN management data is requested or written
- THEN the system returns an explicit empty/unavailable state and creates no phantom record

### Requirement: Permission and audit boundaries

Every management mutation MUST enforce actor, workspace, field, and role scope in the backend. Each accepted or rejected mutation MUST produce an audit entry with actor, action, target, outcome, and time; secrets and unrelated product data MUST NOT be recorded.

#### Scenario: Authorized and forbidden mutation
- GIVEN an authorized manager and an actor outside the workspace
- WHEN each attempts the same transition
- THEN the first succeeds with an audit entry and the second receives `403` with no state change

#### Scenario: Concurrent or duplicate request
- GIVEN two requests target the same task revision
- WHEN they arrive concurrently or one is retried
- THEN only the valid revision transition is applied, duplicates are idempotent, and the conflict is auditable

### Requirement: Recovery and honest planning semantics

Failed, cancelled, blocked, and maintenance states MUST remain visible with retryability and last-known state. Planning assumptions, unavailable soil/economic inputs, and simulations MUST remain labeled as assumptions and MUST NOT become verified economics or completed work.

#### Scenario: Worker or API recovery
- GIVEN a mutation times out after the server may have committed
- WHEN the actor reloads or retries
- THEN the durable outcome is reconciled before another mutation is allowed

## Non-goals

This capability excludes payments, payouts, Checkout Pro, Money Out, settlement, escrow, inventory custody, regulated claims, copied Alqui/Vialovers flows, and implicit user ownership or collaboration semantics.
