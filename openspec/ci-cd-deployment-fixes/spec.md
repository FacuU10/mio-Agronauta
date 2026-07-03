# Spec: CI/CD Deployment Fixes

## Purpose

This operational specification defines required CI/CD, dependency, lint, Turbo, and deployment-validation behavior for `ci-cd-deployment-fixes`.

## Requirements

### Requirement: TruffleHog Workflow Scan Range

The security workflow MUST configure TruffleHog with event-appropriate scan ranges for pull requests and pushes, and MUST NOT use invalid or empty base/head references that make the job fail before scanning.

#### Scenario: Pull request scan succeeds
- GIVEN a pull request event with valid base and head SHAs
- WHEN the security workflow runs TruffleHog
- THEN TruffleHog scans the PR diff range successfully
- AND the job fails only when verified secrets are found.

#### Scenario: Push scan succeeds
- GIVEN a push event without PR metadata
- WHEN the security workflow runs TruffleHog
- THEN it uses the push before/after range or a safe fallback
- AND it does not reference PR-only fields.

### Requirement: pnpm Audit Vulnerability Resolution

The dependency set MUST resolve known `pnpm audit` findings for `postcss` and `turbo` using compatible upgrades or root `pnpm.overrides`, and SHOULD preserve existing package-manager workflows.

#### Scenario: Audit passes for targeted advisories
- GIVEN dependencies are installed from the committed lockfile
- WHEN `pnpm audit` is executed
- THEN no audit failure remains for `postcss` or `turbo`.

#### Scenario: Override compatibility is preserved
- GIVEN the overrides are applied
- WHEN build and test commands install dependencies
- THEN package resolution remains deterministic
- AND no unsupported package-manager switch is introduced.

### Requirement: Web ESLint Generated File Exclusion

The `apps/web` ESLint configuration MUST ignore generated `next-env.d.ts` while continuing to lint application source files.

#### Scenario: Generated env types are ignored
- GIVEN `apps/web/next-env.d.ts` exists
- WHEN web lint runs
- THEN ESLint does not report errors from that generated file.

#### Scenario: App code remains linted
- GIVEN a lint violation exists in `apps/web` source code
- WHEN web lint runs
- THEN ESLint still reports the source violation.

### Requirement: Turbo v2 Tasks Configuration

The Turbo configuration MUST use the v2 `tasks` schema instead of deprecated `pipeline`, and CI/Render builds MUST execute the local Turbo version resolved by pnpm.

#### Scenario: Turbo config is accepted
- GIVEN the repository uses the updated Turbo version
- WHEN a Turbo build/lint command runs
- THEN `turbo.json` is accepted without `pipeline` schema errors.

#### Scenario: Deployment uses local Turbo
- GIVEN CI or Render runs install and build commands
- WHEN Turbo is invoked
- THEN the command resolves the project-local Turbo binary
- AND uses the committed `tasks` configuration.

### Requirement: Database Seed and Ingestion Validation

The deployment validation MUST seed the Neon/PostGIS database and successfully execute the government hydrology ingestion endpoint with persisted evidence.

#### Scenario: Seed completes against Neon
- GIVEN Neon credentials are configured and PostGIS is available
- WHEN the database seed script runs
- THEN required government hydrology seed data is present
- AND the script exits successfully.

#### Scenario: Ingestion endpoint persists data
- GIVEN the database has been seeded and the API is configured for Neon
- WHEN `POST /ingest` is executed for government hydrology ingestion
- THEN the endpoint returns a success response
- AND expected ingestion records are persisted.

#### Scenario: Missing database capability is reported
- GIVEN Neon lacks a required database capability such as PostGIS
- WHEN seed or ingestion runs
- THEN validation fails with a clear operational error
- AND no successful deployment evidence is recorded.
