# Production Launch Readiness Specification

## Purpose

Define the evidence and security gates required before any production-readiness claim. Local proof is useful preparation but MUST remain a separate evidence scope.

## Requirements

### Requirement: Production configuration is explicit and secure

Production MUST explicitly configure authentication, worker-required readiness, trusted proxy behavior, non-local BFF/API origins, bounded timeouts, and scheduler policy. No permissive code default, missing variable, or local fallback MAY weaken production security. Client bundles MUST NOT receive API, database, provider, or ingest secrets.

#### Scenario: Required production setting is omitted
- GIVEN auth, worker-required readiness, origin, proxy, or timeout configuration is absent or invalid
- WHEN launch readiness is evaluated
- THEN the gate is `blocked` and the missing setting is named without exposing its value

#### Scenario: Secret composition is valid
- GIVEN deployment secrets are injected by the runtime or secret manager
- WHEN server and BFF configuration is composed
- THEN only secret names and redacted status are observable; no client response, log, screenshot, or receipt contains a secret

### Requirement: All external and tenant boundaries have real evidence

Launch evidence MUST independently classify every configured provider, authentication path, tenant isolation check, lead capture path, authorized hydrology ingest path, and BFF/API authorization boundary as `live`, `degraded`, `failed`, `blocked`, or `not_run`. Fixtures, route stubs, fake success responses, and inferred authorization MUST NOT satisfy a live claim.

#### Scenario: Authorized tenant flow succeeds
- GIVEN a real authorized actor, tenant-scoped data, approved provider access, and a real lead/ingest request
- WHEN the boundary matrix runs once
- THEN responses prove actor/tenant scope, provider outcome, authorization, and durable correlation independently

#### Scenario: A provider or boundary cannot be exercised
- GIVEN credentials, tenant data, provider approval, or owner authorization is unavailable
- WHEN the matrix reaches that cell
- THEN it records `blocked` or `not_run` with the prerequisite and the release remains non-launchable

### Requirement: Worker, Cron, database, and request contracts are correlated

The selected runtime path MUST prove request ID, revision ID, proof/run ID, job ID where applicable, bounded timeouts, idempotency, durable migration state, worker claim/completion/failure, and read-only database correlation. A 202 acknowledgement or healthy queue alone MUST NOT imply completion.

#### Scenario: Real job reaches terminal persistence
- GIVEN API, Redis, Python worker, PostgreSQL, and migration state are healthy
- WHEN one authorized job is submitted and observed once
- THEN acknowledgement, worker transition, terminal result, and matching read-only row are correlated by stable IDs

#### Scenario: Worker or database boundary fails
- GIVEN a timeout, lost heartbeat, duplicate request, migration failure, or persistence error occurs
- WHEN the run is evaluated
- THEN the outcome preserves the failure state, retry/idempotency semantics, and evidence is not promoted to success

### Requirement: Render Cron is an explicit decision gate

The owner MUST choose exactly one production model: direct one-shot runner execution or authenticated HTTP `POST` to the canonical ingest path. The chosen model MUST document auth, schedule, timeout, idempotency, response/completion semantics, and external execution identity; the other model MUST be marked not selected and MUST NOT be used as equivalent evidence.

#### Scenario: Authenticated HTTP POST is selected
- GIVEN the owner selects the external POST model
- WHEN one Cron execution is live-proven
- THEN it sends the canonical body and ingest secret reference, records Cron/request/proof IDs, observes completion once, and correlates read-only rows

#### Scenario: Direct runner is selected
- GIVEN the owner selects direct one-shot execution
- WHEN one Render Cron execution is live-proven
- THEN the receipt identifies the direct path and its distinct failure semantics; HTTP POST evidence cannot substitute for it

#### Scenario: No model is selected
- GIVEN Render configuration and the runbook describe different models
- WHEN launch review occurs
- THEN production readiness is `blocked` until one model is selected, configured, and live-proven

### Requirement: Operational failure and rollback are explicit

The launch record MUST define responses to provider failure, unauthorized access, BFF timeout, worker loss, Cron duplication, migration failure, and stale data. Rollback MUST disable the affected release or schedule without destructive database reset and MUST preserve the redacted audit trail.

#### Scenario: Production proof fails safely
- GIVEN a provider, worker, BFF, or Cron check fails
- WHEN the operator closes the proof window
- THEN the receipt records the exact failure and the release remains blocked or degraded according to policy

#### Scenario: Configuration rollback is required
- GIVEN a release or Cron change causes a verified regression
- WHEN the approved rollback runs
- THEN only that release/configuration is reverted, duplicate schedules are disabled, and migration/data ownership remains intact
