# Agronautas Field Scope Specification

## Purpose
Corrientes-first Argentina agriculture intake and boundaries.

## Requirements

### Requirement: Argentina Agricultural Scope
The system MUST accept agricultural fields in Argentina, default MVP rollout to Corrientes, and MUST NOT hard-code rice-only behavior.

#### Scenario: Corrientes field accepted
- GIVEN a field in Corrientes with crop category and geometry
- WHEN the field is saved
- THEN validation succeeds
- AND stored scope is Argentina/Corrientes with the submitted crop metadata

#### Scenario: Unsupported boundary is explicit
- GIVEN a field outside the enabled launch regions
- WHEN the field is submitted
- THEN the API returns a typed unsupported-region error
- AND no risk snapshot is generated

### Requirement: No-Auth Boundary
The system MUST NOT introduce accounts, RBAC, billing, or replacement auth in this change; protected behavior MUST remain behind existing deployment controls until the future `auth security` library exists.

#### Scenario: No user model required
- GIVEN dashboard or PDF endpoints are exercised in tests
- WHEN requests are made without new auth entities
- THEN behavior is validated without creating user/account records

### Requirement: Contract-First TDD Gate
Field scope changes MUST have failing-first TS schema, API validation, and E2E tests before implementation.

#### Scenario: Acceptance gate blocks rice-only regression
- GIVEN tests submit non-rice crop metadata
- WHEN contract and E2E suites run
- THEN they prove non-rice fields pass and rice-only copy is absent
