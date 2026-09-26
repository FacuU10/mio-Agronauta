# Agronautas Auth Security Isolation Specification

## Purpose

Provide Agronautas-owned identity, sessions, refresh, memberships, and trusted principals for an operator/admin and invited member. Registration, Alqui/Vialovers behavior, marketplace, billing, Money Out, and payouts are excluded.

## Requirements

### Requirement: Owned identity and trusted principal

Agronautas MUST resolve protected requests from an owned authenticated principal. It MUST NOT accept actor, user, workspace, or role identity from browser headers or public configuration.

#### Scenario: Authenticated member reaches a permitted operation
- GIVEN an owned user has an active session and membership
- WHEN the request reaches a protected operation
- THEN the server derives `(actorId, workspaceId)` from the principal and authorizes

#### Scenario: Caller supplies an identity claim
- GIVEN a request includes caller-supplied identity
- WHEN authentication and authorization run
- THEN the claim is ignored and an untrusted or unauthenticated request is denied

### Requirement: Strict secrets and idempotent bootstrap

Production secrets MUST be explicitly configured and non-default. The system MUST fail closed when absent and provision named pilot workspace/admin without default credentials; bootstrap MUST be repeatable.

#### Scenario: Named bootstrap runs twice
- GIVEN valid secrets and the pilot input
- WHEN bootstrap runs two times
- THEN pilot workspace and admin mapping exist without duplicates

#### Scenario: Secret is missing
- GIVEN a protected production service lacks a required secret
- WHEN startup or a protected request is evaluated
- THEN protected access is denied or maintenance is returned, never disabled

### Requirement: Membership is authorization authority

Protected operations MUST apply membership and scope for `(actorId, workspaceId)`. Default workspace MUST NOT grant membership; unmapped records MUST remain non-writable.

#### Scenario: Cross-workspace access is denied
- GIVEN an authenticated actor belongs to workspace A but requests workspace B
- WHEN authorization evaluates the operation
- THEN the request returns `403` without exposing or mutating workspace B

#### Scenario: Unmapped legacy record is requested for write
- GIVEN an existing field has no explicit ownership mapping
- WHEN a write or admin operation targets that field
- THEN the operation is denied as unmapped

### Requirement: Rotating refresh sessions detect replay

Refresh records MUST be durable and single-use; replay MUST revoke the family. Invalid, expired, revoked, or replayed credentials MUST NOT create a principal.

#### Scenario: Refresh rotates successfully
- GIVEN a valid unconsumed refresh record
- WHEN the client refreshes once
- THEN the old record is consumed and a replacement pair is issued

#### Scenario: Consumed refresh is replayed
- GIVEN a refresh record has already rotated
- WHEN that record is presented again
- THEN the family is revoked and subsequent credentials are denied

### Requirement: Redis degradation is explicit per operation

Each Redis operation MUST declare failure behavior. Security-critical revocation/replay checks MUST fail closed when policy cannot be satisfied; telemetry MAY degrade without weakening authorization.

#### Scenario: Revocation check cannot reach Redis
- GIVEN Redis is unavailable during a required revocation or replay check
- WHEN a protected request is evaluated
- THEN access is denied or maintenance is returned by policy

#### Scenario: Non-critical Redis operation fails
- GIVEN Redis is unavailable for a non-authoritative metric or cache operation
- WHEN the operation runs
- THEN the result remains truthful and no extra access is granted

### Requirement: Migration and rollback preserve safety

Auth migration MUST be additive and ordered, use explicit mappings, and preserve Iberá-Alerta/domain contracts. Rollback MUST expose public health only; protected routes MUST deny or return maintenance. Destructive down-migration MAY occur only in disposable environments after approved recovery.

#### Scenario: Migration leaves ownership unresolved
- GIVEN existing records cannot be explicitly mapped
- WHEN the ordered migration completes
- THEN records remain non-writable until assigned

#### Scenario: Protected rollback is activated
- GIVEN the new protected path is disabled during rollback
- WHEN a protected route is requested
- THEN it is denied or returns maintenance and no legacy-token fallback is enabled
