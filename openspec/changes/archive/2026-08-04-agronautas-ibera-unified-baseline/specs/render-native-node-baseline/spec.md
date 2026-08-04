# Render Native Node Baseline Specification

## Purpose

Define current-compatible Render Native Node integration for the canonical baseline. Agronautas and Iberá-Alerta remain separate products and domain boundaries.

## Requirements

### Requirement: API port precedence preserves local behavior

The API MUST resolve `PORT` > `API_PORT` > `3001`. Canonical local behavior currently uses `API_PORT` with fallback `3001`; absent `PORT`, that behavior MUST remain compatible.

#### Scenario: Precedence and fallback
- GIVEN valid `PORT=4100` and `API_PORT=4200`
- WHEN the resolver runs
- THEN it returns `4100`
- AND without `PORT` it returns valid `API_PORT`, or `3001` when both are missing

#### Scenario: Malformed configuration
- GIVEN the selected value is not a positive integer
- WHEN the resolver runs
- THEN it fails deterministically and MUST NOT pass the malformed value to `listen`

### Requirement: Manifest declares current Node service boundaries

The manifest MUST declare exactly two Native Node web services: API and web. It MUST be derived from scripts/code, not historical deployment evidence, and MUST declare no Python worker.

#### Scenario: Separate services and products
- GIVEN the manifest is inspected
- WHEN services, routes, and upstream variables are reviewed
- THEN API and web are separate Node services
- AND Agronautas and Iberá-Alerta remain separate capability areas with no unified UI/domain model

### Requirement: Build and start commands are script-valid

The API service MUST build required workspace packages before its API build and use `pnpm --dir apps/api start`. The web service MUST use `pnpm --dir apps/web build` and `pnpm --dir apps/web start`. Tests MUST compare commands with package scripts.

#### Scenario: Commands and environment names match current sources
- GIVEN current `package.json` files and service code
- WHEN manifest assertions run
- THEN commands exist and API covers `PORT`, `API_PORT`, database/Redis, scheduler, and hydrology names
- AND web variables cover `PORT`, `AGRONAUTAS_API_INTERNAL_URL`, and existing BFF names

#### Scenario: Missing or stale command
- GIVEN a manifest command is absent from its referenced package scripts
- WHEN validation runs
- THEN validation fails without inventing a replacement command

### Requirement: Render disables duplicate in-process schedulers

The manifest MUST set `AGRONAUTAS_SCHEDULER_ENABLED=false` and `HYDROLOGY_SCHEDULER_ENABLED=false`. It MUST NOT enable or declare the Python worker.

#### Scenario: Scheduler policy
- GIVEN the API starts with manifest variables
- WHEN both startup flags are evaluated
- THEN both in-process schedulers remain disabled
- AND no duplicate scheduler or Python worker is created

### Requirement: Canonical dependency state is preserved

The change MUST preserve canonical package declarations and lockfile versions. It MUST NOT downgrade or replace the canonical dependency state; the verified canonical Next.js lock resolution is `15.5.19`.

#### Scenario: Dependency diff
- GIVEN the manifest is added
- WHEN package and lockfile diffs are reviewed
- THEN no unrelated downgrade, lockfile replacement, or version rollback exists

### Requirement: Health and readiness contracts do not imply deployment evidence

The integration MUST preserve `/health` as HTTP 200 and `/ready` as dependency-derived HTTP 200/503, including revision/configuration fields. It MUST NOT claim provider, database, Render, deployment, or production results.

#### Scenario: Controlled contract test
- GIVEN route tests control dependency outcomes
- WHEN `/health` and `/ready` are exercised
- THEN status and response shape match current contracts
- AND the test reports no live provider, database, or deployment evidence

### Requirement: Source history and non-goals are preserved

The change MUST use the canonical branch as the application baseline. It MUST NOT delete branches, worktrees, or stashes, or wholesale merge/cherry-pick historical sources. Docker, Python worker enablement, and product unification are outside scope.

#### Scenario: Selective recovery
- GIVEN historical Render files or dirty worktree edits exist
- WHEN implementation is prepared
- THEN only current-compatible behavior is re-derived under tests
- AND all source states and historical evidence remain preserved

#### Scenario: Unsupported request
- GIVEN a request for Docker, a Python worker, product unification, or unsupported production claims
- WHEN scope is checked
- THEN it is rejected as outside this capability
