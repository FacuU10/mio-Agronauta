# production-readiness-gates Specification

## Purpose

Define the release gates that MUST remain blocking while Agronautas is in NO-GO production-readiness remediation.

## Requirements

### Requirement: Launch remains gated by reproducible proof

The system SHALL NOT be described as production-ready until committed release evidence proves install, lint/security, tests, build, Playwright, pytest, migrations, deployed smokes, and rollback readiness for the same release commit.

#### Scenario: Complete release gate passes
- GIVEN a clean release branch and a candidate commit
- WHEN CI executes install, lint/security, unit/integration tests, Playwright, pytest, build, migration checks, and smoke gates
- THEN every gate MUST pass for that exact commit
- AND the artifact bundle MUST include command output, commit SHA, environment, timestamp, and operator.

#### Scenario: Any gate is missing or red
- GIVEN any required command is skipped, flaky, manually asserted, or failing
- WHEN release readiness is evaluated
- THEN the release MUST remain NO-GO
- AND launch messaging MUST remain demo/pre-production only.

### Requirement: Real smoke proof covers local, staging, and production

Smoke evidence MUST cover clean local Compose from empty volumes, local endpoints connected to the production database, staging/preview when available, and production URLs. It MUST prove `/health`, `/ready`, Agronautas runtime, field intake, current risk, recompute request, worker completion, dashboard, PDF/chat fallback, hydrology GET, and hydrology ingest with real endpoint responses.

#### Scenario: Production smoke proves runtime behavior
- GIVEN production credentials and URLs are configured
- WHEN the smoke suite runs once against production
- THEN it MUST capture HTTP status/body summaries, browser network proof, worker job completion, and provider status
- AND it MUST NOT rely on mocked responses for launch-critical proof.

#### Scenario: Local smoke uses production database
- GIVEN local services run local code with credentials for the production database
- WHEN endpoint smokes execute locally
- THEN the artifact MUST prove real endpoint responses and production-DB-backed reads/writes or documented no-write reasons
- AND passing builds or tests alone MUST NOT satisfy this gate.

#### Scenario: Main deployment production ping waits for propagation
- GIVEN the verified commit is pushed to `main` and deployed
- WHEN approximately 2 minutes have elapsed after production reports the deployment live
- THEN smokes MUST ping `https://www.agronauta.com.ar` and launch-critical endpoints
- AND readiness MUST remain NO-GO until those production pings return valid real responses.

#### Scenario: Smoke cannot reach production
- GIVEN production access, credentials, or provider keys are unavailable
- WHEN readiness is reviewed
- THEN the release MUST remain NO-GO
- AND the missing dependency MUST be listed as a blocker.

### Requirement: TDD and traceability evidence is mandatory

Each remediation slice MUST include RED-GREEN-REFACTOR evidence before implementation can be accepted.

#### Scenario: Slice evidence is complete
- GIVEN a slice changes code or config
- WHEN review starts
- THEN the artifact MUST cite failing test first, passing test after change, refactor notes, and exact commands used.

#### Scenario: Evidence is absent
- GIVEN implementation exists without RED-GREEN-REFACTOR proof
- WHEN verify evaluates the slice
- THEN verify MUST fail the slice even if final tests pass.

### Requirement: Done requires live endpoint evidence

The definition of Done MUST require real endpoint evidence; successful builds, unit tests, integration tests, or Playwright alone SHALL NOT prove production readiness.

#### Scenario: Builds and tests pass but endpoint proof is missing
- GIVEN all local commands pass
- WHEN local production-database smokes or delayed production pings are absent
- THEN the change MUST NOT be marked Done
- AND the missing endpoint evidence MUST be recorded as a blocker.

### Requirement: Production rollback is explicit and safe

Rollback instructions MUST identify app revert, migration rollback/forward-fix decision, worker/scheduler disable flags, previous deploy env restoration, smoke after rollback, and secret-rotation exception: rotated secrets MUST NOT be rolled back to exposed values.

#### Scenario: Rollback is executed
- GIVEN a post-deploy blocker is found
- WHEN rollback is invoked
- THEN schedulers/workers MAY be disabled, app deploy MAY revert, and smokes MUST prove degraded/demo mode is safe
- AND rotated credentials MUST remain rotated.

### Requirement: Deferred product features are explicitly non-blocking

Tenant/account ownership, branded PDF polish, CRM/email deliverability, Sentinel/simulation cards, full observability platform, and alert/notification launch SHALL remain deferred unless promoted by a later approved spec.

#### Scenario: Deferred feature is requested during launch remediation
- GIVEN a deferred feature is incomplete
- WHEN production readiness is evaluated
- THEN it MUST NOT block this remediation
- AND UI/API claims MUST avoid implying the feature is live.
