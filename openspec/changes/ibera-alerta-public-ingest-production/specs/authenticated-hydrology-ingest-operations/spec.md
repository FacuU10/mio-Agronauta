# authenticated-hydrology-ingest-operations Specification

## Purpose

Operate scheduled hydrology ingestion with authenticated, auditable production evidence.

## Requirements

### Requirement: Authenticated external scheduling

The scheduler MUST obtain `x-hydrology-ingest-token` from approved secret configuration and MUST NOT log or disclose it. A tokenless facade MAY be deployed only when it independently authenticates the caller with signed identity, applies rate limiting, replay protection, and audit logging; anonymous forwarding MUST be rejected.

#### Scenario: Authorized scheduler run

- GIVEN the scheduler has the configured secret
- WHEN it invokes the ingest endpoint
- THEN it sends the authorization header and receives the structured ingest response

#### Scenario: Anonymous facade request

- GIVEN a facade lacks independently verified caller identity
- WHEN it receives an ingest request
- THEN it rejects the request and MUST NOT forward it

### Requirement: Deployment receipt and rollback

Production deployment MUST retain a redacted receipt proving platform/scheduler secret configuration, one authorized run, and bounded read-only health/data checks. The receipt MUST identify time, deployment revision, outcome, and run identifier when available, without secret values. Rollback MUST disable the new scheduler/facade, revoke or rotate its credential, retain the authenticated route, and revert only this change; no data migration is required.

#### Scenario: Evidence is collected

- GIVEN a production deployment succeeds
- WHEN the authorized run and bounded checks complete
- THEN a redacted receipt records their outcomes without credentials

#### Scenario: Rollback is required

- GIVEN the scheduled integration is unsafe or unhealthy
- WHEN rollback is initiated
- THEN new triggering is disabled and prior authenticated behavior remains available

## Non-Goals

Public anonymous ingestion, browser-triggered production ingestion, IP-only protection, and secret rotation disclosure are out of scope.
