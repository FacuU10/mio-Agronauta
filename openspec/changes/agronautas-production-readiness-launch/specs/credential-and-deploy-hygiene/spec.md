# credential-and-deploy-hygiene Specification

## Purpose

Define launch-blocking credential, deployment, and migration hygiene for safe production remediation.

## Requirements

### Requirement: Exposed secrets are rotated and remediated

All exposed or tracked credentials MUST be revoked/rotated before launch proof. Tracked secret files MUST be removed or mitigated, ignored going forward, and covered by secret scanning.

#### Scenario: Secret rotation is proven
- GIVEN `env.env` or local env files contained live-looking values
- WHEN rotation completes
- THEN old credentials MUST be invalid, production/local MUST use new values, and evidence MUST omit secret values
- AND the remediation log MUST identify owners, systems rotated, and verification time.

#### Scenario: Secret scan detects a credential
- GIVEN a candidate commit contains a secret pattern
- WHEN CI runs the secret scan
- THEN the release gate MUST fail
- AND no deploy or smoke gate MAY run from that commit.

### Requirement: Environment manifest is complete and fail-fast

Production and staging MUST have a non-secret env manifest listing required variables, owner, purpose, runtime surface, and fail-fast behavior for API, web runtime, worker, DB, Redis, provider keys, schedulers, and observability. Authentication and BFF-routing hardening are explicitly deferred to the future `auth-security` library scope.

#### Scenario: Required env is missing
- GIVEN a required production env var is absent or invalid
- WHEN the service starts or readiness runs
- THEN the affected service MUST fail fast or `/ready` MUST be unhealthy
- AND the error MUST identify the variable name without exposing the value.

### Requirement: CI and deploy gates are committed and reproducible

The repository MUST include CI/deploy configuration or documented platform commands that enforce install, lint/security, tests, build, migrations, deploy, smoke, and rollback evidence for the release commit.

#### Scenario: Deployment differs from verified commit
- GIVEN production runs a different commit than the verified candidate
- WHEN smoke evidence is collected
- THEN readiness MUST fail
- AND the mismatch MUST be reported with expected and observed SHAs.

### Requirement: Migration bootstrap is reproducible from empty database

Prisma migrations, bootstrap SQL, and release steps MUST create the schema required by the application from empty volumes and MUST prove production schema drift is absent or documented.

#### Scenario: Clean database bootstrap passes
- GIVEN an empty Postgres/PostGIS database
- WHEN the documented bootstrap and `prisma migrate deploy` or equivalent release step runs
- THEN all app-required tables, extensions, indexes, and seed records MUST exist
- AND tests/smokes MUST pass without manual SQL edits.

#### Scenario: Production schema drifts
- GIVEN production schema differs from the committed schema/migrations
- WHEN schema diff runs read-only
- THEN the release MUST remain NO-GO
- AND the diff MUST be archived with an approved fix or rollback decision.

### Requirement: Migration rollback policy is observable

Every migration-affecting change MUST state whether rollback is revert, forward-fix, restore, or disable-path, with data-loss risk and verification commands.

#### Scenario: Migration rollback is unsafe
- GIVEN a migration is destructive or irreversible
- WHEN rollback planning is reviewed
- THEN the release MUST require a forward-fix/restore plan
- AND the smoke suite MUST prove service safety after the chosen rollback path.
