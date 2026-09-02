# Local Proof Workflow Specification

## Purpose

Define one reproducible, no-stub local proof for the existing Agronautas monorepo. The workflow uses API, Postgres/PostGIS, Redis, and worker services supplied through environment variables or process configuration. It preserves package boundaries, existing Spanish UI copy, and truthful local-versus-production evidence semantics.

## Requirements

### Requirement: Minimal setup and safe command aliases

The repository MUST provide one documented setup sequence for pnpm dependencies, env-backed service endpoints/processes, migrations, and the existing `apps/api`, `apps/web`, and Python worker commands. `backend` and `frontend` aliases MAY exist only when they are thin, discoverable delegates; they MUST NOT create duplicate application directories or change package behavior.

#### Scenario: Safe aliases are available
- GIVEN the repository has `apps/api` and `apps/web` package commands
- WHEN an operator invokes the documented `backend` or `frontend` alias
- THEN it delegates to the corresponding package command and reports the same exit status

#### Scenario: An alias would hide a required prerequisite
- GIVEN an alias cannot preserve required environment, migration, or worker prerequisites
- WHEN the setup guide is generated
- THEN the alias is omitted and the canonical package command is documented instead

### Requirement: Full local topology is ready before proof

The proof MUST use PostgreSQL/PostGIS, Redis, worker, API, and web/BFF services supplied through environment variables or process configuration, apply idempotent migrations before data checks, and use readiness to distinguish liveness from required dependency health. Optional services MUST remain explicitly optional.

#### Scenario: Full stack becomes ready
- GIVEN the env-backed services and declared worker dependencies are available
- WHEN migrations complete and health/readiness are queried
- THEN Postgres/PostGIS, Redis, worker heartbeat, API, and web/BFF are attributable as ready

#### Scenario: Required dependency is unavailable
- GIVEN Postgres, Redis, or the required worker endpoint/process cannot become healthy within the bounded timeout
- WHEN the proof sequence reaches readiness
- THEN it stops the dependent checks and records `blocked` or `not_run`, never a passing full-stack claim

### Requirement: Canonical no-stub proof covers runtime, hydrology, and browser

The workflow MUST use the real API/runtime verifier, real BFF traffic, read-only database inspection, and the no-stub Playwright lane. It MUST cover health/readiness, migrations, Agronautas runtime, hydrology reads and explicitly authorized writes, worker completion, and the required public, field, municipality, and ingest browser routes without changing Spanish UI copy.

#### Scenario: Local proof reaches real boundaries
- GIVEN the full topology is ready and required authorization is present
- WHEN the canonical sequence runs once
- THEN it records API/BFF responses, worker and DB correlation, hydrology outcomes, and desktop/mobile browser assertions

#### Scenario: A capability is unavailable
- GIVEN provider, auth, queue, worker, write authorization, or browser-server access is missing
- WHEN its proof step is reached
- THEN the step is labeled `blocked` or `not_run` with a reason and later evidence cannot upgrade it to success

### Requirement: Proof is bounded, repeatable, and reversible

Each run MUST carry safe request, revision, run, job, and proof identifiers where applicable; MUST enforce declared request and upstream timeouts; MUST verify idempotent repeat behavior; and MUST define a non-destructive rollback that preserves unrelated dirty work.

#### Scenario: The same proof is retried
- GIVEN a completed proof identifier is submitted again
- WHEN the bounded repeat check runs
- THEN no duplicate durable job or ingestion result is created and the correlation remains inspectable

#### Scenario: A local slice regresses
- GIVEN a verified route, migration, or proof step regresses
- WHEN rollback is applied
- THEN only the slice is reverted, additive data is preserved, and the evidence identifies the restored revision
